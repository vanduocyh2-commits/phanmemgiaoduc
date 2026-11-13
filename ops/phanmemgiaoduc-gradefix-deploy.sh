#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
FILE="$APP/portal-server.mjs"
SERVICE="phanmemgiaoduc.service"
LOCK="/run/lock/phanmemgiaoduc-deploy.lock"
EXPECTED_BEFORE="3bfc6a1f325ea94635d5e69dddf9a7abc7bb6ebccf370176df381c239a5ce313"
EXPECTED_AFTER="08a5b09adbaa9db31023137525df08cb2f5d7ece85676631bfc2c24fd6d6f214"

if [[ "$#" -ne 0 ]]; then echo "ERROR: arguments are not allowed" >&2; exit 2; fi
exec 9>"$LOCK"
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }
[[ -f "$FILE" ]] || { echo "ERROR: production portal-server.mjs not found" >&2; exit 1; }

current_sha="$(sha256sum "$FILE" | awk '{print $1}')"
if [[ "$current_sha" == "$EXPECTED_AFTER" ]]; then
  echo "GRADE_FIX_ALREADY_PRESENT"
  node --check "$FILE"
  exit 0
fi
if [[ "$current_sha" != "$EXPECTED_BEFORE" ]]; then
  echo "ERROR: production portal-server.mjs changed since review; refusing to overwrite" >&2
  echo "EXPECTED=$EXPECTED_BEFORE" >&2
  echo "ACTUAL=$current_sha" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/phanmemgiaoduc-gradefix-$STAMP"
mkdir -m 0700 -p "$BACKUP_DIR"
cp -a "$FILE" "$BACKUP_DIR/portal-server.mjs.before"
printf '%s\n' "$current_sha" > "$BACKUP_DIR/portal-server.before.sha256"

TMP_FILE="$(mktemp "$APP/.portal-server.mjs.gradefix.XXXXXX")"
TEST_FILE="$(mktemp /tmp/phanmemgiaoduc-gradefix-test.XXXXXX.mjs)"
cleanup() { rm -f "$TMP_FILE" "$TEST_FILE"; }
trap cleanup EXIT

python3 - "$FILE" "$TMP_FILE" <<'PY'
from pathlib import Path
import sys
source_path, output_path = map(Path, sys.argv[1:3])
s = source_path.read_text(encoding='utf-8')
def replace_once(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"ABORT: {label}: expected one match, found {count}")
    s = s.replace(old, new, 1)
replace_once(
    "function scoreSubmission(d,a,sub,useVariants=false){const code=String(sub.examCode||a.snapshot.presentation?.code||'101')",
    "function scoreSubmission(d,a,sub,useVariants=false){const code=String(sub.examCode||studentExamCode(d,a,sub.sbd)||a.snapshot.presentation?.code||'101')",
    "scoreSubmission exam-code fallback")
replace_once(
    "for(const old of next.learningSubmissions.filter(s=>s.assignmentId===a.id)){const scored=scoreSubmission(next,a,old,true),questions=a.snapshot.answerVariants?.[old.examCode]||a.snapshot.questions;",
    "for(const old of next.learningSubmissions.filter(s=>s.assignmentId===a.id)){const code=String(old.examCode||studentExamCode(next,a,old.sbd)||a.snapshot.presentation?.code||'101'),scored=scoreSubmission(next,a,{...old,examCode:code},true),questions=a.snapshot.answerVariants?.[code]||a.snapshot.questions;",
    "regrade resolves each legacy submission's exam code")
replace_once(
    "Object.assign(old,{details:scored.details,score:scored.score,status:scored.status,regradedAt:new Date().toISOString()});",
    "Object.assign(old,{examCode:code,details:scored.details,score:scored.score,status:scored.status,regradedAt:new Date().toISOString()});",
    "regrade persists resolved exam code")
replace_once(
    "const qs=a.snapshot.answerVariants?.[String(r.examCode||a.snapshot.presentation?.code||'101')]||a.snapshot.questions;",
    "const code=String(r.examCode||studentExamCode(d,a,r.sbd)||a.snapshot.presentation?.code||'101'),qs=a.snapshot.answerVariants?.[code]||a.snapshot.questions;",
    "batch grading validates using each student's exam code")
replace_once(
    "const code=String(r.examCode||a.snapshot.presentation?.code||'101');if(a.snapshot.answerVariants&&Object.keys(a.snapshot.answerVariants).length?!a.snapshot.answerVariants[code]:code!==String(a.snapshot.presentation?.code||'101')&&!a.snapshot.variantAttachments?.[code])",
    "if(a.snapshot.answerVariants&&Object.keys(a.snapshot.answerVariants).length?!a.snapshot.answerVariants[code]:code!==String(a.snapshot.presentation?.code||'101')&&!a.snapshot.variantAttachments?.[code])",
    "batch validation removes duplicate code declaration")
replace_once(
    "for(const r of rows){const previous=d.learningSubmissions.find(s=>s.assignmentId===a.id&&s.classId===c.id&&s.sbd===r.sbd&&['teacher_batch','teacher_scan'].includes(s.source));",
    "for(const r of rows){const code=String(r.examCode||studentExamCode(d,a,r.sbd)||a.snapshot.presentation?.code||'101'),previous=d.learningSubmissions.find(s=>s.assignmentId===a.id&&s.classId===c.id&&s.sbd===r.sbd&&['teacher_batch','teacher_scan'].includes(s.source));",
    "batch grading resolves code in scoring loop")
