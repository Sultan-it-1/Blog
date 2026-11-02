---
title: "التعافي من الكوارث والترحيل"
description: وش يعني RPO وRTO، وأربع استراتيجيات للتعافي من الكوارث وتكلفتها، والنسخ المركزي بـ AWS Backup، ونقل قواعد البيانات بـ DMS والسيرفرات بـ AWS Transform MGN، مع تجربة عملية تحذف فيها البيانات وترجعها.
date: 2026-11-02
series: aws
part: 28
numbered: true
tags: [aws, operations]
---

في [الجزء السابع](/posts/aws-07-auto-scaling/) نجا تطبيقنا من فقدان منطقة توفر. بس لو الكارثة أكبر: منطقة كاملة طاحت، أو `DELETE` بالغلط، أو برنامج فدية؟ والنص الثاني من هذا الجزء: لو تطبيقك لسا مو على AWS، وتبي تجيبه؟

## RPO وRTO

قبل أي قرار تقني، تحتاج رقمين من أصحاب العمل:

<figure class="diagram">
<svg viewBox="0 0 640 150" role="img" aria-labelledby="rporto-caption">
<defs>
<marker id="rporto-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="395" y="40" text-anchor="middle" class="d-small">RPO: البيانات اللي تضيع</text>
<text x="230" y="40" text-anchor="middle" class="d-small">RTO: وقت التوقف</text>
<rect x="320" y="52" width="150" height="28" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="140" y="52" width="180" height="28" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<line x1="610" y1="66" x2="28" y2="66" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rporto-arrow)"/>
<line x1="470" y1="46" x2="470" y2="88" stroke="var(--color-accent)" stroke-width="2"/>
<line x1="320" y1="46" x2="320" y2="88" stroke="var(--color-accent)" stroke-width="2"/>
<line x1="140" y1="46" x2="140" y2="88" stroke="var(--color-accent)" stroke-width="2"/>
<text x="470" y="110" text-anchor="middle" class="d-small">آخر نسخة</text>
<text x="320" y="110" text-anchor="middle" class="d-small">الكارثة</text>
<text x="140" y="110" text-anchor="middle" class="d-small">رجعت الخدمة</text>
</svg>
<figcaption id="rporto-caption">RPO يطالع لورا من الكارثة إلى آخر نسخة سليمة، وRTO يطالع لقدام إلى رجوع الخدمة.</figcaption>
</figure>

| الرقم | السؤال | مثال |
| --- | --- | --- |
| **RPO** (Recovery Point Objective) | كم بيانات نقدر نخسر؟ | نسخة كل ساعة تعني خسارة حتى ساعة بيانات |
| **RTO** (Recovery Time Objective) | كم نقدر نبقى واقفين؟ | حتى أربع ساعات توقف |

كل ما صغر الرقمين، ارتفعت التكلفة. فالسؤال مو "وش الأفضل؟"، بل "كم تسوى ساعة التوقف عندنا؟"

## أربع استراتيجيات

هذي للتعافي في منطقة ثانية، مرتبة من الأرخص للأغلى. والفرق بينها كم شي شغال هناك قبل الكارثة:

