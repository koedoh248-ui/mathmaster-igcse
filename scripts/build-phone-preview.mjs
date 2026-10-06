import { writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { buildPrivateTest } from './build-private-copy.mjs';

const student = (await buildPrivateTest()).replace(
  'const isAdminPortal = new URLSearchParams(location.search).get("portal") === "admin" || new URLSearchParams(location.search).get("preview") === "admin";',
  'const isAdminPortal = window.__phonePortal === "admin";'
);
if (!student.includes('const isAdminPortal = window.__phonePortal')) throw Error('Phone portal mapping needs updating.');
const embedded = JSON.stringify(student).replace(/</g, '\\u003c');
const script = `const website = ${embedded};
const frame = document.querySelector('#phone-site');
const status = document.querySelector('#preview-status');
function openPortal(portal) {
  const setup = '<script>window.__phonePortal=' + JSON.stringify(portal) + ';document.addEventListener("click",function(event){const link=event.target.closest("a");if(!link)return;const href=link.getAttribute("href")||"";if(href.startsWith("?portal=")){event.preventDefault();parent.postMessage({phonePreviewPortal:href.includes("portal=admin")?"admin":"student"},"*");}});<\\/script>';
  frame.srcdoc = website.replace('<body>', '<body>' + setup);
  status.textContent = portal === 'admin' ? 'Admin view · use Open local admin preview to explore' : 'Student view · create or sign in to a private test account';
  document.querySelectorAll('[data-portal]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.portal===portal)));
}
document.querySelectorAll('[data-portal]').forEach(button=>button.addEventListener('click',()=>openPortal(button.dataset.portal)));
document.querySelector('#phone-width').addEventListener('change',event=>document.documentElement.style.setProperty('--phone-width',event.target.value+'px'));
window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&['student','admin'].includes(event.data?.phonePreviewPortal))openPortal(event.data.phonePreviewPortal);});
openPortal('student');`;
new Script(script, { filename:'phone-preview-wrapper.js' });
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>MathMaster · Phone preview</title>
<style>
:root{color-scheme:dark;--phone-width:390px;font-family:system-ui,sans-serif;background:#090e17;color:#edf3fc}*{box-sizing:border-box}body{margin:0;padding:28px 16px 40px}header{max-width:850px;margin:0 auto 24px;text-align:center}h1{font-size:25px;margin:0 0 10px}p{color:#a6b4c9;font-size:14px;line-height:1.7}nav{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px;margin:20px 0}button,select{font:inherit;font-size:14px;min-height:44px;border:1px solid #29364a;border-radius:9px;background:#182333;color:#edf3fc;padding:10px 14px}button{cursor:pointer}button[aria-pressed="true"]{border-color:#63efd5;color:#63efd5}label{display:flex;align-items:center;gap:10px;font-size:14px}.phone{background:#0d1420;border:2px solid #354459;border-radius:34px;box-shadow:0 20px 70px #0005;max-width:100%;padding:12px 8px 18px;width:calc(var(--phone-width) + 20px);margin:auto}.speaker{width:70px;height:5px;background:#354459;border-radius:9px;margin:0 auto 12px}.screen{border-radius:22px;overflow:hidden;width:100%;background:#090e17}iframe{border:0;display:block;width:100%;height:844px}.home-indicator{width:100px;height:4px;background:#526277;border-radius:9px;margin:14px auto 0}footer{text-align:center;max-width:600px;margin:24px auto;font-size:13px;color:#a6b4c9}button:focus-visible,select:focus-visible{outline:2px solid #63efd5;outline-offset:3px}@media(max-width:450px){body{padding:20px 8px}.phone{border-radius:26px;padding:8px 3px 12px}iframe{height:75vh;min-height:600px}}
</style></head><body><header><h1>MathMaster phone preview</h1><p>Use the website inside the phone. Tap the menu, scroll, and try the calendar, settings and help chat.</p><nav aria-label="Preview controls"><button type="button" data-portal="student" aria-pressed="true">Student</button><button type="button" data-portal="admin" aria-pressed="false">Admin</button><label>Phone width<select id="phone-width"><option value="360">Small · 360px</option><option value="390" selected>Standard · 390px</option><option value="430">Large · 430px</option></select></label></nav><p id="preview-status" aria-live="polite"></p></header><main class="phone"><div class="speaker" aria-hidden="true"></div><div class="screen"><iframe id="phone-site" title="MathMaster mobile website"></iframe></div><div class="home-indicator" aria-hidden="true"></div></main><footer>This standalone preview uses the private test accounts saved in this browser. It simulates a narrow layout; real phones may differ. No extra files are required.</footer><script>${script}</script></body></html>`;
await writeFile(new URL('../phone-preview.html',import.meta.url),html);
console.log(`Created phone-preview.html (${Math.round(Buffer.byteLength(html)/1024)} KB), with embedded current website and student/admin views.`);
