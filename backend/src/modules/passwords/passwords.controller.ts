import type { FastifyInstance } from 'fastify';
import {
  createPasswordSchema,
  passwordIdParamSchema,
  passwordsQuerySchema,
  updatePasswordSchema,
} from './passwords.schema.js';
import { passwordsService } from './passwords.service.js';

export async function passwordsController(app: FastifyInstance) {
  app.get('/api/passwords', async (request) => {
    const { search } = passwordsQuerySchema.parse(request.query);
    return passwordsService.list(search, request.profileId);
  });

  app.get('/api/passwords/:id', async (request) => {
    const { id } = passwordIdParamSchema.parse(request.params);
    return passwordsService.getById(id, request.profileId);
  });

  app.post('/api/passwords', async (request, reply) => {
    const input = createPasswordSchema.parse(request.body);
    const record = await passwordsService.create(input, request.profileId);
    reply.status(201);
    return record;
  });

  app.patch('/api/passwords/:id', async (request) => {
    const { id } = passwordIdParamSchema.parse(request.params);
    const input = updatePasswordSchema.parse(request.body);
    return passwordsService.update(id, input, request.profileId);
  });

  app.delete('/api/passwords/:id', async (request, reply) => {
    const { id } = passwordIdParamSchema.parse(request.params);
    await passwordsService.deletePassword(id, request.profileId);
    reply.status(204);
  });
}