<figure class="diagram">
<svg viewBox="0 0 640 262" role="img" aria-labelledby="dr-caption">
<defs>
<marker id="dr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="549.5" y="24" text-anchor="middle" class="d-label">Backup</text>
<rect x="479" y="36" width="141" height="54" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="549.5" y="58" text-anchor="middle" class="d-small">البيانات</text>
<text x="549.5" y="78" text-anchor="middle" class="d-label">نسخ احتياطية</text>
<rect x="479" y="96" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="549.5" y="118" text-anchor="middle" class="d-small">السيرفرات</text>
<text x="549.5" y="138" text-anchor="middle" class="d-label">لا شي</text>
<rect x="479" y="156" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="549.5" y="178" text-anchor="middle" class="d-small">الزوار</text>
<text x="549.5" y="198" text-anchor="middle" class="d-label">لا شي</text>
<text x="396.5" y="24" text-anchor="middle" class="d-label">Pilot Light</text>
<rect x="326" y="36" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="396.5" y="58" text-anchor="middle" class="d-small">البيانات</text>
<text x="396.5" y="78" text-anchor="middle" class="d-label">منسوخة</text>
<rect x="326" y="96" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="396.5" y="118" text-anchor="middle" class="d-small">السيرفرات</text>
<text x="396.5" y="138" text-anchor="middle" class="d-label">واقفة</text>
<rect x="326" y="156" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="396.5" y="178" text-anchor="middle" class="d-small">الزوار</text>
<text x="396.5" y="198" text-anchor="middle" class="d-label">لا شي</text>
<text x="243.5" y="24" text-anchor="middle" class="d-label">Warm Standby</text>
<rect x="173" y="36" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="243.5" y="58" text-anchor="middle" class="d-small">البيانات</text>
<text x="243.5" y="78" text-anchor="middle" class="d-label">منسوخة</text>
<rect x="173" y="96" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="243.5" y="118" text-anchor="middle" class="d-small">السيرفرات</text>
<text x="243.5" y="138" text-anchor="middle" class="d-label">قليلة شغالة</text>
<rect x="173" y="156" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="243.5" y="178" text-anchor="middle" class="d-small">الزوار</text>
<text x="243.5" y="198" text-anchor="middle" class="d-label">عند التحويل</text>
<text x="90.5" y="24" text-anchor="middle" class="d-label">Multi-Site</text>
<rect x="20" y="36" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="90.5" y="58" text-anchor="middle" class="d-small">البيانات</text>
<text x="90.5" y="78" text-anchor="middle" class="d-label">منسوخة</text>
<rect x="20" y="96" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="90.5" y="118" text-anchor="middle" class="d-small">السيرفرات</text>
<text x="90.5" y="138" text-anchor="middle" class="d-label">بالحجم الكامل</text>
<rect x="20" y="156" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="90.5" y="178" text-anchor="middle" class="d-small">الزوار</text>
<text x="90.5" y="198" text-anchor="middle" class="d-label">دايماً</text>
<line x1="620" y1="226" x2="22" y2="226" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#dr-arrow)"/>
<text x="320" y="248" text-anchor="middle" class="d-small">تكلفة أعلى، وبيانات ضايعة أقل، وتعافي أسرع</text>
</svg>
<figcaption id="dr-caption">وش شغال في المنطقة الثانية قبل الكارثة: كل ما كان الجاهز أكثر، كان التعافي أسرع والتكلفة أعلى.</figcaption>
</figure>

| الاستراتيجية | RPO تقريبي | RTO تقريبي | تناسب |
| --- | --- | --- | --- |
| **Backup and Restore** | ساعات | حتى 24 ساعة | الأنظمة غير الحرجة |
| **Pilot Light** | دقايق | عشرات الدقايق | البيانات الأساسية لازم تكون جاهزة دايماً |
| **Warm Standby** | ثواني | دقايق | أنظمة مهمة بميزانية محدودة |
| **Multi-Site** (نشط نشط) | قريب من الصفر | قريب من الصفر | لما دقيقة التوقف تكلف ثروة |

- **Backup and Restore:** نسخ تنتقل لمنطقة ثانية، وكل شي ينبني منها وقت الكارثة. والقوالب تساعد، زي ما بنشوف في [الجزء الجاي](/posts/aws-29-cost-good-architecture/).
- **Pilot Light:** البيانات تتنسخ باستمرار، مثل [Aurora](/posts/aws-08-rds-aurora/) Global Database أو [نسخ S3](/posts/aws-15-s3-basics/)، والسيرفرات جاهزة بس واقفة.
- **Warm Standby:** نسخة كاملة صغيرة شغالة وتقدر تستقبل على طول، ثم تكبر بـ Auto Scaling.
- **Multi-Site:** المنطقتين يخدمون المستخدمين طول الوقت، مثل [Route 53](/posts/aws-11-dns-route53/) مع [Global Tables](/posts/aws-21-lambda-api-dynamodb/).

### نصائح تفرق

- **اختبر تعافيك.** النسخة اللي ما رجعتها ولا مرة مجرد أمل. سوّ تدريبات، واستفد من **AWS Fault Injection Service** عشان تسبب أعطال متعمدة.
- **أتمت.** ابن البيئة من قوالب، لأن وقت الكارثة ما أحد يتذكر الخطوات.
- **احمِ نسخك من نفسك.** حطها في حساب ثاني ومنطقة ثانية، لأن المهاجم اللي يدخل حسابك بيبدأ فيها.
- **فكر في Elastic Disaster Recovery.** **AWS DRS** ينسخ سيرفراتك باستمرار لتخزين رخيص، ويشغلها بس لما تحتاجها، بـ RPO ثواني وRTO دقايق.

