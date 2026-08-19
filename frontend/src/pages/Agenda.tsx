import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProfile } from '../context/ProfileContext';
import { AgendaCalendar, type CalendarView } from '../components/agenda/AgendaCalendar';
import { YearView } from '../components/agenda/YearView';
import { AgendaItemModal } from '../components/agenda/AgendaItemModal';
import { GoogleCalendarBanner } from '../components/agenda/GoogleCalendarBanner';
import { fetchAgendaItems, fetchAgendaSummary, type AgendaItem } from '../api/agenda';

type TopView = 'month' | 'week' | 'day' | 'year';

const VIEW_LABELS: Record<TopView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  year: 'Ano',
};

function getRange(view: TopView, date: Date) {
  switch (view) {
    case 'month':
      return { from: startOfWeek(startOfMonth(date)), to: endOfWeek(endOfMonth(date)) };
    case 'week':
      return { from: startOfWeek(date), to: endOfWeek(date) };
    case 'day':
      return { from: startOfDay(date), to: endOfDay(date) };
    case 'year':
      return { from: startOfYear(date), to: endOfYear(date) };
  }
}

function shiftDate(view: TopView, date: Date, direction: 1 | -1): Date {
  switch (view) {
    case 'month':
      return addMonths(date, direction);
    case 'week':
      return addWeeks(date, direction);
    case 'day':
      return addDays(date, direction);
    case 'year':
      return addYears(date, direction);
  }
}

function periodLabel(view: TopView, date: Date): string {
  switch (view) {
    case 'month':
      return format(date, 'MMMM yyyy', { locale: ptBR });
    case 'week': {
      const { from, to } = getRange('week', date);
      return `${format(from, 'dd/MM')} – ${format(to, 'dd/MM/yyyy')}`;
    }
    case 'day':
      return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
    case 'year':
      return format(date, 'yyyy');
  }
}

type ModalState = { mode: 'create'; defaultStart: Date } | { mode: 'edit'; item: AgendaItem } | null;

export function Agenda() {
  const { currentProfile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<TopView>('week');
  const [date, setDate] = useState(new Date());
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    const { from, to } = getRange(view, date);
    fetchAgendaItems(from, to)
      .then(setItems)
      .finally(() => setLoading(false));

    fetchAgendaSummary(startOfMonth(date), endOfMonth(date)).then(setSummary);
  }, [view, date]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const google = searchParams.get('google');
    if (google === 'conectado') {
      setGoogleNotice('Google Agenda conectado com sucesso!');
    } else if (google === 'erro') {
      setGoogleNotice('Não foi possível conectar ao Google Agenda. Tente novamente.');
    }
    if (google) {
      searchParams.delete('google');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function handleSaved() {
    setModalState(null);
    reload();
  }

  function openCreateModal(start?: Date) {
    setModalState({ mode: 'create', defaultStart: start ?? new Date() });
  }

  if (!currentProfile) return null;

  return (
    <section className="flex h-[calc(100vh-170px)] min-h-[500px] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700"
        >
          + Novo compromisso
        </button>
      </div>

      {googleNotice && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-lg text-blue-700">{googleNotice}</div>
      )}

      {currentProfile.role === 'admin' && <GoogleCalendarBanner />}

      <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-lg text-slate-700">
        Total em contas neste mês: <strong>R$ {summary.total.toFixed(2).replace('.', ',')}</strong>{' '}
        <span className="text-slate-400">
          ({summary.count} conta{summary.count === 1 ? '' : 's'})
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        {(Object.keys(VIEW_LABELS) as TopView[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-lg px-4 py-2 text-lg font-medium ${
              view === key ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {VIEW_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDate((current) => shiftDate(view, current, -1))}
            className="rounded-lg bg-white px-3 py-2 text-lg text-slate-700 hover:bg-slate-100"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => setDate(new Date())}
            className="rounded-lg bg-white px-3 py-2 text-lg text-slate-700 hover:bg-slate-100"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setDate((current) => shiftDate(view, current, 1))}
            className="rounded-lg bg-white px-3 py-2 text-lg text-slate-700 hover:bg-slate-100"
          >
            Próximo →
          </button>
        </div>
        <span className="text-xl font-medium capitalize text-slate-800">{periodLabel(view, date)}</span>
      </div>

      {loading && <p className="mb-2 text-lg text-slate-500">Carregando…</p>}

      <div className="min-h-0 flex-1">
        {view === 'year' ? (
          <YearView
            year={date.getFullYear()}
            items={items}
            onSelectMonth={(monthIndex) => {
              setDate(new Date(date.getFullYear(), monthIndex, 1));
              setView('month');
            }}
            onSelectDay={(day) => {
              setDate(day);
              setView('day');
            }}
          />
        ) : (
          <AgendaCalendar
            items={items}
            view={view}
            date={date}
            onNavigate={setDate}
            onViewChange={(nextView: CalendarView) => setView(nextView)}
            onSelectEvent={(item) => setModalState({ mode: 'edit', item })}
            onSelectSlot={(start) => openCreateModal(start)}
          />
        )}
      </div>

      {modalState && (
        <AgendaItemModal
          mode={modalState.mode}
          item={modalState.mode === 'edit' ? modalState.item : undefined}
          defaultStart={modalState.mode === 'create' ? modalState.defaultStart : undefined}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
