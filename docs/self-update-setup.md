# Botão de autoatualização

Qualquer perfil vê, no cabeçalho do app, um botão que aparece quando há uma
versão mais nova do Vecchio em `origin/dev` — apertar "Atualizar" baixa o
código novo e reinicia os containers.

Leva 1 minuto para configurar e só precisa ser feito uma vez na máquina que
roda os containers.

## Por que isso não é automático de fábrica

O container do backend roda `git fetch`/`git status` sozinho para checar se
há atualização, mas **não** tem acesso ao Docker do host — de propósito, para
não dar a um container o poder de controlar (ligar/desligar/inspecionar)
qualquer coisa na máquina. Quem de fato baixa o código novo e reinicia os
containers é um script pequeno que roda **no host**, fora de qualquer
container, disparado a cada minuto por um agendador do sistema operacional
(cron no Linux/macOS, Agendador de Tarefas no Windows).

Sem esse agendamento configurado, o botão "Atualizar" registra o pedido mas
nada acontece até você configurar um dos passos abaixo — escolha a seção do
seu sistema operacional.

## Linux / macOS: configurar (uma vez)

1. Confirme que `docker compose` funciona de dentro da pasta do projeto
   (`vecchio/`) sem precisar de `sudo` — se precisar de `sudo`, rode os
   passos abaixo com o crontab do usuário `root` (`sudo crontab -e`) em vez
   do seu usuário.

2. Adicione uma linha ao crontab apontando para
   `scripts/vecchio-update-watcher.sh` a cada minuto:

   ```
   crontab -e
   ```

   E adicione (ajuste o caminho para onde o repositório está de verdade):

   ```
   * * * * * /caminho/para/vecchio/scripts/vecchio-update-watcher.sh
   ```

3. Pronto. O script:
   - Não faz nada se ninguém apertou "Atualizar" (roda em menos de um
     segundo, sem tráfego de rede).
   - Quando o botão é apertado: confere se o HEAD do host já está na branch
     configurada (padrão `dev`) — se não estiver, faz `git checkout` antes de
     continuar — depois dá `git fetch` + `git merge --ff-only` e, se der
     certo, roda `docker compose restart backend frontend`.
   - Registra tudo em `.git/vecchio-update-watcher.log`, dentro do próprio
     repositório — útil para conferir se uma atualização realmente rodou ou
     por que falhou.
   - Também grava o resultado (sucesso ou erro) em
     `.git/VECCHIO_UPDATE_STATUS`, que o backend lê e mostra no botão — se
     algo falhar, o app mostra "Atualização falhou" com o motivo em vez de
     ficar preso em "Atualizando…" para sempre. Mesmo sem esse arquivo (cron
     nunca configurado, por exemplo), o botão se destrava sozinho depois de
     alguns minutos.

## O que acontece se der errado

- **O host não estava na branch configurada** (HEAD destacado, ou checkout
  em outra branch): o script tenta mudar para ela automaticamente antes do
  merge. Se isso falhar (por exemplo, alguém editou arquivos direto na
  máquina de produção), o script não mexe em mais nada, registra o erro no
  log e no `VECCHIO_UPDATE_STATUS` — é seguro apertar "Atualizar" de novo
  depois de resolver o conflito manualmente.
- **`git merge --ff-only` falha**: mesmo tratamento acima.
- **O `git pull` funciona mas o restart falha**: o log e o
  `VECCHIO_UPDATE_STATUS` avisam que o código já foi atualizado mas os
  containers antigos continuam rodando — reinicie à mão com
  `docker compose restart backend frontend`.
- **Uma atualização muda dependências do backend** (`package.json` novo):
  reiniciar sozinho não basta — vai precisar rodar
  `docker compose up -d --build` manualmente depois (o mesmo passo que foi
  necessário durante o desenvolvimento deste recurso, quando o
  `node_modules` do container ficou desatualizado em relação ao schema do
  Prisma). O botão cobre o caso comum (só mudança de código); mudanças de
  dependência ainda são um passo manual.

