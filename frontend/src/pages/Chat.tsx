import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getErrorMessage } from '../api/client';
import { fetchChatHistory, sendChatMessage, type ChatMessage } from '../api/chat';

interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
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
      .then((history: ChatMessage[]) => setMessages(history.map((m) => ({ id: m.id, role: m.role, content: m.content }))))
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
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', content: question }]);
    setSending(true);

    try {
      const answer = await sendChatMessage(question);
      setMessages((prev) => [...prev, { id: `local-${Date.now()}-reply`, role: 'model', content: answer }]);
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
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-lg ${
                message.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'mr-auto bg-slate-100 text-slate-800'
              }`}
            >
              {message.content}
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
