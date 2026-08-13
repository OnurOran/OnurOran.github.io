import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

const lang = "tr";
const meta = {
  tr: { title: "Onur Oran", description: "Denediğim teknolojiler hakkında yazılar." },
  en: { title: "Onur Oran", description: "Writing about technologies I have actually run." },
}[lang];

export async function GET(context) {
  const posts = await getCollection(lang);
  return rss({
    title: meta.title,
    description: meta.description,
    site: context.site,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((p) => ({
        title: p.data.title,
        description: p.data.description,
        pubDate: p.data.pubDate,
        link: `/${lang}/${p.id}/`,
      })),
  });
}
