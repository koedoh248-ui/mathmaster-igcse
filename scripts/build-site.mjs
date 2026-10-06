import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "admin.html", "styles.css", "manifest.webmanifest", "service-worker.js", "src"]) {
  await cp(resolve(root, entry), resolve(output, entry), { recursive: true });
}
await writeFile(resolve(output, ".nojekyll"), "");
console.log("GitHub Pages site built in dist/");
