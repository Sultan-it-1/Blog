---
title: إعداد WireGuard VPN على سيرفر Ubuntu من الصفر
description: دليل شامل لإعداد سيرفر VPN خاص باستخدام WireGuard على Ubuntu. تعلم كيفية حماية اتصالك وإنشاء شبكة آمنة مع دليل خطوة بخطوة.
date: 2025-09-08
image: /assets/images/vpn-banner.png
tags: [vpn, wireguard, linux]
---

في هذا الشرح بنغطي خطوة بخطوة طريقة إعداد شبكة VPN باستخدام WireGuard على خادم Ubuntu. مناسب لأي شخص حاب يحمي اتصاله أو يربط عدة أجهزة بشبكة خاصة وآمنة.

## 1️⃣ تجهيز الخادم (Cloud Server)

أول شيء نحتاج خادم سحابي. إذا ما عندك واحد، تقدر تتبع هذا الدليل لإنشاء سيرفر على AWS:

<p><a href="/posts/aws/" class="btn">شرح إنشاء خادم AWS</a></p>

يهمنا ضروري جدا تفعيل خطوة 7. إعداد قواعد الدخول (Inbound Rules) في الدليل السابق

بعد ما تدخل على الخادم عن طريق SSH، نبدأ بالتجهيزات.

## 2️⃣ تحديث النظام وتثبيت WireGuard

```bash
# تحديث النظام وتثبيت WireGuard
sudo apt update && sudo apt upgrade -y
sudo apt install wireguard -y
```

- يحدث النظام.
- يثبت برنامج WireGuard.

## 3️⃣ إنشاء مفاتيح WireGuard (Private & Public)

```bash
# إنشاء مفاتيح WireGuard (Private & Public)
sudo bash -c "wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey"
```

🔑 هذا الأمر ينشئ مفتاح خاص (`privatekey`) ومفتاح عام (`publickey`).

::: note 💡 ليش استخدمنا `bash -c`؟
عشان نقدر ننفذ أمر فيه بايب `|` بصلاحيات `sudo`.
:::

## 4️⃣ ضبط صلاحيات المفاتيح

```bash
# ضبط صلاحيات المفاتيح
sudo chmod 600 /etc/wireguard/privatekey
sudo ls -l /etc/wireguard
```

🔒 نحمي المفتاح الخاص من الوصول غير المصرح به.

## 5️⃣ معرفة واجهة الشبكة للسيرفر

```bash
# معرفة واجهة الشبكة للسيرفر
ip a
```

ابحث عن الواجهة الحقيقية (غير `lo`) اللي فيها عنوان IP مثل:

```text
2: eth0: ...
    inet 192.168.1.5/24 ...
```

📌 في هذا المثال، اسم الواجهة هو `eth0`.

## 6️⃣ إنشاء وتعديل ملف الإعداد

```bash
# إنشاء وتعديل ملف الإعداد
sudo nano /etc/wireguard/wg0.conf
```

## 7️⃣ محتوى `wg0.conf` (مع الشرح)

```ini
# محتوى wg0.conf
[Interface]
Address = 10.0.0.1/24
SaveConfig = true
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
ListenPort = 51820
PrivateKey = [الصق هنا المفتاح الخاص بدون مسافات]
```

- غير `eth0` لاسم واجهتك اللي طلع من الخطوة 5.
- للحصول على المفتاح الخاص: اخرج من المحرر `Ctrl + X` ثم نفذ الأمر التالي ونسخ المفتاح:

```bash
# الحصول على المفتاح الخاص
sudo cat /etc/wireguard/privatekey
```

## 8️⃣ حفظ الملف والخروج من Nano

- للحفظ: `Ctrl + O` ثم Enter
- للخروج: `Ctrl + X`

## 📱 إعداد العميل (Client)

## 9️⃣ تثبيت تطبيق WireGuard

- **Android:** [🔗 WireGuard من Google Play](https://play.google.com/store/apps/details?id=com.wireguard.android)
- **iOS:** [🔗 WireGuard من App Store](https://apps.apple.com/us/app/wireguard/id1451685025)

## 🔟 إعداد ملف العميل

داخل التطبيق:

1. اضغط على `+` واختر **Create from scratch**.
2. اختر اسم مناسب.
3. اضغط **Generate keypair**.
4. بيعطيك مفتاح خاص وآخر عام للعميل.
5. في Address اكتب: `10.0.0.2/24`
6. في DNS اكتب: `1.1.1.1`
7. أضف peer جديد:

### Peer:

- **Public key:** الصق المفتاح العام اللي حصلته من السيرفر. تقدر تحصله عن طريق الامر التالي:

```bash
# الحصول على المفتاح العام
sudo cat /etc/wireguard/publickey
```

- **Endpoint:** عنوان السيرفر مع البورت، مثل:

```text
54.67.153.151:51820
```

## 1️⃣1️⃣ إضافة العميل على السيرفر

```bash
# إضافة العميل على السيرفر
sudo wg set wg0 peer [public_key_client] allowed-ips 10.0.0.2/32
sudo wg-quick save wg0
```

استبدل `[public_key_client]` بالمفتاح العام للعميل (المفتاح اللذي انشائته في تطبيق الجوال).

## 1️⃣2️⃣ تشغيل WireGuard تلقائيًا عند الإقلاع

```bash
# تشغيل WireGuard تلقائيًا عند الإقلاع
sudo systemctl start wg-quick@wg0
sudo systemctl enable wg-quick@wg0
```

## 1️⃣3️⃣ التحقق من الاتصال

```bash
# التحقق من الاتصال
sudo wg show
```

إذا شفت المفاتيح والبيانات، معناته الاتصال شغال تمام.
