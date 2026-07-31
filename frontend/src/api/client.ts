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
