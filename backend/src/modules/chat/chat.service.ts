import { GoogleGenerativeAI } from '@google/generative-ai';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';
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

function getModel() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      'O chat ainda não foi configurado. Peça para o administrador adicionar a chave do Gemini em backend/.env.',
      503,
    );
  }
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

async function buildAgendaContext(profileId: string | null) {
  const now = new Date();
  const from = subDays(now, CONTEXT_PAST_DAYS);
  const to = addDays(now, CONTEXT_FUTURE_DAYS);
  const items = await agendaService.list(profileId, from, to);

  if (items.length === 0) {
    return 'Não há nenhum compromisso cadastrado na agenda nos próximos dois meses.';
  }

  return items
    .map((item) => {
      const when = format(item.startAt, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const local = item.location ? ` em ${item.location}` : '';
      const responsavel = item.ownerProfile?.name ?? 'toda a família';
      const bill = item.bill;
      const contaInfo = bill
        ? ` — conta de ${BILL_CATEGORY_LABELS[bill.category] ?? bill.category}, valor: R$ ${bill.amount
            .toFixed(2)
            .replace('.', ',')}, status: ${bill.status === 'pago' ? 'paga' : 'pendente'}${
            bill.payerProfile ? `, quem paga: ${bill.payerProfile.name}` : ''
          }`
        : '';
      return `- ${item.title} (categoria: ${item.category}) — ${when}${local} — responsável: ${responsavel}${contaInfo}`;
    })
    .join('\n');
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
    const agendaContext = await buildAgendaContext(profileId);
    const medicinesContext = await buildMedicinesContext();
    const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const prompt = `Você é o assistente do Vecchio, um sistema de agenda familiar para uma família brasileira.
Responda sempre em português do Brasil, em frases curtas, simples e diretas — a pessoa que está perguntando pode ser idosa e não tem familiaridade com tecnologia.
Hoje é ${today}.
Use SOMENTE as informações das listas abaixo para responder. Se a resposta não estiver nelas, diga educadamente que não encontrou essa informação — não invente datas, valores, remédios ou compromissos.

Compromissos cadastrados (de ${CONTEXT_PAST_DAYS} dias atrás até ${CONTEXT_FUTURE_DAYS} dias à frente):
${agendaContext}

Remédios cadastrados:
${medicinesContext}

Pergunta: ${message}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    if (profileId) {
      await chatRepository.saveExchange(profileId, message, answer);
    }

    return answer;
  },

  history(profileId: string) {
    return chatRepository.listByProfile(profileId);
  },
};
