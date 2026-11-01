---
title: إعداد خادم لينكس آمن من الصفر
description: دليل شامل لإعداد خادم لينكس آمن خطوة بخطوة، بدءاً من التثبيت الأساسي وحتى تأمين الخادم ضد الاختراقات.
date: 2024-06-02
tags: [linux, security]
---

في هذا الدليل الشامل، سنتعرف على كيفية إعداد خادم لينكس آمن خطوة بخطوة، بدءاً من التثبيت الأساسي وحتى تأمين الخادم ضد الاختراقات.

::: note 📌 ملاحظة مهمة
هذا الدليل مخصص لأوبونتو سيرفر 20.04 LTS، لكن معظم الأوامر تعمل على أي توزيعة لينكس.
:::

## المتطلبات الأساسية

1. خادم مخصص أو VPS مع وصول root
2. اتصال إنترنت مستقر
3. معرفة أساسية بأوامر لينكس

## ٢. التثبيت والإعداد الأولي

### تحديث النظام

```bash
# تحديث قائمة الحزم
sudo apt update

# ترقية جميع الحزم المثبتة
sudo apt upgrade -y

# تثبيت الحزم الأساسية
sudo apt install -y ufw fail2ban git curl wget
```

### إنشاء مستخدم جديد

1. إنشاء مستخدم جديد (استبدل `yourusername` باسم المستخدم المطلوب)

   ```bash
   # إنشاء مستخدم جديد
   sudo adduser yourusername

   # إضافة المستخدم إلى مجموعة sudo
   sudo usermod -aG sudo yourusername
   ```

2. نسخ مفاتيح SSH للمستخدم الجديد

   ```bash
   # إنشاء مجلد .ssh
   sudo mkdir -p /home/yourusername/.ssh

   # نسخ مفاتيح SSH
   sudo cp ~/.ssh/authorized_keys /home/yourusername/.ssh/

   # تغيير مالك المجلد
   sudo chown -R yourusername:yourusername /home/yourusername/.ssh

   # ضبط الصلاحيات
   sudo chmod 700 /home/yourusername/.ssh
   sudo chmod 600 /home/yourusername/.ssh/authorized_keys
   ```

## ٣. تأمين الخادم

::: note 🔒 نصائح أمانية
هذه الخطوات ضرورية لحماية خادمك من الهجمات الشائعة.
:::

1. تكوين جدار الحماية (UFW)

   ```bash
   # السماح لخدمة SSH
   sudo ufw allow OpenSSH

   # تفعيل جدار الحماية
   sudo ufw enable

   # عرض القواعد المطبقة
   sudo ufw status verbose
   ```

2. تأمين خدمة SSH

   ```bash
   # تغيير منفذ SSH الافتراضي (اختياري)
   sudo sed -i 's/#Port 22/Port 2222/g' /etc/ssh/sshd_config

   # منع الدخول كـ root
   sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config

   # تقليل وقت تسجيل الدخول
   sudo sed -i 's/#LoginGraceTime 2m/LoginGraceTime 1m/g' /etc/ssh/sshd_config

   # إعادة تشغيل خدمة SSH
   sudo systemctl restart sshd
   ```

## ٤. المراقبة والصيانة

```bash
# تثبيت أدوات المراقبة
sudo apt install -y htop nmon

# عرض العمليات النشطة
htop

# مراقبة أداء النظام
nmon
```

::: note 💡 نصيحة أخيرة
قم بتحديث نظامك بانتظام وتأكد من عمل نسخ احتياطية دورية.
:::
