import type { FastifyInstance } from 'fastify';
import { AppError } from '../../lib/errors.js';
import { sendMessageSchema } from './chat.schema.js';
import { chatService } from './chat.service.js';

function requireProfile(profileId: string | null) {
  if (!profileId) {
    throw new AppError('Selecione um perfil antes de usar o chat.', 400);
  }
  return profileId;
}

export async function chatController(app: FastifyInstance) {
  app.get('/api/chat/history', async (request) => {
    const profileId = requireProfile(request.profileId);
    return chatService.history(profileId);
  });

  app.post('/api/chat/messages', async (request) => {
    const profileId = requireProfile(request.profileId);
    const { message } = sendMessageSchema.parse(request.body);
    const answer = await chatService.ask(profileId, message);
    return { answer };
  });
}
