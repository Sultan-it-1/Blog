---
title: "قواعد البيانات المُدارة: RDS وAurora"
description: لا تدير قاعدة بياناتك بيدك. كيف تتكفل RDS بالنسخ الاحتياطية والتحديثات والتحويل عند الأعطال، والفرق بين Multi-AZ ونسخ القراءة، ووش تضيف Aurora، مع تجربة عملية تبني فيها قاعدة بيانات خاصة.
date: 2026-11-02
series: aws
part: 8
numbered: true
tags: [aws, databases]
---

في [الجزء السابع](/posts/aws-07-auto-scaling/) اتفقنا إن السيرفر ممكن يختفي بأي لحظة، فما يبقى عليه شي مهم. وأهم شي عندك هو بياناتك، فوين تعيش؟

تقدر تثبّت PostgreSQL بنفسك على سيرفر EC2. هذا يشتغل، بس صرت أنت المسؤول عن النسخ الاحتياطية، والتحديثات، والنسخ المتطابقة، والتحويل عند الأعطال، والقرص اللي يمتلي الساعة 3 الفجر. **RDS** تشيل عنك أغلب هذا.

## وش تسوي RDS عنك؟

**RDS** (Relational Database Service) تشغّل محرك قاعدة البيانات اللي تختاره على سيرفرات تديرها AWS. والمحركات المدعومة: PostgreSQL وMySQL وMariaDB وOracle وSQL Server وDb2، وفوقها Aurora اللي بنوصلها بعد شوي.

| المهمة | قاعدة بيانات على EC2 | RDS |
| --- | --- | --- |
| تثبيت المحرك وتحديثه هو والنظام | أنت | AWS، في نافذة صيانة تحددها |
| النسخ الاحتياطي والاسترجاع لوقت محدد | تبنيه بنفسك | جاهز |
| نسخة احتياطية مع تحويل تلقائي | تبنيها بنفسك | خيار واحد |
| نسخ للقراءة | تبنيها بنفسك | بضع ضغطات |
| لوحات المراقبة | تبنيها بنفسك | جاهزة |
| تصميم الجداول والفهارس والاستعلامات | أنت | **لسا أنت** |

والمقابل: ما تقدر تدخل على السيرفر بـ SSH، ولا تلمس نظام التشغيل. ولو تحتاج هذا فعلاً مع Oracle أو SQL Server، فيه **RDS Custom** اللي يعطيك وصول للسيرفر، وتبقى AWS تتكفل بكثير من الأتمتة.

### تخزين يكبر لحاله

فعّل **Storage Auto Scaling** وحدد سقف، وRDS توسّع القرص لما تقل المساحة الفاضية، بدون توقف. بس انتبه: التخزين يكبر فقط، وما تقدر تصغّره بعدها.

## Multi-AZ ونسخ القراءة

هذي أهم فكرة في الجزء، وكثير يخلطون بينهم. واحد يحميك من الأعطال، والثاني يساعدك تخدم قراءات أكثر.

