import { useMemo } from 'react';
import {
  addDays,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AgendaItem } from '../../api/agenda';

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function buildMonthGrid(year: number, monthIndex: number) {
  const first = startOfMonth(new Date(year, monthIndex, 1));
  const last = endOfMonth(first);
  const days: Date[] = [];
  let cursor = startOfWeek(first);
  while (cursor <= last || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 42) break;
  }
  return { first, days };
}

interface YearViewProps {
  year: number;
  items: AgendaItem[];
  onSelectMonth: (monthIndex: number) => void;
  onSelectDay: (date: Date) => void;
}

export function YearView({ year, items, onSelectMonth, onSelectDay }: YearViewProps) {
  const daysWithEvents = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const start = startOfDay(new Date(item.startAt));
      const end = item.endAt ? startOfDay(new Date(item.endAt)) : start;
      for (let day = start; day <= end; day = addDays(day, 1)) {
        set.add(format(day, 'yyyy-MM-dd'));
      }
    });
    return set;
  }, [items]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: 12 }).map((_, monthIndex) => {
        const { first, days } = buildMonthGrid(year, monthIndex);
        return (
          <div key={monthIndex} className="rounded-xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => onSelectMonth(monthIndex)}
              className="mb-2 text-lg font-semibold capitalize text-slate-800 hover:text-blue-600"
            >
              {format(first, 'MMMM', { locale: ptBR })}
            </button>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const inMonth = isSameMonth(day, first);
                const key = format(day, 'yyyy-MM-dd');
                const hasEvent = daysWithEvents.has(key);
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => onSelectDay(day)}
                    className={`relative rounded py-1 text-xs ${
                      inMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300'
                    } ${isToday(day) ? 'font-bold text-blue-600' : ''}`}
                  >
                    {format(day, 'd')}
                    {hasEvent && (
                      <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
