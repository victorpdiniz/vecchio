import { useEffect, useState } from 'react';
import { fetchPendingNotifications, type PendingMedicineDose } from '../../api/notifications';
import type { AgendaItem } from '../../api/agenda';

function daysUntilLabel(startAt: string): string {
  const days = Math.ceil((new Date(startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

function doseLabel(dose: PendingMedicineDose): string {
  const kind = dose.notifications[0]?.kind ?? 'upcoming';
  return kind === 'upcoming'
    ? `Hora de tomar ${dose.medicine.name} (${dose.timeOfDay})`
    : `${dose.medicine.name} ainda não foi marcado como tomado (${dose.timeOfDay})`;
}

export function NotificationsBanner() {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [medicineDoses, setMedicineDoses] = useState<PendingMedicineDose[]>([]);
  // Dismiss só dura a sessão atual (não persiste) — ao recarregar a página o
  // lembrete volta a aparecer, como descrito no plano ("banner no próximo load").
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingNotifications()
      .then(({ agendaItems, medicineDoses }) => {
        setAgendaItems(agendaItems);
        setMedicineDoses(medicineDoses);
      })
      .catch(() => {
        setAgendaItems([]);
        setMedicineDoses([]);
      });
  }, []);

  const visibleAgendaItems = agendaItems.filter((item) => !dismissedIds.has(`agenda-${item.id}`));
  const visibleDoses = medicineDoses.filter((dose) => !dismissedIds.has(`dose-${dose.id}`));
  if (visibleAgendaItems.length === 0 && visibleDoses.length === 0) return null;

  function dismiss(key: string) {
    setDismissedIds((prev) => new Set(prev).add(key));
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      {visibleAgendaItems.map((item) => (
        <div
          key={`agenda-${item.id}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-lg text-blue-900"
        >
          <p>
            Lembrete: <strong>{item.title}</strong> {daysUntilLabel(item.startAt)}
          </p>
          <button
            type="button"
            onClick={() => dismiss(`agenda-${item.id}`)}
            className="rounded-lg border border-blue-300 px-3 py-1 text-base font-medium text-blue-800 hover:bg-blue-100"
          >
            Ok, entendi
          </button>
        </div>
      ))}
      {visibleDoses.map((dose) => (
        <div
          key={`dose-${dose.id}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-lg text-green-900"
        >
          <p>{doseLabel(dose)}</p>
          <button
            type="button"
            onClick={() => dismiss(`dose-${dose.id}`)}
            className="rounded-lg border border-green-300 px-3 py-1 text-base font-medium text-green-800 hover:bg-green-100"
          >
            Ok, entendi
          </button>
        </div>
      ))}
    </div>
  );
}
