import { prisma } from '../../lib/prisma.js';

export const passwordsRepository = {
  findAll() {
    return prisma.password.findMany({ orderBy: { siteName: 'asc' } });
  },

  findById(id: string) {
    return prisma.password.findUnique({ where: { id } });
  },

  create(data: {
    siteName: string;
    url: string | null;
    username: string;
    passwordEncrypted: string;
    notes: string | null;
  }) {
    return prisma.password.create({ data });
  },

  update(
    id: string,
    data: Partial<{
      siteName: string;
      url: string | null;
      username: string;
      passwordEncrypted: string;
      notes: string | null;
    }>,
  ) {
    return prisma.password.update({ where: { id }, data });
  },

  deleteById(id: string) {
    return prisma.password.delete({ where: { id } });
  },
};
