import type { FastifyInstance } from 'fastify';
import { copyRequestSchema, jobIdParamSchema, listFoldersQuerySchema } from './usb.schema.js';
import { usbService } from './usb.service.js';

export async function usbController(app: FastifyInstance) {
  app.get('/api/usb/folders', async (request) => {
    const { path: relativePath } = listFoldersQuerySchema.parse(request.query);
    return usbService.listFolders(relativePath);
  });

  app.get('/api/usb/drives', async () => usbService.listDrives());

  app.post('/api/usb/copy', async (request, reply) => {
    const input = copyRequestSchema.parse(request.body);
    const job = await usbService.startCopy(input.sourcePath, input.driveId, input.destinationPath);
    reply.status(202);
    return job;
  });

  app.get('/api/usb/jobs/:id', async (request) => {
    const { id } = jobIdParamSchema.parse(request.params);
    return usbService.getJob(id);
  });
}
