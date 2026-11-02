---
title: "CloudFront وGlobal Accelerator: أقرب لزوارك"
description: ليش المسافة تبطّئ موقعك، وكيف يحفظ CloudFront نسخ قريبة من الزوار، وكيف تحمي مصدرك وتمسح الكاش، ووش يسوي Global Accelerator للزيارات اللي ما تنخزّن، ومتى تختار كل واحد.
date: 2026-11-02
series: aws
part: 12
numbered: true
tags: [aws, networking]
---

في [الجزء الحادي عشر](/posts/aws-11-dns-route53/) صار لموقعك اسم، بس سيرفره لسا في مكان واحد. والزائر البعيد طلبه يعبر قارات وشبكات كثيرة على الإنترنت العام، وكل طلب ياخذ وقت.

عندك خدمتين لهذي المشكلة: **CloudFront** يحفظ نسخة قريبة من الزائر، و**Global Accelerator** يختصر الطريق نفسه.

## CloudFront: نسخة قريبة من كل زائر

**CloudFront** شبكة توصيل محتوى (CDN). تستخدم [مواقع الحافة](/posts/aws-01-global-infrastructure/) المنتشرة حول العالم، فأول زائر يطلب ملف يجيبه CloudFront من مصدرك ويحفظه، واللي بعده في نفس المنطقة ياخذه من موقع الحافة مباشرة.

<figure class="diagram">
<svg viewBox="0 0 640 220" role="img" aria-labelledby="cf-caption">
<defs>
<marker id="cf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="490" y="24" width="130" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="555" y="50" text-anchor="middle" class="d-label">زائر</text>
<text x="555" y="70" text-anchor="middle" class="d-small">في آسيا</text>
<rect x="490" y="136" width="130" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="555" y="162" text-anchor="middle" class="d-label">زائر</text>
<text x="555" y="182" text-anchor="middle" class="d-small">في أوروبا</text>
<rect x="255" y="24" width="150" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="330" y="50" text-anchor="middle" class="d-label">موقع حافة</text>
<text x="330" y="70" text-anchor="middle" class="d-small">يحفظ نسخة</text>
<rect x="255" y="136" width="150" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="330" y="162" text-anchor="middle" class="d-label">موقع حافة</text>
<text x="330" y="182" text-anchor="middle" class="d-small">يحفظ نسخة</text>
<rect x="20" y="64" width="150" height="92" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="96" text-anchor="middle" class="d-label">المصدر</text>
<text x="95" y="118" text-anchor="middle" class="d-small">ALB أو S3 أو سيرفر</text>
<text x="95" y="138" text-anchor="middle" class="d-small">في Region واحدة</text>
<line x1="490" y1="54" x2="407" y2="54" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cf-arrow)"/>
<line x1="490" y1="166" x2="407" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cf-arrow)"/>
<line x1="255" y1="54" x2="172" y2="94" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="255" y1="166" x2="172" y2="126" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<text x="228" y="115" text-anchor="middle" class="d-small">لو ما عنده</text>
</svg>
<figcaption id="cf-caption">كل زائر يصل لأقرب موقع حافة، وموقع الحافة ما يرجع للمصدر إلا لو ما عنده نسخة صالحة.</figcaption>
</figure>

ووش تستفيد؟

- **سرعة أعلى:** الجواب من مكان قريب.
- **ضغط أقل على المصدر:** أغلب الطلبات تنتهي عند الحافة.
- **حماية:** تجي مع Shield Standard ضد هجمات DDoS، وتقدر تضيف WAF.
- **HTTPS مجاني:** بشهادة من ACM، وتشغيل TLS عند الحافة.

### المصادر (Origins)

المصدر هو المكان الأصلي للمحتوى. وأهم شي إن الزوار ما يتخطون CloudFront ويوصلون له مباشرة:

| المصدر | يناسب | كيف تخليه خاص |
| --- | --- | --- |
| **حاوية S3** | مواقع ثابتة وملفات | **OAC** يخلي CloudFront وحده يقرأ منها |
| **ALB** | تطبيقات ديناميكية | **VPC Origins** يخلي الموزّع في شبكة خاصة |
| **سيرفر EC2** | تطبيق على سيرفر | VPC Origins، أو مجموعة أمان تسمح لنطاقات CloudFront فقط |
| **أي سيرفر HTTP** | حتى خارج AWS | ترويسة سرية يتحقق منها السيرفر |