## Windows (sem crontab): Git Bash + Agendador de Tarefas

Windows não tem `crontab` — o script continua sendo um script bash (ele
também dá `docker compose restart`, então precisa rodar de algum shell que
enxergue o `docker` instalado), então a forma mais simples de rodar é via
**Git Bash** (já que é o que você usa pra `docker compose`) agendado pelo
**Agendador de Tarefas do Windows**, que faz o papel do cron.

1. Confirme o caminho do `bash.exe` do Git Bash — normalmente
   `C:\Program Files\Git\bin\bash.exe`. Pra checar, abra o Git Bash e rode:

   ```
   which bash
   ```

2. Abra o **PowerShell** (não precisa ser como administrador, a não ser que
   sua conta exija privilégio elevado pra rodar `docker`) e registre a
   tarefa, ajustando os dois caminhos entre aspas pro seu usuário e onde o
   repositório está clonado:

   ```powershell
   $action = New-ScheduledTaskAction -Execute "C:\Program Files\Git\bin\bash.exe" -Argument '"C:\Users\SEU_USUARIO\vecchio\scripts\vecchio-update-watcher.sh"'
   $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration ([TimeSpan]::MaxValue)
   Register-ScheduledTask -TaskName "VecchioUpdateWatcher" -Action $action -Trigger $trigger -Description "Watcher de autoatualizacao do Vecchio, roda a cada minuto"
   ```

   Isso cria uma tarefa chamada "VecchioUpdateWatcher" que roda o script a
   cada minuto, indefinidamente, com as mesmas permissões do seu usuário
   (que é quem tem acesso ao Docker Desktop) — equivalente ao `crontab -e`
   do Linux/macOS.

3. Deixe **"Run only when user is logged on"** (é a opção padrão criada pelo
   comando acima) — como o Docker Desktop também só roda com você logado,
   não tem vantagem em tentar rodar sem sessão aberta.

4. Pra conferir que funcionou: abra o app, aperte "Atualizar" (com uma
   atualização disponível) e espere até um minuto — o botão deve sair de
   "Atualizando…" sozinho. Se quiser ver o watcher rodando na hora, pode
   testar manualmente antes de agendar:

   ```
   bash scripts/vecchio-update-watcher.sh
   ```

   (sem marcador `.git/VECCHIO_UPDATE_REQUESTED`, o script só sai sem fazer
   nada — normal fora do fluxo do botão.)

5. Pra desfazer/remover a tarefa depois, se precisar:

   ```powershell
   Unregister-ScheduledTask -TaskName "VecchioUpdateWatcher" -Confirm:$false
   ```

Se preferir, dá pra fazer o mesmo pela interface gráfica: abra o
**Agendador de Tarefas** (Task Scheduler), crie uma tarefa básica que roda
`C:\Program Files\Git\bin\bash.exe` com o argumento sendo o caminho do
script entre aspas, com gatilho "Diariamente" repetindo a cada 1 minuto
indefinidamente.

## Branch diferente de `dev`

Se a instalação real acompanha outra branch, defina `VECCHIO_UPDATE_BRANCH`
com o mesmo valor da variável de ambiente `UPDATE_BRANCH` do backend (em
`backend/.env`) no ambiente de quem dispara o script.

No cron (Linux/macOS):

```
VECCHIO_UPDATE_BRANCH=minha-branch
* * * * * /caminho/para/vecchio/scripts/vecchio-update-watcher.sh
```

No Agendador de Tarefas (Windows), passe a variável dentro do próprio
argumento do bash, já que `New-ScheduledTaskAction` não tem um jeito
separado de setar variáveis de ambiente:

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Program Files\Git\bin\bash.exe" -Argument '-c "VECCHIO_UPDATE_BRANCH=minha-branch \"/c/Users/SEU_USUARIO/vecchio/scripts/vecchio-update-watcher.sh\""'
```
