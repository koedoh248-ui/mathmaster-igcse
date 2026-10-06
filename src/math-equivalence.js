import { evaluateCalculation } from './calculation-checker.js';
// Exact rational arithmetic for bounded, single-variable polynomial expressions.
// Unsupported notation is left for review; no eval or sampled-value matching.
const gcd = (a,b) => { a=a<0n?-a:a; b=b<0n?-b:b; while(b) [a,b]=[b,a%b]; return a||1n; };
const fraction = (n,d=1n) => { if(n.toString(2).length>8192||d.toString(2).length>8192)throw Error('Expression too complex'); if(!d) throw Error('Division by zero'); if(d<0n){n=-n;d=-d;} const g=gcd(n,d); return [n/g,d/g]; };
const add = (a,b) => fraction(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const mul = (a,b) => fraction(a[0]*b[0],a[1]*b[1]);
const neg = a => [-a[0],a[1]];
const zero = () => [0n,1n];
function trim(p){while(p.length>1&&!p.at(-1)[0])p.pop();return p;}
function sumPoly(a,b,sign=1){return trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>add(a[i]||zero(),sign===1?b[i]||zero():neg(b[i]||zero()))));}
function product(a,b){if(a.length+b.length>26)throw Error('Expression too complex');const p=Array.from({length:a.length+b.length-1},zero);a.forEach((x,i)=>b.forEach((y,j)=>p[i+j]=add(p[i+j],mul(x,y))));return trim(p);}
const constant = q => ({n:[q],d:[[1n,1n]]});
const plus = (a,b,sign=1) => ({n:sumPoly(product(a.n,b.d),product(b.n,a.d),sign),d:product(a.d,b.d)});
const times = (a,b) => ({n:product(a.n,b.n),d:product(a.d,b.d)});
const over = (a,b) => {if(b.n.every(q=>q[0]===0n))throw Error('Division by zero');return {n:product(a.n,b.d),d:product(a.d,b.n)};};
const equalPoly = (a,b) => a.length===b.length&&a.every((q,i)=>q[0]===b[i][0]&&q[1]===b[i][1]);
function source(value){return String(value??'').trim().replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\s+/g,'');}
function parse(value){
 const text=source(value);if(text.length>250)throw Error('Expression too long');
 const raw=text.match(/\d+(?:\.\d*)?|\.\d+|[a-zA-Z]|[()+*/^\-]/g)||[];
 if(raw.join('')!==text||!raw.length)throw Error('Unsupported expression');
 const variables=[...new Set(raw.filter(t=>/^[a-zA-Z]$/.test(t)))];if(variables.length>1)throw Error('Multiple variables need review');
 const tokens=[];raw.forEach((t,i)=>{const prev=raw[i-1];if(prev&&(/^(?:\d|\.|[a-zA-Z])/.test(prev)||prev===')')&&(/^[a-zA-Z]$/.test(t)||t==='('))tokens.push('*');tokens.push(t);});
 let index=0, depth=0;
 function atom(){if(++depth>30)throw Error('Expression too deeply nested');const t=tokens[index++];let result;
  if(t==='('){result=expression();if(tokens[index++]!==')')throw Error('Missing bracket');}
  else if(/^[a-zA-Z]$/.test(t||''))result={n:[zero(),[1n,1n]],d:[[1n,1n]]};
  else if(/^\d|^\./.test(t||'')){const [whole,decimal='']=t.split('.');result=constant(fraction(BigInt((whole||'0')+decimal),10n**BigInt(decimal.length)));}
  else throw Error('Missing value'); depth--;return result;}
 function power(){let result=atom();if(tokens[index]==='^'){index++;let sign=1;if(tokens[index]==='-'){sign=-1;index++;}const exponent=Number(tokens[index++]);if(!Number.isInteger(exponent)||exponent<0||exponent>12)throw Error('Unsupported power');const base=result;result=constant([1n,1n]);for(let i=0;i<exponent;i++)result=times(result,base);if(sign<0)result=over(constant([1n,1n]),result);}return result;}
 function unary(){if(tokens[index]==='-'){index++;const value=unary();return {n:value.n.map(neg),d:value.d};}if(tokens[index]==='+'){index++;return unary();}return power();}
 function term(){let value=unary();while(['*','/'].includes(tokens[index])){const op=tokens[index++],right=unary();value=op==='*'?times(value,right):over(value,right);}return value;}
 function expression(){let value=term();while(['+','-'].includes(tokens[index])){const op=tokens[index++];value=plus(value,term(),op==='+'?1:-1);}return value;}
 const result=expression();if(index!==tokens.length)throw Error('Unsupported notation');return {...result,variable:variables[0]||null};
}
function result(status,message){return {status,message};}
export function compareMathAnswers(expected,actual,{tolerance=1e-9}={}){
 if(!String(actual??'').trim())return result('unverified','No answer entered.');
 const clean = value => source(value).replace(/^[a-zA-Z]=(?=[\d.\-])/,'');
 const a=clean(expected),b=clean(actual);
 try{const x=evaluateCalculation(a),y=evaluateCalculation(b);return Math.abs(x-y)<=Math.max(tolerance,Math.abs(x)*tolerance)?result('equivalent','Equivalent numerical value, including fractions, arithmetic expressions and standard form.'):result('different','The numerical values differ. Check the calculation and requested accuracy.');}catch{}
 try{const x=parse(a),y=parse(b);if(x.variable&&y.variable&&x.variable!==y.variable)return result('different','The variable names differ.');
  if(!equalPoly(product(x.n,y.d),product(y.n,x.d)))return result('different','These expressions are not algebraically equivalent.');
  if((x.d.length>1||y.d.length>1)&&!equalPoly(x.d,y.d))return result('unverified','The expressions agree where defined, but denominator restrictions need review.');
  return result('equivalent','Exactly equivalent after expanding and collecting terms. Factored and expanded forms are accepted.');
 }catch{return result('unverified','This notation, diagram, explanation or method needs a reviewer. It has not been marked wrong.');}
}
function equation(value){const parts=String(value).split('=');if(parts.length!==2)throw Error('Use one equality');const left=parse(parts[0]),right=parse(parts[1]);if(left.variable&&right.variable&&left.variable!==right.variable)throw Error('Variable mismatch');const difference=plus(left,right,-1);if(difference.d.length!==1||difference.n.length>3)throw Error('Equation requires domain or higher-order review');return {...difference,variable:left.variable||right.variable};}
function normalized(p){const leading=p.at(-1);if(!leading[0])return p;return p.map(q=>fraction(q[0]*leading[1],q[1]*leading[0]));}
export function checkEquivalentEquations(expected,actual){
 try{const a=equation(expected),b=equation(actual);if(a.variable!==b.variable)return result('unverified','Different variables need review.');if(a.n.every(q=>!q[0])||b.n.every(q=>!q[0]))return result('unverified','An identity alone does not prove a solution.');if(equalPoly(normalized(a.n),normalized(b.n)))return result('equivalent','The equations have the same solution set. Rearrangement or scaling is valid.');if(a.n.length>2||b.n.length>2)return result('unverified','This nonlinear transformation needs review for missing or extra solutions.');return result('different','This transformation changes the linear equation’s solution.');}
 catch{return result('unverified','Review this equation manually, including domain restrictions or extra solutions.');}
}
export function checkAlgebraWorking(working,referenceEquation=''){
 let reference=referenceEquation;
 return String(working||'').split(/\r?\n/).slice(0,100).map((text,index)=>{
  if(!text.includes('='))return null;
  const parts=text.split('=').map(s=>s.trim());let check;
  if(parts.length===2){check=compareMathAnswers(parts[0],parts[1]);
   if(check.status!=='equivalent'&&reference){check=checkEquivalentEquations(reference,text);if(check.status==='equivalent')reference=text;}
  }else check=result('unverified','Check chained equalities or split the steps across separate lines.');
  return {line:index+1,text,...check};
 }).filter(Boolean);
}
