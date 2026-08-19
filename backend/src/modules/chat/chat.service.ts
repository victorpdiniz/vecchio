import { GoogleGenerativeAI, SchemaType, type Content } from '@google/generative-ai';
import { addDays, subDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';
import { APP_TIME_ZONE, formatBR } from '../../lib/timezone.js';
import { agendaService } from '../agenda/agenda.service.js';
import { medicinesService } from '../medicines/medicines.service.js';
import { billsService } from '../bills/bills.service.js';
import { chatRepository } from './chat.repository.js';
import type { AgendaCategory } from '../../lib/enums.js';
import type { ProposedAction } from './chat.types.js';

const CONTEXT_PAST_DAYS = 3;
const CONTEXT_FUTURE_DAYS = 60;
// Quantas mensagens do histórico (user+model somados) são reenviadas ao
// Gemini a cada pergunta. Limita o custo em tokens, que cresce O(n²) numa
// conversa longa se o histórico inteiro fosse replayed a cada turno — o caso
// de uso de "pergunta de esclarecimento" só precisa de contexto recente, não
// de recall de longo prazo.
const MAX_HISTORY_TURNS = 20;

const BILL_CATEGORY_LABELS: Record<string, string> = {
  luz: 'luz',
  agua: 'água',
  internet: 'internet',
  telefone: 'telefone',
  aluguel: 'aluguel',
  saude: 'saúde',
  mercado: 'mercado',
  outro: 'outro',
};

const WEEKDAY_LABELS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return 'todos os dias';
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(', ');
}

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    answer: { type: SchemaType.STRING },
    relevantAgendaItemIds: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    proposedAction: {
      type: SchemaType.OBJECT,
      properties: {
        kind: { type: SchemaType.STRING }, // "none" | "mark_bill_paid" | "create_appointment"
        billId: { type: SchemaType.STRING },
        appointmentTitle: { type: SchemaType.STRING },
        appointmentCategory: { type: SchemaType.STRING },
        appointmentStartAt: { type: SchemaType.STRING }, // ISO 8601
        appointmentIsAllDay: { type: SchemaType.BOOLEAN },
        appointmentAmount: { type: SchemaType.NUMBER },
        confirmationPrompt: { type: SchemaType.STRING },
      },
      // billId/appointment* forçados a sempre aparecer (mesmo vazios quando
      // irrelevantes) porque, deixados como opcionais, o modelo às vezes
      // preenchia só "appointmentTitle" e esquecia categoria/data — sem os
      // 3 campos, confirmAction não tem o que precisa pra criar o
      // compromisso, e a ação falha depois de já ter sido proposta.
      required: [
        'kind',
        'billId',
        'appointmentTitle',
        'appointmentCategory',
        'appointmentStartAt',
        'confirmationPrompt',
      ],
    },
  },
  required: ['answer', 'relevantAgendaItemIds', 'proposedAction'],
};

function buildSystemInstruction(): string {
  const today = formatBR(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy");
  return `Você é o assistente do Vecchio, um sistema de agenda familiar para uma família brasileira.
Responda sempre em português do Brasil, em frases curtas, simples e diretas — a pessoa que está perguntando pode ser idosa e não tem familiaridade com tecnologia.
Hoje é ${today}.
Use SOMENTE as informações fornecidas no contexto de cada pergunta para responder. Se a resposta não estiver nelas, diga educadamente que não encontrou essa informação — não invente datas, valores, remédios ou compromissos.

Além de responder perguntas, você pode propor duas ações: marcar uma conta como paga, ou criar um compromisso na agenda. Você NUNCA executa essas ações sozinho e NUNCA diz que já fez algo — você só propõe, preenchendo "proposedAction", e o app pede confirmação ao usuário antes de aplicar. Se faltar alguma informação necessária (qual conta, data/hora do compromisso), pergunte no campo "answer" e devolva proposedAction com kind "none". Só preencha um kind diferente de "none" quando o usuário tiver claramente pedido uma dessas ações.

Responda sempre em JSON com três campos:
- "answer": sua resposta em texto, como descrito acima.
- "relevantAgendaItemIds": lista dos "id" (da lista de compromissos do contexto) que você usou pra responder — só os que aparecem na sua resposta. Se a pergunta não for sobre a agenda, devolva uma lista vazia.
- "proposedAction": um objeto com "kind" e os campos daquela ação:
  - "mark_bill_paid": preencha "billId" (use o id exato de uma das contas pendentes listadas) e "confirmationPrompt" (uma pergunta curta, ex: "Marcar 'Aluguel' como paga?").
  - "create_appointment": preencha "appointmentTitle", "appointmentCategory" (consulta, exame, conta, remedio, viagem ou outro), "appointmentStartAt" (data e hora local de Brasília, formato ISO 8601 SEM fuso horário — ex: "2026-08-20T10:00:00" — calculada a partir da data de hoje), "appointmentIsAllDay" (true/false, opcional), "appointmentAmount" (obrigatório só se a categoria for "conta") e "confirmationPrompt".
  - Se não houver ação a propor, devolva só { "kind": "none" }.`;
}

function getModel() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      'O chat ainda não foi configurado. Peça para o administrador adicionar a chave do Gemini em backend/.env.',
      503,
    );
  }
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: buildSystemInstruction(),
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  });
}

