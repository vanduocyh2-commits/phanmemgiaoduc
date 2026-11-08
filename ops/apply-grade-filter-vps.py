#!/usr/bin/env python3
from pathlib import Path
import datetime
import re
import shutil
import subprocess
import sys
import tempfile

TARGET = Path("/opt/phanmemgiaoduc/public/index.html")

def fail(message):
    print("KHONG SUA FILE:", message, file=sys.stderr)
    raise SystemExit(1)

if not TARGET.is_file():
    fail("Khong tim thay " + str(TARGET))

source = TARGET.read_text(encoding="utf-8")
if "function setStatusFilter" in source:
    print("BO LOC DA CO SAN; KHONG CAN SUA.")
    raise SystemExit(0)

grade_match = re.search(r"function\\s+grade\\s*\\(\\s*\\)\\s*\\{", source)
if not grade_match:
    fail("Khong tim thay ham grade()")

delete_match = re.search(r"function\\s+deleteSubmissionRecord\\s*\\(", source[grade_match.start():])
if not delete_match:
    fail("Khong xac dinh duoc ket thuc ham grade()")
grade_end = grade_match.start() + delete_match.start()
grade_block = source[grade_match.start():grade_end]

rows_match = re.search(
    r"const\\s+rows\\s*=\\s*teacherSubmissions\\(\\)\\.filter\\((?P<predicate>[^;]+)\\);",
    grade_block
)
if not rows_match:
    fail("Khong tim thay dong tao danh sach bai nop trong grade()")
predicate = rows_match.group("predicate")
if "selectedClass" not in predicate or "gradingFilter" not in predicate or "isSelectedTeacherMonth" not in predicate:
    fail("Dong loc bai nop khong dung cau truc mong doi")

replacement = (
    "const allRows=teacherSubmissions().filter(" + predicate + ");"
    "const counts={pending:allRows.filter(s=>s.status!==\\"graded\\").length,"
    "graded:allRows.filter(s=>s.status===\\"graded\\").length};"
    "const rows=allRows.filter(s=>gradingStatusFilter===\\"graded\\"?"
    "s.status===\\"graded\\":s.status!==\\"graded\\");"
)
grade_block = grade_block[:rows_match.start()] + replacement + grade_block[rows_match.end():]

map_token = r"\\$\\{rows\\.map\\(s=>"
map_match = re.search(map_token, grade_block)
if not map_match:
    fail("Khong tim thay vi tri danh sach rows.map(s=>) de chen nut")

controls = """<div class="flex flex-wrap items-center gap-2">
<button type="button" class="ts-btn" data-status="pending" aria-pressed="${gradingStatusFilter==="pending"}" style="${gradingStatusFilter==="pending"?"background:#fff7ed;border-color:#fdba74;color:#9a3412;":""}" onclick="TS.setStatusFilter(this.dataset.status)">Chưa chấm <strong>${counts.pending}</strong></button>
<button type="button" class="ts-btn" data-status="graded" aria-pressed="${gradingStatusFilter==="graded"}" style="${gradingStatusFilter==="graded"?"background:#ecfdf5;border-color:#6ee7b7;color:#047857;":""}" onclick="TS.setStatusFilter(this.dataset.status)">Đã chấm <strong>${counts.graded}</strong></button>
<small class="ts-help">Thống kê riêng lớp ${esc(selectedClass?.name||"")}</small></div>"""

grade_block = grade_block[:map_match.start()] + controls + grade_block[map_match.start():]
source = source[:grade_match.start()] + 'let gradingStatusFilter="pending";\\n ' + grade_block + source[grade_end:]

setter = re.search(
    r"function\\s+setFilter\\s*\\(\\s*v\\s*\\)\\s*\\{\\s*gradingFilter\\s*=\\s*v\\s*;\\s*grade\\(\\)\\s*;\\s*\\}",
    source
)
if not setter:
    fail("Khong tim thay ham setFilter(v)")
new_setter = setter.group(0) + '\\n function setStatusFilter(v){gradingStatusFilter=v==="graded"?"graded":"pending";grade();}'
source = source[:setter.start()] + new_setter + source[setter.end():]

export_token = "filterGrade,setFilter,mark,saveMark"
if source.count(export_token) != 1:
    fail("Khong tim thay duy nhat danh sach ham TS can mo rong")
source = source.replace(export_token, "filterGrade,setFilter,setStatusFilter,mark,saveMark")

script_open = source.find('<script type="module">')
if script_open < 0:
    fail("Khong tim thay the script module")
script_start = script_open + len('<script type="module">')
script_end = source.find("</script>", script_start)
if script_end < 0:
    fail("Khong tim thay the dong script module")

with tempfile.NamedTemporaryFile(mode="w", suffix=".mjs", encoding="utf-8", delete=False) as check_file:
    check_file.write(source[script_start:script_end])
    check_path = Path(check_file.name)
try:
    check = subprocess.run(["node", "--check", str(check_path)], capture_output=True, text=True)
finally:
    check_path.unlink(missing_ok=True)
if check.returncode != 0:
    fail("Node syntax check: " + check.stderr[:1500])

backup_dir = Path("/opt/phanmemgiaoduc/backups/grade-filter")
backup_dir.mkdir(parents=True, exist_ok=True)
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
backup = backup_dir / ("index.html.before-" + stamp)
shutil.copy2(TARGET, backup)

temporary = TARGET.with_name("index.html.grade-filter.tmp")
temporary.write_text(source, encoding="utf-8")
temporary.replace(TARGET)

print("DA THEM BO LOC CHAM BAI")
print("NODE_CHECK_OK")
print("BACKUP:", backup)
