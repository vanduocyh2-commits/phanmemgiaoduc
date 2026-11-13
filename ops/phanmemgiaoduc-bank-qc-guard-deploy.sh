#!/usr/bin/env bash
set -Eeuo pipefail

APP="/opt/phanmemgiaoduc"
FILE="$APP/public/index.html"
SERVER="$APP/portal-server.mjs"
SERVICE="phanmemgiaoduc.service"
LOCK="/run/lock/phanmemgiaoduc-deploy.lock"
EXPECTED_BEFORE="fce81b0441a051450392e091aa52cb734af15d2f4ece951e44be61a5a1a18dd3"
EXPECTED_AFTER="217271cc818eb8b5dff35b3b0ecacdf60961cc2e4807abb5a918d161e2eab09b"
EXPECTED_SERVER="08a5b09adbaa9db31023137525df08cb2f5d7ece85676631bfc2c24fd6d6f214"

if [[ "$#" -ne 0 ]]; then echo "ERROR: arguments are not allowed" >&2; exit 2; fi
exec 9>"$LOCK"
flock -n 9 || { echo "ERROR: another deployment is running" >&2; exit 1; }
[[ -f "$FILE" && -f "$SERVER" ]] || { echo "ERROR: expected production files not found" >&2; exit 1; }

server_sha="$(sha256sum "$SERVER" | awk '{print $1}')"
if [[ "$server_sha" != "$EXPECTED_SERVER" ]]; then
  echo "ERROR: portal-server.mjs differs from the reviewed deployed version; refusing to patch public/index.html" >&2
  echo "EXPECTED_SERVER=$EXPECTED_SERVER" >&2
  echo "ACTUAL_SERVER=$server_sha" >&2
  exit 1
fi

current_sha="$(sha256sum "$FILE" | awk '{print $1}')"
if [[ "$current_sha" == "$EXPECTED_AFTER" ]]; then
  echo "BANK_QC_GUARD_ALREADY_PRESENT"
  exit 0
fi
if [[ "$current_sha" != "$EXPECTED_BEFORE" ]]; then
  echo "ERROR: production public/index.html changed since review; refusing to overwrite" >&2
  echo "EXPECTED=$EXPECTED_BEFORE" >&2
  echo "ACTUAL=$current_sha" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/phanmemgiaoduc-bank-qc-guard-$STAMP"
mkdir -m 0700 -p "$BACKUP_DIR"
cp -a "$FILE" "$BACKUP_DIR/index.html.before"
printf '%s\n' "$current_sha" > "$BACKUP_DIR/index.html.before.sha256"

TMP_FILE="$(mktemp "$APP/public/.index.html.qcguard.XXXXXX")"
CHECK_DIR="$(mktemp -d /tmp/phanmemgiaoduc-qcguard-check.XXXXXX)"
HTTP_FILE="$(mktemp /tmp/phanmemgiaoduc-qcguard-http.XXXXXX)"
cleanup() { rm -f "$TMP_FILE" "$HTTP_FILE"; rm -rf "$CHECK_DIR"; }
trap cleanup EXIT

python3 - "$FILE" "$TMP_FILE" <<'PY'
from pathlib import Path
import hashlib, sys
source_path, output_path = map(Path, sys.argv[1:3])
s = source_path.read_text(encoding="utf-8")
count = 0
def replace_once(old: str, new: str, label: str) -> None:
    global s, count
    matches = s.count(old)
    if matches != 1:
        raise SystemExit(f"ABORT: {label}: expected exactly one match, found {matches}")
    s = s.replace(old, new, 1)
    count += 1