## AWS Backup: كل شي في مكان واحد

كل خدمة لها نسخها، بس **AWS Backup** يديرها مركزياً، لـ EC2 وEBS وS3 وRDS وAurora وDynamoDB وEFS وFSx وغيرها:

| الجزء | وش يسوي |
| --- | --- |
| **Backup Plan** | جدول ومدة حفظ، مثل يومي لـ 35 يوم، ثم انتقال لتخزين بارد |
| **Vault** | مكان حفظ النسخ، مشفرة بـ KMS |
| **الوسوم** | انسخ أي شي عليه `backup=daily`، فالموارد الجديدة تنضم لحالها |
| **النسخ** | لمنطقة ثانية أو حساب ثاني، لحماية حقيقية من الكوارث |
| **Vault Lock** | يمنع أي أحد، حتى Root في وضع Compliance، من حذف النسخ قبل انتهائها |

و**Vault Lock** أقوى دفاع عندك ضد برامج الفدية وضد اللي معه بيانات مدير مسروقة.

## ترحيل قواعد البيانات: DMS

**AWS DMS** (Database Migration Service) ينقل قاعدة البيانات وهي مستخدمة: ينسخ البيانات الموجودة، ثم يستمر يرسل التغييرات (تعرف بـ **CDC**) لين تكون جاهز تحوّل.

| النوع | مثال | الأدوات |
| --- | --- | --- |
| **نفس المحرك** | MySQL على سيرفر إلى RDS for MySQL | DMS لحاله يكفي |
| **محرك مختلف** | Oracle إلى Aurora PostgreSQL | **DMS Schema Conversion** أو **SCT** لتحويل الجداول والكود أول، ثم DMS للبيانات |

والمصادر والوجهات كثيرة، منها قواعد مكتبك وRDS وS3 وDynamoDB وRedshift وOpenSearch. ويقدر يشتغل بـ **Multi-AZ** مع نسخة احتياطية في منطقة ثانية، أو **Serverless** عشان ما تحتاج تحدد حجمه.

### النقل إلى RDS أو Aurora

لو تنقل MySQL أو PostgreSQL، عندك طرق أبسط:

| الطريقة | التوقف | متى |
| --- | --- | --- |
| **لقطة من RDS إلى Aurora** | نعم، وقت النقل | التوقف مقبول |
| **نسخة قراءة Aurora ثم ترقيتها** | قصير جداً | من RDS بدون توقف حقيقي |
| **نسخة من S3** | نعم | من خارج RDS: Percona XtraBackup لـ MySQL |
| **DMS** | قصير جداً | نسخ مستمر من أي مكان |

## ترحيل السيرفرات ومراكز البيانات

| تبي | استخدم |
| --- | --- |
| نقل السيرفرات زي ما هي (Lift and Shift) | **AWS Transform MGN** |
| استيراد صورة جهاز افتراضي واحد | **VM Import/Export** |
| نقل VMware زي ما هو | **Amazon Elastic VMware Service**، أو VMware Cloud on AWS من Broadcom |
| مساعدة في تخطيط ترحيل كبير | **AWS Transform** |
| نقل الملفات | [DataSync](/posts/aws-18-storage-transfer/) |
| وضع تطبيقات Java أو .NET في حاويات | **App2Container** |

**AWS Transform MGN** كان اسمه Application Migration Service لين 2026. وكيل على سيرفرك ينسخ أقراصه باستمرار إلى موارد AWS منخفضة التكلفة، وتجرب كم ما تبي، ثم تحوّل في دقايق. وغالباً هو أسرع طريق للخروج من مركز بيانات.

::: note أدوات قديمة
ممكن تقرأ عن **Application Discovery Service** و**Migration Hub**، وكانت لتخطيط الترحيل. ما عادت متاحة للعملاء الجدد، وAWS Transform هو الطريق الحين لهذا النوع من الشغل.
:::

ولو عندك بيانات ضخمة، حسبناها في [الجزء الثامن عشر](/posts/aws-18-storage-transfer/).

## عملي: احذف البيانات ورجعها

