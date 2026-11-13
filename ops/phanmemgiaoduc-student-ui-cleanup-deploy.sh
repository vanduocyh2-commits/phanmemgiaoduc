#!/usr/bin/env bash
set -Eeuo pipefail
APP="/opt/phanmemgiaoduc"
FILE="$APP/public/index.html"
SERVER="$APP/portal-server.mjs"
LOCK="/run/lock/phanmemgiaoduc-deploy.lock"
EXPECTED_BEFORE="27a7c4197b438438d42dc8369aa2e774c60fd202f67dafcdf65733e199b29106"
EXPECTED_AFTER="96d5ca31466098562000e86785b705fba616f3814d0b58b0e1e95c19a53943a2"
EXPECTED_SERVER="08a5b09adbaa9db31023137525df08cb2f5d7ece85676631bfc2c24fd6d6f214"
if [[ "$#" -ne 0 ]]; then echo "ERROR: arguments are not allowed" >&2; exit 2; fi
exec 9>"$LOCK"
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }
[[ -f "$FILE" && -f "$SERVER" ]] || { echo "ERROR: expected production files not found" >&2; exit 1; }
server_sha="$(sha256sum "$SERVER" | awk '{print $1}')"
if [[ "$server_sha" != "$EXPECTED_SERVER" ]]; then
  echo "ERROR: production portal-server.mjs differs from reviewed version; refusing UI patch" >&2
  echo "EXPECTED_SERVER=$EXPECTED_SERVER" >&2
  echo "ACTUAL_SERVER=$server_sha" >&2
  exit 1
fi
current_sha="$(sha256sum "$FILE" | awk '{print $1}')"
if [[ "$current_sha" == "$EXPECTED_AFTER" ]]; then echo "STUDENT_EXAM_UI_LAYOUT_ALREADY_PRESENT"; exit 0; fi
if [[ "$current_sha" != "$EXPECTED_BEFORE" ]]; then
  echo "ERROR: public/index.html is not the reviewed intermediate UI version; refusing overwrite" >&2
  echo "EXPECTED=$EXPECTED_BEFORE" >&2
  echo "ACTUAL=$current_sha" >&2
  exit 1
fi
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/phanmemgiaoduc-student-ui-layout-$STAMP"
mkdir -m 0700 -p "$BACKUP_DIR"
cp -a "$FILE" "$BACKUP_DIR/index.html.before"
printf '%s\n' "$current_sha" > "$BACKUP_DIR/index.html.before.sha256"
TMP_FILE="$(mktemp "$APP/public/.index.html.ui-layout.XXXXXX")"
CHECK_DIR="$(mktemp -d /tmp/phanmemgiaoduc-ui-layout-check.XXXXXX)"
HTTP_FILE="$(mktemp /tmp/phanmemgiaoduc-ui-layout-http.XXXXXX)"
cleanup() { rm -f "$TMP_FILE" "$HTTP_FILE"; rm -rf "$CHECK_DIR"; }
trap cleanup EXIT

python3 - "$FILE" "$TMP_FILE" <<'PY'
from pathlib import Path
import hashlib, sys
source_path, output_path = map(Path, sys.argv[1:3])
s = source_path.read_text(encoding="utf-8")
def replace_once(old: str, new: str, label: str) -> None:
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"ABORT: {label}: expected exactly one match, found {n}")
    s = s.replace(old, new, 1)

replace_once(
    "+(q.questionCode?'<div><b>Mã câu:</b> '+esc(q.questionCode)+'</div>':'')",
    "",
    "remove question code from answer feedback card"
)
dollar = chr(36)
tick = chr(96)
quote = chr(39)
old_heading = dollar + "{MathBridge.inline(questionText)}"
new_heading = (dollar + "{q.questionCode?" + tick +
    '<span class="exam-question-code"><b>Mã câu:</b> ' +
    dollar + "{esc(q.questionCode)}</span> " + tick + ":" +
    quote + quote + "}" + old_heading)
replace_once(old_heading, new_heading, "place question code after points in question heading")
if "Báo lỗi câu này" in s:
    raise SystemExit("ERROR: student-facing question flag text remains in source")
digest = hashlib.sha256(s.encode("utf-8")).hexdigest()
expected = "96d5ca31466098562000e86785b705fba616f3814d0b58b0e1e95c19a53943a2"
if digest != expected:
    raise SystemExit(f"ERROR: patched public/index.html SHA mismatch: {digest}")
output_path.write_text(s, encoding="utf-8")
print("UI_LAYOUT_REPLACEMENTS=2")
print(f"PUBLIC_INDEX_SHA256={digest}")
PY

chown --reference="$FILE" "$TMP_FILE"
chmod --reference="$FILE" "$TMP_FILE"
new_sha="$(sha256sum "$TMP_FILE" | awk '{print $1}')"
if [[ "$new_sha" != "$EXPECTED_AFTER" ]]; then
  echo "ERROR: public/index.html output hash mismatch" >&2
  echo "EXPECTED=$EXPECTED_AFTER" >&2
  echo "ACTUAL=$new_sha" >&2
  exit 1
fi
mv -f "$TMP_FILE" "$FILE"
rollback() { echo "ROLLBACK: restoring intermediate public/index.html" >&2; cp -a "$BACKUP_DIR/index.html.before" "$FILE"; }

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
then rollback; exit 1; fi
for check_file in "$CHECK_DIR"/*; do
  if ! node --check "$check_file"; then rollback; exit 1; fi
done
health_ok=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health -o /dev/null; then health_ok=1; break; fi
  sleep 1
done
if [[ "$health_ok" -ne 1 ]]; then echo "ERROR: portal health endpoint unavailable" >&2; rollback; exit 1; fi
if ! curl -fsS --max-time 10 http://127.0.0.1:3000/ -o "$HTTP_FILE"; then echo "ERROR: cannot fetch live public page" >&2; rollback; exit 1; fi
if grep -q 'Báo lỗi câu này' "$HTTP_FILE"; then echo "ERROR: student-facing report flag remains in live UI" >&2; rollback; exit 1; fi
if ! grep -q 'exam-question-code' "$HTTP_FILE"; then echo "ERROR: question code is not in live question heading" >&2; rollback; exit 1; fi
printf 'STUDENT_EXAM_UI_LAYOUT_DEPLOY_SUCCESS\n'
printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
printf 'PUBLIC_INDEX_SHA256=%s\n' "$new_sha"
