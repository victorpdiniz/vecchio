import { NotFoundError } from '../../lib/errors.js';
import { profilesRepository } from './profiles.repository.js';
import type { UpdateProfileInput } from './profiles.schema.js';

export const profilesService = {
  list() {
    return profilesRepository.findAll();
  },

  async getById(id: string) {
    const profile = await profilesRepository.findById(id);
    if (!profile) {
      throw new NotFoundError('Perfil não encontrado.');
    }
    return profile;
  },

  async update(id: string, data: UpdateProfileInput) {
    await this.getById(id);
    return profilesRepository.update(id, data);
  },
};
