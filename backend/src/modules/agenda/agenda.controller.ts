import type { FastifyInstance } from 'fastify';
import {
  agendaIdParamSchema,
  createAgendaItemSchema,
  dateRangeQuerySchema,
  seriesParamSchema,
  updateAgendaItemSchema,
} from './agenda.schema.js';
import { agendaService } from './agenda.service.js';

export async function agendaController(app: FastifyInstance) {
  app.get('/api/agenda', async (request) => {
    const { from, to } = dateRangeQuerySchema.parse(request.query);
    return agendaService.list(from, to);
  });

  app.get('/api/agenda/summary', async (request) => {
    const { from, to } = dateRangeQuerySchema.parse(request.query);
    return agendaService.summary(from, to);
  });

  app.get('/api/agenda/:id', async (request) => {
    const { id } = agendaIdParamSchema.parse(request.params);
    return agendaService.getById(id);
  });

  app.post('/api/agenda', async (request, reply) => {
    const input = createAgendaItemSchema.parse(request.body);
    const items = await agendaService.create(input, request.profileId);
    reply.status(201);
    return items;
  });

  app.patch('/api/agenda/:id', async (request) => {
    const { id } = agendaIdParamSchema.parse(request.params);
    const input = updateAgendaItemSchema.parse(request.body);
    return agendaService.update(id, input, request.profileId);
  });

  app.delete('/api/agenda/series/:recurrenceGroupId', async (request) => {
    const { recurrenceGroupId } = seriesParamSchema.parse(request.params);
    return agendaService.deleteSeries(recurrenceGroupId);
  });

  app.delete('/api/agenda/:id', async (request, reply) => {
    const { id } = agendaIdParamSchema.parse(request.params);
    await agendaService.deleteItem(id);
    reply.status(204);
  });
}
