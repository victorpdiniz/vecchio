# Vecchio

Sistema de gestão familiar para o Vô, a Vó, o Pai e o Admin (neto): agenda
compartilhada, contas do mês/ano, remédios, cofre de senhas, chat com
inteligência artificial e transferência de pastas para pendrive — tudo em
português, sem necessidade de login.

O plano completo do projeto (contexto, decisões de arquitetura, módulos e
fases de construção) está descrito em
[`docs/plano.md`](./docs/plano.md).

## Stack

- **Back-end**: Node.js, TypeScript, Fastify, Prisma ORM, SQLite, Zod
- **Front-end**: React, Vite, React Router, Axios, Tailwind CSS
- **Chat**: Google Generative AI (Gemini)
- **Ambiente de desenvolvimento**: Docker + Docker Compose

## Estrutura do projeto

```
vecchio/
  backend/    API Fastify (MVC: controller/service/repository) + Prisma + SQLite
  frontend/   Aplicação React (Vite + Tailwind)
  docs/       Documentação do projeto (plano, runbooks)
  docker-compose.yml
```

## Como rodar em desenvolvimento

### Com Docker (recomendado)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

- API: http://localhost:3333
- Front-end: http://localhost:5173

O `docker compose up` já aplica as migrations do Prisma e cria os 4 perfis
iniciais (Vô, Vó, Pai, Admin) automaticamente.

### Sem Docker

```bash
# Back-end
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# Front-end (em outro terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Identificação de perfil (sem autenticação)

Vecchio não tem login — só a família usa a máquina. Ao abrir o app, cada
pessoa escolhe seu cartão (Vô, Vó, Pai ou Admin); essa escolha é guardada no
navegador e enviada em um header (`x-profile-id`) só para personalizar a
tela (agenda privada do admin, destinatário de notificação), não como
mecanismo de segurança.

## Fluxo de branches e commits

- `main` — versão estável
- `dev` — integração das features
- `backend/*` e `frontend/*` — branches de trabalho por módulo, mescladas em `dev` via PR

Commits seguem [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`).

## Roadmap

Ver a seção "Build Phases" em [`docs/plano.md`](./docs/plano.md) para a
ordem de construção dos módulos (agenda, notificações, contas, PDF, senhas,
remédios, chat, pendrive, acessibilidade e, por fim, o empacotamento como
aplicativo Windows).
