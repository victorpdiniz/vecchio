# Conectar o Vecchio ao Google Agenda

Isso permite que os compromissos da família cadastrados no Vecchio apareçam
automaticamente numa agenda dedicada ("Vecchio — Família") dentro da sua
conta pessoal do Google, sem misturar com seus próprios compromissos. Só o
perfil **Admin** pode conectar.

Leva uns 5 minutos, é gratuito, e só precisa ser feito uma vez.

## 1. Criar um projeto no Google Cloud

1. Acesse https://console.cloud.google.com/ e faça login com a conta Google
   onde você quer receber os compromissos da família.
2. No topo, clique em **"Selecionar projeto" → "Novo projeto"**.
3. Nome do projeto: `Vecchio` (ou qualquer nome). Clique em **Criar**.

## 2. Ativar a API do Google Calendar

1. Com o projeto `Vecchio` selecionado, vá em **"APIs e serviços" → "Biblioteca"**.
2. Procure por **"Google Calendar API"** e clique em **Ativar**.

## 3. Configurar a tela de consentimento OAuth

1. Vá em **"APIs e serviços" → "Tela de permissão OAuth"**.
2. Tipo de usuário: **Externo** → Criar.
3. Preencha nome do app (`Vecchio`), seu e-mail de suporte e de contato do
   desenvolvedor. Salve e continue nas telas seguintes (escopos: pode pular,
   já pedimos o escopo certo direto no código).
4. Na tela **"Usuários de teste"**, clique em **"Adicionar usuários"** e
   adicione o seu próprio e-mail do Google. Isso é necessário porque o app
   fica em modo "Teste" (não passa pela revisão do Google) — funciona
   normalmente, só é restrito às contas que você cadastrar aqui.

   > Enquanto o app estiver em modo de teste, o Google pode expirar o acesso
   > de tempos em tempos e pedir para conectar de novo pela tela do Vecchio.
   > Isso é uma limitação do modo de teste do Google, não um bug do Vecchio.

## 4. Criar as credenciais OAuth

1. Vá em **"APIs e serviços" → "Credenciais"**.
2. Clique em **"Criar credenciais" → "ID do cliente OAuth"**.
3. Tipo de aplicativo: **Aplicativo da Web**.
4. Nome: `Vecchio backend`.
5. Em **"URIs de redirecionamento autorizados"**, adicione:
   ```
   http://localhost:3333/api/google-calendar/callback
   ```
   (quando o Vecchio for instalado de verdade no computador dos seus avós,
   adicione também o endereço real usado lá, seguindo o mesmo padrão
   `<endereço-do-backend>/api/google-calendar/callback`.)
6. Clique em **Criar**. Copie o **Client ID** e o **Client Secret** que
   aparecem na tela.

## 5. Configurar o Vecchio

1. Abra `backend/.env` (crie a partir de `backend/.env.example` se ainda não
   existir).
2. Preencha:
   ```
   GOOGLE_CLIENT_ID="cole aqui o Client ID"
   GOOGLE_CLIENT_SECRET="cole aqui o Client Secret"
   GOOGLE_REDIRECT_URI="http://localhost:3333/api/google-calendar/callback"
   FRONTEND_URL="http://localhost:5173"
   ```
3. Reinicie o backend (`docker compose restart backend` ou `npm run dev`).

## 6. Conectar pelo Vecchio

1. Abra o Vecchio, escolha o perfil **Admin**.
2. Vá em **Agenda** → clique em **"Conectar Google Agenda"**.
3. Faça login com a mesma conta Google usada nos passos acima e autorize o
   acesso. Você será redirecionado de volta para o Vecchio.
4. Uma agenda chamada **"Vecchio — Família"** vai aparecer na barra lateral
   do seu Google Calendar (app ou site) — é nela que os compromissos não
   privados da família (tudo, exceto a agenda pessoal do Admin) vão
   aparecer automaticamente.

Para desconectar a qualquer momento, use o botão **"Desconectar"** na
mesma tela — os compromissos já criados no Google Agenda não são apagados
automaticamente, mas novos compromissos param de sincronizar.
