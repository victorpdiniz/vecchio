import { useEffect, useState } from 'react';
import {
  disconnectGoogleCalendar,
  fetchGoogleAuthUrl,
  fetchGoogleCalendarStatus,
  type GoogleCalendarStatus,
} from '../../api/googleCalendar';

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

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      setStatus((prev) => (prev ? { ...prev, connected: false } : prev));
    } finally {
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

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-lg text-slate-700">
        {status.connected
          ? 'Conectado ao Google Agenda — os compromissos da família aparecem na sua agenda "Vecchio — Família".'
          : 'Sincronize os compromissos da família com sua Google Agenda pessoal.'}
      </p>
      <button
        type="button"
        onClick={status.connected ? handleDisconnect : handleConnect}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status.connected ? 'Desconectar' : 'Conectar Google Agenda'}
      </button>
    </div>
  );
}
