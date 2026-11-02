---
title: "خدمات تخزين ونقل إضافية"
description: أنظمة الملفات الجاهزة في FSx، وربط مكتبك بتخزين السحابة عبر Storage Gateway، ونقل البيانات بـ DataSync وTransfer Family، ووش تسوي لو بياناتك أضخم من الإنترنت، مع مقارنة شاملة لخدمات التخزين.
date: 2026-11-02
series: aws
part: 18
numbered: true
tags: [aws, storage]
---

في [الأجزاء السابقة](/posts/aws-17-s3-security/) غطينا S3 بالتفصيل. بس فيه حالات ما يحلها: تطبيق Windows يحتاج مجلد مشترك، أو خوادم في مكتبك تبي توصل للسحابة، أو شريك يرسل ملفاته عبر SFTP، أو بيانات ضخمة تحتاج تنقلها.

هذي خريطة الجزء:

| تبي | استخدم |
| --- | --- |
| نظام ملفات Windows أو أداء عالي جداً | **Amazon FSx** |
| خوادم مكتبك توصل لتخزين السحابة | **Storage Gateway** |
| نقل ومزامنة بيانات كبيرة بشكل مجدول | **DataSync** |
| شركاء يرفعون ملفات عبر SFTP | **Transfer Family** |
| نقل كميات هائلة فعلياً | **Data Transfer Terminal** |

## Amazon FSx: أنظمة ملفات جاهزة

شفنا [EFS](/posts/aws-05-ec2-storage/) لنظام ملفات Linux مشترك. **FSx** يشغّل لك أنظمة ملفات معروفة كخدمة مُدارة، فما تحتاج تديرها بنفسك:

| النوع | البروتوكول | يناسب |
| --- | --- | --- |
| **FSx for Windows** | SMB | تطبيقات Windows ومجلدات مشتركة، ومربوط بـ Active Directory |
| **FSx for Lustre** | Lustre | الحوسبة العالية وتدريب النماذج، ويتكامل مع S3، ولأجهزة Linux فقط |
| **FSx for NetApp ONTAP** | NFS وSMB وiSCSI | نقل أنظمة NetApp، وأنظمة تشغيل مختلفة على نفس البيانات |
| **FSx for OpenZFS** | NFS | أحمال Linux، ونقل أنظمة ZFS، ولقطات ونسخ فورية |

واختيار **FSx for Lustre** فيه خيارين: **Scratch** رخيص وسريع لبيانات مؤقتة، بس البيانات ما لها نسخ، فلو تعطل قرص تضيع. و**Persistent** لبيانات طويلة المدى مع نسخ داخل منطقة التوفر.

## Storage Gateway: مكتبك والسحابة

عندك خوادم في مكتبك وتبي تستفيد من السحابة، بدون تغيير التطبيقات؟ **Storage Gateway** برنامج تشغّله عندك كجهاز افتراضي، ويقدم تخزين عادي لتطبيقاتك، وبياناته فعلياً في AWS، مع كاش محلي للملفات الأخيرة.

<figure class="diagram">
<svg viewBox="0 0 640 230" role="img" aria-labelledby="gateway-caption">
<defs>
<marker id="gw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="326" y="14" width="300" height="202" rx="14" fill="none" stroke="var(--color-line-strong)"/>
<text x="476" y="42" text-anchor="middle" class="d-label">مكتبك</text>
<rect x="496" y="70" width="110" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="551" y="105" text-anchor="middle" class="d-label">تطبيقاتك</text>
<rect x="342" y="70" width="118" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="401" y="96" text-anchor="middle" class="d-label">Gateway</text>
<text x="401" y="116" text-anchor="middle" class="d-small">مع كاش محلي</text>
<text x="476" y="168" text-anchor="middle" class="d-small">NFS أو SMB أو iSCSI أو أشرطة</text>
<rect x="14" y="14" width="226" height="202" rx="14" fill="none" stroke="var(--color-accent)" stroke-dasharray="6 6"/>
<text x="127" y="34" text-anchor="middle" class="d-small">AWS</text>
<rect x="34" y="44" width="190" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="129" y="71" text-anchor="middle" class="d-label">S3</text>
<rect x="34" y="100" width="190" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="129" y="127" text-anchor="middle" class="d-label">لقطات EBS</text>
<rect x="34" y="156" width="190" height="44" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="129" y="183" text-anchor="middle" class="d-label">Glacier</text>
<line x1="496" y1="100" x2="462" y2="100" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
<line x1="342" y1="90" x2="226" y2="66" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
<line x1="342" y1="100" x2="226" y2="122" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
<line x1="342" y1="110" x2="226" y2="178" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
</svg>
<figcaption id="gateway-caption">التطبيقات في مكتبك تشوف تخزين عادي عبر Gateway، وهو يحفظ البيانات في S3 أو لقطات EBS أو Glacier.</figcaption>
</figure>