وبنشرح S3 بالتفصيل في [قسم التخزين الكائني](/series/aws/#section-6).

### وش ينخزّن وكم؟

- **مفتاح الكاش (Cache Key):** افتراضياً الرابط. وكل ما أضفت له ترويسات أو كوكيز، قلّت فرص إيجاد نسخة جاهزة، فخله بأقل ما يمكن.
- **مدة الصلاحية:** من ترويسة `Cache-Control` عند المصدر، أو من إعدادات CloudFront.
- **السلوكيات (Behaviors):** قواعد حسب المسار، مثل `/images/*` بمدة طويلة و`/api/*` بدون كاش. فنطاق واحد يخدم المحتوى الثابت والديناميكي.

### مسح الكاش

لو غيّرت ملف، النسخة القديمة تبقى لين تنتهي صلاحيتها. وعندك حلين:

- **Invalidation:** تطلب من CloudFront يمسح مسارات، مثل `/*`. وأول 1000 مسار في الشهر مجانية.
- **إصدار في اسم الملف:** مثل `main.css?v=12`، فالإصدار الجديد رابط جديد. وهذا الحل الأفضل للملفات الثابتة.

::: note مثال حقيقي
روابط CSS وJavaScript في هذي المدونة فيها إصدار يتغيّر مع كل نشر، عشان الزائر ياخذ النسخة الجديدة بدون أي مسح.
:::

### ميزات إضافية

- **Geo Restriction:** تسمح أو تمنع دول معينة، مثل محتوى مرخّص لبلد واحد.
- **روابط موقّعة (Signed URLs):** لمحتوى مدفوع أو خاص، برابط له مدة.
- **CloudFront Functions وLambda@Edge:** كود قصير يشتغل عند الحافة، مثل التحويلات وتعديل الترويسات.

### الأسعار

عندك طريقتين، والأسعار ممكن تتغير فراجعها قبل ما تقرر:

- **حسب الاستخدام:** تدفع على البيانات الخارجة والطلبات، ويختلف السعر حسب المنطقة. وكل شهر عندك 1 TB و10 ملايين طلب مجاناً. و**Price Classes** تخليك تستثني المناطق الأغلى، مقابل تغطية أقل.
- **خطط ثابتة:** Free وPro وBusiness وPremium بسعر شهري لكل توزيعة بدون مفاجآت، وتشمل خدمات ثانية مثل WAF.

ونقل البيانات من S3 أو ALB إلى CloudFront مجاني.

### CloudFront أو نسخ S3 بين Regions؟

| | CloudFront | S3 Cross-Region Replication |
| --- | --- | --- |
| **التغطية** | كل مواقع الحافة | الـ Regions اللي تختارها |
| **البيانات** | نسخ مؤقتة لين تنتهي صلاحيتها | نسخ كاملة تتحدث باستمرار |
| **يناسب** | محتوى ثابت لكل العالم | بيانات متغيرة تبيها قريبة في Regions محددة |

## Global Accelerator: طريق أسرع

بعض الزيارات ما تنخزّن: لعبة عبر UDP، أو مكالمة صوتية، أو طلب دفع. لازم توصل لتطبيقك نفسه، وعلى الإنترنت العام تمر بشبكات كثيرة وتأخير غير ثابت.

**Global Accelerator** يدخّل الزائر شبكة AWS الخاصة من أقرب موقع حافة، ويكمل الطريق عليها لين تطبيقك.

<figure class="diagram">
<svg viewBox="0 0 640 220" role="img" aria-labelledby="ga-caption">
<defs>
<marker id="ga-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="320" y="22" text-anchor="middle" class="d-small">بدونه: شبكات كثيرة وتأخير غير ثابت</text>
<rect x="510" y="36" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="66" text-anchor="middle" class="d-label">الزائر</text>
<rect x="20" y="36" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="66" text-anchor="middle" class="d-label">تطبيقك</text>
<polyline points="510,61 450,44 390,76 320,46 250,78 190,48 132,61" fill="none" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<circle cx="450" cy="44" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="390" cy="76" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="320" cy="46" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="250" cy="78" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="190" cy="48" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="128" text-anchor="middle" class="d-small">معه: شبكة AWS الخاصة من أقرب موقع حافة</text>
<rect x="510" y="146" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="176" text-anchor="middle" class="d-label">الزائر</text>
<rect x="360" y="146" width="110" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="415" y="176" text-anchor="middle" class="d-label">موقع حافة</text>
<rect x="20" y="146" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="176" text-anchor="middle" class="d-label">تطبيقك</text>
<line x1="510" y1="171" x2="472" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#ga-arrow)"/>
<line x1="360" y1="171" x2="132" y2="171" stroke="var(--color-accent)" stroke-width="3" marker-end="url(#ga-arrow)"/>
</svg>
<figcaption id="ga-caption">بدل ما يقطع الطلب الإنترنت العام كله، يدخل شبكة AWS من أقرب موقع حافة ويكمل عليها.</figcaption>
</figure>

### عنوانين ثابتين عبر Anycast

في الإنترنت العادي (**Unicast**)، كل عنوان له جهاز واحد. وفي **Anycast**، عدة أماكن تشارك نفس العنوان، والشبكة توصلك لأقربها.

Global Accelerator يعطيك **عنوانين ثابتين** من هذا النوع، يشيرون لموزّعات ALB أو NLB أو سيرفرات EC2 أو Elastic IP، حتى في أكثر من Region. وهذا يعطيك:

- **عناوين ما تتغير:** عميلك يقدر يسمح لها في جدار الحماية.
- **تحويل سريع:** يتابع صحة التطبيق وينقل الزيارات، بدون ما تنتظر انتهاء كاش DNS عند الناس.
- **تحكم في الزيارات:** تحدد نسبة كل Region، فتقدر تجرب نسخة جديدة في واحدة منها.
- **حماية:** Shield Standard، وتطبيقك ما ينكشف مباشرة.

وتكلفته رسم ثابت بالساعة مع رسم إضافي على البيانات، فما هو مجاني مثل طبقة CloudFront.

### أيهم تختار؟

| | CloudFront | Global Accelerator |
| --- | --- | --- |
| **البروتوكولات** | HTTP وHTTPS | أي TCP أو UDP |
| **يخزّن؟** | نعم | لا، يوصّل الطلب فقط |
| **العناوين** | تتغير، وتستخدم اسم نطاق | عنوانين ثابتين |
| **يناسب** | مواقع وصور وفيديو وواجهات API | ألعاب ومكالمات وIoT، أو حاجة لعناوين ثابتة |

لو تطبيقك HTTP، ابدأ بـ CloudFront.

## الصورة الكاملة حتى الآن

مسار الزائر صار كذا: **Route 53** تعطيه العنوان، ثم **CloudFront** يجاوبه من أقرب موقع لو عنده نسخة، وإلا يوصّل طلبه لـ **ALB**، وهو يوزّعه على سيرفرات **Auto Scaling**، اللي تقرأ من **ElastiCache** و**RDS**.

## عملي: شوف الكاش بعينك

بنحط CloudFront قدام سيرفرك `web-1` من [الجزء الثالث](/posts/aws-03-ec2-first-server/)، لأنه يسمح بـ HTTP من أي مكان. من CloudShell:

```bash
ORIGIN=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=web-1" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PublicDnsName" --output text)

aws cloudfront create-distribution \
  --origin-domain-name "$ORIGIN" \
  --query "Distribution.[Id,DomainName]" --output table
```

احفظ المعرّف والاسم من الجدول، وانتظر لين تجهز، وهذا ياخذ كم دقيقة:

```bash
aws cloudfront wait distribution-deployed --id YOUR-DISTRIBUTION-ID
```

الحين اطلب الصفحة ثلاث مرات، وشوف الترويسات:

```bash
for i in 1 2 3; do
  curl -s -o /dev/null -D - https://YOUR-DOMAIN.cloudfront.net \
    | grep -iE "^(x-cache|age|x-amz-cf-pop)"
  echo
  sleep 2
done
```

أول طلب يرجع `Miss from cloudfront`، واللي بعده `Hit from cloudfront` مع `age` يزيد. و`x-amz-cf-pop` يوريك موقع الحافة اللي جاوبك.

الحين غيّر الصفحة على السيرفر من EC2 Instance Connect:

```bash
echo "<h1>New version</h1>" | sudo tee /usr/share/nginx/html/index.html
```

افتح رابط CloudFront، وبتلقى الصفحة القديمة لأنها لسا في الكاش. امسحها من CloudShell:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID --paths "/*"
```

بعد لحظات تظهر الصفحة الجديدة.

::: security احذف بعد التجربة
التوزيعة ما تنحذف مباشرة. من صفحتها في الكونسول اضغط **Disable**، وانتظر لين تنتهي، ثم **Delete**.
:::

## الخلاصة

- **CloudFront** يحفظ نسخ قريبة من الزوار، فالموقع يسرع والضغط يقل على المصدر.
- خل مصدرك **خاص** عبر OAC أو VPC Origins، عشان ما أحد يتخطى CloudFront.
- **إصدار في اسم الملف** أفضل من مسح الكاش في كل مرة.
- **Global Accelerator** ما يخزّن، بس يوصّل أي TCP أو UDP عبر شبكة AWS بعنوانين ثابتين.
- لو تطبيقك HTTP ابدأ بـ CloudFront.

كل هذا يوصّل الزائر لبوابة شبكتك، بس كيف تنبني الشبكة نفسها؟ في [**الجزء الثالث عشر**](/posts/aws-13-vpc/) نفتح VPC ونبني واحدة من الصفر.
