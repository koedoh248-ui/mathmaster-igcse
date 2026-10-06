import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/cloud.js',import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const initial={users:[{id:'student-1',email:'learner@example.com',role:'student',profile:{name:'Learner',xp:0,studyPlan:null},revision:0}],currentEmail:'learner@example.com',content:{questions:[],lessons:[]},contentRevision:0,messages:[]};
async function fixture() {
 const saved=new Map(); let server=copy(initial), offline=false, conflict=false, refreshes=0;
 globalThis.location={protocol:'https:',href:'https://mathmaster.example/index.html'};
 globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 saved.set('mathmaster-cloud-session-student',JSON.stringify({user:{id:'student-1'},access_token:'test-token',refresh_token:'test-refresh',expires_at:Date.now()/1000+3600}));
 globalThis.fetch=async (url,options={})=>{
  if(offline) throw new Error('Connection unavailable');
  let data={},status=200;
  if(url.endsWith('/auth/v1/user')) data={id:'student-1'};
  else if(url.includes('grant_type=refresh_token')) {refreshes++;data={user:{id:'student-1'},access_token:'new-token',refresh_token:'test-refresh',expires_at:Date.now()/1000+3600};}
  else if(url.endsWith('/mm_bootstrap')) data=copy(server);
  else if(url.endsWith('/mm_save_profile')) {
   const args=JSON.parse(options.body);
   if(args.p_id!=='student-1') {status=403;data={message:'Access denied'};}
   else if(conflict) {status=409;data={message:'Progress changed on another device'};}
   else {server.users[0].profile={...server.users[0].profile,...args.p_patch};data={revision:++server.users[0].revision,managedProfileRevision:0};}
  } else if(url.endsWith('/mm_save_content')) {status=403;data={message:'Administrator access required'};}
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 };
 const code=source.replace('import { cloudConfig } from "./cloud-config.js";','const cloudConfig={url:"https://supabase.test",publishableKey:"sb_publishable_test"};');
 const cloud=await import(`data:text/javascript;base64,${Buffer.from(code+'\n// '+Math.random()).toString('base64')}`);
 return {cloud,saved,get server(){return server;},set offline(v){offline=v;},set conflict(v){conflict=v;},get refreshes(){return refreshes;}};
}
async function settle(cloud) { for(let i=0;i<15;i++) {await new Promise(resolve=>setImmediate(resolve)); await cloud.flushCloud();} }
test('cloud saves progress without accepting a forged client role or leaking other profiles',async()=>{
 const f=await fixture(); await f.cloud.initializeCloud();
 const store=f.cloud.cloudStore(); store.users[0].profile.xp=15;store.users[0].role='admin';f.cloud.cloudSaveStore(store);await settle(f.cloud);
 assert.equal(f.server.users[0].profile.xp,15);assert.equal(f.cloud.cloudActor().role,'student');assert.equal(f.cloud.cloudStore().users.length,1);
 assert.equal(f.saved.has('mathmaster-cloud-pending-student-1'),false);
});
test('offline progress remains journaled and retry sync sends it once connected',async()=>{
 const f=await fixture();await f.cloud.initializeCloud();f.offline=true;
 const store=f.cloud.cloudStore();store.users[0].profile.studyPlan={days:5,minutes:30};f.cloud.cloudSaveStore(store);await settle(f.cloud);
 assert.match(f.cloud.cloudStatus(),/Sync paused/);assert.ok(f.saved.has('mathmaster-cloud-pending-student-1'));
 await assert.rejects(f.cloud.cloudSignOut(),/Finish syncing/);
 f.offline=false;await settle(f.cloud);assert.deepEqual(f.server.users[0].profile.studyPlan,{days:5,minutes:30});assert.match(f.cloud.cloudStatus(),/Saved/);
});
test('conflicts retain pending answers and students cannot publish shared content',async()=>{
 const f=await fixture();await f.cloud.initializeCloud();f.conflict=true;
 const store=f.cloud.cloudStore();store.users[0].profile.xp=20;f.cloud.cloudSaveStore(store);await settle(f.cloud);
 assert.equal(f.server.users[0].profile.xp,0);assert.equal(f.cloud.cloudActor().profile.xp,20);assert.ok(f.saved.has('mathmaster-cloud-pending-student-1'));
 f.conflict=false;await settle(f.cloud);
 const content=f.cloud.cloudStore();content.content.questions.push({id:'forged'});f.cloud.cloudSaveStore(content);await settle(f.cloud);
 assert.match(f.cloud.cloudStatus(),/Administrator access required/);assert.equal(f.server.content.questions.length,0);
});