| النوع | تشوفه تطبيقاتك كـ | وين البيانات | مثال |
| --- | --- | --- | --- |
| **S3 File Gateway** | مجلد NFS أو SMB | كائنات في S3 | مجلدات مشتركة ونسخ احتياطية للملفات |
| **Volume Gateway** | قرص iSCSI | S3 مع لقطات EBS | أقراص لخوادم قائمة، بكاش أو نسخة كاملة محلية |
| **Tape Gateway** | مكتبة أشرطة افتراضية | S3 ثم Glacier | برامج نسخ احتياطي تعتمد على الأشرطة |

وفيه نوع رابع اسمه **FSx File Gateway** ما عاد متاح للعملاء الجدد، وAWS تنصح بالاتصال بـ FSx مباشرة.

## نقل البيانات

### DataSync

**DataSync** ينقل ويزامن بيانات كبيرة بشكل مجدول:

- **من وين وإلى وين:** من خوادم NFS أو SMB أو HDFS أو تخزين كائني، إلى S3 أو EFS أو FSx، وبين خدمات AWS نفسها.
- **وكيل:** تحتاج تشغّل وكيل (Agent) عندك للنقل من مكتبك، وما تحتاجه بين خدمات AWS.
- **ينقل اللي تغيّر فقط** في كل تشغيل، ويحافظ على الصلاحيات والتواريخ، ويتحقق من سلامة البيانات.

### Transfer Family

عندك شركاء أو أنظمة قديمة ترسل ملفات عبر **SFTP** أو **FTPS** أو **FTP** أو **AS2**، وما تبي تدير سيرفر لها؟ **Transfer Family** يعطيك نقطة استقبال مُدارة، والملفات تروح لـ S3 أو EFS. والمستخدمين من داخله، أو Active Directory، أو نظام هوية خاص فيك.

ولاحظ إن FTP غير مشفّر، فما يتوفر إلا داخل VPC. وتدفع بالساعة على كل نقطة، حتى بدون استخدام.

### لما تكون البيانات أضخم من الإنترنت

قبل ما تختار طريقة النقل، احسب. هذي المدة النظرية بسرعة الخط كاملة، والواقع أبطأ:

| الحجم | 100 ميجابت | 1 جيجابت | 10 جيجابت |
| --- | --- | --- | --- |
| **1 TB** | 22 ساعة | ساعتين | 13 دقيقة |
| **10 TB** | 9 أيام | 22 ساعة | ساعتين |
| **100 TB** | 93 يوم | 9 أيام | 22 ساعة |
| **1 PB** | سنتين ونص | 93 يوم | 9 أيام |

عندك هذي الخيارات للكميات الكبيرة:

- **DataSync** لو خطك يتحمل، مع مزامنة مستمرة.
- **Direct Connect** لو النقل كبير ومستمر، وشرحناه في [الجزء الرابع عشر](/posts/aws-14-vpc-connectivity/).
- **Data Transfer Terminal**: مواقع فعلية تجيبها بأجهزة تخزينك، وتوصلها بشبكة AWS بسرعة عالية.

::: note ماذا عن Snowball؟
ممكن تقرأ عن **AWS Snowball Edge**، وهي أجهزة ترسلها AWS، تعبيها، وترجعها لهم. بس الخدمة ما عادت متاحة للعملاء الجدد منذ نوفمبر 2025، وهي مستمرة لعملائها الحاليين. وللحوسبة في المواقع البعيدة، AWS توجّه لـ **Outposts**.
:::

