import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const schema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  lang: z.enum(["tr", "en"]),
  translationKey: z.string(),
});

export const collections = {
  tr: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/tr" }), schema }),
  en: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/en" }), schema }),
};