// Reconstrói o histórico da conversa no formato que o Gemini espera
// (alterna estritamente user/model, começando por user). saveExchange
// sempre grava os dois papéis em par, então isso vale por construção — só
// pega as últimas MAX_HISTORY_TURNS mensagens pra limitar o custo.
async function buildHistory(profileId: string): Promise<Content[]> {
  const messages = await chatRepository.listByProfile(profileId);
  const recent = messages.slice(-MAX_HISTORY_TURNS);
  return recent.map((message) => ({
    role: message.role === 'user' ? 'user' : 'model',
    parts: [{ text: message.content }],
  }));
}

// Devolve o texto pro prompt (com o id de cada item, pro modelo poder
// referenciar) e a lista crua, reaproveitada depois pra resolver
// `relevantAgendaItemIds` sem precisar consultar o banco de novo.
async function buildAgendaContext() {
  const now = new Date();
  const from = subDays(now, CONTEXT_PAST_DAYS);
  const to = addDays(now, CONTEXT_FUTURE_DAYS);
  const items = await agendaService.list(from, to);

  if (items.length === 0) {
    return { text: 'Não há nenhum compromisso cadastrado na agenda nos próximos dois meses.', items };
  }

  const text = items
    .map((item) => {
      const when = formatBR(item.startAt, "EEEE, dd/MM/yyyy 'às' HH:mm");
      const bill = item.bill;
      const contaInfo = bill
        ? ` — conta de ${BILL_CATEGORY_LABELS[bill.category] ?? bill.category}, valor: R$ ${bill.amount
            .toFixed(2)
            .replace('.', ',')}, status: ${bill.status === 'pago' ? 'paga' : 'pendente'}${
            bill.payerProfile ? `, quem paga: ${bill.payerProfile.name}` : ''
          }`
        : '';
      return `- [id: ${item.id}] ${item.title} (categoria: ${item.category}) — ${when}${contaInfo}`;
    })
    .join('\n');

  return { text, items };
}

async function buildMedicinesContext() {
  const now = new Date();
  const all = await medicinesService.list();
  const active = all.filter((medicine) => medicine.startDate <= now && (!medicine.endDate || medicine.endDate >= now));

  if (active.length === 0) {
    return 'Não há nenhum remédio cadastrado no momento.';
  }

  return active
    .map((medicine) => {
      const quem = medicine.profile?.name ?? 'toda a família';
      const horarios = medicine.schedules
        .map((schedule) => `${schedule.timeOfDay} (${formatDaysOfWeek(schedule.daysOfWeek)})`)
        .join('; ');
      return `- ${medicine.name} (${medicine.dosage}) — para: ${quem} — horários: ${horarios}`;
    })
    .join('\n');
}

// Só contas pendentes — é o universo relevante pra "marcar como paga", e dar
// ids reais pro modelo evita que ele invente um billId.
async function buildBillsContext() {
  const pending = await billsService.list({ status: 'pendente' });

  if (pending.length === 0) {
    return 'Não há nenhuma conta pendente no momento.';
  }

  return pending
    .map(
      (bill) =>
        `- [id: ${bill.id}] ${bill.description} — vence ${formatBR(bill.dueDate, 'dd/MM/yyyy')}, R$ ${bill.amount
          .toFixed(2)
          .replace('.', ',')}`,
    )
    .join('\n');
}

function parseResponse(raw: string): { answer: string; relevantIds: string[]; proposedAction: ProposedAction } {
  try {
    const parsed = JSON.parse(raw) as {
      answer?: unknown;
      relevantAgendaItemIds?: unknown;
      proposedAction?: unknown;
    };
    const answer = typeof parsed.answer === 'string' ? parsed.answer : raw;
    const relevantIds = Array.isArray(parsed.relevantAgendaItemIds)
      ? parsed.relevantAgendaItemIds.filter((id): id is string => typeof id === 'string')
      : [];
    const action = parsed.proposedAction as ProposedAction | undefined;
    const proposedAction: ProposedAction =
      action && typeof action.kind === 'string' && action.kind !== 'none' ? action : { kind: 'none' };
    return { answer, relevantIds, proposedAction };
  } catch {
    // Resposta não veio como o JSON esperado — mostra o texto cru mesmo
    // (sem cards nem ação) em vez de quebrar o chat.
    return { answer: raw, relevantIds: [], proposedAction: { kind: 'none' } };
  }
}