## مقارنة خدمات التخزين

| الخدمة | النوع | تناسب |
| --- | --- | --- |
| **S3** | كائني | ملفات وصور ونسخ احتياطية ومواقع ثابتة |
| **S3 Glacier** | كائني للأرشيف | بيانات نادراً ما تنطلب |
| **EBS** | قرص شبكي | قرص لسيرفر واحد وقواعد بيانات |
| **Instance Store** | قرص محلي مؤقت | أعلى سرعة لبيانات مؤقتة |
| **EFS** | ملفات لـ Linux | مجلد مشترك بين عدة سيرفرات |
| **FSx for Windows** | ملفات SMB | مجلدات مشتركة لتطبيقات Windows |
| **FSx for Lustre** | ملفات عالية الأداء | الحوسبة العالية وتدريب النماذج |
| **FSx for ONTAP** | ملفات بعدة بروتوكولات | نقل أنظمة NetApp |
| **FSx for OpenZFS** | ملفات NFS | أحمال Linux ونقل أنظمة ZFS |
| **Storage Gateway** | جسر | مكتبك يوصل لتخزين السحابة |
| **DataSync** | نقل | مزامنة مجدولة |
| **Transfer Family** | نقل | استقبال ملفات عبر SFTP وأخواته |

## عملي: مزامنة مع DataSync

بننقل ملفات بين حاويتين، وهذا ما يحتاج وكيل. من CloudShell، جهّز حاويتين وملفات:

```bash
SRC=series-src-$RANDOM$RANDOM
DST=series-dst-$RANDOM$RANDOM

aws s3 mb s3://$SRC
aws s3 mb s3://$DST

for i in 1 2 3; do
  echo "file $i" > file$i.txt
  aws s3 cp file$i.txt s3://$SRC/
done

echo "source: $SRC  destination: $DST"
```

افتح **DataSync** في الكونسول، واضغط **Create task**:

1. **المصدر:** أنشئ موقع جديد من نوع S3، وحدد حاوية `series-src-...`، واختر إنشاء دور IAM تلقائياً.
2. **الوجهة:** نفس الشي مع حاوية `series-dst-...`.
3. **الإعدادات:** سمّ المهمة `series-sync`، واختر **Enhanced** لو ظهر لك خيار الوضع، وخل الباقي على حاله.
4. **التشغيل:** أنشئ المهمة، ثم اضغط **Start**.

لما تنتهي، تأكد من الوجهة:

```bash
aws s3 ls s3://$DST/
```

الحين أضف ملف واحد، وشغّل المهمة مرة ثانية:

```bash
echo "file 4" > file4.txt
aws s3 cp file4.txt s3://$SRC/
```

في صفحة التشغيل الجديد بتلقى ملف واحد انتقل، لأن DataSync ينقل اللي تغيّر فقط. وهذا اللي يفرق عن النسخ الكامل في كل مرة.

::: security احذف بعد التجربة
التكلفة هنا سنتات قليلة. احذف المهمة والموقعين من DataSync، ثم الأدوار اللي انشأت من IAM. وأخيراً احذف الحاويتين:
:::

```bash
aws s3 rb s3://$SRC --force
aws s3 rb s3://$DST --force
```

## الخلاصة

- **FSx** أنظمة ملفات جاهزة: Windows وLustre وONTAP وOpenZFS.
- **Storage Gateway** يخلي مكتبك يشوف السحابة كتخزين عادي.
- **DataSync** للمزامنة المجدولة، و**Transfer Family** لاستقبال SFTP.
- احسب مدة النقل قبل ما تقرر، وSnowball ما عاد متاح للجدد.

بهذا نكمل قسم التخزين. عندك الحين تطبيق قوي بقاعدة بيانات وشبكة وتخزين، بس كل أجزائه مربوطة ببعض مباشرة. في **الجزء التاسع عشر** نبدأ قسم التطبيقات الحديثة، ونفصل بينها بـ SQS وSNS وKinesis.
