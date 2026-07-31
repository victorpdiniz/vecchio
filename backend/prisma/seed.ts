import { PrismaClient } from '@prisma/client';
import type { ProfileRole } from '../src/lib/enums.js';

const prisma = new PrismaClient();

// Os 4 perfis são fixos: avô, avó, pai e o admin (neto). O e-mail de cada um
// deve ser trocado pelo real após a instalação (usado nos lembretes por
// e-mail do módulo de notificações).
const profiles: Array<{
  role: ProfileRole;
  name: string;
  email: string;
  colorTag: string;
  avatarIcon: string;
}> = [
  { role: 'avo', name: 'Vô', email: 'avo@vecchio.local', colorTag: '#2563eb', avatarIcon: 'grandpa' },
  { role: 'avo_f', name: 'Vó', email: 'avo_f@vecchio.local', colorTag: '#db2777', avatarIcon: 'grandma' },
  { role: 'pai', name: 'Pai', email: 'pai@vecchio.local', colorTag: '#16a34a', avatarIcon: 'dad' },
  { role: 'admin', name: 'Admin', email: 'admin@vecchio.local', colorTag: '#7c3aed', avatarIcon: 'admin' },
];

async function main() {
  for (const profile of profiles) {
    await prisma.profile.upsert({
      where: { role: profile.role },
      update: {},
      create: profile,
    });
  }
  console.log('Perfis iniciais criados/verificados.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