replace_once(
    " function bankQcNorm(v){return String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi').replace(/\\s+/g,' ').trim();}\n",
    " function bankQcNorm(v){return String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi').replace(/\\s+/g,' ').trim();}\n"
    " function bankQcAnswerLetter(q,value){const raw=String(value??'').trim();const direct=raw.match(/^([ABCD])(?=$|[\\s).:：—–-])/i);if(direct)return direct[1].toUpperCase();const normalized=bankQcNorm(raw.replace(/^[ABCD]\\s*[.):：—–-]\\s*/i,''));const options=Array.isArray(q?.options)?q.options:[];const index=options.findIndex(option=>bankQcNorm(String(option??'').replace(/^[ABCD]\\s*[.):：—–-]\\s*/i,''))===normalized);return index>=0?'ABCD'[index]:'';}\n"
    " function bankQuestionEligibleForDelivery(q){if(!q||q.qc?.status!=='verified'||!String(q.text||'').trim()||!String(q.explanation||'').trim())return false;if(q.type==='mcq'){const saved=String(q.answer||'').trim().toUpperCase(),verified=bankQcAnswerLetter(q,q.qc?.verifiedAnswer);if(!/^[ABCD]$/.test(saved)||!verified||saved!==verified)return false;}return bankQcIssues(q).length===0;}\n",
    "add question-bank answer verification helpers"
)

old = " function bankQcApprove(id){if(!staff())return;const q=(state.questionBank||[]).find(x=>String(x.id)===String(id));if(!q)return;if(q.qc?.aiStatus!=='correct')return toast('AI chưa xác nhận câu đúng.');const issues=bankQcIssues(q);if(issues.length)return toast('Chưa thể duyệt: '+issues.join('; '));q.qc={...(q.qc||{}),status:'verified',approvedAt:new Date().toISOString(),approvedBy:activeAccount?.username||onlineMember?.username||'teacher'};put();const h=$('question-bank-panel');if(h)h.innerHTML=TS.renderQuestionBankContents();toast('Đã duyệt. Câu hỏi được phép sử dụng.');}"
new = " function bankQcApprove(id){if(!staff())return;const q=(state.questionBank||[]).find(x=>String(x.id)===String(id));if(!q)return;if(q.qc?.aiStatus!=='correct')return toast('AI chưa xác nhận câu đúng.');const issues=bankQcIssues(q);if(issues.length)return toast('Chưa thể duyệt: '+issues.join('; '));if(q.type==='mcq'){const saved=String(q.answer||'').trim().toUpperCase(),verified=bankQcAnswerLetter(q,q.qc?.verifiedAnswer);if(!/^[ABCD]$/.test(saved)||!verified||saved!==verified){q.qc={...(q.qc||{}),status:'needs_review',reason:'Đáp án lưu trong ngân hàng ('+(saved||'không hợp lệ')+') không khớp đáp án AI giải độc lập ('+(verified||'chưa xác định được A/B/C/D')+'). Cần sửa đáp án rồi kiểm định lại.',approvedAt:null};put();const h=$('question-bank-panel');if(h)h.innerHTML=TS.renderQuestionBankContents();return toast('Không duyệt: đáp án AI xác minh không khớp đáp án đang lưu.');}}q.qc={...(q.qc||{}),status:'verified',approvedAt:new Date().toISOString(),approvedBy:activeAccount?.username||onlineMember?.username||'teacher'};put();const h=$('question-bank-panel');if(h)h.innerHTML=TS.renderQuestionBankContents();toast('Đã duyệt. Câu hỏi được phép sử dụng.');}"
replace_once(old, new, "approval key-match guard")

