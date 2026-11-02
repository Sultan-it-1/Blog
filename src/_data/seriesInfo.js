// Article series. A post joins one with `series: <key>` and `part: <number>` in its front matter;
// the series page (/series/<key>/), the part badge and the next-part panel are built from that.
// `sections` is the roadmap: part numbers run through it in order, so the third title overall is part 3.
// A planned title is replaced by the post's own title once that part is published.
export default {
  aws: {
    icon: "cloud",
    ar: {
      title: "تعلّم AWS من الصفر",
      description:
        "سلسلة مرتّبة تمشي معك خطوة بخطوة في Amazon Web Services: تسعة أقسام من الأساسيات والصلاحيات، إلى الخوادم والشبكات والتخزين والتطبيقات الحديثة والأمان. كل جزء يبني على اللي قبله.",
      sections: [
        {
          title: "الأساسيات",
          parts: ["ما هي AWS؟ والبنية العالمية", "الهوية والصلاحيات (IAM)"],
        },
        {
          title: "الخوادم وتخزينها",
          parts: ["EC2: أول سيرفر لك", "EC2: خيارات الدفع والشبكة", "تخزين السيرفرات: EBS وAMI وEFS"],
        },
        {
          title: "التوفر العالي والتوسّع",
          parts: ["توزيع الحمل (Load Balancers)", "التوسّع التلقائي وبناء تطبيق كامل"],
        },
        {
          title: "قواعد البيانات",
          parts: ["RDS وAurora", "الكاش مع ElastiCache", "أي قاعدة بيانات تختار؟"],
        },
        {
          title: "الشبكات وتوصيل المحتوى",
          parts: [
            "DNS وRoute 53",
            "CloudFront وGlobal Accelerator",
            "VPC: شبكتك الخاصة",
            "VPC: ربط الشبكات ببعض",
          ],
        },
        {
          title: "التخزين الكائني",
          parts: [
            "S3: الأساسيات",
            "S3: فئات التخزين ودورة الحياة",
            "S3: الأمان والتشفير",
            "خدمات تخزين ونقل إضافية",
          ],
        },
        {
          title: "التطبيقات الحديثة",
          parts: [
            "ربط الخدمات: SQS وSNS وKinesis",
            "الحاويات: ECS وFargate وEKS",
            "بدون خوادم: Lambda وAPI Gateway وDynamoDB",
            "تصميم تطبيقات بدون خوادم",
          ],
        },
        {
          title: "البيانات والذكاء الاصطناعي",
          parts: ["تحليل البيانات: Athena وRedshift وGlue", "خدمات الذكاء الاصطناعي الجاهزة"],
        },
        {
          title: "الأمان والتشغيل",
          parts: [
            "المراقبة والتدقيق: CloudWatch وCloudTrail وConfig",
            "الهوية المتقدمة: Organizations وIdentity Center",
            "التشفير وحماية الأسرار",
            "التعافي من الكوارث والترحيل",
            "التكلفة والتصميم الجيد",
          ],
        },
      ],
    },
    en: {
      title: "Learn AWS from Scratch",
      description:
        "An ordered series that walks you through Amazon Web Services: nine sections, from the fundamentals and permissions to servers, networking, storage, modern applications and security. Each part builds on the one before.",
      sections: [
        {
          title: "Fundamentals",
          parts: ["What is AWS? The global infrastructure", "Identity and permissions (IAM)"],
        },
        {
          title: "Servers and their storage",
          parts: ["EC2: your first server", "EC2: pricing options and networking", "Server storage: EBS, AMI and EFS"],
        },
        {
          title: "High availability and scaling",
          parts: ["Load balancers", "Auto scaling and building a full application"],
        },
        {
          title: "Databases",
          parts: ["RDS and Aurora", "Caching with ElastiCache", "Which database should you choose?"],
        },
        {
          title: "Networking and content delivery",
          parts: [
            "DNS and Route 53",
            "CloudFront and Global Accelerator",
            "VPC: your private network",
            "VPC: connecting networks together",
          ],
        },
        {
          title: "Object storage",
          parts: [
            "S3: the basics",
            "S3: storage classes and lifecycle",
            "S3: security and encryption",
            "More storage and transfer services",
          ],
        },
        {
          title: "Modern applications",
          parts: [
            "Connecting services: SQS, SNS and Kinesis",
            "Containers: ECS, Fargate and EKS",
            "Serverless: Lambda, API Gateway and DynamoDB",
            "Designing serverless applications",
          ],
        },
        {
          title: "Data and AI",
          parts: ["Analyzing data: Athena, Redshift and Glue", "Ready-made AI services"],
        },
        {
          title: "Security and operations",
          parts: [
            "Monitoring and auditing: CloudWatch, CloudTrail and Config",
            "Advanced identity: Organizations and Identity Center",
            "Encryption and protecting secrets",
            "Disaster recovery and migration",
            "Cost and good architecture",
          ],
        },
      ],
    },
  },
};
