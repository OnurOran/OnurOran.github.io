/**
 * posts/ is where articles are authored. This turns them into Astro content.
 *
 * Two conversions matter:
 *   - the `> **[GÖRSEL n]** \`path\`` markers become real markdown images,
 *     with the caption as an italic line underneath (portable: renders here,
 *     and survives Medium's importer as a normal paragraph)
 *   - horizontal rules are dropped; they add nothing here and Medium's
 *     importer turns each one into a stray empty paragraph
 */
import { readdir, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const POSTS = path.resolve(SITE, "..", "posts");
const CONTENT = path.join(SITE, "src", "content");
const PUBLIC_IMG = path.join(SITE, "public", "images");

const LANG_OF = (file) => (file.endsWith(".tr.md") ? "tr" : file.endsWith(".en.md") ? "en" : null);

const MARKER_HEAD = /\*\*\[(?:IMAGE|GÖRSEL)[^\]]*\]\*\*\s*`([^`]+)`/;

function convert(md, slug) {
  // strip the h1 and the ### dek — they become frontmatter
  const lines = md.split("\n");
  let title = "";
  let dek = "";
  const body = [];
  for (const ln of lines) {
    if (!title && ln.startsWith("# ")) { title = ln.slice(2).trim(); continue; }
    if (title && !dek && ln.startsWith("### ")) { dek = ln.slice(4).trim(); continue; }
    body.push(ln);
  }

  const out = [];
  for (let i = 0; i < body.length; i++) {
    const ln = body[i];

    // gather a whole blockquote block, then decide what it is
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
        const file = head[1].split("/").pop();
        const cap = block.match(/(?:Caption|Altyazı):\s*\*([^*]+)\*/);
        const caption = cap ? cap[1].trim() : "";
        const alt = (caption || file).replace(/[[\]]/g, "");
        out.push(`![${alt}](/images/${slug}/${file})`);
        if (caption) out.push("", `*${caption}*`);
      } else {
        out.push(...buf.map((b) => `> ${b}`));
      }
      continue;
    }

    if (ln.trim() === "---") continue; // horizontal rules add nothing here
    out.push(ln);
  }

  return {
    title,
    dek,
    body: out.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

const esc = (s) => s.replace(/"/g, '\\"');

async function main() {
  const dirs = (await readdir(POSTS, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);

  for (const lang of ["en", "tr"]) {
    await rm(path.join(CONTENT, lang), { recursive: true, force: true });
    await mkdir(path.join(CONTENT, lang), { recursive: true });
  }
  await rm(PUBLIC_IMG, { recursive: true, force: true });
  await mkdir(PUBLIC_IMG, { recursive: true });

  let count = 0;
  for (const dir of dirs) {
    const slug = dir;
    const full = path.join(POSTS, dir);
    const files = (await readdir(full)).filter((f) => LANG_OF(f));

    const imgDir = path.join(full, "images");
    if (existsSync(imgDir)) {
      await cp(imgDir, path.join(PUBLIC_IMG, slug), { recursive: true });
    }

    // date comes from the folder name: YYYY-MM-topic
    const m = slug.match(/^(\d{4})-(\d{2})/);
    const pubDate = m ? `${m[1]}-${m[2]}-01` : "2026-01-01";

    for (const file of files) {
      const lang = LANG_OF(file);
      const md = await readFile(path.join(full, file), "utf8");
      const { title, dek, body } = convert(md, slug);
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
      count++;
    }
  }
  console.log(`sync: ${count} dosya, ${dirs.length} yazı klasörü`);
}

main();
