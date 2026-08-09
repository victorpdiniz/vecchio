import { useEffect, useState } from 'react';
import { fetchPendingNotifications } from '../../api/notifications';
import type { AgendaItem } from '../../api/agenda';

function daysUntilLabel(startAt: string): string {
  const days = Math.ceil((new Date(startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

export function NotificationsBanner() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  // Dismiss só dura a sessão atual (não persiste) — ao recarregar a página o
  // lembrete volta a aparecer, como descrito no plano ("banner no próximo load").
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingNotifications()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const visibleItems = items.filter((item) => !dismissedIds.has(item.id));
  if (visibleItems.length === 0) return null;

  function dismiss(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      {visibleItems.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-lg text-blue-900"
        >
          <p>
            Lembrete: <strong>{item.title}</strong> {daysUntilLabel(item.startAt)}
            {item.location ? ` — ${item.location}` : ''}
          </p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="rounded-lg border border-blue-300 px-3 py-1 text-base font-medium text-blue-800 hover:bg-blue-100"
          >
            Ok, entendi
          </button>
        </div>
      ))}
    </div>
  );
}
