import { useEffect, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getErrorMessage } from '../api/client';
import { fetchChatHistory, sendChatMessage, type ChatMessage } from '../api/chat';
import type { AgendaItem, AgendaCategory } from '../api/agenda';

interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  agendaItems: AgendaItem[];
}

const CATEGORY_COLORS: Record<AgendaCategory, string> = {
  consulta: '#2563eb',
  exame: '#7c3aed',
  conta: '#dc2626',
  remedio: '#16a34a',
  viagem: '#0891b2',
  outro: '#6b7280',
};

const CATEGORY_LABELS: Record<AgendaCategory, string> = {
  consulta: 'Consulta',
  exame: 'Exame',
  conta: 'Conta',
  remedio: 'Remédio',
  viagem: 'Viagem',
  outro: 'Outro',
};

// Card compacto pra representar um compromisso citado na resposta do chat —
// mesma paleta de categoria do calendário, pra ficar reconhecível de cara
// em vez de mais um bloco de texto.
function AgendaResultCard({ item }: { item: AgendaItem }) {
  const color = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.outro;
  const label = CATEGORY_LABELS[item.category] ?? item.category;
  const when = item.isAllDay
    ? format(new Date(item.startAt), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : format(new Date(item.startAt), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-800">{item.title}</span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-sm font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      </div>
      <p className="mt-1 text-base capitalize text-slate-600">{when}</p>
      {item.bill && (
        <p className="mt-1 text-base text-slate-600">
          R$ {item.bill.amount.toFixed(2).replace('.', ',')} · {item.bill.status === 'pago' ? 'paga' : 'pendente'}
        </p>
      )}
    </div>
  );
}

export function Chat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory()
      .then((history: ChatMessage[]) =>
        setMessages(history.map((m) => ({ id: m.id, role: m.role, content: m.content, agendaItems: m.agendaItems }))),
      )
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', content: question, agendaItems: [] }]);
    setSending(true);

    try {
      const { answer, agendaItems } = await sendChatMessage(question);
      setMessages((prev) => [...prev, { id: `local-${Date.now()}-reply`, role: 'model', content: answer, agendaItems }]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto flex h-[75vh] max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-4">
      <h1 className="mb-4 text-3xl font-bold text-slate-800">Chat</h1>

      <div className="flex-1 overflow-y-auto pr-1">
        {loading && <p className="text-lg text-slate-500">Carregando conversa…</p>}

        {!loading && messages.length === 0 && (
          <p className="text-lg text-slate-500">
            Pergunte, por exemplo: "Quais são meus próximos compromissos?" ou "Quanto tenho de conta esse mês?"
          </p>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-2">
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-lg ${
                  message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-slate-100 text-slate-800'
                }`}
              >
                {message.content}
              </div>
              {message.agendaItems.length > 0 && (
                <div className="mr-auto flex w-full max-w-[85%] flex-col gap-2">
                  {message.agendaItems.map((item) => (
                    <AgendaResultCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-3 text-lg text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
