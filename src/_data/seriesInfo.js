// Article series. A post joins one with `series: <key>` and `part: <number>` in its front matter;
// the series page (/series/<key>/), the part box and the next/previous links are built from that.
// `upcoming` lists parts not written yet, shown greyed out on the series page.
export default {
  aws: {
    icon: "cloud",
    ar: {
      title: "تعلّم AWS من الصفر",
      description:
        "سلسلة مرتّبة تمشي معك خطوة بخطوة في أساسيات Amazon Web Services: من البنية العالمية والصلاحيات، إلى الخوادم والتخزين والشبكات. كل جزء يبني على اللي قبله.",
      upcoming: [
        "الخوادم الافتراضية (EC2)",
        "تخزين الخوادم (EBS وEFS)",
        "توزيع الحمل والتوسّع التلقائي",
        "التخزين الكائني (S3)",
        "قواعد البيانات المُدارة",
        "الشبكات الخاصة (VPC)",
      ],
    },
    en: {
      title: "Learn AWS from Scratch",
      description:
        "An ordered series that walks you through the fundamentals of Amazon Web Services: from the global infrastructure and permissions to servers, storage and networking. Each part builds on the one before.",
      upcoming: [
        "Virtual servers (EC2)",
        "Server storage (EBS and EFS)",
        "Load balancing and auto scaling",
        "Object storage (S3)",
        "Managed databases",
        "Private networks (VPC)",
      ],
    },
  },
};
