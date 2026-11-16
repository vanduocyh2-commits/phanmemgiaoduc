#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
SERVICE="phanmemgiaoduc.service"
SHA="${1:-}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "ERROR: invalid commit SHA" >&2; exit 2; }

exec 9>/run/lock/phanmemgiaoduc-deploy.lock
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }

RAW="https://raw.githubusercontent.com/vanduocyh2-commits/phanmemgiaoduc/$SHA"
ROOT_MODULE="$APP/ai-math-lessons.mjs"
PUBLIC_MODULE="$APP/public/ai-math-lessons-ui.mjs"
STAGE="$(mktemp -d /tmp/phanmemgiaoduc-ai.XXXXXX)"
BACKUP="$STAGE/backup"
mkdir -p "$BACKUP"
had_root=0
had_public=0
[[ ! -f "$ROOT_MODULE" ]] || { cp -a "$ROOT_MODULE" "$BACKUP/root"; had_root=1; }
[[ ! -f "$PUBLIC_MODULE" ]] || { cp -a "$PUBLIC_MODULE" "$BACKUP/public"; had_public=1; }

rollback() {
  status=$?
  if [[ "$status" -ne 0 ]]; then
    echo "Deployment failed; restoring AI module files" >&2
    if [[ "$had_root" -eq 1 ]]; then cp -a "$BACKUP/root" "$ROOT_MODULE"; else rm -f "$ROOT_MODULE"; fi
    if [[ "$had_public" -eq 1 ]]; then cp -a "$BACKUP/public" "$PUBLIC_MODULE"; else rm -f "$PUBLIC_MODULE"; fi
    chown centerapp:centerapp "$ROOT_MODULE" "$PUBLIC_MODULE" 2>/dev/null || true
    echo "AI_MODULE_ROLLBACK_COMPLETED" >&2
  fi
  rm -rf "$STAGE"
  exit "$status"
}
trap rollback EXIT

curl -fsSL --retry 2 --connect-timeout 10 --max-time 120 "$RAW/ai-math-lessons.mjs" -o "$STAGE/ai-math-lessons.mjs"
curl -fsSL --retry 2 --connect-timeout 10 --max-time 120 "$RAW/public/ai-math-lessons-ui.mjs" -o "$STAGE/ai-math-lessons-ui.mjs"
node --check "$STAGE/ai-math-lessons.mjs"
node --check "$STAGE/ai-math-lessons-ui.mjs"

install -o centerapp -g centerapp -m 0644 "$STAGE/ai-math-lessons.mjs" "$ROOT_MODULE"
install -o centerapp -g centerapp -m 0644 "$STAGE/ai-math-lessons-ui.mjs" "$PUBLIC_MODULE"

echo "=== Deploying public/index.html and portal-server.mjs ==="
/usr/local/sbin/phanmemgiaoduc-source-deploy "$SHA"
systemctl is-active --quiet "$SERVICE"
echo "AI_MODULES_INSTALLED"
echo "COMMIT=$SHA"
