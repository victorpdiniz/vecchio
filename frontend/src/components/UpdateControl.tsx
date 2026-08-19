import { useEffect, useState } from 'react';
import { fetchUpdateStatus, triggerUpdate, type UpdateStatus } from '../api/system';
import { getErrorMessage } from '../api/client';

const POLL_INTERVAL_MS = 60_000;

// Só aparece quando há algo a fazer (atualização disponível) ou em
// andamento — igual ao GoogleCalendarBanner, fica invisível no caso comum
// (já atualizado) para não poluir o cabeçalho.
export function UpdateControl() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function check() {
      fetchUpdateStatus()
        .then((data) => {
          if (!cancelled) setStatus(data);
        })
        .catch(() => undefined);
    }
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleClick() {
    if (!status?.updateAvailable) return;
    const confirmed = window.confirm(
      `Atualizar o Vecchio agora?${status.remoteSummary ? `\n\nÚltima mudança: ${status.remoteSummary}` : ''}\n\nO app fica indisponível por alguns segundos enquanto reinicia.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const { triggeredAt } = await triggerUpdate();
      setStatus((prev) => (prev ? { ...prev, triggeredAt } : prev));
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  if (status.triggeredAt) {
    return (
      <button
        type="button"
        disabled
        className="rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-lg font-medium text-white opacity-75"
      >
        Atualizando…
      </button>
    );
  }

  if (!status.updateAvailable) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      Atualização disponível
    </button>
  );
}
