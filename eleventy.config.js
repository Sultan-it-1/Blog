import markdownIt from "markdown-it";
import markdownItContainer from "markdown-it-container";
import pluginRss from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

import site from "./src/_data/site.js";

const POSTS_GLOB = "src/*/posts/*.md";

const byDateDesc = (a, b) => b.date - a.date;
const getPath = (obj, path) => path.split(".").reduce((value, key) => value?.[key], obj);

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);

  // Markdown: raw HTML allowed, and `::: note Title` blocks for callouts.
  const md = markdownIt({ html: true, linkify: true });
  md.use(markdownItContainer, "note", {
    render(tokens, idx) {
      if (tokens[idx].nesting !== 1) return "</aside>\n";
      const title = tokens[idx].info.trim().slice("note".length).trim();
      return `<aside class="note">${title ? `<p class="note-title">${md.renderInline(title)}</p>` : ""}\n`;
    },
  });
  eleventyConfig.setLibrary("md", md);

  // Files served as-is: src/static/* goes to the site root, src/assets/* to /assets/.
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  eleventyConfig.addPassthroughCopy("src/assets");

  // ---- Collections ----
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob(POSTS_GLOB).sort(byDateDesc)
  );

  // One entry per language + tag, used to build /tags/<tag>/ pages.
  eleventyConfig.addCollection("tagPages", (api) => {
    const pages = new Map();
    for (const post of api.getFilteredByGlob(POSTS_GLOB)) {
      for (const tag of post.data.tags || []) {
        const key = `${post.data.lang}:${tag}`;
        if (!pages.has(key)) pages.set(key, { lang: post.data.lang, tag, posts: [] });
        pages.get(key).posts.push(post);
      }
    }
    return [...pages.values()]
      .map((tagPage) => ({ ...tagPage, posts: tagPage.posts.sort(byDateDesc) }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  });

  // ---- Filters ----
  eleventyConfig.addFilter("where", (items = [], path, value) =>
    items.filter((item) => getPath(item, path) === value)
  );
  eleventyConfig.addFilter("limit", (items = [], count) => items.slice(0, count));

  // URL of the page with the same translationKey in another language, or null.
  eleventyConfig.addFilter("translationUrl", (items = [], key, lang) => {
    if (!key) return null;
    const match = items.find((item) => item.data.translationKey === key && item.data.lang === lang);
    return match ? match.url : null;
  });

  eleventyConfig.addFilter("tagUrl", function (tag, lang) {
    const slugify = eleventyConfig.getFilter("slugify");
    return `${site.languages[lang].prefix}/tags/${slugify(tag)}/`;
  });

  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
  eleventyConfig.addFilter("readableDate", (date, lang) =>
    new Intl.DateTimeFormat(site.languages[lang].locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(date)
    )
  );

  eleventyConfig.addFilter("readingMinutes", (html = "") => {
    const words = String(html).replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["md", "njk"],
    htmlTemplateEngine: "njk",
    // Markdown is not run through Nunjucks, so `{{ }}` in code samples needs no escaping.
    markdownTemplateEngine: false,
  };
}
