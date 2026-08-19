import { useEffect, useState } from 'react';
import { fetchGoogleAuthUrl, fetchGoogleCalendarStatus, type GoogleCalendarStatus } from '../../api/googleCalendar';

export function GoogleCalendarBanner() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchGoogleCalendarStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false }));
  }, []);

  async function handleConnect() {
    setBusy(true);
    try {
      const url = await fetchGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setBusy(false);
    }
  }

  if (!status) return null;

  if (!status.configured) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-lg text-amber-800">
        A integração com o Google Agenda ainda não foi configurada. Veja{' '}
        <code className="rounded bg-amber-100 px-1">docs/google-calendar-setup.md</code>.
      </div>
    );
  }

  // Conectado e funcionando não precisa de aviso nenhum — só mostramos algo
  // aqui quando é preciso agir (conectar pela primeira vez ou reconectar).
  if (status.connected) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-lg text-slate-700">Sincronize os compromissos da família com sua Google Agenda pessoal.</p>
      <button
        type="button"
        onClick={handleConnect}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Conectar Google Agenda
      </button>
    </div>
  );
}
