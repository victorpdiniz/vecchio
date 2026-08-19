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
  allDay: 'Dia inteiro',
  noEventsInRange: 'Nenhum compromisso neste período.',
  showMore: (total: number) => `+${total} mais`,
};

const CATEGORY_COLORS: Record<string, string> = {
  consulta: '#2563eb',
  exame: '#7c3aed',
  conta: '#dc2626',
  remedio: '#16a34a',
  viagem: '#0891b2',
  outro: '#6b7280',
};

// A Agenda.tsx já mostra seu próprio controle Hoje/Anterior/Próximo,
// centralizado e compartilhado com a view de ano — a barra de ferramentas
// nativa do react-big-calendar fica escondida para não duplicar a navegação.
function HiddenToolbar() {
  return null;
}

function formatTime(date: Date): string {
  return format(date, 'HH:mm', { locale: ptBR });
}

function formatShortDate(date: Date): string {
  return format(date, 'dd/MM', { locale: ptBR });
}

const calendarFormats = {
  timeGutterFormat: (date: Date) => formatTime(date),
  eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => `${formatTime(start)} – ${formatTime(end)}`,
  eventTimeRangeStartFormat: ({ start }: { start: Date }) => `${formatTime(start)} – `,
  eventTimeRangeEndFormat: ({ end }: { end: Date }) => `– ${formatTime(end)}`,
  agendaTimeFormat: (date: Date) => formatTime(date),
  agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => `${formatTime(start)} – ${formatTime(end)}`,
  selectRangeFormat: ({ start, end }: { start: Date; end: Date }) => `${formatTime(start)} – ${formatTime(end)}`,
  // A biblioteca usa tokens fixos tipo 'MMM dd' (mês antes do dia) nesses
  // três formatos — sempre na ordem americana, mesmo com culture pt-BR.
  dayHeaderFormat: (date: Date) => format(date, 'cccc, dd/MM', { locale: ptBR }),
  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => `${formatShortDate(start)} – ${formatShortDate(end)}`,
  agendaDateFormat: (date: Date) => format(date, 'ccc, dd/MM', { locale: ptBR }),
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
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
    return { id: item.id, title: item.title, start, end, allDay: item.isAllDay, resource: item };
  });

  return (
    <div className="h-full">
      <Calendar
        localizer={localizer}
        culture="pt-BR"
        messages={messages}
        formats={calendarFormats}
        events={events}
        view={view}
        date={date}
        onNavigate={onNavigate}
        onView={(nextView) => onViewChange(nextView as CalendarView)}
        views={['month', 'week', 'day']}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        selectable
        onSelectSlot={(slotInfo) => onSelectSlot(slotInfo.start)}
        showMultiDayTimes
        components={{ toolbar: HiddenToolbar }}
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
