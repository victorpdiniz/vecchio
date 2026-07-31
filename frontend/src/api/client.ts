import axios from 'axios';

// URL base da API. Em dev, o Vite injeta VITE_API_URL a partir do
// docker-compose; fora do Docker cai para localhost.
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export const api = axios.create({ baseURL });

// Anexa o perfil atual (escolhido na tela inicial) em toda requisição.
// Não é autenticação — só identifica "quem está perguntando" para o
// back-end personalizar agenda privada e destinatários de notificação.
export function setApiProfileId(profileId: string | null) {
  if (profileId) {
    api.defaults.headers.common['x-profile-id'] = profileId;
  } else {
    delete api.defaults.headers.common['x-profile-id'];
  }
}

interface ApiErrorBody {
  message?: string;
  issues?: { campo: string; erro: string }[];
}

// Extrai uma mensagem em português pronta para mostrar ao usuário a partir
// de um erro da API (400 com issues do Zod, ou AppError com só message).
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data?.issues?.length) {
      return data.issues.map((issue) => issue.erro).join(' ');
    }
    if (data?.message) {
      return data.message;
    }
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
