import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItContainer from "markdown-it-container";
import pluginRss from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

import i18n from "./src/_data/i18n.js";
import seriesInfo from "./src/_data/seriesInfo.js";
import site from "./src/_data/site.js";
import topics from "./src/_data/topics.js";
import { renderIcon } from "./src/_includes/icons.js";

const POSTS_GLOB = "src/*/posts/*.md";

const byDateDesc = (a, b) => b.date - a.date || (b.data.part || 0) - (a.data.part || 0);
const getPath = (obj, path) => path.split(".").reduce((value, key) => value?.[key], obj);
const escapeAttr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Heading ids keep Arabic letters readable instead of percent-encoding them.
const slugifyHeading = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");

const CODE_LANGUAGES = {
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  powershell: "PowerShell",
  ini: "INI",
  yaml: "YAML",
  json: "JSON",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  python: "Python",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  docker: "Dockerfile",
  nginx: "Nginx",
  text: "Output",
};

// Callout boxes in Markdown: `::: note`, `::: tip`, `::: warning`, `::: security`, each with an optional title.
const CALLOUTS = { note: "info", tip: "bulb", warning: "alert", security: "shield" };

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);

  const md = markdownIt({ html: true, linkify: true });

  md.use(markdownItAnchor, {
    level: [2, 3],
    slugify: slugifyHeading,
    permalink: markdownItAnchor.permalink.linkInsideHeader({
      symbol: "#",
      placement: "after",
      class: "heading-anchor",
      ariaHidden: true,
    }),
  });

  for (const [kind, icon] of Object.entries(CALLOUTS)) {
    md.use(markdownItContainer, kind, {
      render(tokens, idx, _options, env) {
        if (tokens[idx].nesting !== 1) return "</aside>\n";
        const lang = env?.lang || "ar";
        const title = tokens[idx].info.trim().slice(kind.length).trim() || i18n[lang].notes[kind];
        return `<aside class="callout callout-${kind}"><p class="callout-title">${renderIcon(icon)}<span>${md.renderInline(title)}</span></p>\n`;
      },
    });
  }

  // Wrap every fenced code block in a labelled frame with a copy button (enabled by main.js).
  const renderFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const lang = tokens[idx].info.trim().split(/\s+/)[0] || "text";
    const label = CODE_LANGUAGES[lang] || lang;
    const copy = i18n[env?.lang || "ar"].code.copy;
    return `<figure class="code-block" dir="ltr">
<figcaption class="code-bar"><span class="code-lang" lang="en">${escapeAttr(label)}</span><button type="button" class="copy-btn" data-copy hidden>${renderIcon("copy")}${renderIcon("check")}<span class="copy-label">${copy}</span></button></figcaption>
${renderFence(tokens, idx, options, env, self)}</figure>\n`;
  };

  eleventyConfig.setLibrary("md", md);

  // Files served as-is: src/static/* goes to the site root, src/assets/* to /assets/.
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addShortcode("icon", (name, className) => renderIcon(name, className));
  eleventyConfig.addShortcode("tagIcon", (tag) => renderIcon(topics[tag]?.icon || "hash"));

  // ---- Collections ----
  eleventyConfig.addCollection("posts", (api) => api.getFilteredByGlob(POSTS_GLOB).sort(byDateDesc));

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
      .sort((a, b) => b.posts.length - a.posts.length || a.tag.localeCompare(b.tag));
  });

  // One entry per series + language that has at least one published part: /series/<key>/ pages.
  eleventyConfig.addCollection("seriesPages", (api) => {
    const posts = api.getFilteredByGlob(POSTS_GLOB);
    return Object.keys(seriesInfo).flatMap((key) =>
      Object.keys(site.languages)
        .map((lang) => ({
          key,
          lang,
          parts: posts
            .filter((post) => post.data.series === key && post.data.lang === lang)
            .sort((a, b) => a.data.part - b.data.part),
        }))
        .filter((seriesPage) => seriesPage.parts.length)
    );
  });

  // ---- Filters ----
  eleventyConfig.addFilter("where", (items = [], path, value) =>
    items.filter((item) => getPath(item, path) === value)
  );
  eleventyConfig.addFilter("limit", (items = [], count) => items.slice(0, count));

  eleventyConfig.addFilter("groupByYear", (items = []) => {
    const groups = [];
    for (const item of items) {
      const year = new Date(item.date).getUTCFullYear();
      if (groups.at(-1)?.year !== year) groups.push({ year, items: [] });
      groups.at(-1).items.push(item);
    }
    return groups;
  });

  // URL of the page with the same translationKey in another language, or null.
  eleventyConfig.addFilter("translationUrl", (items = [], key, lang) => {
    if (!key) return null;
    const match = items.find((item) => item.data.translationKey === key && item.data.lang === lang);
    return match ? match.url : null;
  });

  eleventyConfig.addFilter("tagUrl", (tag, lang) => {
    const slugify = eleventyConfig.getFilter("slugify");
    return `${site.languages[lang].prefix}/tags/${slugify(tag)}/`;
  });
  eleventyConfig.addFilter("topicName", (tag, lang) => topics[tag]?.[lang]?.name || tag);
  eleventyConfig.addFilter("topicDescription", (tag, lang) => topics[tag]?.[lang]?.description || "");
  eleventyConfig.addFilter("topicIcon", (tag) => topics[tag]?.icon || "hash");

  eleventyConfig.addFilter("seriesUrl", (key, lang) => `${site.languages[lang].prefix}/series/${key}/`);
  // The series page entry for a series + language, or undefined.
  eleventyConfig.addFilter("seriesPage", (seriesPages = [], key, lang) =>
    seriesPages.find((seriesPage) => seriesPage.key === key && seriesPage.lang === lang)
  );

  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
  eleventyConfig.addFilter("readableDate", (date, lang, style = "long") =>
    new Intl.DateTimeFormat(site.languages[lang].locale, { dateStyle: style, timeZone: "UTC" }).format(new Date(date))
  );

  eleventyConfig.addFilter("readingMinutes", (html = "") => {
    const words = String(html).replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  // Table of contents: the h2 headings of a rendered post, as plain text
  // (entities decoded, since Nunjucks escapes the output again).
  const decodeEntities = (text) =>
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  eleventyConfig.addFilter("toc", (html = "") =>
    [...String(html).matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map(([, id, inner]) => ({
      id,
      text: decodeEntities(
        inner
          .replace(/<a class="heading-anchor"[\s\S]*?<\/a>/g, "")
          .replace(/<[^>]*>/g, "")
          .trim()
      ),
    }))
  );

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
