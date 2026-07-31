import path from 'node:path';

// Baseado em process.cwd() (não em __dirname) porque o processo sempre
// roda com a raiz de backend/ como diretório de trabalho — tanto local
// (`cd backend && npm run dev`) quanto no Docker (WORKDIR /app == backend/).
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
