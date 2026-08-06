# Configurar acesso remoto ao computador (RustDesk)

Isso é **só um passo a passo de configuração** — não faz parte do código do
Vecchio. A ideia é que você (neto/admin) consiga ver e controlar a tela do
computador dos seus avós remotamente, pra ajudar com qualquer coisa (não só
o Vecchio) sem precisar ir até lá.

Usamos o **RustDesk** porque é gratuito, de código aberto, não exige abrir
portas no roteador (usa um servidor de relay pela internet) e suporta
**acesso desacompanhado** (você entra na tela mesmo sem ninguém apertando
"aceitar" do outro lado — essencial aqui, já que seus avós não teriam como
aceitar a conexão sozinhos).

Leva uns 10-15 minutos e só precisa ser feito uma vez por computador.

## 1. Instalar o RustDesk no computador dos seus avós

1. Baixe o instalador em https://rustdesk.com/ (escolha a versão para o
   sistema operacional deles — Windows é o mais comum).
2. Instale normalmente, aceitando as opções padrão.
3. Abra o RustDesk. Ele mostra uma tela com dois campos:
   - **Seu ID** — um número que identifica esse computador (fixo depois que
     você configurar acesso desacompanhado no passo 2, senão muda a cada
     reinício em algumas versões).
   - **Senha única** — uma senha temporária que muda a cada abertura do
     programa. Não é essa que você vai usar no dia a dia; vamos trocar por
     uma senha permanente no próximo passo.

## 2. Configurar acesso desacompanhado (senha permanente)

1. No RustDesk, vá em **⋮ (menu) → Configurações → Segurança** (ou
   **Settings → Security**, dependendo do idioma instalado).
2. Em **"Senha de acesso desacompanhado" / "Permanent Password"**, defina
   uma senha forte (misture letras, números e símbolos — essa senha dá
   controle total da tela, trate com o mesmo cuidado de uma senha de banco).
3. Ative a opção **"Permitir conexão desacompanhada" / "Enable unattended
   access"**.
4. Anote o **ID** e a **senha permanente** — vamos usá-los no passo 4.

   > **Dica:** guarde os dois no próprio cofre de senhas do Vecchio
   > (**Senhas** → **+ Nova senha**, com "RustDesk — computador dos avós"
   > como nome do site). Assim você não perde o acesso se esquecer onde
   > anotou.

## 3. Deixar o RustDesk abrindo sozinho com o Windows

Sem isso, se o computador reiniciar (queda de luz, atualização do Windows)
e ninguém estiver lá pra abrir o programa, você perde o acesso remoto até
alguém abrir manualmente.

1. Nas mesmas **Configurações → Segurança**, procure a opção
   **"Iniciar o RustDesk automaticamente ao ligar o computador" / "Start
   RustDesk on boot"** e ative.
2. Se essa opção não aparecer na sua versão, adicione o RustDesk manualmente
   à pasta de Inicialização do Windows (`Win + R` → digite `shell:startup`
   → arraste um atalho do RustDesk pra essa pasta).

## 4. Instalar o RustDesk no seu computador/celular

1. Baixe e instale o RustDesk no(s) seu(s) dispositivo(s)
   (https://rustdesk.com/ tem versões para Windows, Mac, Linux, Android e
   iOS).
2. Abra o programa, digite o **ID** anotado no passo 2 no campo de conexão
   e clique em conectar.
3. Quando pedir senha, use a **senha permanente** que você definiu — não a
   senha única que aparece na tela deles.
4. Pronto — você deve ver a tela do computador dos seus avós e conseguir
   controlá-la.

## 5. Cuidados de segurança

- A senha permanente dá controle total do computador — não a compartilhe
  além de quem realmente precisa ter acesso (idealmente só você).
- Mantenha o RustDesk atualizado nos dois lados (ele avisa quando há
  atualização).
- Se algum dia desconfiar que a senha vazou, troque-a imediatamente em
  **Configurações → Segurança** (mesmo passo do item 2) e atualize o
  registro no cofre de senhas do Vecchio.
- O RustDesk, por padrão, usa os servidores públicos de relay do projeto.
  Para uso pessoal/familiar isso é suficiente e é o que temos aqui — um
  servidor próprio ("self-hosted") só vale a pena para uso mais avançado
  ou corporativo.

## Solução de problemas

- **ID mudou depois de reiniciar:** confirme que o acesso desacompanhado
  (passo 2) está mesmo ativado — com ele ligado o ID fica fixo.
- **Não consegue conectar:** confirme que o computador dos seus avós está
  ligado e conectado à internet, e que o RustDesk está aberto (ou
  configurado para abrir sozinho, passo 3).
- **Conexão lenta:** normal em relays públicos com internet mais fraca de
  um dos lados — ainda assim costuma ser utilizável para orientar alguém
  na tela ou mexer em configurações.