replace_once(
    "examCode:String(r.examCode||a.snapshot.presentation?.code||'101'),",
    "examCode:code,",
    "batch scoring stores resolved exam code")
replace_once(
    "details:qs.map((q,i)=>({qid:q.id,answer:r.answers[i]}))",
    "details:a.snapshot.questions.map((q,i)=>({qid:q.id,answer:r.answers[i]}))",
    "batch grading avoids out-of-scope qs reference")
output_path.write_text(s, encoding='utf-8')
PY

chown --reference="$FILE" "$TMP_FILE"
chmod --reference="$FILE" "$TMP_FILE"
new_sha="$(sha256sum "$TMP_FILE" | awk '{print $1}')"
if [[ "$new_sha" != "$EXPECTED_AFTER" ]]; then
  echo "ERROR: patched file hash did not match reviewed result" >&2
  echo "EXPECTED=$EXPECTED_AFTER" >&2
  echo "ACTUAL=$new_sha" >&2
  exit 1
fi
mv -f "$TMP_FILE" "$FILE"

rollback() {
  echo "ROLLBACK: restoring the original production server file" >&2
  cp -a "$BACKUP_DIR/portal-server.mjs.before" "$FILE"
  systemctl restart "$SERVICE" || true
}
if ! node --check "$FILE"; then rollback; exit 1; fi

cat > "$TEST_FILE" <<'TEST'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, batchGrade, regradeExam } from '/opt/phanmemgiaoduc/portal-server.mjs';
const teacher = { role: 'teacher', username: 'gv', account: { id: 't1' } };
function makeData() {
  const d = emptyState('password123');
  d.classes = [{ id: 'c1', name: '10A', teacherId: 't1', students: [
    { sbd: 'S1', name: 'An', fees: {} }, { sbd: 'S2', name: 'Bình', fees: {} }
  ] }];
  const baseAnswers = ['A', 'B', 'C', 'D', 'A'];
  const variantAnswers = ['B', 'D', 'A', 'C', 'D'];
  const orders = [[2,0,3,1], [3,2,0,1], [2,0,3,1], [2,0,3,1], [1,2,3,0]];
  const base = baseAnswers.map((answer, i) => ({
    id: 'mcq_' + (i + 1), type: 'mcq', level: 'NB', text: 'Câu ' + (i + 1),
    options: ['A','B','C','D'].map(letter => 'C' + (i + 1) + '-' + letter), answer, points: 2
  }));
  const variant = base.map((q, i) => ({
    ...q, options: orders[i].map(index => q.options[index]), answer: variantAnswers[i]
  }));
  const exam = { id: 'e1', owner: 'gv', title: 'Kiểm tra mã đề', duration: 45,
    questions: base, answerVariants: { '101': base, '102': variant }, presentation: { code: '101' } };
  d.learningExams = [structuredClone(exam)];
  d.assignments = [{ id: 'a1', examId: 'e1', classId: 'c1', students: ['S1','S2'],
    studentCodes: { S1: '101', S2: '102' }, maxAttempts: 1, assessmentType: 'test',
    snapshot: structuredClone(exam) }];
  return { d, baseAnswers, variantAnswers };
}
test('batch grading uses each student assigned code and correct shuffled answers for five questions', () => {
  const { d, baseAnswers, variantAnswers } = makeData();
  batchGrade(d, teacher, { assignmentId: 'a1', rows: [
    { sbd: 'S1', answers: baseAnswers }, { sbd: 'S2', answers: variantAnswers }
  ]});
  const first = d.learningSubmissions.find(row => row.sbd === 'S1');
  const second = d.learningSubmissions.find(row => row.sbd === 'S2');
  assert.equal(first.examCode, '101'); assert.equal(first.score, 10);
  assert.equal(second.examCode, '102'); assert.equal(second.score, 10);
  assert.deepEqual(second.details.map(row => row.points), [2,2,2,2,2]);
});
test('regrading resolves and persists exam code for an older submission without examCode', () => {
  const { d, variantAnswers } = makeData();
  batchGrade(d, teacher, { assignmentId: 'a1', rows: [{ sbd: 'S2', answers: variantAnswers }] });
  const old = d.learningSubmissions.find(row => row.sbd === 'S2');
  assert.equal(old.examCode, '102');
  delete old.examCode;
  regradeExam(d, teacher, { examId: 'e1' });
  assert.equal(old.examCode, '102'); assert.equal(old.score, 10);
  assert.deepEqual(old.details.map(row => row.points), [2,2,2,2,2]);
});
TEST

chmod 0644 "$TEST_FILE"
# Run the node:test file in-process. The isolated --test worker cannot be spawned by this VPS user context.
if ! runuser -u centerapp -- node "$TEST_FILE"; then rollback; exit 1; fi
if ! systemctl restart "$SERVICE"; then rollback; exit 1; fi
if ! systemctl is-active --quiet "$SERVICE"; then
  journalctl -u "$SERVICE" -n 40 --no-pager >&2 || true
  rollback
  exit 1
fi
health_ok=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health -o /dev/null; then
    health_ok=1
    break
  fi
  sleep 1
done
if [[ "$health_ok" -ne 1 ]]; then
  echo "ERROR: service did not become HTTP-ready on 127.0.0.1:3000 within 30 seconds" >&2
  ss -lntp >&2 || true
  journalctl -u "$SERVICE" -n 60 --no-pager >&2 || true
  rollback
  exit 1
fi
printf 'GRADE_FIX_DEPLOY_SUCCESS\n'
printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
printf 'PORTAL_SERVER_SHA256=%s\n' "$new_sha"