<figure class="diagram">
<svg viewBox="0 0 640 280" role="img" aria-labelledby="rds-caption">
<defs>
<marker id="rds-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="330" y="10" width="300" height="260" rx="14" fill="none" stroke="var(--color-line-strong)"/>
<text x="480" y="36" text-anchor="middle" class="d-label">Multi-AZ: الحماية</text>
<rect x="400" y="50" width="160" height="34" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="480" y="72" text-anchor="middle" class="d-small">التطبيق</text>
<rect x="504" y="112" width="112" height="76" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="560" y="146" text-anchor="middle" class="d-label">الأساسية</text>
<text x="560" y="166" text-anchor="middle" class="d-small">منطقة توفر A</text>
<rect x="344" y="112" width="112" height="76" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="400" y="146" text-anchor="middle" class="d-label">الاحتياطية</text>
<text x="400" y="166" text-anchor="middle" class="d-small">منطقة توفر B</text>
<line x1="510" y1="84" x2="540" y2="110" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<line x1="450" y1="84" x2="418" y2="110" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="504" y1="150" x2="458" y2="150" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<text x="480" y="222" text-anchor="middle" class="d-small">نسخ متزامن، وما تقرأ من الاحتياطية</text>
<text x="480" y="246" text-anchor="middle" class="d-small">عند العطل تستلم تلقائياً</text>
<rect x="10" y="10" width="300" height="260" rx="14" fill="none" stroke="var(--color-line-strong)"/>
<text x="160" y="36" text-anchor="middle" class="d-label">نسخ القراءة: قراءات أكثر</text>
<rect x="80" y="50" width="160" height="34" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="160" y="72" text-anchor="middle" class="d-small">التطبيق</text>
<rect x="196" y="112" width="100" height="76" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="246" y="146" text-anchor="middle" class="d-label">الأساسية</text>
<text x="246" y="166" text-anchor="middle" class="d-small">الكتابة</text>
<rect x="22" y="98" width="126" height="104" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<rect x="32" y="108" width="106" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="85" y="132" text-anchor="middle" class="d-small">نسخة قراءة 1</text>
<rect x="32" y="154" width="106" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="85" y="178" text-anchor="middle" class="d-small">نسخة قراءة 2</text>
<line x1="210" y1="84" x2="240" y2="110" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<line x1="110" y1="84" x2="92" y2="96" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<line x1="196" y1="150" x2="150" y2="150" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<text x="160" y="222" text-anchor="middle" class="d-small">نسخ غير متزامن، وتقدر تقرأ منها</text>
<text x="160" y="246" text-anchor="middle" class="d-small">تطبيقك يختار وين تروح القراءات</text>
</svg>
<figcaption id="rds-caption">في Multi-AZ تنتظر النسخة الاحتياطية بدون قراءة وتستلم عند العطل، وفي نسخ القراءة يوجّه التطبيق قراءاته لنسخ منفصلة.</figcaption>
</figure>

| | Multi-AZ | نسخة قراءة (Read Replica) |
| --- | --- | --- |
| **الهدف** | التوفر: تنجو من العطل | التوسّع: تخدم قراءات أكثر |
| **النسخ** | متزامن | غير متزامن، فممكن تتأخر شوي |
| **تقرأ منها؟** | لا، الاحتياطية تنتظر فقط | نعم، هذا هدفها |
| **العنوان** | نفسه، وينتقل عند التحويل | لكل نسخة عنوانها |
| **مكانها** | منطقة توفر ثانية في نفس الـ Region | نفس المنطقة أو غيرها أو Region ثانية |
| **عند العطل** | تحويل تلقائي خلال دقيقة أو دقيقتين | يدوي: ترقّيها لقاعدة مستقلة |

### Multi-AZ

**متزامن** معناها إن الكتابة ما تتأكد إلا بعد ما توصل النسختين. ولما تتعطل الأساسية، توجّه RDS نفس اسم الـ DNS للاحتياطية، وتطبيقك يعيد الاتصال بدون أي تعديل. وتقدر تفعّلها على قاعدة شغّالة بدون توقف.

وفيه شكل أحدث اسمه **Multi-AZ DB cluster** لـ MySQL وPostgreSQL: قاعدة أساسية واحدة مع نسختين احتياطيتين تقدر تقرأ منهم، وتحويل أسرع.

### نسخ القراءة

تقدر تسوي لين 15 نسخة في PostgreSQL وMySQL وMariaDB، وأقل في غيرها. ومثال شائع: تقارير لوحة التحكم الثقيلة تقرأ من نسخة، فما تأثر على قاعدة الإنتاج.

انتبه لنقطتين:

