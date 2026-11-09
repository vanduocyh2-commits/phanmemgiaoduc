#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
SERVICE="phanmemgiaoduc.service"
BACKUP_ROOT="$APP/backups/deploy-safety"

if [[ "$#" -ne 0 ]]; then
  echo "ERROR: arguments are not allowed" >&2
  exit 2
fi

exec 9>/run/lock/phanmemgiaoduc-deploy.lock
flock -n 9 || {
  echo "ERROR: another deployment is running" >&2
  exit 1
}

git_as_app() {
  runuser -u centerapp -- git -C "$APP" "$@"
}

if [[ "$(git_as_app branch --show-current)" != "main" ]]; then
  echo "ERROR: application checkout is not on main" >&2
  exit 1
fi

# Preserve local tracked edits before refusing a deployment. Never stash,
# reset, checkout, or overwrite the live working tree automatically.
if ! git_as_app diff HEAD --quiet; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP="$BACKUP_ROOT/$STAMP"
  install -d -o centerapp -g centerapp -m 0750 "$BACKUP"
  git_as_app diff HEAD --binary > "$BACKUP/tracked-changes.patch"
  git_as_app status --short > "$BACKUP/git-status.txt"
  git_as_app rev-parse HEAD > "$BACKUP/original-commit.txt"

  while IFS= read -r file; do
    [[ -n "$file" && -f "$APP/$file" ]] || continue
    install -d -o centerapp -g centerapp "$BACKUP/files/$(dirname "$file")"
    cp -a "$APP/$file" "$BACKUP/files/$file"
    chown centerapp:centerapp "$BACKUP/files/$file"
  done < <(git_as_app diff HEAD --name-only)

  chown -R centerapp:centerapp "$BACKUP"
  echo "ERROR: tracked local changes detected; deployment stopped safely." >&2
  echo "BACKUP_CREATED: $BACKUP" >&2
  echo "Review the backup and reconcile local changes before deploying." >&2
  cat "$BACKUP/git-status.txt" >&2
  exit 1
fi

PREVIOUS_COMMIT="$(git_as_app rev-parse HEAD)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/clean-$STAMP"
install -d -o centerapp -g centerapp -m 0750 "$BACKUP"
printf '%s\n' "$PREVIOUS_COMMIT" > "$BACKUP/original-commit.txt"
chown centerapp:centerapp "$BACKUP/original-commit.txt"

git_as_app fetch origin main
git_as_app merge --ff-only origin/main

if ! runuser -u centerapp -- bash -c 'set -Eeuo pipefail; export HOME="$(mktemp -d /tmp/centerapp-home.XXXXXX)"; trap '\''rm -rf "$HOME"'\'' EXIT; export npm_config_cache="$HOME/.npm"; cd /opt/phanmemgiaoduc; npm ci --omit=dev'; then
  echo "ERROR: dependency installation failed; restoring previous Git commit." >&2
  git_as_app reset --hard "$PREVIOUS_COMMIT"
  exit 1
fi

systemctl restart "$SERVICE"
if ! systemctl is-active --quiet "$SERVICE"; then
  journalctl -u "$SERVICE" -n 40 --no-pager >&2 || true
  echo "ERROR: service did not become active; restoring previous Git commit." >&2
  git_as_app reset --hard "$PREVIOUS_COMMIT"
  systemctl restart "$SERVICE" || true
  exit 1
fi

echo "DEPLOY_SUCCESS"
echo "BACKUP_CREATED: $BACKUP"
git_as_app log -1 --oneline