export const chatService = {
  async ask(profileId: string, message: string) {
    const model = getModel();
    const [agendaContext, medicinesContext, billsContext, history] = await Promise.all([
      buildAgendaContext(),
      buildMedicinesContext(),
      buildBillsContext(),
      buildHistory(profileId),
    ]);

    const turnPrompt = `Compromissos cadastrados (de ${CONTEXT_PAST_DAYS} dias atrás até ${CONTEXT_FUTURE_DAYS} dias à frente):
${agendaContext.text}

Remédios cadastrados:
${medicinesContext}

Contas pendentes:
${billsContext}

Pergunta: ${message}`;

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(turnPrompt);
    const raw = result.response.text().trim();

    const { answer, relevantIds, proposedAction } = parseResponse(raw);
    const agendaItems = agendaContext.items.filter((item) => relevantIds.includes(item.id));

    const modelMessage = await chatRepository.saveExchange(
      profileId,
      message,
      answer,
      agendaItems.map((item) => item.id),
      proposedAction,
    );

    return { answer, agendaItems, proposedAction, messageId: modelMessage.id };
  },

  async confirmAction(messageId: string, actorProfileId: string) {
    const message = await chatRepository.findMessageById(messageId);
    if (
      !message ||
      message.profileId !== actorProfileId ||
      message.proposedActionStatus !== 'pending' ||
      !message.proposedAction
    ) {
      throw new AppError('Essa ação não está mais disponível para confirmação.', 409);
    }

    const action = JSON.parse(message.proposedAction) as ProposedAction;
    let resultText: string;

    try {
      switch (action.kind) {
        case 'mark_bill_paid': {
          if (!action.billId) throw new AppError('Não foi possível identificar a conta.', 400);
          await billsService.setPaid(action.billId, true);
          resultText = 'Conta marcada como paga.';
          break;
        }
        case 'create_appointment': {
          if (!action.appointmentTitle || !action.appointmentCategory || !action.appointmentStartAt) {
            throw new AppError('Faltam dados para criar o compromisso.', 400);
          }
          // appointmentStartAt vem sem fuso do modelo (ex: "2026-08-20T10:00:00")
          // e representa horário de Brasília — fromZonedTime converte esse
          // "relógio de parede" pro instante UTC certo. Um new Date(...) direto
          // seria interpretado no fuso do processo (UTC no container), o que
          // criava o compromisso 3h adiantado/atrasado.
          const startAt = fromZonedTime(action.appointmentStartAt, APP_TIME_ZONE);
          if (Number.isNaN(startAt.getTime())) {
            throw new AppError('A data do compromisso ficou inválida.', 400);
          }
          await agendaService.create(
            {
              title: action.appointmentTitle,
              category: action.appointmentCategory as AgendaCategory,
              isAllDay: action.appointmentIsAllDay ?? false,
              startAt,
              amount: action.appointmentAmount,
              reminders: [],
            },
            actorProfileId,
          );
          resultText = 'Compromisso criado.';
          break;
        }
        default:
          throw new AppError('Ação desconhecida.', 400);
      }
    } catch (error) {
      await chatRepository.updateProposedActionStatus(messageId, 'cancelled');
      const friendlyMessage = error instanceof AppError ? error.message : 'Não foi possível concluir a ação.';
      await chatRepository.appendSystemMessage(actorProfileId, `Não consegui: ${friendlyMessage}`);
      throw error instanceof AppError ? error : new AppError(friendlyMessage, 502);
    }

    await chatRepository.updateProposedActionStatus(messageId, 'confirmed');
    const systemMessage = await chatRepository.appendSystemMessage(actorProfileId, resultText);
    return { resultText, messageId: systemMessage.id };
  },

  async cancelAction(messageId: string, actorProfileId: string) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message || message.profileId !== actorProfileId || message.proposedActionStatus !== 'pending') {
      throw new AppError('Essa ação não está mais disponível para confirmação.', 409);
    }
    await chatRepository.updateProposedActionStatus(messageId, 'cancelled');
    return { cancelled: true };
  },

  async clearHistory(profileId: string) {
    await chatRepository.deleteByProfile(profileId);
  },

  async history(profileId: string) {
    const messages = await chatRepository.listByProfile(profileId);
    const allIds = messages.flatMap((m) => (m.agendaItemIds ? m.agendaItemIds.split(',') : []));
    const resolved = allIds.length > 0 ? await agendaService.listByIds(allIds) : [];
    const byId = new Map(resolved.map((item) => [item.id, item]));

    return messages.map((message) => ({
      ...message,
      proposedAction: message.proposedAction ? (JSON.parse(message.proposedAction) as ProposedAction) : null,
      agendaItems: message.agendaItemIds
        ? message.agendaItemIds
            .split(',')
            .map((id) => byId.get(id))
            .filter((item): item is (typeof resolved)[number] => Boolean(item))
        : [],
    }));
  },
};
