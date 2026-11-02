// Display name, icon and blurb for each tag used in posts.
// A tag missing from this list still works; it is shown as written, with the generic icon.
export default {
  aws: {
    icon: "cloud",
    ar: { name: "AWS", description: "خدمات أمازون السحابية: الخوادم والشبكات والصلاحيات." },
    en: { name: "AWS", description: "Amazon Web Services: servers, networking and access." },
  },
  cloud: {
    icon: "globe",
    ar: { name: "الحوسبة السحابية", description: "مفاهيم السحابة الأساسية: المناطق والتوفر والمسؤولية المشتركة." },
    en: { name: "Cloud computing", description: "Core cloud concepts: regions, availability and shared responsibility." },
  },
  ec2: {
    icon: "cpu",
    ar: { name: "EC2", description: "إنشاء الخوادم الافتراضية وإدارتها على AWS." },
    en: { name: "EC2", description: "Launching and managing virtual servers on AWS." },
  },
  iam: {
    icon: "user",
    ar: { name: "IAM", description: "إدارة المستخدمين والمجموعات والصلاحيات في AWS." },
    en: { name: "IAM", description: "Managing users, groups and permissions on AWS." },
  },
  linux: {
    icon: "terminal",
    ar: { name: "لينكس", description: "أوامر وإعدادات خوادم Linux من الصفر." },
    en: { name: "Linux", description: "Commands and configuration for Linux servers." },
  },
  scaling: {
    icon: "network",
    ar: { name: "التوفر العالي", description: "توزيع الحمل والتوسّع التلقائي وبناء تطبيقات تتحمل الأعطال." },
    en: { name: "High availability", description: "Load balancing, auto scaling and building fault-tolerant applications." },
  },
  security: {
    icon: "shield",
    ar: { name: "الأمن", description: "تأمين الخوادم: جدار الحماية وSSH والصلاحيات." },
    en: { name: "Security", description: "Hardening servers: firewalls, SSH and permissions." },
  },
  storage: {
    icon: "server",
    ar: { name: "التخزين", description: "الأقراص وأنظمة الملفات والنسخ الاحتياطية على AWS." },
    en: { name: "Storage", description: "Disks, file systems and backups on AWS." },
  },
  vpn: {
    icon: "lock",
    ar: { name: "VPN", description: "شبكات خاصة ومشفّرة تتحكم فيها بنفسك." },
    en: { name: "VPN", description: "Private, encrypted networks you control yourself." },
  },
  wireguard: {
    icon: "network",
    ar: { name: "WireGuard", description: "إعداد WireGuard على الخادم وربط الأجهزة به." },
    en: { name: "WireGuard", description: "Setting up WireGuard and connecting devices to it." },
  },
};
