#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
SERVICE="phanmemgiaoduc.service"
BACKUP_ROOT="$APP/backups/deploy-safety"
HEALTH_URL="http://127.0.0.1:3000/api/health"

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

install_dependencies() {
  runuser -u centerapp -- bash -c 'set -Eeuo pipefail; export HOME="$(mktemp -d /tmp/centerapp-home.XXXXXX)"; trap '\''rm -rf "$HOME"'\'' EXIT; export npm_config_cache="$HOME/.npm"; cd /opt/phanmemgiaoduc; npm ci --omit=dev'
}

wait_for_health() {
  local attempt
  for attempt in {1..12}; do
    if systemctl is-active --quiet "$SERVICE" && curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null; then
      return 0
    fi
    sleep 5
  done
  return 1
}

restore_previous_release() {
  local previous_commit="$1"
  echo "ROLLBACK: restoring $previous_commit" >&2
  git_as_app reset --hard "$previous_commit" || return 1
  install_dependencies || {
    echo "ERROR: could not restore dependencies for previous release" >&2
    return 1
  }
  systemctl restart "$SERVICE" || return 1
  wait_for_health || {
    echo "ERROR: previous release did not pass health check" >&2
    return 1
  }
  echo "ROLLBACK_SUCCESS: $previous_commit" >&2
}

if [[ "$(git_as_app branch --show-current)" != "main" ]]; then
  echo "ERROR: application checkout is not on main" >&2
  exit 1
fi

# Back up and stop if there are tracked, staged, unstaged, or untracked edits.
if [[ -n "$(git_as_app status --porcelain)" ]]; then
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

  while IFS= read -r file; do
    [[ -n "$file" && -f "$APP/$file" ]] || continue
    install -d -o centerapp -g centerapp "$BACKUP/untracked/$(dirname "$file")"
    cp -a "$APP/$file" "$BACKUP/untracked/$file"
    chown centerapp:centerapp "$BACKUP/untracked/$file"
  done < <(git_as_app ls-files --others --exclude-standard)

  chown -R centerapp:centerapp "$BACKUP"
  echo "ERROR: local changes detected; deployment stopped safely." >&2
  echo "BACKUP_CREATED: $BACKUP" >&2
  echo "Review and reconcile the backup before deploying." >&2
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

if ! install_dependencies; then
  echo "ERROR: dependency installation failed." >&2
  restore_previous_release "$PREVIOUS_COMMIT" || true
  exit 1
fi

systemctl restart "$SERVICE"
if ! wait_for_health; then
  journalctl -u "$SERVICE" -n 60 --no-pager >&2 || true
  echo "ERROR: service/API health check failed." >&2
  restore_previous_release "$PREVIOUS_COMMIT" || true
  exit 1
fi

echo "DEPLOY_SUCCESS"
echo "BACKUP_CREATED: $BACKUP"
git_as_app log -1 --oneline
