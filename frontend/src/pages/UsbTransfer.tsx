import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';
import {
  fetchUsbDrives,
  fetchUsbFolders,
  fetchUsbJob,
  startUsbCopy,
  type UsbCopyJob,
  type UsbDrive,
} from '../api/usb';

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const segments = path ? path.split('/') : [];
  return (
    <div className="flex flex-wrap items-center gap-1 text-lg text-slate-600">
      <button type="button" onClick={() => onNavigate('')} className="text-blue-600 hover:underline">
        Início
      </button>
      {segments.map((segment, index) => {
        const target = segments.slice(0, index + 1).join('/');
        return (
          <span key={target} className="flex items-center gap-1">
            <span className="text-slate-400">/</span>
            <button type="button" onClick={() => onNavigate(target)} className="text-blue-600 hover:underline">
              {segment}
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function UsbTransfer() {
  const [browsePath, setBrowsePath] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const [drives, setDrives] = useState<UsbDrive[]>([]);
  const [drivesMessage, setDrivesMessage] = useState<string | null>(null);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);

  const [job, setJob] = useState<UsbCopyJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reloadFolders = useCallback((path: string) => {
    fetchUsbFolders(path)
      .then((result) => {
        setBrowsePath(result.path);
        setFolders(result.folders);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const reloadDrives = useCallback(() => {
    fetchUsbDrives()
      .then((result) => {
        setDrives(result.drives);
        setDrivesMessage(result.message);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    reloadFolders('');
    reloadDrives();
  }, [reloadFolders, reloadDrives]);

  useEffect(() => {
    if (job && job.status === 'em_andamento') {
      pollRef.current = setInterval(() => {
        fetchUsbJob(job.id)
          .then(setJob)
          .catch((err) => setError(getErrorMessage(err)));
      }, 1000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [job]);

  async function handleCopy() {
    if (!selectedSource || !selectedDrive) return;
    setError(null);
    setStarting(true);
    try {
      const newJob = await startUsbCopy(selectedSource, selectedDrive);
      setJob(newJob);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  function handleReset() {
    setJob(null);
    setSelectedSource(null);
    setSelectedDrive(null);
    reloadFolders('');
    reloadDrives();
  }

  const progressPercent = job && job.totalFiles > 0 ? Math.round((job.copiedFiles / job.totalFiles) * 100) : 0;

  return (
    <section>
      <h1 className="mb-4 text-3xl font-bold text-slate-800">Pendrive</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-lg text-red-700">{error}</div>
      )}

      {job ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-800">
            {job.status === 'em_andamento' && 'Copiando…'}
            {job.status === 'concluido' && 'Cópia concluída!'}
            {job.status === 'erro' && 'Deu um erro na cópia'}
          </h2>

          {job.status !== 'erro' && (
            <div className="mt-4">
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${job.totalFiles > 0 ? progressPercent : job.status === 'concluido' ? 100 : 0}%` }}
                />
              </div>
              <p className="mt-2 text-lg text-slate-600">
                {job.copiedFiles} de {job.totalFiles || '?'} arquivo{job.totalFiles === 1 ? '' : 's'} copiado
                {job.copiedFiles === 1 ? '' : 's'}
              </p>
            </div>
          )}

          {job.status === 'erro' && <p className="mt-2 text-lg text-red-700">{job.message}</p>}

          {job.status !== 'em_andamento' && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700"
            >
              Fazer outra cópia
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-2xl font-semibold text-slate-800">1. Escolher pasta</h2>
            <Breadcrumb path={browsePath} onNavigate={reloadFolders} />
            <ul className="mt-3 flex flex-col gap-2">
              {folders.length === 0 && <li className="text-lg text-slate-400">Nenhuma subpasta aqui.</li>}
              {folders.map((folder) => {
                const childPath = browsePath ? `${browsePath}/${folder}` : folder;
                return (
                  <li key={folder} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => reloadFolders(childPath)}
                      className="text-lg text-blue-600 hover:underline"
                    >
                      📁 {folder}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSource(childPath)}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-base text-slate-700 hover:bg-slate-50"
                    >
                      Selecionar
                    </button>
                  </li>
                );
              })}
            </ul>
            {browsePath && (
              <button
                type="button"
                onClick={() => setSelectedSource(browsePath)}
                className="mt-3 rounded-lg border border-blue-300 px-3 py-2 text-base text-blue-700 hover:bg-blue-50"
              >
                Usar a pasta atual ("{browsePath}")
              </button>
            )}
            {selectedSource && (
              <p className="mt-3 rounded-lg bg-blue-50 p-2 text-base text-blue-700">
                Pasta escolhida: <strong>{selectedSource}</strong>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-800">2. Escolher pendrive</h2>
              <button type="button" onClick={reloadDrives} className="text-base text-blue-600 hover:underline">
                Atualizar
              </button>
            </div>
            {drivesMessage && <p className="text-lg text-slate-500">{drivesMessage}</p>}
            <ul className="flex flex-col gap-2">
              {drives.map((drive) => (
                <li key={drive.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDrive(drive.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-lg ${
                      selectedDrive === drive.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    💾 {drive.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <h2 className="mb-2 text-2xl font-semibold text-slate-800">3. Copiar</h2>
              <button
                type="button"
                disabled={!selectedSource || !selectedDrive || starting}
                onClick={handleCopy}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? 'Iniciando…' : 'Copiar pasta para o pendrive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
