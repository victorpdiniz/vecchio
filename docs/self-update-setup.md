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
container, disparado pelo cron.

Sem esse script instalado, o botão "Atualizar" registra o pedido mas nada
acontece até você configurar o passo abaixo.

## Configurar (uma vez)

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
   - Quando o botão é apertado: dá `git fetch` + `git merge --ff-only` na
     branch configurada (padrão `dev`) e, se der certo, roda
     `docker compose restart backend frontend`.
   - Registra tudo em `.git/vecchio-update-watcher.log`, dentro do próprio
     repositório — útil para conferir se uma atualização realmente rodou ou
     por que falhou.

## O que acontece se der errado

- **`git merge --ff-only` falha** (por exemplo, alguém editou arquivos
  direto na máquina de produção): o script não mexe em nada, registra o erro
  no log e apaga o pedido — é seguro apertar "Atualizar" de novo depois de
  resolver o conflito manualmente.
- **O `git pull` funciona mas o restart falha**: o log avisa que o código já
  foi atualizado mas os containers antigos continuam rodando — reinicie à
  mão com `docker compose restart backend frontend`.
- **Uma atualização muda dependências do backend** (`package.json` novo):
  reiniciar sozinho não basta — vai precisar rodar
  `docker compose up -d --build` manualmente depois (o mesmo passo que foi
  necessário durante o desenvolvimento deste recurso, quando o
  `node_modules` do container ficou desatualizado em relação ao schema do
  Prisma). O botão cobre o caso comum (só mudança de código); mudanças de
  dependência ainda são um passo manual.

## Branch diferente de `dev`

Se a instalação real acompanha outra branch, exporte
`VECCHIO_UPDATE_BRANCH` para o cron (mesmo valor da variável de ambiente
`UPDATE_BRANCH` do backend, em `backend/.env`):

```
VECCHIO_UPDATE_BRANCH=minha-branch
* * * * * /caminho/para/vecchio/scripts/vecchio-update-watcher.sh
```