- **RDS ما توزّع القراءات عنك.** تطبيقك هو اللي يوجّه القراءة لعنوان النسخة.
- **النسخ غير متزامن.** ممكن المستخدم ما يشوف اللي كتبه قبل لحظة، فخل القراءات اللي لازم تكون محدّثة على القاعدة الأساسية.

ونقل البيانات لنسخة داخل نفس الـ Region مجاني، وبين Regions مدفوع.

::: tip كل واحد له تكلفته
كل نسخة هي سيرفر تدفع عليه كامل، وMulti-AZ تقريباً تضاعف تكلفة القاعدة. فعّلها في الإنتاج، وغالباً ما تحتاجها في بيئة التطوير.
:::

## النسخ الاحتياطي والاسترجاع

RDS تاخذ نسخة يومية تلقائية، وتحفظ سجلات المعاملات كل 5 دقايق، فتقدر **ترجع لأي ثانية** داخل فترة الاحتفاظ لين حوالي 5 دقايق قبل الحين. وتحدد الفترة من يوم لين 35 يوم، و0 يوقف النسخ التلقائي.

أما **اللقطات اليدوية** (Snapshots) فتبقى لين تحذفها أنت، فمناسبة قبل أي تغيير كبير.

وأهم نقطة: **الاسترجاع ينشئ قاعدة جديدة** بعنوان جديد، وما يكتب فوق القديمة. وبعدها توجّه تطبيقك للعنوان الجديد.

::: warning الإيقاف ما يوقف كل التكلفة
القاعدة الموقوفة تدفع على تخزينها ونسخها، وRDS تشغّلها من جديد تلقائياً بعد 7 أيام. لو ما تحتاجها، خذ لقطة واحذفها.
:::

## الأمان

نفس النمط اللي شفناه في [الجزء السادس](/posts/aws-06-load-balancers/): قاعدة البيانات في شبكة خاصة، وما تقبل إلا من مجموعة أمان السيرفرات.

- **الشبكة:** أوقف الوصول العام (Public access)، وخل مجموعة الأمان تسمح بالمنفذ (`5432` أو `3306`) من مجموعة أمان السيرفرات فقط.
- **التشفير المخزّن:** عن طريق KMS، وقرره عند الإنشاء. تفعيله بعدين يعني تشفّر نسخة من لقطة وتسترجعها.
- **التشفير أثناء النقل:** TLS.
- **كلمات المرور:** خل RDS تدير كلمة المدير في **Secrets Manager**، أو استخدم مصادقة IAM برموز مؤقتة في PostgreSQL وMySQL وMariaDB.
- **السجلات:** صدّرها إلى CloudWatch Logs.

### RDS Proxy

لو عندك اتصالات كثيرة وقصيرة، زي دوال Lambda اللي بنشرحها في [الجزء الحادي والعشرين](/posts/aws-21-lambda-api-dynamodb/)، ممكن تستهلك حد الاتصالات في القاعدة. **RDS Proxy** يجلس في النص ويعيد استخدام الاتصالات، وتطبيقك يتصل فيه كأنه القاعدة نفسها.

ويقلل وقت التحويل عند الأعطال، لأنه يبقي اتصالات تطبيقك مفتوحة ويوجّهها للقاعدة الجديدة. ويتوفر من داخل شبكتك الخاصة فقط.

## Aurora

**Aurora** محرك قاعدة بيانات بنته AWS للسحابة، ومتوافق مع MySQL أو PostgreSQL، فتطبيقك وأدواتك تشتغل بتعديل بسيط أو بدون تعديل. والفرق الجوهري: التخزين منفصل عن السيرفرات.

