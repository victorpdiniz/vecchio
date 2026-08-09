import type { FastifyInstance } from 'fastify';
import { AppError } from '../../lib/errors.js';
import {
  billAttachmentIdParamSchema,
  billIdParamSchema,
  billsQuerySchema,
  billsSummaryQuerySchema,
  createBillSchema,
  markBillPaidSchema,
  updateBillSchema,
} from './bills.schema.js';
import { billsService } from './bills.service.js';

export async function billsController(app: FastifyInstance) {
  app.get('/api/bills', async (request) => {
    const filters = billsQuerySchema.parse(request.query);
    return billsService.list(filters);
  });

  app.get('/api/bills/summary', async (request) => {
    const { from, to } = billsSummaryQuerySchema.parse(request.query);
    return billsService.summary(from, to);
  });

  app.get('/api/bills/:id', async (request) => {
    const { id } = billIdParamSchema.parse(request.params);
    return billsService.getById(id);
  });

  app.post('/api/bills', async (request, reply) => {
    const input = createBillSchema.parse(request.body);
    const bills = await billsService.create(input, request.profileId);
    reply.status(201);
    return bills;
  });

  app.patch('/api/bills/:id', async (request) => {
    const { id } = billIdParamSchema.parse(request.params);
    const input = updateBillSchema.parse(request.body);
    return billsService.update(id, input);
  });

  app.patch('/api/bills/:id/pago', async (request) => {
    const { id } = billIdParamSchema.parse(request.params);
    const { paid } = markBillPaidSchema.parse(request.body);
    return billsService.setPaid(id, paid);
  });

  app.delete('/api/bills/:id', async (request, reply) => {
    const { id } = billIdParamSchema.parse(request.params);
    await billsService.deleteBill(id);
    reply.status(204);
  });

  app.post('/api/bills/:id/attachments', async (request) => {
    const { id } = billIdParamSchema.parse(request.params);
    const file = await request.file();
    if (!file) {
      throw new AppError('Selecione um arquivo PDF para enviar.', 400);
    }
    if (file.mimetype !== 'application/pdf') {
      throw new AppError('Só é possível anexar arquivos PDF.', 400);
    }
    return billsService.addAttachment(id, file, request.profileId);
  });

  app.delete('/api/bills/attachments/:attachmentId', async (request, reply) => {
    const { attachmentId } = billAttachmentIdParamSchema.parse(request.params);
    await billsService.removeAttachment(attachmentId);
    reply.status(204);
  });
}
