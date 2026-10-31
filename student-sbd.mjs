// One monotonic sequence for the entire center. Call inside the store transaction.
export function studentSbdHighWater(d){
 let max=Number.isSafeInteger(d._studentSbdSequence)&&d._studentSbdSequence>=0?d._studentSbdSequence:0;
 const see=value=>{const m=/^HS(\d+)$/i.exec(String(value||''));if(m){const n=Number(m[1]);if(Number.isSafeInteger(n))max=Math.max(max,n);}};
 for(const c of d.classes||[])for(const s of c.students||[])see(s.sbd);
 for(const a of d.archivedStudents||[])see(a.student?.sbd);
 for(const a of d.enrollmentApplications||[]){see(a.sbd);see(a.proposedSbd);}
 for(const b of d._rosterImportHistory||[]){for(const s of b.students||[])see(s.sbd);for(const a of b.applications||[]){see(a.before?.proposedSbd);see(a.after?.proposedSbd);}}
 for(const key of ['gradeBook','learningSubmissions','learningAttempts','learningReports','lessonProgress'])for(const row of d[key]||[])see(row.sbd);
 for(const key of Object.keys(d._auth||{}))if(/^(student|parent):/.test(key))see(key.split(':').at(-1));
 for(const key of Object.keys(d._familyAccounts||{}))see(key.split(':').at(-1));
 return max;
}
export function createStudentSbdSequence(d){
 let value=studentSbdHighWater(d);
 return {next(){if(value>=Number.MAX_SAFE_INTEGER)throw Error('Bộ số báo danh đã hết giới hạn.');return 'HS'+String(++value).padStart(5,'0');},commit(){d._studentSbdSequence=Math.max(studentSbdHighWater(d),value);}};
}
export function rememberStudentSbds(d,floor=0){d._studentSbdSequence=Math.max(studentSbdHighWater(d),floor);}