<figure class="diagram">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="aurora-caption">
<defs>
<marker id="aurora-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="430" y="10" width="170" height="40" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="515" y="35" text-anchor="middle" class="d-label">عنوان الكتابة</text>
<rect x="40" y="10" width="365" height="40" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="222" y="35" text-anchor="middle" class="d-label">عنوان القراءة: يوزّع على النسخ</text>
<line x1="515" y1="50" x2="515" y2="76" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<line x1="320" y1="50" x2="320" y2="76" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<line x1="125" y1="50" x2="125" y2="76" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<rect x="430" y="78" width="170" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="515" y="103" text-anchor="middle" class="d-label">Writer</text>
<text x="515" y="122" text-anchor="middle" class="d-small">يقرأ ويكتب</text>
<rect x="235" y="78" width="170" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="103" text-anchor="middle" class="d-label">Reader 1</text>
<text x="320" y="122" text-anchor="middle" class="d-small">يقرأ فقط</text>
<rect x="40" y="78" width="170" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="125" y="103" text-anchor="middle" class="d-label">Reader 2</text>
<text x="125" y="122" text-anchor="middle" class="d-small">يقرأ فقط</text>
<line x1="515" y1="134" x2="515" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<line x1="320" y1="134" x2="320" y2="168" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="125" y1="134" x2="125" y2="168" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<rect x="20" y="168" width="600" height="122" rx="14" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="320" y="192" text-anchor="middle" class="d-label">تخزين مشترك: ست نسخ على ثلاث مناطق توفر</text>
<rect x="430" y="204" width="170" height="74" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<text x="515" y="224" text-anchor="middle" class="d-small">منطقة توفر A</text>
<rect x="453" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="481" y="256" text-anchor="middle" class="d-small">نسخة</text>
<rect x="521" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="549" y="256" text-anchor="middle" class="d-small">نسخة</text>
<rect x="235" y="204" width="170" height="74" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<text x="320" y="224" text-anchor="middle" class="d-small">منطقة توفر B</text>
<rect x="258" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="286" y="256" text-anchor="middle" class="d-small">نسخة</text>
<rect x="326" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="354" y="256" text-anchor="middle" class="d-small">نسخة</text>
<rect x="40" y="204" width="170" height="74" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<text x="125" y="224" text-anchor="middle" class="d-small">منطقة توفر C</text>
<rect x="63" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="91" y="256" text-anchor="middle" class="d-small">نسخة</text>
<rect x="131" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="159" y="256" text-anchor="middle" class="d-small">نسخة</text>
</svg>
<figcaption id="aurora-caption">سيرفر واحد يكتب وعدة سيرفرات تقرأ، وكلهم يتشاركون تخزين واحد محفوظ بست نسخ على ثلاث مناطق توفر.</figcaption>
</figure>

- **التخزين:** ما تحجز مساحة مسبقاً، فهو يكبر لحاله لين 256 TiB في الإصدارات الحديثة، ويحفظ ست نسخ على ثلاث مناطق توفر.
- **السيرفرات:** سيرفر كتابة واحد ولين 15 نسخة قراءة. وبما إنهم يتشاركون التخزين، يكون تأخر النسخ عادةً قليل جداً.
- **التحويل:** عند العطل تترقى نسخة قراءة، وعادةً خلال أقل من 30 ثانية.
- **العناوين:** **عنوان الكتابة** يشير دايماً للسيرفر الكاتب، و**عنوان القراءة** يوزّع على النسخ. وتقدر تسوي عناوين مخصصة، مثلاً تخصص أقوى النسخ للتقارير.
- **توسّع النسخ:** تقدر تخلي Aurora تزيد نسخ القراءة وتنقصها حسب الضغط.

### ميزات تستاهل تعرفها

| الميزة | وش تعطيك |
| --- | --- |
| **Aurora Serverless v2** | السعة تكبر وتصغر مع الضغط بدون ما تختار حجم سيرفر. يناسب الضغط المتقلب، ويقدر يوقف وقت الخمول |
| **Global Database** | Region واحدة للكتابة ولين 10 Regions للقراءة، بتأخر أقل من ثانية عادةً. وترقّي وحدة منهم لو طاحت الأساسية |
| **Cloning** | نسخة سريعة من الإنتاج للتجربة، تتشارك البيانات وتخزّن التغييرات فقط |
| **Babelfish** | يخلي Aurora PostgreSQL تفهم لغة T-SQL حقت SQL Server، فيسهّل الانتقال |
| **Aurora ML** | تنادي نماذج ذكاء اصطناعي من SageMaker أو Bedrock داخل استعلام SQL |

