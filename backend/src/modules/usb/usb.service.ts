import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../lib/env.js';
import { AppError, NotFoundError } from '../../lib/errors.js';

const BASE_DIR = path.resolve(env.USB_BASE_DIR);
const DRIVES_DIR = path.resolve(env.USB_DRIVES_DIR);

// Garante que o caminho resolvido (já com `..` etc. processados) continua
// dentro do diretório permitido — sem isso, um `path` como "../../etc"
// vindo da API escaparia da pasta base (path traversal).
function resolveWithinBase(base: string, relativePath: string): string {
  const target = path.resolve(base, relativePath || '.');
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new AppError('Caminho inválido.', 400);
  }
  return target;
}

async function listSubfolders(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

async function countFiles(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await countFiles(full);
    } else if (entry.isFile()) {
      total += 1;
    }
  }
  return total;
}

async function copyRecursive(src: string, dest: string, onFileCopied: () => void) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath, onFileCopied);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
      onFileCopied();
    }
  }
}

interface CopyJob {
  id: string;
  status: 'em_andamento' | 'concluido' | 'erro';
  totalFiles: number;
  copiedFiles: number;
  message: string | null;
}

// Estado dos jobs de cópia em memória — some se o processo reiniciar, o
// que é aceitável aqui: são cópias locais e rápidas, sem necessidade de
// sobreviver a um restart do backend (diferente de Bill/AgendaItem, que
// são registros permanentes).
const jobs = new Map<string, CopyJob>();

export const usbService = {
  async listFolders(relativePath: string) {
    const target = resolveWithinBase(BASE_DIR, relativePath);
    const folders = await listSubfolders(target);
    return { path: path.relative(BASE_DIR, target), folders };
  },

  async listDrives() {
    const names = await listSubfolders(DRIVES_DIR);
    return {
      drives: names.map((name) => ({ id: name, name })),
      message: names.length === 0 ? 'Nenhum pendrive detectado. Conecte um pendrive e tente novamente.' : null,
    };
  },

  async startCopy(sourceRelativePath: string, driveId: string, destinationRelativePath: string) {
    const sourceDir = resolveWithinBase(BASE_DIR, sourceRelativePath);
    const sourceStat = await fs.stat(sourceDir).catch(() => null);
    if (!sourceStat?.isDirectory()) {
      throw new AppError('Pasta de origem não encontrada.', 400);
    }

    const driveRoot = resolveWithinBase(DRIVES_DIR, driveId);
    const driveStat = await fs.stat(driveRoot).catch(() => null);
    if (!driveStat?.isDirectory()) {
      throw new AppError('Pendrive não encontrado. Verifique se ele ainda está conectado.', 400);
    }

    const destinationDir = resolveWithinBase(driveRoot, destinationRelativePath || path.basename(sourceDir));

    const job: CopyJob = { id: randomUUID(), status: 'em_andamento', totalFiles: 0, copiedFiles: 0, message: null };
    jobs.set(job.id, job);

    // Cópia roda em segundo plano; o front acompanha via polling em
    // GET /api/usb/jobs/:id, sem precisar segurar a conexão HTTP aberta
    // (útil pra pastas grandes, sem timeout no request original).
    void (async () => {
      try {
        job.totalFiles = await countFiles(sourceDir);
        await copyRecursive(sourceDir, destinationDir, () => {
          job.copiedFiles += 1;
        });
        job.status = 'concluido';
      } catch (err) {
        job.status = 'erro';
        job.message = err instanceof Error ? err.message : 'Erro desconhecido ao copiar.';
      }
    })();

    return job;
  },

  getJob(id: string) {
    const job = jobs.get(id);
    if (!job) {
      throw new NotFoundError('Cópia não encontrada.');
    }
    return job;
  },
};
