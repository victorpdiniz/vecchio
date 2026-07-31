import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
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

type ModalState = { mode: 'create'; defaultStart: Date } | { mode: 'edit'; item: AgendaItem } | null;

export function Agenda() {
  const { currentProfile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<TopView>('month');
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
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
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
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-lg text-blue-700">{googleNotice}</div>
      )}

      {currentProfile.role === 'admin' && <GoogleCalendarBanner />}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-lg text-slate-700">
        Total em contas neste mês: <strong>R$ {summary.total.toFixed(2).replace('.', ',')}</strong>{' '}
        <span className="text-slate-400">
          ({summary.count} conta{summary.count === 1 ? '' : 's'})
        </span>
      </div>

      <div className="mb-4 flex gap-2">
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

      {loading && <p className="mb-2 text-lg text-slate-500">Carregando…</p>}

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

      {modalState && (
        <AgendaItemModal
          mode={modalState.mode}
          item={modalState.mode === 'edit' ? modalState.item : undefined}
          defaultStart={modalState.mode === 'create' ? modalState.defaultStart : undefined}
          currentProfile={currentProfile}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
