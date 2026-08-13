/**
 * posts/ is where articles are authored. This turns them into Astro content.
 *
 * Two conversions matter:
 *   - the `> **[GÖRSEL n]** \`path\`` markers become real markdown images,
 *     with the caption as an italic line underneath (portable: renders here,
 *     and survives Medium's importer as a normal paragraph)
 *   - horizontal rules are dropped; they add nothing here and Medium's
 *     importer turns each one into a stray empty paragraph
 *
 * It refuses to produce output it cannot vouch for. A silent pass that ships a
 * broken article is worse than a failed build, so every problem below is fatal.
 */
import { readdir, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const POSTS = path.resolve(SITE, "..", "posts");
const CONTENT = path.join(SITE, "src", "content");
const PUBLIC_IMG = path.join(SITE, "public", "images");

const LANG_OF = (f) => (f.endsWith(".tr.md") ? "tr" : f.endsWith(".en.md") ? "en" : null);
const MARKER_HEAD = /\*\*\[(?:IMAGE|GÖRSEL)[^\]]*\]\*\*\s*`([^`]+)`/;
const LEFTOVER = /\[(?:IMAGE|GÖRSEL)\s*\d/;

const errors = [];
const warnings = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

function convert(md, slug, file, imagesOnDisk) {
  const lines = md.split("\n");
  let title = "";
  let dek = "";
  const body = [];
  for (const ln of lines) {
    if (!title && ln.startsWith("# ")) { title = ln.slice(2).trim(); continue; }
    if (title && !dek && ln.startsWith("### ")) { dek = ln.slice(4).trim(); continue; }
    body.push(ln);
  }

  if (!title) fail(file, "no `# Title` line");
  if (!dek) fail(file, "no `### subtitle` line");

  const used = [];
  const out = [];

  for (let i = 0; i < body.length; i++) {
    const ln = body[i];

    // skip HTML comment blocks wholesale — a commented-out image marker is a
    // note to the author, not something to render
    if (ln.trimStart().startsWith("<!--")) {
      while (i < body.length && !body[i].includes("-->")) i++;
      continue;
    }

    if (ln.startsWith(">")) {
      const buf = [];
      while (i < body.length && body[i].startsWith(">")) {
        buf.push(body[i].replace(/^>\s?/, ""));
        i++;
      }
      i--;
      const block = buf.join(" ").trim();
      const head = block.match(MARKER_HEAD);
      if (head) {
        const fileName = head[1].split("/").pop();
        const cap = block.match(/(?:Caption|Altyazı):\s*\*([^*]+)\*/);
        const caption = cap ? cap[1].trim() : "";
        if (!caption) warnings.push(`${file}: image ${fileName} has no caption`);
        if (!imagesOnDisk.includes(fileName)) fail(file, `image not found on disk: ${fileName}`);
        used.push(fileName);
        const alt = (caption || fileName).replace(/[[\]]/g, "");
        out.push(`![${alt}](/images/${slug}/${fileName})`);
        if (caption) out.push("", `*${caption}*`);
      } else {
        out.push(...buf.map((b) => `> ${b}`));
      }
      continue;
    }

    if (ln.trim() === "---") continue;
    out.push(ln);
  }

  const rendered = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  // a marker that survived means the parser did not understand it — that used to
  // ship silently and leave "▓▓▓ GÖRSEL 3" in a published article
  if (LEFTOVER.test(rendered)) fail(file, "an image marker survived conversion");

  const orphans = imagesOnDisk.filter((f) => !used.includes(f));
  if (orphans.length) warnings.push(`${file}: unused images — ${orphans.join(", ")}`);

  return { title, dek, body: rendered };
}

const esc = (s) => s.replace(/"/g, '\\"');

async function main() {
  if (!existsSync(POSTS)) {
    console.error(`sync: posts/ not found at ${POSTS}`);
    process.exit(1);
  }

  const dirs = (await readdir(POSTS, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);

  for (const lang of ["en", "tr"]) {
    await rm(path.join(CONTENT, lang), { recursive: true, force: true });
    await mkdir(path.join(CONTENT, lang), { recursive: true });
  }
  await rm(PUBLIC_IMG, { recursive: true, force: true });
  await mkdir(PUBLIC_IMG, { recursive: true });

  let written = 0;

  for (const slug of dirs) {
    const full = path.join(POSTS, slug);
    const files = (await readdir(full)).filter((f) => LANG_OF(f));

    if (!files.length) { warnings.push(`${slug}: no .tr.md or .en.md file`); continue; }
    const langs = files.map(LANG_OF);
    if (langs.length === 1) warnings.push(`${slug}: only ${langs[0]}, no translation`);

    const imgDir = path.join(full, "images");
    const imagesOnDisk = existsSync(imgDir) ? await readdir(imgDir) : [];
    if (imagesOnDisk.length) {
      await cp(imgDir, path.join(PUBLIC_IMG, slug), { recursive: true });
    }

    const m = slug.match(/^(\d{4})-(\d{2})/);
    if (!m) { fail(slug, "folder must start with YYYY-MM"); continue; }
    const pubDate = `${m[1]}-${m[2]}-01`;

    for (const file of files) {
      const lang = LANG_OF(file);
      const md = await readFile(path.join(full, file), "utf8");
      const { title, dek, body } = convert(md, slug, file, imagesOnDisk);
      if (!title || !dek) continue;

      const fm = [
        "---",
        `title: "${esc(title)}"`,
        `description: "${esc(dek)}"`,
        `pubDate: ${pubDate}`,
        `lang: "${lang}"`,
        `translationKey: "${slug}"`,
        "---",
        "",
      ].join("\n");
      await writeFile(path.join(CONTENT, lang, `${slug}.md`), fm + body + "\n");
      written++;
    }
  }

  for (const w of warnings) console.warn(`  uyarı  ${w}`);

  if (errors.length) {
    console.error(`\nsync durdu — ${errors.length} hata:`);
    for (const e of errors) console.error(`  hata   ${e}`);
    process.exit(1);
  }

  console.log(`sync: ${written} dosya, ${dirs.length} yazı${warnings.length ? `, ${warnings.length} uyarı` : ""}`);
}

main();
