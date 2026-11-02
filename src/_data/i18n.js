// Interface text for each language. Article text lives in the Markdown files, not here.

function arabicMinutes(n) {
  if (n === 1) return "دقيقة قراءة";
  if (n === 2) return "دقيقتان قراءة";
  if (n <= 10) return `${n} دقائق قراءة`;
  return `${n} دقيقة قراءة`;
}

function arabicPosts(n) {
  if (n === 1) return "مقال واحد";
  if (n === 2) return "مقالان";
  if (n <= 10) return `${n} مقالات`;
  return `${n} مقالًا`;
}

export default {
  ar: {
    siteName: "sultanops",
    tagline: "مدونة تقنية عن السحابة والشبكات وأمن الخوادم",
    siteDescription:
      "شروحات عملية خطوة بخطوة بالعربي: إنشاء الخوادم على AWS، تشغيل VPN خاص بك عبر WireGuard، وتأمين خوادم Linux.",
    nav: [
      { key: "home", path: "/", label: "الرئيسية" },
      { key: "blog", path: "/blog/", label: "المقالات" },
      { key: "about", path: "/about/", label: "عن المدونة" },
    ],
    mainNav: "القائمة الرئيسية",
    menu: "القائمة",
    closeMenu: "إغلاق القائمة",
    skip: "تخطَّ إلى المحتوى",
    toggleTheme: "تبديل المظهر الفاتح والداكن",
    switchLanguage: "Read in English",
    search: "ابحث في المقالات",
    backToTop: "العودة للأعلى",
    rights: "جميع الحقوق محفوظة.",
    readingTime: arabicMinutes,
    postCount: arabicPosts,

    home: {
      eyebrow: "DevOps · Cloud · Security",
      heroTitle: "دروس عملية في السحابة والشبكات وأمن الخوادم",
      heroText:
        "شروحات خطوة بخطوة، بلغة بسيطة، من إعدادات حقيقية: من إنشاء سيرفر على AWS، إلى تشغيل VPN خاص بك، إلى تأمين خادم Linux.",
      ctaPrimary: "ابدأ القراءة",
      ctaSecondary: "عن المدونة",
      latestTitle: "أحدث المقالات",
      allPosts: "كل المقالات",
      topicsTitle: "المواضيع",
      topicsText: "كل مقال مصنّف حسب موضوعه، عشان توصل للي تحتاجه بسرعة.",
      authorTitle: "عن الكاتب",
      authorText:
        "أنا سلطان عايض، مطور ومهتم بالبنية التحتية والأمن. أكتب هنا ما أتعلمه وأطبقه فعلياً، بشكل يقدر أي أحد يتبعه.",
      authorCta: "زيارة موقعي الشخصي",
    },

    blog: {
      searchLabel: "ابحث في المقالات",
      searchPlaceholder: "ابحث بالعنوان أو الموضوع…",
      noResults: "ما لقينا مقالات تطابق بحثك.",
      topicsLabel: "تصفّح حسب الموضوع",
    },

    post: {
      blog: "المقالات",
      updated: "آخر تحديث",
      by: "بقلم",
      toc: "في هذا المقال",
      newer: "المقال الأحدث",
      older: "المقال الأقدم",
      topics: "مواضيع المقال",
    },

    tag: {
      eyebrow: "موضوع",
      allTopics: "كل المواضيع",
    },

    notes: {
      note: "ملاحظة",
      tip: "نصيحة",
      warning: "تنبيه",
      security: "أمان",
    },

    code: {
      copy: "نسخ",
      copied: "تم النسخ",
      failed: "تعذّر النسخ",
    },

    series: {
      eyebrow: "سلسلة",
      sectionTitle: "السلاسل التعليمية",
      sectionText: "مقالات مرتّبة تتعلّم منها موضوع كامل من البداية، جزء بعد جزء.",
      part: (n) => `الجزء ${n}`,
      partOf: (n) => `الجزء ${n} من سلسلة`,
      published: (n, total) => `${n} من ${total} جزء منشور`,
      section: (n, total) => `القسم ${n} من ${total}`,
      sectionsTitle: "أقسام السلسلة",
      allParts: "كل أجزاء السلسلة",
      start: "ابدأ من الجزء الأول",
      continue: "عرض السلسلة",
      parts: "أجزاء السلسلة",
      upcoming: "قريباً",
      next: "الجزء التالي",
      nextSoon: "الجزء التالي قريباً",
      current: "أنت هنا",
    },

    subscribe: {
      what: "RSS طريقة بسيطة لمتابعة المواقع: بدل ما تزور المدونة كل مرة، يوصلك كل مقال جديد في تطبيق واحد تقرأ منه كل اللي تتابعه.",
      feedLabel: "رابط الخلاصة",
      stepsTitle: "كيف تشترك",
      steps: [
        "انسخ رابط الخلاصة من فوق.",
        "افتح تطبيق قراءة الخلاصات اللي تستخدمه، مثل Feedly أو Inoreader أو NetNewsWire.",
        "أضف الرابط كاشتراك جديد، وبيوصلك كل مقال جديد تلقائياً.",
      ],
      otherFeed: "تبي المقالات بالإنجليزي؟ هذي الخلاصة الإنجليزية:",
      latest: "آخر ما نُشر",
    },

    footer: {
      explore: "تصفّح",
      topics: "المواضيع",
      follow: "تابع",
      rss: "تابع عبر RSS",
      website: "الموقع الشخصي",
    },

    notFound: {
      title: "الصفحة غير موجودة",
      text: "الرابط اللي فتحته ما يوصل لأي صفحة. ممكن انحذفت أو تغيّر رابطها.",
      home: "الصفحة الرئيسية",
      blog: "كل المقالات",
    },
  },

  en: {
    siteName: "sultanops",
    tagline: "A tech blog on cloud, networking and server security",
    siteDescription:
      "Hands-on, step-by-step guides: launching servers on AWS, running your own WireGuard VPN, and hardening Linux servers.",
    nav: [
      { key: "home", path: "/", label: "Home" },
      { key: "blog", path: "/blog/", label: "Articles" },
      { key: "about", path: "/about/", label: "About" },
    ],
    mainNav: "Main navigation",
    menu: "Menu",
    closeMenu: "Close menu",
    skip: "Skip to content",
    toggleTheme: "Switch between light and dark",
    switchLanguage: "اقرأ بالعربية",
    search: "Search articles",
    backToTop: "Back to top",
    rights: "All rights reserved.",
    readingTime: (n) => `${n} min read`,
    postCount: (n) => (n === 1 ? "1 article" : `${n} articles`),

    home: {
      eyebrow: "DevOps · Cloud · Security",
      heroTitle: "Hands-on guides to cloud, networking and server security",
      heroText:
        "Step-by-step tutorials in plain language, from real setups: launching a server on AWS, running your own VPN, hardening a Linux server.",
      ctaPrimary: "Start reading",
      ctaSecondary: "About the blog",
      latestTitle: "Latest articles",
      allPosts: "All articles",
      topicsTitle: "Topics",
      topicsText: "Every article is filed under its topics, so you can get to what you need quickly.",
      authorTitle: "About the author",
      authorText:
        "I'm Sultan Ayidh, a developer focused on infrastructure and security. I write up what I actually learn and run, in a way anyone can follow.",
      authorCta: "Visit my website",
    },

    blog: {
      searchLabel: "Search articles",
      searchPlaceholder: "Search by title or topic…",
      noResults: "No articles match your search.",
      topicsLabel: "Browse by topic",
    },

    post: {
      blog: "Articles",
      updated: "Updated",
      by: "By",
      toc: "In this article",
      newer: "Newer article",
      older: "Older article",
      topics: "Article topics",
    },

    tag: {
      eyebrow: "Topic",
      allTopics: "All topics",
    },

    notes: {
      note: "Note",
      tip: "Tip",
      warning: "Warning",
      security: "Security",
    },

    code: {
      copy: "Copy",
      copied: "Copied",
      failed: "Copy failed",
    },

    series: {
      eyebrow: "Series",
      sectionTitle: "Learning series",
      sectionText: "Ordered articles that teach a whole topic from the start, one part at a time.",
      part: (n) => `Part ${n}`,
      partOf: (n) => `Part ${n} of`,
      published: (n, total) => `${n} of ${total} parts published`,
      section: (n, total) => `Section ${n} of ${total}`,
      sectionsTitle: "Sections in this series",
      allParts: "All parts in this series",
      start: "Start with part 1",
      continue: "View the series",
      parts: "Parts in this series",
      upcoming: "Coming soon",
      next: "Next part",
      nextSoon: "Next part coming soon",
      current: "You are here",
    },

    subscribe: {
      what: "RSS is a simple way to follow sites: instead of checking the blog for updates, every new article arrives in one app where you read everything you follow.",
      feedLabel: "Feed URL",
      stepsTitle: "How to subscribe",
      steps: [
        "Copy the feed URL above.",
        "Open your feed reader, such as Feedly, Inoreader or NetNewsWire.",
        "Add the URL as a new subscription, and every new article will arrive automatically.",
      ],
      otherFeed: "Prefer Arabic? Here is the Arabic feed:",
      latest: "Recently published",
    },

    footer: {
      explore: "Explore",
      topics: "Topics",
      follow: "Follow",
      rss: "Follow via RSS",
      website: "Personal website",
    },

    notFound: {
      title: "Page not found",
      text: "The link you followed doesn't lead to a page. It may have been removed or moved.",
      home: "Home page",
      blog: "All articles",
    },
  },
};
