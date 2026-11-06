#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
SERVICE="phanmemgiaoduc.service"

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

if ! git_as_app diff --quiet || ! git_as_app diff --cached --quiet; then
  echo "ERROR: tracked local changes detected; refusing deployment" >&2
  exit 1
fi

git_as_app fetch origin main
git_as_app merge --ff-only origin/main

runuser -u centerapp -- bash -c 'cd /opt/phanmemgiaoduc && npm ci --omit=dev'

systemctl restart "$SERVICE"
if ! systemctl is-active --quiet "$SERVICE"; then
  journalctl -u "$SERVICE" -n 40 --no-pager >&2 || true
  echo "ERROR: service did not become active" >&2
  exit 1
fi

echo "DEPLOY_SUCCESS"
git_as_app log -1 --oneline
