#!/usr/bin/env bash
set -Eeuo pipefail
APP="/opt/phanmemgiaoduc"
FILE="$APP/public/index.html"
SERVER="$APP/portal-server.mjs"
LOCK="/run/lock/phanmemgiaoduc-deploy.lock"
EXPECTED_BEFORE="96d5ca31466098562000e86785b705fba616f3814d0b58b0e1e95c19a53943a2"
EXPECTED_AFTER="e21c831a9d9a4737df26847cd1fa16aa61ac3cf7e78d19cdebf427cf58c59961"
EXPECTED_SERVER="08a5b09adbaa9db31023137525df08cb2f5d7ece85676631bfc2c24fd6d6f214"

if [[ "$#" -ne 0 ]]; then echo "ERROR: arguments are not allowed" >&2; exit 2; fi
exec 9>"$LOCK"
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }
[[ -f "$FILE" && -f "$SERVER" ]] || { echo "ERROR: expected production files not found" >&2; exit 1; }

server_sha="$(sha256sum "$SERVER" | awk '{print $1}')"
if [[ "$server_sha" != "$EXPECTED_SERVER" ]]; then
  echo "ERROR: production portal-server.mjs differs from reviewed gradefix; refusing answer display patch" >&2
  echo "EXPECTED_SERVER=$EXPECTED_SERVER" >&2
  echo "ACTUAL_SERVER=$server_sha" >&2
  exit 1
fi

current_sha="$(sha256sum "$FILE" | awk '{print $1}')"
if [[ "$current_sha" == "$EXPECTED_AFTER" ]]; then
  echo "LEADING_ANSWER_DASH_FIX_ALREADY_PRESENT"
  exit 0
fi
if [[ "$current_sha" != "$EXPECTED_BEFORE" ]]; then
  echo "ERROR: production public/index.html changed since review; refusing to overwrite" >&2
  echo "EXPECTED=$EXPECTED_BEFORE" >&2
  echo "ACTUAL=$current_sha" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/phanmemgiaoduc-answer-display-$STAMP"
mkdir -m 0700 -p "$BACKUP_DIR"
cp -a "$FILE" "$BACKUP_DIR/index.html.before"
printf '%s\n' "$current_sha" > "$BACKUP_DIR/index.html.before.sha256"

TMP_FILE="$(mktemp "$APP/public/.index.html.answer-display.XXXXXX")"
CHECK_DIR="$(mktemp -d /tmp/phanmemgiaoduc-answer-display-check.XXXXXX)"
HTTP_FILE="$(mktemp /tmp/phanmemgiaoduc-answer-display-http.XXXXXX)"
cleanup() { rm -f "$TMP_FILE" "$HTTP_FILE"; rm -rf "$CHECK_DIR"; }
trap cleanup EXIT

python3 - "$FILE" "$TMP_FILE" <<'PY'
from pathlib import Path
import hashlib, sys
source_path, output_path = map(Path, sys.argv[1:3])
s = source_path.read_text(encoding="utf-8")
old = "}else key=esc(String(q.answer||'').split('|').join(' / '));const points="
new = "}else key=esc(String(q.answer||'').split('|').join(' / '));key=String(key).replace(/^(?:\\s|&nbsp;)*(?:—|–|&mdash;|&#8212;)\\s*/i,'');const points="
count = s.count(old)
if count != 1:
    raise SystemExit(f"ABORT: expected one answer-feedback renderer, found {count}")
s = s.replace(old, new, 1)
digest = hashlib.sha256(s.encode("utf-8")).hexdigest()
expected = "e21c831a9d9a4737df26847cd1fa16aa61ac3cf7e78d19cdebf427cf58c59961"
if digest != expected:
    raise SystemExit(f"ERROR: patched public/index.html SHA mismatch: {digest}")
output_path.write_text(s, encoding="utf-8")
print("ANSWER_DISPLAY_REPLACEMENTS=1")
print(f"PUBLIC_INDEX_SHA256={digest}")
PY

chown --reference="$FILE" "$TMP_FILE"
chmod --reference="$FILE" "$TMP_FILE"
new_sha="$(sha256sum "$TMP_FILE" | awk '{print $1}')"
if [[ "$new_sha" != "$EXPECTED_AFTER" ]]; then
  echo "ERROR: answer display output hash mismatch" >&2
  echo "EXPECTED=$EXPECTED_AFTER" >&2
  echo "ACTUAL=$new_sha" >&2
  exit 1
fi
mv -f "$TMP_FILE" "$FILE"

rollback() {
  echo "ROLLBACK: restoring original public/index.html" >&2
  cp -a "$BACKUP_DIR/index.html.before" "$FILE"
}
if ! python3 - "$FILE" "$CHECK_DIR" <<'PY'
from pathlib import Path
import re, sys
html = Path(sys.argv[1]).read_text(encoding="utf-8")
dest = Path(sys.argv[2])
scripts = re.findall(r"<script\b([^>]*)>([\s\S]*?)</script>", html, re.I)
count = 0
for attrs, script in scripts:
    if re.search(r"\bsrc\s*=", attrs, re.I):
        continue
    suffix = "mjs" if re.search(r"\btype\s*=\s*[\"']module[\"']", attrs, re.I) else "js"
    count += 1
    (dest / f"inline-{count}.{suffix}").write_text(script, encoding="utf-8")
if not count:
    raise SystemExit("No inline scripts found")
print(f"INLINE_SCRIPTS={count}")
PY
then
  rollback
  exit 1
fi
for check_file in "$CHECK_DIR"/*; do
  if ! node --check "$check_file"; then rollback; exit 1; fi
done

health_ok=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health -o /dev/null; then
    health_ok=1
    break
  fi
  sleep 1
done
if [[ "$health_ok" -ne 1 ]]; then
  echo "ERROR: portal health endpoint unavailable" >&2
  rollback
  exit 1
fi
if ! curl -fsS --max-time 10 http://127.0.0.1:3000/ -o "$HTTP_FILE"; then
  echo "ERROR: cannot fetch live public page" >&2
  rollback
  exit 1
fi
if ! grep -q "replace(/^(?:\\\\s|&nbsp;)*(" "$HTTP_FILE"; then
  echo "ERROR: live page does not contain leading separator normalization" >&2
  rollback
  exit 1
fi

printf 'LEADING_ANSWER_DASH_FIX_DEPLOY_SUCCESS\n'
printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
printf 'PUBLIC_INDEX_SHA256=%s\n' "$new_sha"
