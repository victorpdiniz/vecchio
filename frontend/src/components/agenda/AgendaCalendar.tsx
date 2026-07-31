import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { AgendaItem } from '../../api/agenda';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const messages = {
  today: 'Hoje',
  previous: 'Anterior',
  next: 'Próximo',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Lista',
  date: 'Data',
  time: 'Hora',
  event: 'Compromisso',
  noEventsInRange: 'Nenhum compromisso neste período.',
  showMore: (total: number) => `+${total} mais`,
};

const CATEGORY_COLORS: Record<string, string> = {
  consulta: '#2563eb',
  conta: '#dc2626',
  remedio: '#16a34a',
  outro: '#6b7280',
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AgendaItem;
}

export type CalendarView = 'month' | 'week' | 'day';

interface AgendaCalendarProps {
  items: AgendaItem[];
  view: CalendarView;
  date: Date;
  onNavigate: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onSelectEvent: (item: AgendaItem) => void;
  onSelectSlot: (start: Date) => void;
}

export function AgendaCalendar({
  items,
  view,
  date,
  onNavigate,
  onViewChange,
  onSelectEvent,
  onSelectSlot,
}: AgendaCalendarProps) {
  const events: CalendarEvent[] = items.map((item) => {
    const start = new Date(item.startAt);
    const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    return { id: item.id, title: item.title, start, end, resource: item };
  });

  return (
    <div style={{ height: '70vh' }}>
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        messages={messages}
        events={events}
        view={view}
        date={date}
        onNavigate={onNavigate}
        onView={(nextView) => onViewChange(nextView as CalendarView)}
        views={['month', 'week', 'day']}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        selectable
        onSelectSlot={(slotInfo) => onSelectSlot(slotInfo.start)}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: CATEGORY_COLORS[event.resource.category] ?? '#6b7280',
            borderRadius: 6,
            border: 'none',
          },
        })}
        popup
      />
    </div>
  );
}
