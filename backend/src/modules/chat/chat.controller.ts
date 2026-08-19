import type { FastifyInstance } from 'fastify';
import { AppError } from '../../lib/errors.js';
import { chatMessageIdParamSchema, sendMessageSchema } from './chat.schema.js';
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
    return chatService.ask(profileId, message);
  });

  app.post('/api/chat/messages/:id/confirm-action', async (request) => {
    const profileId = requireProfile(request.profileId);
    const { id } = chatMessageIdParamSchema.parse(request.params);
    return chatService.confirmAction(id, profileId);
  });

  app.post('/api/chat/messages/:id/cancel-action', async (request) => {
    const profileId = requireProfile(request.profileId);
    const { id } = chatMessageIdParamSchema.parse(request.params);
    return chatService.cancelAction(id, profileId);
  });

  app.delete('/api/chat/history', async (request, reply) => {
    const profileId = requireProfile(request.profileId);
    await chatService.clearHistory(profileId);
    reply.status(204);
  });
}
