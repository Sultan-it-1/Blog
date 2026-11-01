// Display name, icon and blurb for each tag used in posts.
// A tag missing from this list still works; it is shown as written, with the generic icon.
export default {
  aws: {
    icon: "cloud",
    ar: { name: "AWS", description: "خدمات أمازون السحابية: الخوادم والشبكات والصلاحيات." },
    en: { name: "AWS", description: "Amazon Web Services: servers, networking and access." },
  },
  ec2: {
    icon: "cpu",
    ar: { name: "EC2", description: "إنشاء الخوادم الافتراضية وإدارتها على AWS." },
    en: { name: "EC2", description: "Launching and managing virtual servers on AWS." },
  },
  linux: {
    icon: "terminal",
    ar: { name: "لينكس", description: "أوامر وإعدادات خوادم Linux من الصفر." },
    en: { name: "Linux", description: "Commands and configuration for Linux servers." },
  },
  security: {
    icon: "shield",
    ar: { name: "الأمن", description: "تأمين الخوادم: جدار الحماية وSSH والصلاحيات." },
    en: { name: "Security", description: "Hardening servers: firewalls, SSH and permissions." },
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
