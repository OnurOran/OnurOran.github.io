import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://onuroran.github.io",
  i18n: {
    locales: ["tr", "en"],
    defaultLocale: "tr",
    routing: { prefixDefaultLocale: true },
  },
  markdown: {
    // dual themes: Shiki emits both palettes as CSS variables, the stylesheet picks one
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: false,
    },
  },
});
