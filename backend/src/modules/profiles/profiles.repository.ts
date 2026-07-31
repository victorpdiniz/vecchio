import { prisma } from '../../lib/prisma.js';
import type { UpdateProfileInput } from './profiles.schema.js';

export const profilesRepository = {
  findAll() {
    return prisma.profile.findMany({ orderBy: { role: 'asc' } });
  },
  findById(id: string) {
    return prisma.profile.findUnique({ where: { id } });
  },
  update(id: string, data: UpdateProfileInput) {
    return prisma.profile.update({ where: { id }, data });
  },
};
