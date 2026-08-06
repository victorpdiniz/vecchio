# Vecchio — Family Management System for Grandparents

> Plano de implementação aprovado no início do projeto. Mantido em inglês
> (como foi escrito originalmente); o produto em si é 100% em português.
> Atualizado conforme cada fase é concluída — ver checkboxes em
> "Build Phases" abaixo.

## Context

The user's grandparents struggle to keep track of monthly/yearly bills, don't have a
single place to look up their passwords, and rely on the user (their grandson) to
physically visit and pay bills for them. The user wants one unified system —
**Vecchio** — that consolidates: bill/debit tracking, a password reference list, a
shared family calendar/agenda (appointments, medicines, bill due dates), a
data-aware chat assistant, PDF bill viewing, and an interactive "move folder to USB"
utility. Everything must be in Brazilian Portuguese, usable by non-technical elderly
users, and requires no login/authentication — just a profile picker, since only the
family uses the machine. The project starts as a local web app (Docker for dev) and
is explicitly meant to evolve into an installable Windows desktop app later.

**Decisions locked in during clarification with the user:**
- **Remote access = both**: (1) a remote-desktop tool (not built into Vecchio) so
  the grandson can view/control the grandparents' PC from anywhere, plus (2) an
  elderly-friendly, large-button/keyboard-navigable UI inside Vecchio itself so a
  simple clicker/remote can drive it.
- **Chat is data-aware**: Gemini answers are grounded in the profile's own Vecchio
  records (bills, agenda, medicines), not a generic chatbot.
- **Admin = the grandson.** Four profiles total: Avô, Avó, Pai, Admin (grandson).
  Admin additionally sees a private semester agenda (class/work) not shared with
  the others.
- **Notifications = in-app + email to everyone**: reminders show as in-app banners
  to all profiles, and emails go to every registered profile email (grandparents,
  father, admin), not just the admin.

## Architecture Overview

**Stack (as requested by user):** TypeScript everywhere. Backend: Node.js +
Fastify + Prisma ORM + SQLite + Zod (fail-fast validation on every route).
Frontend: React + Vite + React Router + Axios + Tailwind CSS. Chat: Google
Generative AI (Gemini) SDK. Dev environment: Docker Compose. Version control:
GitHub, with `dev`/`frontend`/`backend` branch conventions and Conventional
Commits.

**Pattern: MVC, no auth.**
- **Model** — Prisma schema + a thin repository layer per domain (`*.repository.ts`).
- **Controller** — Fastify route handlers per domain (`*.controller.ts`), each
  route validates `body`/`params`/`query` with a Zod schema before touching the
  service layer (fail fast → 400 with a Portuguese error message).
- **Service** — business logic (`*.service.ts`): due-date recurrence, notification
  scheduling, PDF-to-bill linking, Gemini prompt assembly. Controllers stay thin.
- No session/auth middleware. Instead, a lightweight `x-profile-id` header (set
  once when the user picks their profile card on launch, persisted in
  `localStorage`) scopes requests that need "who is asking" (personal admin
  agenda, notification email targets). This is identity for personalization, not
  security — matches the "only they're accessing" requirement.
- SQLite doesn't support native Prisma enums, so all "enum-like" fields
  (profile role, agenda category, bill status, etc.) are plain `String` in
  `schema.prisma`, with the valid values fixed as TS constants in
  `backend/src/lib/enums.ts` and enforced by each module's Zod schema.

**Why Electron for the eventual Windows app:** the whole stack is already
Node/TypeScript/React, so Electron reuses the same codebase with no new language
(Tauri would require Rust). It also gives native filesystem/USB access for the
folder-transfer feature without browser sandboxing — noted now so early
decisions (e.g., keeping filesystem logic in the backend, not the browser) stay
compatible with that future packaging step. Not built in the first phases.

## Data Model (Prisma schema sketch)

- `Profile` — id, name, role (`avo` | `avo_f` | `pai` | `admin`), email,
  colorTag, avatarIcon.
