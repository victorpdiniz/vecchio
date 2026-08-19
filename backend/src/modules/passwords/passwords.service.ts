import type { Password } from '@prisma/client';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { decryptSecret, encryptSecret } from '../../lib/crypto.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { passwordsRepository } from './passwords.repository.js';
import type { CreatePasswordInput, UpdatePasswordInput } from './passwords.schema.js';

async function requireAdmin(actorProfileId: string | null) {
  if (!actorProfileId) {
    throw new AppError('Selecione um perfil antes de continuar.', 400);
  }
  const actor = await profilesRepository.findById(actorProfileId);
  if (!actor || actor.role !== 'admin') {
    throw new AppError('Só o admin pode gerenciar o cofre de senhas.', 403);
  }
  return actor;
}

// Descriptografa a senha antes de expor ao front — o valor cifrado no
// banco nunca sai do backend, só o texto plano já resolvido.
function toPublic(record: Password) {
  return {
    id: record.id,
    siteName: record.siteName,
    url: record.url,
    username: record.username,
    password: decryptSecret(record.passwordEncrypted),
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const passwordsService = {
  async list(search?: string) {
    const all = await passwordsRepository.findAll();
    // Filtro em memória (não via Prisma `contains`) porque o SQLite não
    // suporta `mode: 'insensitive'` — a lista de senhas de uma família é
    // pequena o bastante pra isso não ser um problema de performance.
    const filtered = search
      ? all.filter((record) => record.siteName.toLowerCase().includes(search.toLowerCase()))
      : all;
    return filtered.map(toPublic);
  },

  async getById(id: string) {
    const record = await passwordsRepository.findById(id);
    if (!record) {
      throw new NotFoundError('Senha não encontrada.');
    }
    return toPublic(record);
  },

  async create(input: CreatePasswordInput, actorProfileId: string | null) {
    await requireAdmin(actorProfileId);
    const record = await passwordsRepository.create({
      siteName: input.siteName,
      url: input.url ?? null,
      username: input.username,
      passwordEncrypted: encryptSecret(input.password),
      notes: input.notes ?? null,
    });
    return toPublic(record);
  },

  async update(id: string, input: UpdatePasswordInput, actorProfileId: string | null) {
    await requireAdmin(actorProfileId);
    const existing = await passwordsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Senha não encontrada.');
    }
    const record = await passwordsRepository.update(id, {
      siteName: input.siteName,
      url: input.url ?? null,
      username: input.username,
      passwordEncrypted: encryptSecret(input.password),
      notes: input.notes ?? null,
    });
    return toPublic(record);
  },

  async deletePassword(id: string, actorProfileId: string | null) {
    await requireAdmin(actorProfileId);
    const existing = await passwordsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Senha não encontrada.');
    }
    await passwordsRepository.deleteById(id);
  },
};
