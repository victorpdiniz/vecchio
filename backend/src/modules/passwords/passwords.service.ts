import type { Password, Profile } from '@prisma/client';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { decryptSecret, encryptSecret } from '../../lib/crypto.js';
import { profilesRepository } from '../profiles/profiles.repository.js';
import { passwordsRepository } from './passwords.repository.js';
import type { CreatePasswordInput, UpdatePasswordInput } from './passwords.schema.js';

async function requireActor(actorProfileId: string | null) {
  if (!actorProfileId) {
    throw new AppError('Selecione um perfil antes de continuar.', 400);
  }
  const actor = await profilesRepository.findById(actorProfileId);
  if (!actor) {
    throw new AppError('Perfil inválido.', 400);
  }
  return actor;
}

// Cada senha tem um dono (quem cadastrou). Admin vê e gerencia todas; os
// demais só a própria — igual à regra do resto da app: admin é único
// (Profile.role é @unique), então isso nunca é ambíguo.
function assertOwnerOrAdmin(record: Password, actor: Profile) {
  if (actor.role !== 'admin' && record.ownerProfileId !== actor.id) {
    throw new AppError('Você só pode gerenciar as suas próprias senhas.', 403);
  }
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
    ownerProfileId: record.ownerProfileId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const passwordsService = {
  async list(search: string | undefined, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);
    const all = actor.role === 'admin' ? await passwordsRepository.findAll() : await passwordsRepository.findAllByOwner(actor.id);
    // Filtro em memória (não via Prisma `contains`) porque o SQLite não
    // suporta `mode: 'insensitive'` — a lista de senhas de uma família é
    // pequena o bastante pra isso não ser um problema de performance.
    const filtered = search
      ? all.filter((record) => record.siteName.toLowerCase().includes(search.toLowerCase()))
      : all;
    return filtered.map(toPublic);
  },

  async getById(id: string, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);
    const record = await passwordsRepository.findById(id);
    if (!record) {
      throw new NotFoundError('Senha não encontrada.');
    }
    assertOwnerOrAdmin(record, actor);
    return toPublic(record);
  },

  async create(input: CreatePasswordInput, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);
    const record = await passwordsRepository.create({
      siteName: input.siteName,
      url: input.url ?? null,
      username: input.username,
      passwordEncrypted: encryptSecret(input.password),
      notes: input.notes ?? null,
      ownerProfileId: actor.id,
    });
    return toPublic(record);
  },

  async update(id: string, input: UpdatePasswordInput, actorProfileId: string | null) {
    const actor = await requireActor(actorProfileId);
    const existing = await passwordsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Senha não encontrada.');
    }
    assertOwnerOrAdmin(existing, actor);
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
    const actor = await requireActor(actorProfileId);
    const existing = await passwordsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Senha não encontrada.');
    }
    assertOwnerOrAdmin(existing, actor);
    await passwordsRepository.deleteById(id);
  },
};
