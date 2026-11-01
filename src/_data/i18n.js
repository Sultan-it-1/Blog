// Interface text for each language. Article text lives in the Markdown files, not here.

function arabicMinutes(n) {
  if (n === 1) return "دقيقة واحدة للقراءة";
  if (n === 2) return "دقيقتان للقراءة";
  if (n <= 10) return `${n} دقائق للقراءة`;
  return `${n} دقيقة للقراءة`;
}

export default {
  ar: {
    siteName: "مدونة تقنية",
    siteDescription:
      "مرحباً بكم في مدونتنا التقنية! اكتشف أحدث التقنيات والابتكارات في عالم البرمجة والتكنولوجيا. مقالات تعليمية مفيدة حول AWS وVPN وLinux والبرمجة.",
    nav: [
      { key: "home", path: "/", label: "الرئيسية" },
      { key: "blog", path: "/blog/", label: "المدونة" },
      { key: "about", path: "/about/", label: "من نحن" },
    ],
    mainNav: "القائمة الرئيسية",
    menu: "القائمة",
    skip: "تخطَّ إلى المحتوى",
    toggleTheme: "تبديل الوضع الليلي والنهاري",
    switchLanguage: "Read in English",
    backToTop: "العودة للأعلى",
    rights: "جميع الحقوق محفوظة.",
    readingTime: arabicMinutes,

    home: {
      heroTitle: "مرحباً بكم في مدونتنا التقنية",
      heroText:
        "استكشف أحدث التقنيات والابتكارات في عالم البرمجة والتكنولوجيا. نقدم لك مقالات تعليمية مفيدة وتقنيات متطورة تساعدك في تطوير مهاراتك التقنية. تعلم كيفية إنشاء سيرفرات على AWS وتشغيل VPN مثل WireGuard وتأمين خوادم Linux. مقالاتنا مكتوبة بلغة بسيطة ومفهومة تناسب المبتدئين والمحترفين على حد سواء.",
      cta: "استكشف المقالات",
      features: [
        {
          icon: "📚",
          title: "مقالات تعليمية",
          text: "تعلم أحدث التقنيات والأساليب من خلال مقالات مبسطة وسهلة الفهم",
        },
        {
          icon: "🚀",
          title: "تقنيات متطورة",
          text: "استكشف التقنيات الناشئة والمستقبلية التي تشكل مستقبل التكنولوجيا",
        },
        {
          icon: "🎯",
          title: "محتوى مفيد",
          text: "مقالات عملية وتطبيقية تساعدك في تطوير مهاراتك التقنية",
        },
      ],
      latestTitle: "أحدث المقالات",
      allPosts: "عرض جميع المقالات",
      whyTitle: "لماذا تختار مدونتنا التقنية؟",
      whyText:
        "مدونتنا التقنية هي مصدرك المفضل للمعلومات التقنية المحدثة. نقدم محتوى عالي الجودة ومحدث بانتظام لضمان حصولك على أحدث المعلومات والاتجاهات في عالم التكنولوجيا. سواء كنت مطورًا مبتدئًا أو محترفًا، ستجد مقالات تلبي احتياجاتك وتساعدك على التقدم في مسيرتك التقنية.",
      aboutCta: "تعرف علينا أكثر",
    },

    blog: {
      searchLabel: "ابحث في المقالات",
      searchPlaceholder: "ابحث في المقالات...",
      noResults: "ما لقينا مقالات تطابق بحثك.",
      tagsTitle: "التصنيفات",
    },

    post: {
      back: "← العودة للمدونة",
      backToBlog: "العودة إلى المدونة",
      by: "بواسطة",
      updated: "آخر تحديث",
      newer: "مقال أحدث",
      older: "مقال أقدم",
    },

    tag: {
      title: "مقالات عن",
      count: "عدد المقالات:",
    },

    code: {
      copy: "نسخ",
      copied: "تم النسخ!",
      failed: "تعذّر النسخ",
    },
  },

  en: {
    siteName: "Tech Blog",
    siteDescription:
      "Welcome to our tech blog! Discover the latest technologies and innovations in programming and technology. Practical tutorials on AWS, VPN, Linux and programming.",
    nav: [
      { key: "home", path: "/", label: "Home" },
      { key: "blog", path: "/blog/", label: "Blog" },
      { key: "about", path: "/about/", label: "About Us" },
    ],
    mainNav: "Main navigation",
    menu: "Menu",
    skip: "Skip to content",
    toggleTheme: "Toggle dark and light mode",
    switchLanguage: "اقرأ بالعربية",
    backToTop: "Back to top",
    rights: "All rights reserved.",
    readingTime: (n) => `${n} min read`,

    home: {
      heroTitle: "Welcome to Our Tech Blog",
      heroText:
        "Explore the latest technologies and innovations in the world of programming and technology. We provide useful educational articles and advanced techniques to help you develop your technical skills. Learn how to create servers on AWS, run VPNs like WireGuard, and secure Linux servers. Our articles are written in simple language suitable for both beginners and professionals.",
      cta: "Explore Articles",
      features: [
        {
          icon: "📚",
          title: "Educational Articles",
          text: "Learn the latest technologies and techniques through simplified and easy-to-understand articles",
        },
        {
          icon: "🚀",
          title: "Advanced Techniques",
          text: "Explore emerging and future technologies that shape the future of technology",
        },
        {
          icon: "🎯",
          title: "Useful Content",
          text: "Practical and applied articles to help you develop your technical skills",
        },
      ],
      latestTitle: "Latest Articles",
      allPosts: "View All Articles",
      whyTitle: "Why Choose Our Tech Blog?",
      whyText:
        "Our tech blog is your favorite source for updated technical information. We provide high-quality content that is regularly updated to ensure you get the latest information and trends in the world of technology. Whether you're a beginner or professional developer, you'll find articles that meet your needs and help you advance in your technical career.",
      aboutCta: "Learn More About Us",
    },

    blog: {
      searchLabel: "Search articles",
      searchPlaceholder: "Search articles...",
      noResults: "No articles match your search.",
      tagsTitle: "Topics",
    },

    post: {
      back: "← Back to Blog",
      backToBlog: "Back to Blog",
      by: "By",
      updated: "Updated",
      newer: "Newer article",
      older: "Older article",
    },

    tag: {
      title: "Articles about",
      count: "Articles:",
    },

    code: {
      copy: "Copy",
      copied: "Copied!",
      failed: "Copy failed",
    },
  },
};
