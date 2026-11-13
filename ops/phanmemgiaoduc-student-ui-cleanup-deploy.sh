#!/usr/bin/env bash
set -Eeuo pipefail
APP="/opt/phanmemgiaoduc"
FILE="$APP/public/index.html"
SERVER="$APP/portal-server.mjs"
LOCK="/run/lock/phanmemgiaoduc-deploy.lock"
EXPECTED_BEFORE="54f1f21d213d54c5e83f7db5ec477dfe56c813a2f86003d80f20406eba23f9b1"
EXPECTED_AFTER="27a7c4197b438438d42dc8369aa2e774c60fd202f67dafcdf65733e199b29106"
EXPECTED_SERVER="08a5b09adbaa9db31023137525df08cb2f5d7ece85676631bfc2c24fd6d6f214"
if [[ "$#" -ne 0 ]]; then echo "ERROR: arguments are not allowed" >&2; exit 2; fi
exec 9>"$LOCK"
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }
[[ -f "$FILE" && -f "$SERVER" ]] || { echo "ERROR: expected production files not found" >&2; exit 1; }
server_sha="$(sha256sum "$SERVER" | awk '{print $1}')"
if [[ "$server_sha" != "$EXPECTED_SERVER" ]]; then
  echo "ERROR: production portal-server.mjs differs from reviewed gradefix; refusing UI patch" >&2
  echo "EXPECTED_SERVER=$EXPECTED_SERVER" >&2
  echo "ACTUAL_SERVER=$server_sha" >&2
  exit 1
fi
current_sha="$(sha256sum "$FILE" | awk '{print $1}')"
if [[ "$current_sha" == "$EXPECTED_AFTER" ]]; then echo "STUDENT_EXAM_UI_CLEANUP_ALREADY_PRESENT"; exit 0; fi
if [[ "$current_sha" != "$EXPECTED_BEFORE" ]]; then
  echo "ERROR: production public/index.html changed since review; refusing to overwrite" >&2
  echo "EXPECTED=$EXPECTED_BEFORE" >&2
  echo "ACTUAL=$current_sha" >&2
  exit 1
fi
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/phanmemgiaoduc-student-ui-cleanup-$STAMP"
mkdir -m 0700 -p "$BACKUP_DIR"
cp -a "$FILE" "$BACKUP_DIR/index.html.before"
printf '%s\n' "$current_sha" > "$BACKUP_DIR/index.html.before.sha256"
TMP_FILE="$(mktemp "$APP/public/.index.html.ui-cleanup.XXXXXX")"
CHECK_DIR="$(mktemp -d /tmp/phanmemgiaoduc-ui-cleanup-check.XXXXXX)"
HTTP_FILE="$(mktemp /tmp/phanmemgiaoduc-ui-cleanup-http.XXXXXX)"
cleanup() { rm -f "$TMP_FILE" "$HTTP_FILE"; rm -rf "$CHECK_DIR"; }
trap cleanup EXIT
python3 - "$FILE" "$TMP_FILE" <<'PY'
from pathlib import Path
import hashlib, sys
source_path, output_path = map(Path, sys.argv[1:3])
s = source_path.read_text(encoding="utf-8")
lines = s.splitlines(keepends=True)
tick = chr(96)
dollar = chr(36)
report_lines = [i for i,line in enumerate(lines) if line.startswith("   const reportButton=")]
if len(report_lines) != 1 or "Báo lỗi câu này" not in lines[report_lines[0]]:
    raise SystemExit(f"ABORT: expected one question report flag line, found {len(report_lines)}")
del lines[report_lines[0]]
s = "".join(lines)
report_expr = dollar + "{reportButton}"
if s.count(report_expr) != 1:
    raise SystemExit(f"ABORT: expected one rendered reportButton placeholder, found {s.count(report_expr)}")
s = s.replace(report_expr, "", 1)

