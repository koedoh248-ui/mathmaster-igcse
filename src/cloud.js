import { cloudConfig } from "./cloud-config.js";
export const cloudEnabled = Boolean(cloudConfig.url && cloudConfig.publishableKey && ["https:","http:"].includes(globalThis.location?.protocol));
const clone = value => JSON.parse(JSON.stringify(value));
const blank = () => ({ users: [], currentEmail: null, content: { questions: [], lessons: [] }, messages: [], contentRevision: 0 });
let cache = blank(), base = blank(), session = null, adminPortal = false, saving = false, failed = false;
let status = "Connecting…", listener = () => {};
const sessionKey = () => `mathmaster-cloud-session-${adminPortal ? 'admin' : 'student'}`;
const journalKey = () => `mathmaster-cloud-pending-${session?.user?.id || 'none'}`;
function announce(message) { status = message; listener(message); }
export function cloudStatus() { return status; }
export function onCloudStatus(callback) { listener = callback; }
export function cloudStore() { return clone(cache); }
export function cloudActor() { return cache.users.find(u => u.id === session?.user?.id) || null; }
function persistSession() { localStorage.setItem(sessionKey(),JSON.stringify(session)); }
async function responseJSON(response) {
 const value = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(value.msg || value.error_description || value.message || value.error || `Server returned ${response.status}`);
 return value;
}
async function refreshSession() {
 if (!session?.refresh_token) throw new Error('Sign in again to sync your saved progress.');
 const response = await fetch(`${cloudConfig.url}/auth/v1/token?grant_type=refresh_token`, {method:'POST',headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
 session = await responseJSON(response); persistSession();
}
export async function cloudRequest(path, options = {}) {
 if (!session?.access_token) throw new Error('Sign in first.');
 if ((session.expires_at || 0) * 1000 < Date.now() + 30000) await refreshSession();
 const run = () => fetch(`${cloudConfig.url}${path}`,{...options,headers:{apikey:cloudConfig.publishableKey,Authorization:`Bearer ${session.access_token}`,...options.headers}});
 let response = await run();
 if (response.status===401) { await refreshSession(); response=await run(); }
 return response;
}
export async function cloudRPC(name,args={}) {
 return responseJSON(await cloudRequest(`/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)}));
}
async function bootstrap() {
 const result = await cloudRPC('mm_bootstrap');
 if (!result.users.some(u=>u.id===session.user.id)) throw new Error('Account profile is unavailable.');
 base=clone(result); cache=clone(result);
 const actor=cloudActor();
 if (adminPortal && actor.role!=='admin') { session=null; persistSession(); cache=blank(); base=blank(); throw new Error('This account does not have administrator access.'); }
 const saved=JSON.parse(localStorage.getItem(journalKey()) || 'null');
 if (saved?.actor===actor.id) {
  const identities=result.users;
  for(const store of [saved.cache,saved.base]) store.users=store.users.filter(u=>identities.some(i=>i.id===u.id)).map(u=>{const identity=identities.find(i=>i.id===u.id);return {...u,email:identity.email,role:identity.role};});
  cache=saved.cache; base=saved.base; cache.currentEmail=actor.email;
 }
 announce('Connected');
 await flushCloud();
}
async function initializeCloudSession(admin=false) {
 if (!cloudEnabled) return;
 adminPortal=admin;
 const parameters=new URLSearchParams((location.hash || '').replace(/^#/,''));
 if(parameters.get('access_token') && parameters.get('refresh_token')) {
  session={access_token:parameters.get('access_token'),refresh_token:parameters.get('refresh_token'),expires_at:Date.now()/1000+Number(parameters.get('expires_in') || 3600)};
  passwordLink=['recovery','invite'].includes(parameters.get('type'));
  if(globalThis.history?.replaceState) history.replaceState(null,'',location.pathname+location.search);
  const identity=await responseJSON(await cloudRequest('/auth/v1/user')); session.user=identity; persistSession(); await bootstrap(); return;
 }
 try { session=JSON.parse(localStorage.getItem(sessionKey()) || 'null'); } catch { session=null; }
 if (!session) { announce('Sign in to sync'); return; }
 // Server validation, never a client email or role, establishes the identity.
 const identity=await responseJSON(await cloudRequest('/auth/v1/user'));
 session.user=identity; persistSession(); await bootstrap();
}
export async function initializeCloud(admin=false) {
 try { await initializeCloudSession(admin); }
 catch(error) { announce(`Connection unavailable: ${error.message}`); throw error; }
}
export async function cloudSignIn(email,password) {
 session=await responseJSON(await fetch(`${cloudConfig.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})}));
 persistSession(); await bootstrap(); return cloudActor();
}
export async function cloudSignUp(email,password,profile) {
 const redirect = new URL('./index.html',location.href).href.split('#')[0];
 const result=await responseJSON(await fetch(`${cloudConfig.url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{name:profile.name,profile}})}));
 if (!result.access_token) return null;
 session=result; persistSession(); await bootstrap();
 const actor=cloudActor(); actor.profile={...actor.profile,...profile};
 cache.users[cache.users.findIndex(u=>u.id===actor.id)]=actor; cloudSaveStore(cache); await flushCloud(); return cloudActor();
}
function journal() {
 if (!session) return;
 localStorage.setItem(journalKey(),JSON.stringify({actor:session.user.id,cache,base}));
}
export function cloudSaveStore(store) {
 if (!session) throw new Error('Sign in to save progress.');
 // Keep immutable identity/role fields from server records.
 const next=clone(store);
 for(const account of next.users) {
  const known=cache.users.find(u=>u.id===account.id);
  if (!known) throw new Error('Unknown account.');
  account.email=known.email; account.role=known.role;
 }
 cache={...cache,...next}; journal(); failed=false; announce('Syncing…');
 void flushCloud();
}
export async function flushCloud() {
 if (!cloudEnabled || !session || saving) return;
 saving=true;
 try {
  while(true) {
   const desired=clone(cache); let changed=false;
   for(const account of desired.users) {
    const original=base.users.find(u=>u.id===account.id); if(!original) continue;
    const patch={};
    for(const [key,value] of Object.entries(account.profile)) if(JSON.stringify(value)!==JSON.stringify(original.profile[key])) patch[key]=value;
    if(!Object.keys(patch).length) continue;
    changed=true;
    const result=await cloudRPC('mm_save_profile',{p_id:account.id,p_patch:patch,p_base:original.profile});
    original.profile={...original.profile,...patch}; original.revision=result.revision; original.managedProfileRevision=result.managedProfileRevision;
    const current=cache.users.find(u=>u.id===account.id); current.revision=result.revision; current.managedProfileRevision=result.managedProfileRevision;
    journal();
   }
   if(JSON.stringify(desired.content)!==JSON.stringify(base.content)) {
    changed=true; base.contentRevision=await cloudRPC('mm_save_content',{p_content:desired.content,p_revision:base.contentRevision}); base.content=desired.content; cache.contentRevision=base.contentRevision; journal();
   }
   const pending=(cache.messages||[]).filter(m=>m.pending);
   for(const message of pending) {
    changed=true;
    await cloudRPC('mm_send_message',{p_id:message.id,p_learner:message.learnerId,p_body:message.body});
    const current=cache.messages.find(m=>m.id===message.id); if(current) delete current.pending; journal();
   }
   if(!changed) break;
  }
  failed=false; localStorage.removeItem(journalKey()); announce('Saved to your account');
 } catch(error) { failed=true; announce(`Sync paused: ${error.message} Changes are kept on this device. Use Retry sync.`); }
 finally {saving=false;}
}
export async function cloudSignOut() {
 await flushCloud();
 if(saving || failed) throw new Error('Finish syncing before signing out. Your pending changes are still on this device.');
 const response=await cloudRequest('/auth/v1/logout?scope=local',{method:'POST'});
 if(!response.ok) await responseJSON(response);
 localStorage.removeItem(sessionKey()); session=null; cache=blank(); base=blank(); announce('Signed out');
}
export async function refreshCloud() {
 if(saving || failed || !session) return false;
 await flushCloud(); if(failed) return false;
 const snapshot=JSON.stringify(cache);
 const result=await cloudRPC('mm_bootstrap');
 if(saving || failed || JSON.stringify(cache)!==snapshot) return false;
 base=clone(result); cache=clone(result); return true;
}
export async function cloudChangePassword(current,password) {
 const email=cloudActor()?.email;
 await responseJSON(await fetch(`${cloudConfig.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,password:current})}));
 await responseJSON(await cloudRequest('/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}));
}
export function cloudSendMessage(learnerEmail,body) {
 const learner=cache.users.find(u=>u.email===learnerEmail), actor=cloudActor();
 if(!learner || (!actor || (actor.role!=='admin'&&actor.id!==learner.id))) throw new Error('Conversation unavailable.');
 const message={id:crypto.randomUUID(),learnerId:learner.id,learnerEmail,senderEmail:actor.email,senderRole:actor.role,body,date:new Date().toISOString(),pending:true};
 cache.messages.push(message); journal(); announce('Sending message…'); void flushCloud(); return message;
}
export async function cloudSaveFile(owner,file) {
 const actor=cloudActor(); if(actor?.email!==owner) throw new Error('Sign in as the file owner.');
 const id=`${actor.id}/${crypto.randomUUID()}`;
 await responseJSON(await cloudRequest(`/storage/v1/object/mathmaster-work/${id}`,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file}));
 return {id,name:file.name || 'Paper working',type:file.type,size:file.size,created:new Date().toISOString()};
}
export async function cloudReadFile(owner,id) {
 const actor=cloudActor(), learner=cache.users.find(u=>u.email===owner);
 if(!learner || (!actor || (actor.role!=='admin'&&actor.id!==learner.id)) || !id.startsWith(`${learner.id}/`)) return null;
 const response=await cloudRequest(`/storage/v1/object/authenticated/mathmaster-work/${id}`);
 if(!response.ok) await responseJSON(response); return response.blob();
}
export async function cloudDeleteFile(owner,id) {
 const actor=cloudActor(); if(actor?.email!==owner || !id.startsWith(`${actor.id}/`)) throw new Error('Access denied.');
 await responseJSON(await cloudRequest('/storage/v1/object/mathmaster-work',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[id]})}));
}

let passwordLink = false;
export function cloudNeedsPassword() { return passwordLink; }
export async function cloudResetEmail(email) {
 const redirect=new URL('./index.html',location.href).href.split('#')[0];
 await responseJSON(await fetch(`${cloudConfig.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:{apikey:cloudConfig.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email})}));
}
export async function cloudSetPassword(password) {
 if(!passwordLink) throw new Error('Open your account recovery link first.');
 await responseJSON(await cloudRequest('/auth/v1/user',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}));
 passwordLink=false;
}
