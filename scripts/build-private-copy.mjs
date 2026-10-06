import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// This dependency-free packer handles this project's named, acyclic ES modules.
// Each module keeps its own scope, so double-clicking the HTML needs no imports.
export async function buildPrivateTest() {
  const modules = [], visited = new Set(), visiting = new Set();
  async function visit(path) {
    if (visited.has(path)) return;
    if (visiting.has(path)) throw new Error(`Circular module dependency: ${path}`);
    visiting.add(path);
    let source = await readFile(path, 'utf8');
    const imports = [...source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?\s*$/gm)];
    for (const match of imports) {
      if (!match[2].startsWith('./')) throw new Error(`Unsupported module import: ${match[2]}`);
      await visit(resolve(dirname(path), match[2]));
      const bindings = match[1].split(',').map(binding => binding.trim().replace(/\s+as\s+/g, ': ')).join(', ');
      const id = relative(root, resolve(dirname(path), match[2]));
      source = source.replace(match[0], `const { ${bindings} } = __modules[${JSON.stringify(id)}];\n`);
    }
    const exports = [...source.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var)\s+(\w+)/gm)].map(match => match[1]);
    source = source.replace(/^export\s+(?=(?:async\s+)?function\b|(?:const|let|var)\b)/gm, '');
    if (/^(?:import|export)\s/m.test(source)) throw new Error(`Unsupported module syntax in ${path}`);
    if (path.endsWith('/src/app.js')) {
      source = source.replace('const isAdminPortal = String(location.pathname || "").endsWith("/admin.html");', 'const isAdminPortal = new URLSearchParams(location.search).get("portal") === "admin" || new URLSearchParams(location.search).get("preview") === "admin";');
      source = source.replaceAll('./admin.html?preview=admin', '?portal=admin&preview=admin').replaceAll('./admin.html', '?portal=admin').replaceAll('./index.html', '?portal=student');
      source = source.replace(/^if \("serviceWorker" in navigator[^\n]+\n/m, '');
      source = source.replace('Original learning content · No external services required', 'Private test copy · <a href="?portal=admin">Test admin</a>');
    }
    if (path.endsWith('/src/cloud-config.js')) source = 'const cloudConfig = { url: "", publishableKey: "" };';
    source = source.replaceAll('./index.html', '?portal=student').replaceAll('./admin.html', '?portal=admin');
    source = source.replaceAll('mathmaster-igcse-v1' , 'mathmaster-private-test-v1')
      .replaceAll('mathmaster-admin-session-v1', 'mathmaster-private-admin-session-v1')
      .replaceAll('mathmaster-student-session-v1', 'mathmaster-private-student-session-v1')
      .replaceAll('mathmaster-preferences-v1', 'mathmaster-private-preferences-v1')
      .replaceAll('mathmaster-support-v1', 'mathmaster-private-support-v1')
      .replaceAll('mathmaster-paper-working-v1', 'mathmaster-private-test-working-v1');
    modules.push(`// ${relative(root, path)}\n__modules[${JSON.stringify(relative(root, path))}] = (() => {\n${source}\nreturn { ${exports.join(', ')} };\n})();`);
    visiting.delete(path); visited.add(path);
  }
  await visit(resolve(root, 'src/app.js'));
  const script = `(() => {\n"use strict";\nconst __modules = Object.create(null);\n${modules.join('\n\n')}\n})();`;
  new Script(script, { filename: 'private-test-bundle.js' });
  const css = await readFile(resolve(root, 'styles.css'), 'utf8');
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#090e17"><meta name="robots" content="noindex,nofollow"><title>MathMaster — Private Test Copy</title>
<style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>
<body><noscript>Please enable JavaScript to test MathMaster.</noscript><div id="app"><div class="loading-screen"><span class="brand-mark">M</span><span>Getting your maths ready…</span></div></div>
<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = await buildPrivateTest();
  await writeFile(resolve(root, 'test.html'), html);
  console.log(`Created test.html (${Math.round(Buffer.byteLength(html) / 1024)} KB). Share this file; no source folders are needed.`);
}