### RDS أو Aurora؟

| تبي | اختر |
| --- | --- |
| Oracle أو SQL Server أو Db2 أو MariaDB | **RDS**، فـ Aurora متوافقة مع MySQL وPostgreSQL فقط |
| قاعدة صغيرة بضغط متوسط وتكلفة قليلة | **RDS** |
| قراءات كثيرة وتحويل سريع وتشغيل عبر Regions | **Aurora** |
| ضغط متقلب أو تشتغل ساعات محدودة | **Aurora Serverless v2** |

وفي التكلفة، سيرفرات Aurora أغلى في الساعة، وطريقة حساب التخزين مختلفة. الخيار القياسي يحسب عمليات القراءة والكتابة، وخيار **I/O-Optimized** يلغيها مقابل سعر أعلى للسيرفرات والتخزين. فقارن بحاسبة الأسعار على ضغطك الحقيقي.

## عملي: قاعدة بيانات خاصة ما يوصلها إلا سيرفرك

بنستخدم السيرفر اللي شغّلته في [الجزء الثالث](/posts/aws-03-ec2-first-server/). افتح خدمة **Aurora and RDS** واضغط **Create database**:

1. **المحرك:** اختر **PostgreSQL**، وخيار الإعداد اللي يعرض كل التفاصيل بدل الإعداد السريع.
2. **القالب:** أرخص قالب متاح، مثل **Free tier** لو يظهر في حسابك.
3. **الاسم:** سمّ القاعدة `series-db`، وخل اسم المستخدم `postgres`، واختر **Self managed** وحط كلمة مرور قوية.
4. **الحجم:** `db.t4g.micro` مع 20 GiB.
5. **الشبكة:** اختر **Connect to an EC2 compute resource** وحدد سيرفرك. RDS تضبط مجموعات الأمان لك، ويبقى الوصول العام مقفل.

انتظر لين تصير الحالة **Available**، وانسخ **Endpoint** من تبويب **Connectivity & security**. ثم ادخل على السيرفر من EC2 Instance Connect:

```bash
sudo dnf install -y postgresql16
psql -h YOUR-DB-ENDPOINT -U postgres -d postgres
```

وداخل `psql` سوّ جدول وجرّبه:

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  item TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO orders (item) VALUES ('keyboard'), ('screen');

SELECT * FROM orders;
```

اخرج بـ `\q`. والحين تأكد إن القاعدة خاصة فعلاً، بتجربة الوصول من CloudShell اللي هو خارج شبكتك:

```bash
timeout 5 bash -c '</dev/tcp/YOUR-DB-ENDPOINT/5432' && echo open || echo closed
```

المفروض تشوف `closed`. وخذ لقطة يدوية من CloudShell، وهذا اللي تسويه قبل أي تغيير خطير:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier series-db \
  --db-snapshot-identifier series-db-demo

aws rds describe-db-snapshots \
  --db-snapshot-identifier series-db-demo \
  --query "DBSnapshots[0].[Status,PercentProgress]" --output table
```

### إضافية: جرّب نسخة قراءة

نسخة القراءة تحتاج النسخ التلقائي مفعّل على القاعدة الأساسية، وهي سيرفر مدفوع لحاله، وبعض خطط الحسابات المجانية ما تسمح بهذا. لو حسابك يسمح:

```bash
aws rds modify-db-instance --db-instance-identifier series-db \
  --backup-retention-period 1 --apply-immediately

aws rds create-db-instance-read-replica \
  --db-instance-identifier series-db-replica \
  --source-db-instance-identifier series-db
```

