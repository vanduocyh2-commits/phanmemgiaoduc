#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
FILE="$APP/teacher-tools.mjs"
SERVER="$APP/portal-server.mjs"
SERVICE="phanmemgiaoduc.service"
LOCK="/run/lock/phanmemgiaoduc-deploy.lock"
EXPECTED_BEFORE="2ec4f4ff2acacbdc0df1c6914a7f8e26507c8d8071fd0c39e6585268ae379f81"
EXPECTED_AFTER="b2e5d5ffb4428befd5209271df74ded49664af2729c3be4287e8c38e4bb7ef02"
EXPECTED_SERVER="08a5b09adbaa9db31023137525df08cb2f5d7ece85676631bfc2c24fd6d6f214"

if [[ "$#" -ne 0 ]]; then echo "ERROR: arguments are not allowed" >&2; exit 2; fi
exec 9>"$LOCK"
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }
[[ -f "$FILE" && -f "$SERVER" ]] || { echo "ERROR: expected production files not found" >&2; exit 1; }

server_sha="$(sha256sum "$SERVER" | awk '{print $1}')"
if [[ "$server_sha" != "$EXPECTED_SERVER" ]]; then
  echo "ERROR: portal-server.mjs differs from reviewed deployed version; refusing to patch teacher-tools.mjs" >&2
  echo "EXPECTED_SERVER=$EXPECTED_SERVER" >&2
  echo "ACTUAL_SERVER=$server_sha" >&2
  exit 1
fi

current_sha="$(sha256sum "$FILE" | awk '{print $1}')"
if [[ "$current_sha" == "$EXPECTED_AFTER" ]]; then
  echo "MCQ_MATCH_FIX_ALREADY_PRESENT"
  exit 0
fi
if [[ "$current_sha" != "$EXPECTED_BEFORE" ]]; then
  echo "ERROR: production teacher-tools.mjs changed since review; refusing to overwrite" >&2
  echo "EXPECTED=$EXPECTED_BEFORE" >&2
  echo "ACTUAL=$current_sha" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/phanmemgiaoduc-mcq-matchfix-$STAMP"
mkdir -m 0700 -p "$BACKUP_DIR"
cp -a "$FILE" "$BACKUP_DIR/teacher-tools.mjs.before"
printf '%s\n' "$current_sha" > "$BACKUP_DIR/teacher-tools.before.sha256"

TMP_FILE="$(mktemp "$APP/.teacher-tools.mjs.matchfix.XXXXXX")"
TEST_FILE="$(mktemp /tmp/phanmemgiaoduc-mcq-matchfix-test.XXXXXX.mjs)"
cleanup() { rm -f "$TMP_FILE" "$TEST_FILE"; }
trap cleanup EXIT

python3 - "$FILE" "$TMP_FILE" <<'PY'
from pathlib import Path
import hashlib, sys
source_path, output_path = map(Path, sys.argv[1:3])
s = source_path.read_text(encoding="utf-8")
old = "export function answersMatch(expected,actual,type){const norm=v=>String(v??'').trim().toLowerCase().replace(/\\s+/g,' ').replace(/,/g,'.'),a=norm(expected),b=norm(actual),numeric=/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/;if(type==='short'&&numeric.test(a)&&numeric.test(b))return Math.abs(Number(a)-Number(b))<=1e-9;return a===b;}"
new = "export function answersMatch(expected,actual,type){const norm=v=>String(v??'').normalize('NFKC').replace(/[−–—﹣－]/g,'-').trim().toLowerCase().replace(/\\s+/g,' ').replace(/\\s*,\\s*/g,',').replace(/,/g,'.'),a=norm(expected),b=norm(actual),numeric=/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/;if(type==='short'&&numeric.test(a)&&numeric.test(b))return Math.abs(Number(a)-Number(b))<=1e-9;return a===b;}"
count = s.count(old)
if count != 1:
    raise SystemExit(f"ABORT: expected one answersMatch function, found {count}")
s = s.replace(old, new, 1)
digest = hashlib.sha256(s.encode("utf-8")).hexdigest()
expected = "b2e5d5ffb4428befd5209271df74ded49664af2729c3be4287e8c38e4bb7ef02"
if digest != expected:
    raise SystemExit(f"ERROR: patched source SHA mismatch: {digest}")
output_path.write_text(s, encoding="utf-8")
print("MATCHER_REPLACEMENTS=1")
print(f"TEACHER_TOOLS_SHA256={digest}")
PY

chown --reference="$FILE" "$TMP_FILE"
chmod --reference="$FILE" "$TMP_FILE"
new_sha="$(sha256sum "$TMP_FILE" | awk '{print $1}')"
if [[ "$new_sha" != "$EXPECTED_AFTER" ]]; then
  echo "ERROR: teacher-tools.mjs hash mismatch after patch" >&2
  echo "EXPECTED=$EXPECTED_AFTER" >&2
  echo "ACTUAL=$new_sha" >&2
  exit 1
fi
mv -f "$TMP_FILE" "$FILE"

rollback() {
  echo "ROLLBACK: restoring original teacher-tools.mjs" >&2
  cp -a "$BACKUP_DIR/teacher-tools.mjs.before" "$FILE"
  systemctl restart "$SERVICE" || true
}
if ! node --check "$FILE"; then rollback; exit 1; fi

cat > "$TEST_FILE" <<'TEST'
import assert from 'node:assert/strict';
import { answersMatch, answersMatchQuestion } from '/opt/phanmemgiaoduc/teacher-tools.mjs';
const q = { type: 'mcq', options: [
  '2, 1, 5, 1, −3, −1',
  '2, 1, 5, 1, 3, 1',
  '1, 2, 3, 4, 5, 6',
  '0, 0, 0, 0, 0, 0'
]};
assert.equal(answersMatchQuestion(q, '2,1,5,1,-3,-1', 'A'), true);
assert.equal(answersMatchQuestion(q, '2, 1, 5, 1, −3, −1', 'A'), true);
assert.equal(answersMatchQuestion(q, '2,1,5,1,-3,-1', 'B'), false);
assert.equal(answersMatch('−3', '-3', 'short'), true);
assert.equal(answersMatch('2,5', '2.5', 'short'), true);
console.log('MCQ_UNICODE_MINUS_TESTS_PASSED=5');
TEST
chmod 0644 "$TEST_FILE"
if ! runuser -u centerapp -- node "$TEST_FILE"; then rollback; exit 1; fi

if ! systemctl restart "$SERVICE"; then rollback; exit 1; fi
health_ok=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health -o /dev/null; then
    health_ok=1
    break
  fi
  sleep 1
done
if [[ "$health_ok" -ne 1 ]]; then
  echo "ERROR: portal health endpoint did not become ready after teacher-tools restart" >&2
  journalctl -u "$SERVICE" -n 50 --no-pager >&2 || true
  rollback
  exit 1
fi

printf 'MCQ_MATCH_FIX_DEPLOY_SUCCESS\n'
printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
printf 'TEACHER_TOOLS_SHA256=%s\n' "$new_sha"