replace_once(
    "if(item.qc?.status!=='verified')return toast('Câu hỏi chưa được kiểm định và giáo viên duyệt.');",
    "if(!bankQuestionEligibleForDelivery(item))return toast('Câu hỏi chưa được AI kiểm định, giáo viên duyệt hoặc đáp án chưa đúng định dạng.');",
    "direct add-bank eligibility"
)
replace_once(
    "const pool=(state.questionBank||[]).filter(q=>q.qc?.status==='verified'&&(!draft.bankGrade||String(q.grade)===draft.bankGrade)",
    "const pool=(state.questionBank||[]).filter(q=>bankQuestionEligibleForDelivery(q)&&(!draft.bankGrade||String(q.grade)===draft.bankGrade)",
    "random bank exam eligibility"
)
replace_once(
    "const pool=(state.questionBank||[]).filter(q=>norm(q.grade)===norm(grade)&&norm(q.subject)===norm(subject)&&norm(q.textbook||'Kết nối tri thức với cuộc sống')===norm(lessonDraft.textbook||'Kết nối tri thức với cuộc sống')&&norm(q.chapter)===norm(chapter)&&norm(q.lesson)===norm(lesson));",
    "const pool=(state.questionBank||[]).filter(q=>bankQuestionEligibleForDelivery(q)&&norm(q.grade)===norm(grade)&&norm(q.subject)===norm(subject)&&norm(q.textbook||'Kết nối tri thức với cuộc sống')===norm(lessonDraft.textbook||'Kết nối tri thức với cuộc sống')&&norm(q.chapter)===norm(chapter)&&norm(q.lesson)===norm(lesson));",
    "lesson practice eligible-only pool"
)
replace_once(
    "return (state.questionBank||[]).filter(q=>{if(!q||q.id==null||norm(q.grade)!==norm(grade)",
    "return (state.questionBank||[]).filter(q=>{if(!bankQuestionEligibleForDelivery(q)||q.id==null||norm(q.grade)!==norm(grade)",
    "lesson sequence picker eligible-only pool"
)
replace_once(
    "q.qc?.status!=='verified'||norm(q.grade)!==norm(p.grade)",
    "!bankQuestionEligibleForDelivery(q)||norm(q.grade)!==norm(p.grade)",
    "standalone pool eligibility guard"
)
replace_once(
    "const rows=(state.questionBank||[]).filter(q=>q&&q.id&&q.qc?.status!=='verified').filter(q=>",
    "const rows=(state.questionBank||[]).filter(q=>q&&q.id&&(!bankQcStatusFilter||(bankQcStatusFilter==='unverified'?!['verified','failed','needs_review'].includes(q.qc?.status):q.qc?.status===bankQcStatusFilter))).filter(q=>",
    "allow rechecking previously verified questions by selected status"
)
replace_once(
    "if(!rows.length)return toast('Không có câu chưa duyệt trong phạm vi đã chọn.');",
    "if(!rows.length)return toast('Không có câu hỏi trong phạm vi đã chọn.');",
    "recheck prompt empty-state message"
)
replace_once(
    "Hãy đóng vai chuyên gia kiểm định Toán phổ thông. Tự giải độc lập, không tin đáp án/lời giải có sẵn. Kiểm tra dữ kiện, điều kiện, số đáp án đúng và lời giải.",
    "Hãy đóng vai chuyên gia kiểm định Toán phổ thông. Tự giải độc lập, không tin đáp án/lời giải có sẵn. Kiểm tra dữ kiện, điều kiện, số đáp án đúng và lời giải. Nếu câu trắc nghiệm có đáp án lưu khác phương án đúng sau khi tự giải, phải ghi status=incorrect và verifiedAnswer là chữ cái đúng. Nếu không thể giải chắc chắn, ghi ambiguous; không được suy đoán.",
    "strengthen independent AI review instruction"
)

new_sha = hashlib.sha256(s.encode("utf-8")).hexdigest()
expected_after = "217271cc818eb8b5dff35b3b0ecacdf60961cc2e4807abb5a918d161e2eab09b"
if count != 10:
    raise SystemExit(f"ERROR: expected 10 replacements, got {count}")
if new_sha != expected_after:
    raise SystemExit(f"ERROR: patched HTML hash mismatch: {new_sha}")
output_path.write_text(s, encoding="utf-8")
print(f"PATCH_REPLACEMENTS={count}")
print(f"PATCH_SHA256={new_sha}")
PY

chown --reference="$FILE" "$TMP_FILE"
chmod --reference="$FILE" "$TMP_FILE"
new_sha="$(sha256sum "$TMP_FILE" | awk '{print $1}')"
if [[ "$new_sha" != "$EXPECTED_AFTER" ]]; then
  echo "ERROR: patched public/index.html hash did not match reviewed result" >&2
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
  echo "ERROR: portal health endpoint did not become ready" >&2
  journalctl -u "$SERVICE" -n 40 --no-pager >&2 || true
  rollback
  exit 1
fi
if ! curl -fsS --max-time 10 http://127.0.0.1:3000/ -o "$HTTP_FILE" || ! grep -q 'bankQuestionEligibleForDelivery' "$HTTP_FILE"; then
  echo "ERROR: live public entry did not return the reviewed question-bank guard" >&2
  rollback
  exit 1
fi

printf 'BANK_QC_GUARD_DEPLOY_SUCCESS\n'
printf 'BACKUP_DIR=%s\n' "$BACKUP_DIR"
printf 'PUBLIC_INDEX_SHA256=%s\n' "$new_sha"
