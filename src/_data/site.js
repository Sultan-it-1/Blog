// Site-wide settings. Change the domain, author or languages here — nowhere else.
export default {
  url: "https://blog.sultanops.com",
  defaultImage: "/assets/images/og-default.png",
  year: new Date().getFullYear(),

  author: {
    name: { ar: "سلطان عايض", en: "Sultan Ayidh" },
    website: "https://sultanops.com/",
    twitter: "@sultanayidh",
  },

  // `prefix` is the URL folder for the language: Arabic lives at the root, English under /en/.
  languages: {
    ar: {
      name: "العربية",
      short: "عربي",
      dir: "rtl",
      prefix: "",
      locale: "ar-u-ca-gregory-nu-latn",
      ogLocale: "ar_SA",
    },
    en: {
      name: "English",
      short: "EN",
      dir: "ltr",
      prefix: "/en",
      locale: "en-US",
      ogLocale: "en_US",
    },
  },
};
