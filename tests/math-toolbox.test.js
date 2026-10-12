import test from 'node:test';
import assert from 'node:assert/strict';
import { insertMathTemplate, nextMathBlank, mathTemplates } from '../src/math-toolbox.js';
import { checkAnswer } from '../src/math-engine.js';
function field(value, start=value.length, end=start) {
 return {value, selectionStart:start, selectionEnd:end, maxLength:10000, events:[], focus(){}, setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}, setRangeText(text,a,b){this.value=this.value.slice(0,a)+text+this.value.slice(b);this.selectionStart=this.selectionEnd=a+text.length;}, dispatchEvent(event){this.events.push(event);} };
}
test('inserting a template replaces the selection, preserves surrounding working and bubbles input for autosave', () => {
 const f=field('Area = old = 9',7,10);
 assert.equal(insertMathTemplate(f,'sqrt(□)'),true);
 assert.equal(f.value,'Area = sqrt(□) = 9');
 assert.equal(f.value.slice(f.selectionStart,f.selectionEnd),'□');
 assert.equal(f.events[0].type,'input');assert.equal(f.events[0].bubbles,true);
});
test('fraction blanks advance and wrap, then return normal tab navigation once filled', () => {
 const f=field('');insertMathTemplate(f,mathTemplates.find(t=>t.name==='Fraction').text);
 f.setRangeText('1',f.selectionStart,f.selectionEnd);
 assert.equal(nextMathBlank(f),true);assert.equal(f.selectionStart,2);
 f.setRangeText('2',f.selectionStart,f.selectionEnd);
 assert.equal(nextMathBlank(f),false);
 assert.equal(checkAnswer({text:'Simplify the fraction',type:'numerical',answer:'1/2'},f.value),true);
});
test('root and power templates produce checker-compatible numeric expressions', () => {
 for(const [name,numbers,answer] of [['Square root',['49'],'7'],['Power',['2','3'],'8']]) {
  const f=field('');insertMathTemplate(f,mathTemplates.find(t=>t.name===name).text);
  for(const n of numbers){f.setRangeText(n,f.selectionStart,f.selectionEnd);nextMathBlank(f);}
  assert.equal(checkAnswer({text:'Work out the value',type:'numerical',answer},f.value),true);
 }
});
test('readonly, disabled and over-limit answers are not mutated',()=>{
 for(const opts of [{readOnly:true},{disabled:true},{maxLength:4}]) {
  const f=Object.assign(field('1234',2,2),opts);
  assert.equal(insertMathTemplate(f,'sqrt(□)'),false);assert.equal(f.value,'1234');assert.equal(f.events.length,0);
 }
});
