interface PlaceholderPageProps {
  title: string;
  description: string;
}

// Usado pelos módulos que ainda serão construídos nas próximas fases do
// plano (agenda, contas, remédios, senhas, chat, pendrive). Mantém a
// navegação completa e testável desde já.
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
      <p className="mt-4 text-xl text-slate-600">{description}</p>
      <p className="mt-6 text-lg text-slate-400">Em construção — chega em uma próxima etapa.</p>
    </section>
  );
}