- `AgendaItem` — id, title, description, category (`consulta` | `conta` |
  `outro`), date/time, ownerProfileId (nullable = shared/family-wide),
  isPrivate (true only for admin's semester items), reminderDaysBefore
  (default 3 for `consulta`), linked billId (nullable).
- `Medicine` — id, name, dosage, profileId (or null = shared), notes,
  startDate, endDate (nullable).
- `MedicineSchedule` — id, medicineId, timeOfDay (HH:mm), daysOfWeek.
- `Bill` (debit) — id, description, amount, dueDate, category, isRecurring,
  recurrenceRule (monthly), status (`pendente`|`pago`), payerProfileId,
  paidAt, attachmentId (nullable), createdBy.
- `Attachment` — id, billId, filename, storagePath, uploadedBy, uploadedAt.
- `Password` (vault) — id, siteName, url, username, passwordEncrypted (AES,
  key from env — encrypted at rest even without app-level auth, since this is
  a credential store), notes.
- `NotificationLog` — id, agendaItemId, channel (`inapp`|`email`), sentTo,
  sentAt — prevents duplicate reminder sends.
- `ChatMessage` — id, profileId, role (`user`|`model`), content, createdAt —
  per-profile chat history for context continuity.

## Feature Modules

1. **Profile picker** (landing page) — 4 big cards, no password, sets
   `x-profile-id`, remembers last profile per browser.
2. **Agenda/Calendar** — shared month/week/day view (all profiles see the same
   family events, except admin's private semester items); create/edit/delete
   appointments; doctor appointments trigger the 3-day-before reminder.
3. **Notifications** — a scheduled job (e.g., `node-cron` inside the Fastify
   process) scans upcoming `AgendaItem`s daily, writes `NotificationLog`
   entries, shows an in-app banner on next load for all profiles, and sends
   email via SMTP/nodemailer to every profile's registered email.
4. **Medicines** — CRUD medicines + daily times; dashboard "hoje" widget shows
   what to take now; in-app reminder banner at scheduled times (email optional
   toggle, off by default to avoid inbox spam for routine daily doses).
5. **Debits/Bills (Contas)** — the core problem: monthly/yearly ledger, mark
   paid/pending, recurring templates (e.g. "Luz" every month), category
   breakdown, monthly and yearly summary totals, each bill auto-appears on the
   agenda at its due date.
6. **PDF bill viewer** — admin uploads a PDF (boleto/fatura) from anywhere;
   backend stores it under `backend/uploads` and links it to a `Bill` record
   (amount, due date, description entered by admin at upload time, since
   automatic PDF parsing is unreliable and out of scope for v1); grandparents
   see a large, simplified card (valor, vencimento, descrição) with a "ver
   PDF" button.
7. **Password vault** — shared list (all 4 profiles can view/copy), populated
   by admin, values encrypted at rest, simple search by site name.
8. **USB folder transfer** — backend lists local folders (scoped to an
   allow-listed base directory, e.g. the user's Documents) and detected
   removable drives (via a small Node helper); frontend gives a simple
   two-pane "escolher pasta → escolher pendrive → copiar" flow with progress
   feedback. Runs against the host filesystem, so in dev this container needs
   a bind-mount of the host paths; it becomes trivial once packaged as a
   native Electron app later.
9. **Chat assistant (Gemini)** — per-profile chat screen; service layer
   fetches that profile's relevant `Bill`/`AgendaItem`/`Medicine` rows
   (e.g. "this month" + "next 30 days"), assembles a Portuguese system prompt
   with that context, calls Gemini, stores the exchange in `ChatMessage`.
10. **Admin's personal agenda** — semester view (class/work blocks) stored as
    private `AgendaItem`s scoped to the admin profile; visible only when
    logged in as admin, not shown to the other three.
11. **Accessibility / "modo simples"** — large fonts, high-contrast theme
    toggle, full keyboard navigation (arrow keys + Enter) throughout so a
    cheap Bluetooth/IR presenter clicker (which emulates arrow-key/Enter
    keypresses) drives the app with zero extra software.
12. **Remote-desktop access (operational, not code)** — set up a tool like
    RustDesk (free, no port-forwarding, unattended access) on the
    grandparents' PC so the grandson can view/control the screen remotely;
    documented as a setup runbook, not part of the Vecchio codebase.

## Project Structure (monorepo)

```
vecchio/
  backend/
    src/
      lib/            (env.ts, prisma.ts, errors.ts, enums.ts)
      plugins/         (errorHandler.ts, profileContext.ts)
      modules/
        profiles/       (controller, service, repository, schema.ts) — done
        agenda/
        bills/
        medicines/
        passwords/
        usb/
        chat/
        notifications/
      prisma/
        schema.prisma
        seed.ts
      app.ts            (Fastify instance, plugin registration)
      server.ts          (entrypoint)
    uploads/            (PDFs enviados — persistido pelo bind mount do Docker)
    Dockerfile
  frontend/
    src/
      pages/            (ProfilePicker, Dashboard, PlaceholderPage — demais chegam por fase)
      components/       (AppLayout, RequireProfile)
      api/               (client.ts, profiles.ts — um arquivo por módulo)
      context/           (ProfileContext)
    Dockerfile
  docker-compose.yml
  docs/
    plano.md            (este arquivo)
    remote-access-setup.md   (a escrever na fase 9)
  README.md
```

## Git / GitHub Workflow

- `git init` in `vecchio/`, create a new GitHub repo (private, name `vecchio`).
- Branches: `main` (stable) ← `dev` (integration) ← `backend/*` and
  `frontend/*` short-lived feature branches per module (e.g.
  `backend/bills-module`, `frontend/agenda-page`).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`), each PR merges
  into `dev`; periodic `dev` → `main` merges are the deploy points.

## Docker (dev only)

`docker-compose.yml` with two services: `backend` (Fastify + Prisma, SQLite
file persisted via the `./backend:/app` bind mount) and `frontend` (Vite dev
server with HMR). No separate DB container needed since SQLite is file-based.
Production/real deployment is explicitly out of Docker per the user's request
— it becomes the packaged Windows app in a later phase.

## Build Phases (suggested order)

- [x] **0. Scaffold** — monorepo, Docker Compose, Prisma schema for all
      entities above, Fastify app skeleton with health check + profiles
      module, Vite+Tailwind frontend skeleton, Profile picker page, routing
      shell with placeholder pages for every future module. First commit +
      branches (`main`, `dev`, `backend/scaffold`, `frontend/scaffold`).
- [x] **1. Agenda module** — shared calendar CRUD (month/week/day/year
      views, opens in month by default), categories, admin's private
      semester view, location field, PDF attachments per compromisso,
      recurring compromissos (diária/semanal/mensal/anual, materializadas
      até 1 ano à frente), one-way sync com o Google Agenda pessoal do
      Admin (agenda dedicada "Vecchio — Família", ver
      `docs/google-calendar-setup.md`). Went further than originally
      planned — pulled in the start of Bills, Attachments and Chat too
      (see notes below).
- [x] **2. Notifications** — `node-cron` roda um scan diário (e uma vez na
      subida do processo) que verifica compromissos cujo `reminderDaysBefore`
      já foi atingido, registra um `NotificationLog` por canal para evitar
      reenvio, mostra banner in-app (visível em qualquer tela, some ao
      recarregar) e envia email via nodemailer a cada perfil da família
      (compromissos privados do admin notificam só o admin). SMTP não
      configurado apenas loga em vez de falhar.
- [x] **3. Bills/Contas module** — `bills.controller.ts`/`bills.service.ts`
      dedicados: CRUD completo, categorias próprias de conta (`luz`,
      `agua`, `internet`, `telefone`, `aluguel`, `saude`, `mercado`,
      `outro` — ver `BILL_CATEGORIES` em `enums.ts`), templates
      recorrentes (reaproveita `computeOccurrenceDates`, mesma regra de 1
      ano/200 ocorrências da Agenda), marcar como pago/pendente, resumo
      mensal/anual com total e detalhamento por categoria. Toda conta
      criada aqui gera um compromisso espelhado na agenda (categoria
      "conta", compartilhado) e sincroniza com o Google Agenda — simétrico
      ao que a Agenda já fazia ao criar uma "conta" por lá; editar/excluir
      a conta atualiza/remove o compromisso vinculado também. Tela
      `frontend/src/pages/Bills.tsx` (filtros por mês/status/categoria,
      cartão de resumo) + `BillModal.tsx` substituem o placeholder de
      `/contas`.
- [x] **4. PDF upload & simplified viewer** — agora também para Bills
      diretamente (`POST/DELETE /api/bills/:id/attachments`, mesmo padrão
      de anexos da Agenda), além dos compromissos da agenda já existentes.
- [x] **5. Password vault** — `passwords.controller.ts`/`.service.ts`
      dedicados; CRUD completo (só o admin cria/edita/exclui, os outros 3
      perfis só veem e copiam — reforçado em `passwordsService`, não só na
      UI); cifra AES-256-GCM em `lib/crypto.ts` (chave derivada via
      SHA-256 de `PASSWORD_ENCRYPTION_KEY`, formato armazenado
      `iv+authTag+ciphertext` em base64 num único campo); busca por nome
      do site (case-insensitive, filtrada em memória — lista pequena,
      SQLite não tem `mode: 'insensitive'`). Tela `Passwords.tsx` com
      mostrar/ocultar e copiar usuário/senha.
- [ ] **6. Medicines** — CRUD + daily schedule + "hoje" dashboard widget.
- [~] **7. Chat assistant** — Gemini integrado e funcionando; o contexto é
      a agenda dos próximos ~60 dias, que agora também traz categoria,
      status (paga/pendente) e quem paga de cada conta (toda conta tem um
      compromisso espelhado, então já aparece automaticamente). Falta
      incluir o contexto de Remédios quando esse módulo existir.
- [ ] **8. USB folder transfer** — drive detection + copy flow.
- [ ] **9. Accessibility pass** — "modo simples" theme, full keyboard nav;
      write the remote-desktop setup runbook (`docs/remote-access-setup.md`).
- [ ] **10. Windows packaging** — wrap with Electron, bundle SQLite + backend
      as a local service, installer build — explicitly a later milestone,
      not part of the initial implementation.

## Verification

After each phase: `docker compose up`, exercise the new module's flows in the
browser (create/edit/delete records, confirm Portuguese copy, confirm
Zod validation rejects bad input with a friendly message), check
`prisma studio` for correct data, and confirm the relevant page is reachable
via keyboard-only navigation. Commit + push to the phase's feature branch,
open a PR into `dev`.
