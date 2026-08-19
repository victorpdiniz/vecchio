#!/usr/bin/env bash
# Roda a cada minuto via cron no HOST (nunca dentro de um container — ver
# docs/self-update-setup.md para o porquê). Aplica atualizações pedidas pelo
# botão "Atualizar" do app: aparece um marcador em .git/ quando alguém
# aperta o botão; este script vê o marcador, atualiza o repositório e
# reinicia os containers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MARKER="$REPO_ROOT/.git/VECCHIO_UPDATE_REQUESTED"
STATUS_FILE="$REPO_ROOT/.git/VECCHIO_UPDATE_STATUS"
LOG_FILE="${VECCHIO_UPDATE_LOG:-$REPO_ROOT/.git/vecchio-update-watcher.log}"
BRANCH="${VECCHIO_UPDATE_BRANCH:-dev}"

log() {
  echo "[$(date -Iseconds)] $*" >>"$LOG_FILE"
}

# Registra o resultado da tentativa (sucesso ou falha) num arquivo que o
# backend lê em system.service.ts getStatus() — sem isso, uma falha aqui
# (branch errada, merge não fast-forward, containers não reiniciando) ficava
# só no log, e o botão "Atualizando…" do app nunca sabia que tinha dado
# errado.
write_status() {
  local state="$1"
  local message="$2"
  printf '{"state":"%s","message":"%s","at":"%s"}\n' "$state" "$message" "$(date -Iseconds)" >"$STATUS_FILE"
}

[ -f "$MARKER" ] || exit 0

log "Atualização pedida em $(cat "$MARKER" 2>/dev/null || echo '?'). Branch: $BRANCH."
cd "$REPO_ROOT"

# git merge --ff-only só é seguro se já estivermos na branch certa — se o
# host estiver em outra branch (ou HEAD destacado), o merge falha em
# silêncio sem isso. É a causa raiz confirmada do botão travando pra sempre.
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'DETACHED')"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  log "AVISO: HEAD estava em '$CURRENT_BRANCH', não '$BRANCH' — mudando de branch antes de atualizar."
  if ! git checkout "$BRANCH" >>"$LOG_FILE" 2>&1; then
    log "ERRO: falha ao mudar para a branch '$BRANCH' (mudanças locais não commitadas?). Nenhuma alteração aplicada."
    write_status "error" "Nao foi possivel mudar para a branch $BRANCH no host."
    rm -f "$MARKER"
    exit 0
  fi
fi

if git fetch origin "$BRANCH" >>"$LOG_FILE" 2>&1 && git merge --ff-only "origin/$BRANCH" >>"$LOG_FILE" 2>&1; then
  log "Repositório atualizado para $(git rev-parse HEAD). Reiniciando containers…"
  if docker compose restart backend frontend >>"$LOG_FILE" 2>&1; then
    log "Containers reiniciados com sucesso."
    write_status "ok" "Atualizado para $(git rev-parse --short HEAD)."
  else
    log "ERRO: código já foi atualizado, mas falhou reiniciar os containers. Reinicie manualmente: docker compose restart backend frontend"
    write_status "error" "Codigo atualizado, mas os containers nao reiniciaram. Reinicie manualmente."
  fi
else
  log "ERRO: git fetch/merge falhou (ver acima), nenhuma alteração aplicada. É seguro tentar de novo pelo app."
  write_status "error" "Falha ao baixar ou aplicar a atualizacao (git fetch/merge). Veja o log no host."
fi

rm -f "$MARKER"
