import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { addDays, subDays } from 'date-fns';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';
import { formatBR } from '../../lib/timezone.js';
import { agendaService } from '../agenda/agenda.service.js';
import { medicinesService } from '../medicines/medicines.service.js';
import { chatRepository } from './chat.repository.js';

const CONTEXT_PAST_DAYS = 3;
const CONTEXT_FUTURE_DAYS = 60;

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
  },
  required: ['answer', 'relevantAgendaItemIds'],
};

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
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  });
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

export const chatService = {
  async ask(profileId: string | null, message: string) {
    const model = getModel();
    const agendaContext = await buildAgendaContext();
    const medicinesContext = await buildMedicinesContext();
    const today = formatBR(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy");

    const prompt = `Você é o assistente do Vecchio, um sistema de agenda familiar para uma família brasileira.
Responda sempre em português do Brasil, em frases curtas, simples e diretas — a pessoa que está perguntando pode ser idosa e não tem familiaridade com tecnologia.
Hoje é ${today}.
Use SOMENTE as informações das listas abaixo para responder. Se a resposta não estiver nelas, diga educadamente que não encontrou essa informação — não invente datas, valores, remédios ou compromissos.

Responda em JSON com dois campos:
- "answer": sua resposta em texto, como descrito acima.
- "relevantAgendaItemIds": lista dos "id" (da lista de compromissos abaixo) que você usou pra responder — só os que aparecem na sua resposta. Se a pergunta não for sobre a agenda (ex: só sobre remédio), devolva uma lista vazia.

Compromissos cadastrados (de ${CONTEXT_PAST_DAYS} dias atrás até ${CONTEXT_FUTURE_DAYS} dias à frente):
${agendaContext.text}

Remédios cadastrados:
${medicinesContext}

Pergunta: ${message}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    let answer: string;
    let relevantIds: string[];
    try {
      const parsed = JSON.parse(raw) as { answer?: unknown; relevantAgendaItemIds?: unknown };
      answer = typeof parsed.answer === 'string' ? parsed.answer : raw;
      relevantIds = Array.isArray(parsed.relevantAgendaItemIds)
        ? parsed.relevantAgendaItemIds.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      // Resposta não veio como o JSON esperado — mostra o texto cru mesmo
      // (sem cards) em vez de quebrar o chat.
      answer = raw;
      relevantIds = [];
    }

    const agendaItems = agendaContext.items.filter((item) => relevantIds.includes(item.id));

    if (profileId) {
      await chatRepository.saveExchange(profileId, message, answer, agendaItems.map((item) => item.id));
    }

    return { answer, agendaItems };
  },

  async history(profileId: string) {
    const messages = await chatRepository.listByProfile(profileId);
    const allIds = messages.flatMap((m) => (m.agendaItemIds ? m.agendaItemIds.split(',') : []));
    const resolved = allIds.length > 0 ? await agendaService.listByIds(allIds) : [];
    const byId = new Map(resolved.map((item) => [item.id, item]));

    return messages.map((message) => ({
      ...message,
      agendaItems: message.agendaItemIds
        ? message.agendaItemIds
            .split(',')
            .map((id) => byId.get(id))
            .filter((item): item is (typeof resolved)[number] => Boolean(item))
        : [],
    }));
  },
};