feedback_prefix = "function practiceQuizFeedbackHTML("
start = s.find(feedback_prefix)
if start < 0:
    raise SystemExit("ABORT: practice quiz feedback renderer not found")
end = s.find("\n", start)
if end < 0: end = len(s)
feedback = s[start:end]
old_score_close = "+'</div>'+(key?"
question_code_markup = "+'</div>'+(q.questionCode?'<div><b>Mã câu:</b> '+esc(q.questionCode)+'</div>':'')+(key?"
if feedback.count(old_score_close) != 1:
    raise SystemExit(f"ABORT: expected one feedback score insertion point, found {feedback.count(old_score_close)}")
feedback = feedback.replace(old_score_close, question_code_markup, 1)
s = s[:start] + feedback + s[end:]

if "Báo lỗi câu này" in s or 'class="question-report-actions"' in s:
    raise SystemExit("ABORT: question report flag still exists in rendered UI source")
digest = hashlib.sha256(s.encode("utf-8")).hexdigest()
expected = "27a7c4197b438438d42dc8369aa2e774c60fd202f67dafcdf65733e199b29106"
if digest != expected:
    raise SystemExit(f"ERROR: patched HTML SHA mismatch: {digest}")
output_path.write_text(s, encoding="utf-8")
print("UI_REPLACEMENTS=3")
print(f"PUBLIC_INDEX_SHA256={digest}")
PY
chown --reference="$FILE" "$TMP_FILE"
chmod --reference="$FILE" "$TMP_FILE"
new_sha="$(sha256sum "$TMP_FILE" | awk '{print $1}')"
if [[ "$new_sha" != "$EXPECTED_AFTER" ]]; then
  echo "ERROR: public/index.html does not match reviewed output hash" >&2
  echo "EXPECTED=$EXPECTED_AFTER" >&2
  echo "ACTUAL=$new_sha" >&2
  exit 1
fi
mv -f "$TMP_FILE" "$FILE"
rollback() { echo "ROLLBACK: restoring original public/index.html" >&2; cp -a "$BACKUP_DIR/index.html.before" "$FILE"; }
if ! python3 - "$FILE" "$CHECK_DIR" <<'PY'
from pathlib import Path
import re, sys
html = Path(sys.argv[1]).read_text(encoding="utf-8")
dest = Path(sys.argv[2])
scripts = re.findall(r"<script\b([^>]*)>([\s\S]*?)</script>", html, re.I)
count = 0
for attrs, script in scripts:
    if re.search(r"\bsrc\s*=", attrs, re.I): continue
    suffix = "mjs" if re.search(r"\btype\s*=\s*[\"']module[\"']", attrs, re.I) else "js"
    count += 1
    (dest / f"inline-{count}.{suffix}").write_text(script, encoding="utf-8")
if not count: raise SystemExit("No inline scripts found")
print(f"INLINE_SCRIPTS={count}")
PY
then rollback; exit 1; fi
for check_file in "$CHECK_DIR"/*; do if ! node --check "$check_file"; then rollback; exit 1; fi; done
health_ok=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health -o /dev/null; then health_ok=1; break; fi
  sleep 1
done
if [[ "$health_ok" -ne 1 ]]; then echo "ERROR: portal health endpoint unavailable" >&2; rollback; exit 1; fi
if ! curl -fsS --max-time 10 http://127.0.0.1:3000/ -o "$HTTP_FILE"; then echo "ERROR: cannot fetch live public page" >&2; rollback; exit 1; fi
if grep -q 'Báo lỗi câu này' "$HTTP_FILE"; then echo "ERROR: report flag remains in live UI" >&2; rollback; exit 1; fi
if ! grep -q 'Mã câu:</b>' "$HTTP_FILE"; then echo "ERROR: question code missing from feedback template" >&2; rollback; exit 1; fi
printf 'STUDENT_EXAM_UI_CLEANUP_DEPLOY_SUCCESS\n'
printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
printf 'PUBLIC_INDEX_SHA256=%s\n' "$new_sha"
