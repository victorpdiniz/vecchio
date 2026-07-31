import type { FastifyInstance } from 'fastify';
import { AppError } from '../../lib/errors.js';
import {
  agendaIdParamSchema,
  attachmentIdParamSchema,
  createAgendaItemSchema,
  dateRangeQuerySchema,
  seriesParamSchema,
  updateAgendaItemSchema,
} from './agenda.schema.js';
import { agendaService } from './agenda.service.js';

export async function agendaController(app: FastifyInstance) {
  app.get('/api/agenda', async (request) => {
    const { from, to } = dateRangeQuerySchema.parse(request.query);
    return agendaService.list(request.profileId, from, to);
  });

  app.get('/api/agenda/summary', async (request) => {
    const { from, to } = dateRangeQuerySchema.parse(request.query);
    return agendaService.summary(from, to);
  });

  app.get('/api/agenda/:id', async (request) => {
    const { id } = agendaIdParamSchema.parse(request.params);
    return agendaService.getById(id, request.profileId);
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
    return agendaService.deleteSeries(recurrenceGroupId, request.profileId);
  });

  app.delete('/api/agenda/:id', async (request, reply) => {
    const { id } = agendaIdParamSchema.parse(request.params);
    await agendaService.deleteItem(id, request.profileId);
    reply.status(204);
  });

  app.post('/api/agenda/:id/attachments', async (request) => {
    const { id } = agendaIdParamSchema.parse(request.params);
    const file = await request.file();
    if (!file) {
      throw new AppError('Selecione um arquivo PDF para enviar.', 400);
    }
    if (file.mimetype !== 'application/pdf') {
      throw new AppError('Só é possível anexar arquivos PDF.', 400);
    }
    return agendaService.addAttachment(id, file, request.profileId);
  });

  app.delete('/api/agenda/attachments/:attachmentId', async (request, reply) => {
    const { attachmentId } = attachmentIdParamSchema.parse(request.params);
    await agendaService.removeAttachment(attachmentId);
    reply.status(204);
  });
}