لما تجهز، اتصل بعنوانها من سيرفرك. بتلقى صفوف جدول `orders` كلها، ولو حاولت تضيف صف بيرجع لك الخطأ `cannot execute INSERT in a read-only transaction`.

::: security احذف بعد التجربة
القاعدة تنحسب بالساعة حتى لو ما أحد يستخدمها، واللقطات اليدوية تبقى وتنحسب بعد حذف القاعدة. احذف النسخة أولاً لو سويتها، وانتظر لين تختفي، ثم الباقي:
:::

```bash
aws rds delete-db-instance --db-instance-identifier series-db-replica \
  --skip-final-snapshot

aws rds delete-db-instance --db-instance-identifier series-db \
  --skip-final-snapshot --delete-automated-backups

aws rds delete-db-snapshot --db-snapshot-identifier series-db-demo
```

## الخلاصة

- **RDS** تتكفل بالتشغيل والنسخ والتحديثات، وتصميم الجداول والاستعلامات يبقى عليك.
- **Multi-AZ** للتوفر وما تقرأ منها، و**نسخ القراءة** للتوسّع وتأخرها وارد.
- **الاسترجاع** ينشئ قاعدة جديدة بعنوان جديد.
- خل القاعدة في شبكة خاصة، وما تقبل إلا من **مجموعة أمان السيرفرات**.
- **Aurora** تخزين مشترك بست نسخ، ولين 15 نسخة قراءة، وتحويل سريع، بس مع توافق MySQL وPostgreSQL فقط.

## اختبر نفسك

::: quiz
قاعدة بيانات PostgreSQL للإنتاج على RDS لازم تستمر لو طاحت منطقة التوفر حقها. والتحويل لازم يكون تلقائي، بدون تغيير نص الاتصال في التطبيق. وش يفعّل الفريق؟

- [ ] نسخة قراءة في منطقة توفر ثانية
- [x] Multi-AZ
- [ ] لقطات يدوية كل يوم
- [ ] نوع سيرفر أكبر

Multi-AZ يبقي نسخة احتياطية متزامنة في منطقة توفر ثانية. ووقت العطل، RDS يوجه نفس اسم DNS لها، فيعيد التطبيق الاتصال بدون أي تغيير.

- **A:** نسخة القراءة تحتاج ترقية يدوية، ولها نقطة وصول خاصة فيها.
- **C:** الاسترجاع ياخذ وقت، وينشئ قاعدة جديدة بنقطة وصول جديدة.
- **D:** السيرفر الأكبر يبقى في منطقة توفر وحدة.

