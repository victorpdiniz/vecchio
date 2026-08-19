import { useEffect, useState } from 'react';
import { fetchUpdateStatus, triggerUpdate, type UpdateStatus } from '../api/system';
import { getErrorMessage } from '../api/client';

const POLL_INTERVAL_MS = 60_000;

// Sempre visível (ao contrário do GoogleCalendarBanner) — o botão em si é a
// prova de que o recurso existe; escondê-lo quando não há nada a fazer
// deixava dúvida sobre se tinha sido implementado. Clicar quando já está
// atualizado força uma checagem na hora, em vez de esperar o próximo poll.
export function UpdateControl() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [busy, setBusy] = useState(false);

  function check() {
    return fetchUpdateStatus()
      .then(setStatus)
      .catch(() => undefined);
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleClick() {
    if (!status) return;

    if (!status.updateAvailable) {
      setBusy(true);
      await check();
      setBusy(false);
      return;
    }

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

  if (status.updateAvailable) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={status.checkError ?? undefined}
      className="rounded-lg border border-slate-300 px-4 py-2 text-lg font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {status.checkError ? 'Não foi possível checar atualizações' : 'Atualizado'}
    </button>
  );
}
