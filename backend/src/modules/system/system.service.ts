import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';

const execFileAsync = promisify(execFile);

// Marca que o usuário apertou "Atualizar" — só na memória do processo, não
// em disco: sobrevive a recarregar a página ou trocar de aparelho (é estado
// do servidor, não do navegador), mas some sozinho assim que o processo
// reinicia — exatamente o momento em que a atualização foi de fato aplicada.
let triggeredAt: string | null = null;

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['--git-dir', env.GIT_DIR, ...args]);
  return stdout.trim();
}

export interface UpdateStatus {
  updateAvailable: boolean;
  currentCommit: string | null;
  remoteCommit: string | null;
  commitsBehind: number;
  remoteSummary: string | null;
  triggeredAt: string | null;
  checkError: string | null;
}

export const systemService = {
  // Só checa e reporta — quem de fato baixa e reinicia é o watcher do host
  // (scripts/vecchio-update-watcher.sh), acionado pelo marcador que
  // requestUpdate() escreve dentro do próprio .git. O container nunca tem
  // acesso ao socket do Docker (ver docs/self-update-setup.md).
  async getStatus(): Promise<UpdateStatus> {
    try {
      await git('fetch', 'origin', env.UPDATE_BRANCH);

      const currentCommit = await git('rev-parse', 'HEAD');
      const remoteCommit = await git('rev-parse', `origin/${env.UPDATE_BRANCH}`);
      const updateAvailable = currentCommit !== remoteCommit;

      const commitsBehind = updateAvailable
        ? Number(await git('rev-list', '--count', `HEAD..origin/${env.UPDATE_BRANCH}`)) || 0
        : 0;
      const remoteSummary = updateAvailable ? await git('log', '-1', '--format=%s', `origin/${env.UPDATE_BRANCH}`) : null;

      return { updateAvailable, currentCommit, remoteCommit, commitsBehind, remoteSummary, triggeredAt, checkError: null };
    } catch (error) {
      // .git não montado (ex: rodando fora do Docker), sem rede, branch
      // remota inexistente etc. — nunca derruba a rota por causa disso.
      return {
        updateAvailable: false,
        currentCommit: null,
        remoteCommit: null,
        commitsBehind: 0,
        remoteSummary: null,
        triggeredAt,
        checkError: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async requestUpdate(): Promise<{ triggeredAt: string }> {
    const status = await this.getStatus();
    if (status.checkError) {
      throw new AppError('Não foi possível checar atualizações agora.', 502);
    }
    if (!status.updateAvailable) {
      throw new AppError('Já está tudo atualizado.', 400);
    }
    // Clique repetido enquanto o watcher ainda não processou o pedido — não
    // reescreve o marcador, só devolve o mesmo horário já registrado.
    if (triggeredAt) {
      return { triggeredAt };
    }

    const now = new Date().toISOString();
    await fs.writeFile(path.join(env.GIT_DIR, 'VECCHIO_UPDATE_REQUESTED'), now);
    triggeredAt = now;
    return { triggeredAt };
  },
};