للمراجعة: [Multi-AZ ونسخ القراءة](#multi-az-ونسخ-القراءة) في هذا الجزء، و[Multi-AZ deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html) في وثائق AWS.
:::

::: quiz
لوحة إدارية تشغّل استعلامات ثقيلة تبطئ قاعدة RDS حق المتجر في ساعات الدوام. والتقارير تتحمل تأخر كم ثانية. وش يحل هذا **بأقل تغيير**؟

- [ ] إرسال التقارير إلى نسخة Multi-AZ الاحتياطية
- [ ] تفعيل Storage Auto Scaling
- [ ] نقل بيانات المتجر إلى DynamoDB
- [x] إنشاء نسخة قراءة، وتوجيه اللوحة لنقطة وصولها

نسخة القراءة تخدم هذي الاستعلامات على سيرفر منفصل، فتبقى قاعدة الإنتاج مرتاحة. وتأخرها البسيط مقبول لهذي التقارير.

- **A:** النسخة الاحتياطية في Multi-AZ ما تخدم القراءة.
- **B:** هذا يزيد مساحة القرص، والمشكلة في حمل الاستعلامات.
- **C:** هذا يعني إعادة تصميم البيانات وكتابة التطبيق من جديد.

للمراجعة: [نسخ القراءة](#نسخ-القراءة) في هذا الجزء، و[Working with read replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html) في وثائق AWS.
:::

::: quiz
مطور شغّل `UPDATE` غلط على قاعدة RDS للإنتاج الساعة 2:05 مساءً. والنسخ التلقائي شغال. وش يصير لو استرجع الفريق إلى الساعة 2:04؟

- [x] RDS ينشئ قاعدة جديدة، ولازم يتوجه التطبيق لنقطة وصولها
- [ ] RDS يرجع القاعدة الموجودة مكانها، بنفس نقطة الوصول
- [ ] ما ينفع بدون لقطة يدوية مأخوذة قبلها
- [ ] لازم يرقّي الفريق نسخة Multi-AZ الاحتياطية بدل هذا

الاسترجاع لنقطة زمنية ينشئ دايماً قاعدة جديدة بنقطة وصول جديدة، من النسخ التلقائية وسجلات المعاملات.

- **B:** الاسترجاع ما يكتب فوق القاعدة الموجودة.
- **C:** النسخ التلقائية تكفي لهذا.
- **D:** النسخة الاحتياطية متزامنة، فوصلها نفس الـ `UPDATE` الغلط.

للمراجعة: [النسخ الاحتياطي والاسترجاع](#النسخ-الاحتياطي-والاسترجاع) في هذا الجزء، و[Restoring to a specified time](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) في وثائق AWS.
:::

::: quiz
مئات من دوال Lambda تفتح اتصالات قصيرة بقاعدة RDS، ووقت الزحمة تفشل القاعدة لأن الاتصالات كثيرة. أي حل يحتاج **أقل تغيير في الكود**؟

- [ ] تفعيل Multi-AZ
- [ ] إضافة نسخ قراءة، وإرسال الكتابة لها
- [x] وضع RDS Proxy بين الدوال والقاعدة
- [ ] تفعيل Storage Auto Scaling

RDS Proxy يعيد استخدام مجموعة صغيرة من الاتصالات، والتطبيق يتصل فيه كأنه القاعدة نفسها.

- **A:** هذا يضيف نسخة احتياطية ما تقبل أي اتصال.
- **B:** نسخ القراءة للقراءة فقط، فما تستقبل الكتابة.
- **D:** هذا يكبر القرص، والحد هنا في الاتصالات.

للمراجعة: [RDS Proxy](#rds-proxy) في هذا الجزء، و[Amazon RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html) في وثائق AWS.
:::

::: quiz
فريق يشغّل RDS for MySQL ويفكر ينتقل إلى Aurora MySQL. أي **عبارتين** عن Aurora صحيحة؟ (اختر اثنين.)

- [x] التخزين يكبر لحاله، بدون حجز مسبق
- [ ] يقدر يشغّل قواعد Oracle وSQL Server
- [ ] كل قارئ في المجموعة يقبل الكتابة
- [x] حتى 15 قارئ يتشاركون طبقة تخزين وحدة مع الكاتب
- [ ] كل قارئ يحتفظ بنسخة كاملة خاصة من البيانات

Aurora يفصل التخزين عن السيرفرات، وطبقة التخزين المشتركة هذي هي اللي تخلي التأخر بسيط والتحويل سريع.

- **B:** Aurora متوافق مع MySQL وPostgreSQL فقط.
- **C:** سيرفر واحد يكتب، والقراء يقرأون فقط.
- **E:** هذا أسلوب نسخ القراءة في RDS، أما قراء Aurora فيتشاركون التخزين.

للمراجعة: [Aurora](#aurora) في هذا الجزء، و[What is Amazon Aurora?](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) في وثائق AWS.
:::

حتى مع قاعدة قوية، تكرار نفس الاستعلام آلاف المرات هدر. في [**الجزء التاسع**](/posts/aws-09-elasticache/) نضيف طبقة سريعة قدّامها مع ElastiCache.
