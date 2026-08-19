import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../lib/env.js';
import { AppError } from '../../lib/errors.js';

const execFileAsync = promisify(execFile);

// Marca que o usuário apertou "Atualizar" — só na memória do processo, não
// em disco: sobrevive a recarregar a página ou trocar de aparelho (é estado
// do servidor, não do navegador). Normalmente some assim que o processo
// reinicia — o momento em que a atualização foi de fato aplicada — mas isso
// sozinho deixava o botão preso em "Atualizando…" pra sempre se o watcher do
// host (scripts/vecchio-update-watcher.sh) nunca rodasse ou falhasse (branch
// errada, merge não fast-forward, containers não reiniciando): daí o timeout
// abaixo, que garante que o botão sempre se destrava em alguns minutos.
let triggeredAt: string | null = null;
const TRIGGER_TIMEOUT_MS = 5 * 60_000;

const STATUS_FILE = 'VECCHIO_UPDATE_STATUS';

interface LastUpdateResult {
  state: 'ok' | 'error';
  message: string;
  at: string;
}

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['--git-dir', env.GIT_DIR, ...args]);
  return stdout.trim();
}

// Lê o resultado que o watcher do host escreveu após processar o último
// pedido de atualização (sucesso ou falha) — best-effort, igual ao resto
// deste módulo: se o arquivo não existir ou vier corrompido, não derruba a
// rota, só reporta "sem resultado ainda".
async function readLastUpdateResult(): Promise<LastUpdateResult | null> {
  try {
    const raw = await fs.readFile(path.join(env.GIT_DIR, STATUS_FILE), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LastUpdateResult>;
    if (parsed.state !== 'ok' && parsed.state !== 'error') return null;
    return { state: parsed.state, message: parsed.message ?? '', at: parsed.at ?? new Date(0).toISOString() };
  } catch {
    return null;
  }
}

export interface UpdateStatus {
  updateAvailable: boolean;
  currentCommit: string | null;
  remoteCommit: string | null;
  commitsBehind: number;
  remoteSummary: string | null;
  triggeredAt: string | null;
  checkError: string | null;
  lastUpdateResult: LastUpdateResult | null;
}

export const systemService = {
  // Só checa e reporta — quem de fato baixa e reinicia é o watcher do host
  // (scripts/vecchio-update-watcher.sh), acionado pelo marcador que
  // requestUpdate() escreve dentro do próprio .git. O container nunca tem
  // acesso ao socket do Docker (ver docs/self-update-setup.md).
  async getStatus(): Promise<UpdateStatus> {
    const lastUpdateResult = await readLastUpdateResult();

    // Se o watcher já terminou de processar o pedido (registrou um
    // resultado mais novo que o triggeredAt atual), a tentativa acabou — de
    // um jeito ou de outro — então destrava o botão mesmo sem o processo ter
    // reiniciado (ex: falha reportada, ou sucesso mas o restart do container
    // demorou a derrubar este processo).
    if (triggeredAt && lastUpdateResult && new Date(lastUpdateResult.at).getTime() >= new Date(triggeredAt).getTime()) {
      triggeredAt = null;
    }
    // Trava de segurança independente: nunca deixa o botão preso além do
    // timeout, mesmo se o watcher nunca tiver rodado (cron não instalado
    // nesta máquina, por exemplo).
    if (triggeredAt && Date.now() - new Date(triggeredAt).getTime() > TRIGGER_TIMEOUT_MS) {
      triggeredAt = null;
    }

    try {
      await git('fetch', 'origin', env.UPDATE_BRANCH);

      const currentCommit = await git('rev-parse', 'HEAD');
      const remoteCommit = await git('rev-parse', `origin/${env.UPDATE_BRANCH}`);
      const updateAvailable = currentCommit !== remoteCommit;

      const commitsBehind = updateAvailable
        ? Number(await git('rev-list', '--count', `HEAD..origin/${env.UPDATE_BRANCH}`)) || 0
        : 0;
      const remoteSummary = updateAvailable ? await git('log', '-1', '--format=%s', `origin/${env.UPDATE_BRANCH}`) : null;

      return {
        updateAvailable,
        currentCommit,
        remoteCommit,
        commitsBehind,
        remoteSummary,
        triggeredAt,
        checkError: null,
        lastUpdateResult,
      };
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
        lastUpdateResult,
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
