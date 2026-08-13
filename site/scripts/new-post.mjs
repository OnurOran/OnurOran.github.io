/**
 * Scaffolds a post folder so a new article starts in a shape sync-posts.mjs
 * already understands. Usage:
 *
 *   npm run new -- aur-outage
 *   npm run new -- aur-outage 2026-09
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const POSTS = path.resolve(SITE, "..", "posts");

const topic = process.argv[2];
if (!topic) {
  console.error("kullanım: npm run new -- <konu-slug> [YYYY-MM]");
  process.exit(1);
}

const stamp = process.argv[3] || new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(stamp)) {
  console.error(`tarih YYYY-MM olmalı, gelen: ${stamp}`);
  process.exit(1);
}

const slug = `${stamp}-${topic}`;
const dir = path.join(POSTS, slug);

if (existsSync(dir)) {
  console.error(`zaten var: posts/${slug}`);
  process.exit(1);
}

const template = (lang) => {
  const tr = lang === "tr";
  return `# ${tr ? "Başlık buraya" : "Title goes here"}

### ${tr ? "Tek cümlelik alt başlık: yazı ne iddia ediyor, okuyucu ne kazanacak." : "One-sentence subtitle: what the piece argues, what the reader gets."}

${tr ? "İlk paragraf. Kancayı buraya kur — doğrulanabilir bir olguyla." : "Opening paragraph. Put the hook here, built on a checkable fact."}

## ${tr ? "Bölüm başlığı" : "Section heading"}

${tr ? "Metin." : "Text."}

<!-- ${tr
  ? "Görsel eklerken bu yorumu kaldır, dosyayı images/ altına koy:"
  : "When adding an image, remove this comment and drop the file in images/:"}
> **[${tr ? "GÖRSEL" : "IMAGE"} 1]** \`images/01-ornek.png\`
> ${tr ? "Altyazı" : "Caption"}: *${tr ? "Görselin altına düşecek satır." : "The line that sits under the image."}*
-->

## ${tr ? "Önemli mi?" : "Does it matter?"}

${tr
  ? "Karşı argümanlar burada. Sonra hüküm ikiye ayrılır: ürün olarak, fikir olarak."
  : "Counter-arguments here. Then split the verdict: as a product, as an idea."}

---

*${tr ? "Kaynaklar" : "Sources"}: …*
`;
};

const research = `# Research notes — ${topic}

Every factual sentence in the article must trace back to a line on this page.

## Article type
<!-- hands-on (installed and ran it) | commentary (nothing to install) -->

## Primary sources

## Facts

## The critical material
<!-- the counter-argument, the prior attempt that failed, the thing nobody mentions -->
`;

await mkdir(path.join(dir, "images"), { recursive: true });
await writeFile(path.join(dir, `01-${topic}.tr.md`), template("tr"));
await writeFile(path.join(dir, `01-${topic}.en.md`), template("en"));
await writeFile(path.join(dir, "research.md"), research);

console.log(`oluşturuldu: posts/${slug}`);
console.log(`  01-${topic}.tr.md`);
console.log(`  01-${topic}.en.md`);
console.log(`  research.md   (yayına gitmez, .gitignore'da)`);
console.log(`  images/`);
