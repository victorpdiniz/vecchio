import { GoogleGenerativeAI } from '@google/generative-ai';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';
import { agendaService } from '../agenda/agenda.service.js';
import { chatRepository } from './chat.repository.js';

const CONTEXT_PAST_DAYS = 3;
const CONTEXT_FUTURE_DAYS = 60;

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
      const valor = item.bill ? ` — valor: R$ ${item.bill.amount.toFixed(2).replace('.', ',')}` : '';
      return `- ${item.title} (categoria: ${item.category}) — ${when}${local} — responsável: ${responsavel}${valor}`;
    })
    .join('\n');
}

export const chatService = {
  async ask(profileId: string | null, message: string) {
    const model = getModel();
    const context = await buildAgendaContext(profileId);
    const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const prompt = `Você é o assistente do Vecchio, um sistema de agenda familiar para uma família brasileira.
Responda sempre em português do Brasil, em frases curtas, simples e diretas — a pessoa que está perguntando pode ser idosa e não tem familiaridade com tecnologia.
Hoje é ${today}.
Use SOMENTE as informações da lista de compromissos abaixo para responder. Se a resposta não estiver nessa lista, diga educadamente que não encontrou essa informação na agenda — não invente datas, valores ou compromissos.

Compromissos cadastrados (de ${CONTEXT_PAST_DAYS} dias atrás até ${CONTEXT_FUTURE_DAYS} dias à frente):
${context}

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
