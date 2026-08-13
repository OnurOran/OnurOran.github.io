import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://onuroran.github.io",

  // "/" lands on Turkish; this emits an instant redirect rather than the
  // two-second meta refresh a redirecting page component produces
  redirects: { "/": "/tr/" },

  i18n: {
    locales: ["tr", "en"],
    defaultLocale: "tr",
    routing: { prefixDefaultLocale: true },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "tr",
        locales: { tr: "tr-TR", en: "en-GB" },
      },
    }),
  ],

  markdown: {
    // dual themes: Shiki emits both palettes as CSS variables, the stylesheet picks one
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: false,
    },
  },
});
