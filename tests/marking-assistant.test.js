import test from 'node:test';
import assert from 'node:assert/strict';
import { compareMathAnswers, checkEquivalentEquations, checkAlgebraWorking } from '../src/math-equivalence.js';
import { assessTypedWorking, assessOfficialWorking } from '../src/marking-assistant.js';
import { checkAnswer } from '../src/math-engine.js';
import { markSchemeIndex } from '../src/mark-scheme-index.js';
import { pastPapers } from '../src/past-paper-catalog.js';
import { pastPaperStructure } from '../src/past-paper-structure.js';

test('equivalent values and algebraic forms are checked symbolically without treating all forms as interchangeable',()=>{
 for(const [a,b] of [['0.5','2/4'],['1000','1×10^3'],['sqrt(49)','7'],['2*pi','2π'],['14','2(3+4)'],['x^2+5x+6','(x+2)(x+3)'],['3x+6','3(x+2)'],['0.1x+0.2x','0.3x'],['x+3','3+x'],['(x+1)/(x-2)','(2x+2)/(2x-4)']]) {
   // Different polynomial denominator scale still needs domain confirmation.
   const comparison=compareMathAnswers(a,b);
   if(a.includes('/(x-2)'))assert.equal(comparison.status,'unverified'); else assert.equal(comparison.status,'equivalent',`${a} vs ${b}`);
 }
 for(const [a,b] of [['x^2+5x+6','(x+2)(x+4)'],['4','-4'],['x','y']])assert.equal(compareMathAnswers(a,b).status,'different');
 for(const value of ['alert(1)','sin(x)','1/0','x/x','1'.repeat(501)])assert.equal(compareMathAnswers('1',value).status,'unverified');
 assert.equal(compareMathAnswers('x/x','1').status,'unverified');
 assert.equal(checkAnswer({type:'shortAnswer',answer:'3x+6',text:'Find an expression for 2x+x+6.'},'3(x+2)'),true);
 assert.equal(checkAnswer({type:'shortAnswer',answer:'(x+2)(x+3)',text:'Factorise x²+5x+6.'},'x^2+5x+6'),false);
 assert.equal(checkAnswer({type:'shortAnswer',answer:'(x+2)(x+3)',text:'Factorise x²+5x+6.'},'(3+x)(2+x)'),true);
});

test('alternative linear solution steps and factorisations retain credit while unrelated arithmetic does not earn method marks',()=>{
 assert.equal(checkEquivalentEquations('2x+6=14','x+3=7').status,'equivalent');
 assert.equal(checkEquivalentEquations('2x+6=14','x=4').status,'equivalent');
 assert.equal(checkEquivalentEquations('2x+6=14','x=5').status,'different');
 assert.equal(checkEquivalentEquations('x^2=0','x=0').status,'unverified');
 assert.equal(checkEquivalentEquations('x^2-5x+6=0','(x-2)(x-3)=0').status,'equivalent');
 const lines=checkAlgebraWorking('x+3=7\nx=4','2x+6=14');
 assert.ok(lines.every(line=>line.status==='equivalent'));
 const multi={type:'numerical',text:'Solve 2x+6=14.',answer:'4',marks:3,markScheme:['Subtract 6.','Divide by 2.','x=4.']};
 const valid=assessTypedWorking(multi,'8/2','x+3=7\nx=4');
 assert.equal(valid.answer.status,'equivalent');
 assert.equal(valid.verifiedMark,null,'method marks are not awarded by line counts');
 assert.equal(assessTypedWorking(multi,'5','40=40').verifiedMark,null);
 const independent={type:'numerical',text:'Find half of 1.',answer:'0.5',marks:1};
 assert.equal(assessTypedWorking(independent,'2/4','').verifiedMark,1);
 assert.equal(assessTypedWorking({...independent,text:'Show that half of 1 is 0.5.'},'0.5','').verifiedMark,null);
});

test('every scheme is indexed honestly, and verified part marks reconcile per question with the scanned original paper',()=>{
 assert.equal(Object.keys(markSchemeIndex).length,pastPapers.length);
 let verified=0;
 for(const paper of pastPapers){
   const reference=markSchemeIndex[paper.id];
   assert.ok(['verified-index','needs-review','missing','unavailable'].includes(reference.status));
   if(!paper.markSchemeUrl)assert.equal(reference.status,'missing');
   if(reference.status!=='verified-index')continue;
   verified++;
   const structure=pastPaperStructure[paper.id];
   assert.equal(reference.rows.reduce((sum,row)=>sum+row.maximum,0),structure.totalMarks);
   for(const q of structure.questions)assert.equal(reference.rows.filter(row=>Number(row.label.match(/^Q(\d+)/)[1])===q.number).reduce((sum,row)=>sum+row.maximum,0),q.marks);
   for(const row of reference.rows)if(row.numericAnswer!==undefined){assert.equal(row.maximum,1);assert.match(row.numericAnswer,/^-?\d+(?:\.\d+)?$/);assert.ok(!row.rules.some(rule=>['FT','SC','dep','nfww','awrt'].includes(rule)));}
 }
 assert.ok(verified>0);
 const [id,index]=Object.entries(markSchemeIndex).find(([,index])=>index.status==='verified-index'&&index.rows.some(row=>row.numericAnswer!==undefined));
 const row=index.rows.find(row=>row.numericAnswer!==undefined);
 assert.throws(()=>assessOfficialWorking(id,{label:row.label,answer:row.numericAnswer,confirmed:false}));
 const check=assessOfficialWorking(id,{label:row.label,answer:`(${row.numericAnswer})*2/2`,confirmed:true});
 assert.equal(check.answer.status,'equivalent');assert.equal(check.verifiedMark,1);
 const [unverifiedId,unverified]=Object.entries(markSchemeIndex).find(([,index])=>index.status==='needs-review'&&index.rows.length);
 const pending=assessOfficialWorking(unverifiedId,{label:unverified.rows[0].label,answer:'1/2',expected:'0.5',confirmed:true});
 assert.equal(pending.answer.status,'equivalent');assert.equal(pending.verifiedMark,null,'unverified scans do not supply automatic marks');
});