بنمثل كارثة صغيرة: جدول، ونسخة، وحذف بالغلط، ثم استعادة. من CloudShell، أنشئ الجدول بطلب واحد:

```bash
aws dynamodb create-table --table-name series-orders \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --query TableDescription.TableStatus

aws dynamodb wait table-exists --table-name series-orders

aws dynamodb put-item --table-name series-orders \
  --item '{"id":{"S":"1001"},"total":{"N":"120"}}'

TABLE_ARN=$(aws dynamodb describe-table --table-name series-orders \
  --query Table.TableArn --output text)
```

AWS Backup يحتاج دور وVault:

```bash
cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "backup.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role --role-name series-backup-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

aws iam attach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
aws iam attach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores

aws backup create-backup-vault --backup-vault-name series-vault \
  --query BackupVaultName --output text
```

ابدأ النسخ، ثم انتظره. ولو جاك خطأ عن الدور، انتظر كم ثانية وأعد الأمر الأول. وهذا ياخذ عادةً كم دقيقة:

```bash
JOB=$(aws backup start-backup-job --backup-vault-name series-vault \
  --resource-arn $TABLE_ARN --iam-role-arn $ROLE_ARN \
  --query BackupJobId --output text)

while true; do
  STATE=$(aws backup describe-backup-job --backup-job-id $JOB \
    --query State --output text)
  echo $STATE
  case $STATE in COMPLETED|FAILED|ABORTED|EXPIRED) break ;; esac
  sleep 15
done

POINT=$(aws backup describe-backup-job --backup-job-id $JOB \
  --query RecoveryPointArn --output text)
```

الحين الكارثة. الطلب راح:

```bash
aws dynamodb delete-item --table-name series-orders \
  --key '{"id":{"S":"1001"}}'

aws dynamodb get-item --table-name series-orders \
  --key '{"id":{"S":"1001"}}'
```

الأمر الثاني ما يطبع شي. استعد النسخة إلى جدول جديد، ولاحظ الوقت اللي تاخذه، لأن هذا هو RTO الحقيقي حقك:

```bash
RESTORE=$(aws backup start-restore-job --recovery-point-arn $POINT \
  --iam-role-arn $ROLE_ARN \
  --metadata targetTableName=series-orders-restored,encryptionType=Default \
  --query RestoreJobId --output text)

while true; do
  STATE=$(aws backup describe-restore-job --restore-job-id $RESTORE \
    --query Status --output text)
  echo $STATE
  case $STATE in COMPLETED|FAILED|ABORTED) break ;; esac
  sleep 15
done

aws dynamodb get-item --table-name series-orders-restored \
  --key '{"id":{"S":"1001"}}' --query Item
```

الطلب رجع. وأي شي انكتب بعد النسخة ضاع، وهذا هو RPO حقك.

::: security احذف بعد التجربة
هذا يكلف جزء من السنت، بس احذف محتوى الـ Vault قبله:
:::

```bash
aws backup delete-recovery-point --backup-vault-name series-vault \
  --recovery-point-arn $POINT
aws backup delete-backup-vault --backup-vault-name series-vault

aws dynamodb delete-table --table-name series-orders \
  --query TableDescription.TableStatus
aws dynamodb delete-table --table-name series-orders-restored \
  --query TableDescription.TableStatus

aws iam detach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
aws iam detach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores
aws iam delete-role --role-name series-backup-role
```

## الخلاصة

- **RPO** البيانات اللي تخسرها، و**RTO** وقت توقفك، وأصحاب العمل يحددونهم.
- الاستراتيجيات الأربع: **النسخ**، و**Pilot Light**، و**Warm Standby**، و**Multi-Site**، والتكلفة ترتفع كل ما تحسنت.
- **AWS Backup** يدير النسخ مركزياً، و**Vault Lock** يحميها.
- **DMS** ينقل قواعد البيانات وهي شغالة، و**AWS Transform MGN** ينقل السيرفرات.
- **اختبر تعافيك**، وإلا ما عندك تعافي.

تطبيقك الحين مبني ومحمي وقابل للتعافي. يبقى سؤال أخير: كم يكلف، وهل هو مصمم صح؟ في [**الجزء التاسع والعشرين**](/posts/aws-29-cost-good-architecture/) نختم السلسلة بالتكلفة والتصميم الجيد.
