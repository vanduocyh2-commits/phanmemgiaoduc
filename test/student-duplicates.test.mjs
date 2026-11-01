import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findStudentDuplicates} from '../portal-server.mjs';

test('duplicate audit groups repeated SBDs and accent-insensitive names without changing student records',()=>{
 const d={classes:[
  {id:'a',name:'8A',students:[{name:'Nguyễn Văn An',sbd:'K8A01',dob:'2012-01-01'},{name:'Trần Bình',sbd:'K8A02'}]},
  {id:'b',name:'8B',students:[{name:'NGUYEN VAN AN',sbd:'K8A01',dob:'2012-01-01'},{name:'Trần Bình',sbd:'K8B02'}]}
 ]};
 const before=structuredClone(d),result=findStudentDuplicates(d);
 assert.equal(result.duplicateSbd.length,1);
 assert.equal(result.duplicateSbd[0].value,'K8A01');
 assert.equal(result.duplicateNames.length,2);
 assert.deepEqual(d,before);
});
test('duplicate audit ignores blank SBDs and blank names',()=>{
 const result=findStudentDuplicates({classes:[{id:'a',name:'A',students:[{name:'',sbd:''},{name:'',sbd:''}]}]});
 assert.deepEqual(result,{duplicateSbd:[],duplicateNames:[]});
});
