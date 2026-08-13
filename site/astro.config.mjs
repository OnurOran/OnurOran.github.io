import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://onuroran.github.io",
  i18n: {
    locales: ["tr", "en"],
    defaultLocale: "tr",
    routing: { prefixDefaultLocale: true },
  },
  markdown: {
    shikiConfig: { theme: "github-light", wrap: false },
  },
});
