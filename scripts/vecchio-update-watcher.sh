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
LOG_FILE="${VECCHIO_UPDATE_LOG:-$REPO_ROOT/.git/vecchio-update-watcher.log}"
BRANCH="${VECCHIO_UPDATE_BRANCH:-dev}"

log() {
  echo "[$(date -Iseconds)] $*" >>"$LOG_FILE"
}

[ -f "$MARKER" ] || exit 0

log "Atualização pedida em $(cat "$MARKER" 2>/dev/null || echo '?'). Branch: $BRANCH."
cd "$REPO_ROOT"

if git fetch origin "$BRANCH" >>"$LOG_FILE" 2>&1 && git merge --ff-only "origin/$BRANCH" >>"$LOG_FILE" 2>&1; then
  log "Repositório atualizado para $(git rev-parse HEAD). Reiniciando containers…"
  if docker compose restart backend frontend >>"$LOG_FILE" 2>&1; then
    log "Containers reiniciados com sucesso."
  else
    log "ERRO: código já foi atualizado, mas falhou reiniciar os containers. Reinicie manualmente: docker compose restart backend frontend"
  fi
else
  log "ERRO: git fetch/merge falhou (ver acima), nenhuma alteração aplicada. É seguro tentar de novo pelo app."
fi

rm -f "$MARKER"
