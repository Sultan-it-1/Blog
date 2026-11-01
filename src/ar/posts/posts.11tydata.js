// Defaults for every post in this folder. A post's URL is /posts/<file-name>/ (with /en in front for English),
// and posts with the same file name in ar/posts and en/posts are treated as translations of each other.
export default {
  layout: "layouts/post.njk",
  ogType: "article",
  navKey: "blog",
  eleventyComputed: {
    translationKey: (data) => data.page.fileSlug,
    permalink: (data) => `${data.site.languages[data.lang].prefix}/posts/${data.page.fileSlug}/`,
  },
};
