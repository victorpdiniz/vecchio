import type { FastifyInstance } from 'fastify';
import { createMedicineSchema, medicineIdParamSchema, updateMedicineSchema } from './medicines.schema.js';
import { medicinesService } from './medicines.service.js';

export async function medicinesController(app: FastifyInstance) {
  app.get('/api/medicines', async () => medicinesService.list());

  app.get('/api/medicines/today', async () => medicinesService.today());

  app.get('/api/medicines/:id', async (request) => {
    const { id } = medicineIdParamSchema.parse(request.params);
    return medicinesService.getById(id);
  });

  app.post('/api/medicines', async (request, reply) => {
    const input = createMedicineSchema.parse(request.body);
    const medicine = await medicinesService.create(input);
    reply.status(201);
    return medicine;
  });

  app.patch('/api/medicines/:id', async (request) => {
    const { id } = medicineIdParamSchema.parse(request.params);
    const input = updateMedicineSchema.parse(request.body);
    return medicinesService.update(id, input);
  });

  app.delete('/api/medicines/:id', async (request, reply) => {
    const { id } = medicineIdParamSchema.parse(request.params);
    await medicinesService.deleteMedicine(id);
    reply.status(204);
  });
}
