---
title: "تحليل البيانات: Athena وRedshift وGlue"
description: كيف تطلع إجابات من بياناتك. استعلامات SQL على S3 بـ Athena، ومستودع بيانات بـ Redshift، وتجهيز البيانات بـ Glue، مع البحث والشغل الكبير واللوحات والتيارات، وتجربة عملية يقلل فيها Parquet اللي يقرأه الاستعلام.
date: 2026-11-02
series: aws
part: 23
numbered: true
tags: [aws, data]
---

التطبيق اللي خلصنا تصميمه في [الجزء الثاني والعشرين](/posts/aws-22-serverless-design/) يطلع بيانات كثيرة: طلبات وسجلات وأحداث. وبعدين يسألك أحد: "أي مدينة نمت أكثر هالسنة؟"

تقدر تشغّل هذا على قاعدة الإنتاج وتبطئها على عملائك. بس AWS عندها مجموعة خدمات مبنية للتحليل، وهذا الجزء دليل لها.

| تبي | استخدم |
| --- | --- |
| SQL على ملفات في S3 بدون سيرفرات | **Athena** |
| مستودع بيانات لتقارير ثقيلة ومتكررة | **Redshift** |
| فهرس لبياناتك وتنظيفها وتحويلها | **Glue** |
| صلاحيات على بحيرة بيانات كاملة | **Lake Formation** |
| بحث نصي وتحليل سجلات | **OpenSearch** |
| شغل كبير بـ Spark أو Hadoop | **EMR** |
| لوحات متابعة لفريقك | **Quick Sight** |
| تحليل تيار وقت وصوله | **Managed Flink** |
| Apache Kafka مُدار | **MSK** |

## نوعين من الشغل

الأسئلة اللي يسألها التطبيق تختلف عن الأسئلة اللي يسألها أصحاب القرار:

| | تشغيل التطبيق (OLTP) | التحليل (OLAP) |
| --- | --- | --- |
| **مثال** | هات الطلب 1001 | مجموع المبيعات لكل مدينة خلال ثلاث سنوات |
| **الصفوف المعنية** | قليلة | ملايين |
| **من يسأل** | ملايين العملاء | محللين قليلين |
| **الخدمات** | [RDS](/posts/aws-08-rds-aurora/) و[DynamoDB](/posts/aws-21-lambda-api-dynamodb/) | Athena وRedshift |

سر خدمات التحليل إنها تخزن البيانات **بالأعمدة**. عشان تجمع عمود واحد، ما تحتاج تقرأ الباقي:

<figure class="diagram">
<svg viewBox="0 0 640 196" role="img" aria-labelledby="warehouse-caption">
<defs>
<marker id="warehouse-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="475" y="22" text-anchor="middle" class="d-small">بالصفوف: يقرأ كل شي</text>
<text x="565" y="48" text-anchor="middle" class="d-code">id</text>
<rect x="520" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="520" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="520" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="475" y="48" text-anchor="middle" class="d-code">city</text>
<rect x="430" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="430" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="430" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="385" y="48" text-anchor="middle" class="d-code">amount</text>
<rect x="340" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="340" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="340" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="165" y="22" text-anchor="middle" class="d-small">بالأعمدة: يقرأ عمود واحد</text>
<text x="255" y="48" text-anchor="middle" class="d-code">id</text>
<rect x="210" y="58" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="210" y="92" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="210" y="126" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="165" y="48" text-anchor="middle" class="d-code">city</text>
<rect x="120" y="58" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="120" y="92" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="120" y="126" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="48" text-anchor="middle" class="d-code">amount</text>
<rect x="30" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="30" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="30" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="182" text-anchor="middle" class="d-small">الاستعلام: SUM(amount)&#x200E;</text>
</svg>
<figcaption id="warehouse-caption">عشان تجمع عمود المبلغ، التخزين بالصفوف يمر على كل الحقول، والتخزين بالأعمدة يقرأ هذا العمود وحده.</figcaption>
</figure>

## Amazon Athena: SQL على S3

**Athena** يخليك تستعلم من ملفات S3 مباشرة بـ SQL. ما فيه شي تشغله: توصف الملفات كجدول، والبيانات تبقى مكانها.

تدفع حوالي **5 دولار لكل TB يتم مسحه**، بحد أدنى 10 MB للاستعلام. وإنشاء الجداول والاستعلامات الفاشلة ما تكلف شي. ويناسب الأسئلة العابرة وتحليل السجلات، مثل سجلات موزع الحمل أو [S3](/posts/aws-17-s3-security/)، وهو كمان اللي توجهك له AWS بعد ما أقفلت **S3 Select** على العملاء الجدد.

### اقرأ أقل، وادفع أقل

بما إن السعر يعتمد على اللي ينقرأ، القراءة الأقل تعني فاتورة أقل وجواب أسرع:

- **تنسيقات الأعمدة:** حوّل الملفات إلى **Parquet** أو ORC، فالاستعلام يقرأ أعمدته فقط.
- **التقسيم (Partitions):** قسّم البيانات إلى مسارات مثل `year=2025/`، فالاستعلام يتجاهل الباقي.
- **الضغط:** كل ما صغرت البيانات، قل اللي ينمسح.
- **ملفات أكبر:** آلاف الملفات الصغيرة تبطئ الشغل، فادمجها.

<figure class="diagram">
<svg viewBox="0 0 640 188" role="img" aria-labelledby="partition-caption">
<defs>
<marker id="partition-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="390" y="52" width="230" height="84" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="505" y="89" text-anchor="middle" class="d-label">Athena</text>
<text x="505" y="109" text-anchor="middle" class="d-code">WHERE year = 2025</text>
<rect x="20" y="14" width="250" height="48" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="145" y="33" text-anchor="middle" class="d-code">year=2024/&#x200E;</text>
<text x="145" y="53" text-anchor="middle" class="d-small">يتجاهله</text>
<rect x="20" y="70" width="250" height="48" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="145" y="89" text-anchor="middle" class="d-code">year=2025/&#x200E;</text>
<text x="145" y="109" text-anchor="middle" class="d-small">يقرأه</text>
<rect x="20" y="126" width="250" height="48" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="145" y="145" text-anchor="middle" class="d-code">year=2026/&#x200E;</text>
<text x="145" y="165" text-anchor="middle" class="d-small">يتجاهله</text>
<line x1="390" y1="94" x2="272" y2="94" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#partition-arrow)"/>
</svg>
<figcaption id="partition-caption">لما تكون البيانات مقسمة بالسنة، استعلام عن 2025 يقرأ مجلد واحد ويتجاهل الباقي، فتدفع على اللي قرأه فقط.</figcaption>
</figure>

### الاستعلامات الموحدة

بياناتك مو كلها في S3؟ **Federated Query** يخلي Athena يوصل لمصادر ثانية مثل DynamoDB أو RDS، عبر موصل يشتغل كدالة Lambda في حسابك. واستعلام واحد يقدر يربطها مع ملفاتك كمان.

## Amazon Redshift: المستودع

لما تصير التقارير ثقيلة ومتكررة، مع ربط جداول كثير ومستخدمين كثير، تحتاج **مستودع بيانات**. **Redshift** مبني على PostgreSQL، ويخزن البيانات بالأعمدة، ويقسم الاستعلام على عدة عقد بالتوازي.

| | Serverless | Provisioned |
| --- | --- | --- |
| **تختار** | ولا شي، والسعة تضبط نفسها | نوع العقد وعددها |
| **تدفع على** | وقت الحوسبة لما تشتغل الاستعلامات | كل عقدة بالساعة |
| **يناسب** | حمل متغير أو متقطع | حمل ثابت، أو تحتاج Multi-AZ |

### إدخال البيانات

| الطريقة | متى |
| --- | --- |
| **`COPY` من S3** | الطريقة المعتادة: يحمّل دفعة وحدة وبالتوازي |
| **Data Firehose** | [تيار](/posts/aws-19-sqs-sns-kinesis/) ينزل في S3 ثم ينحمل بـ `COPY` |
| **Zero-ETL** | نسخ تلقائي من مصادر مثل Aurora وRDS وDynamoDB، بدون بناء مسار |
| **`INSERT` صف صف** | تجنبه مع الكميات الكبيرة، لأنه بطيء جداً |

### نقاط تستاهل تعرفها

- **Redshift Spectrum:** استعلم من ملفات S3 داخل Redshift بدون تحميلها، واربطها مع جداولك.
- **اللقطات:** تلقائية وتزايدية، وتقدر تنسخها لمنطقة ثانية عشان تتعافى من كارثة.
- **Multi-AZ:** متاح في مجموعات RA3 من نوع Provisioned، بعقد في منطقتي توفر خلف نقطة وصول وحدة.

### Athena أو Redshift؟

| | Athena | Redshift |
| --- | --- | --- |
| **البيانات في** | S3 | المستودع، ومعها S3 عبر Spectrum |
| **التجهيز** | ولا شي | قليل مع Serverless |
| **تدفع على** | البيانات الممسوحة | وقت الحوسبة |
| **يناسب** | أسئلة عابرة وسجلات | تقارير ثقيلة ومتكررة ولوحات |

ابدأ بـ Athena، وانتقل لـ Redshift لما تصير استعلاماتك متكررة لدرجة تبرر تكلفته.

## AWS Glue: تجهيز البيانات

التحليل يفترض إن البيانات نظيفة ومرتبة، وهذا نادر. **Glue** مجموعة أدوات بدون سيرفرات لهذا الغرض:

| الجزء | وش يسوي |
| --- | --- |
| **Data Catalog** | قائمة مركزية بجداولك وأعمدتها، يستخدمها Athena وRedshift Spectrum وEMR |
| **Crawlers** | تمسح S3 وتستنتج الأعمدة، ثم تضيفها للفهرس |
| **ETL Jobs** | كود Spark يستخرج البيانات ويحولها ويحملها، مثل CSV إلى Parquet |
| **Job Bookmarks** | تتذكر اللي تمت معالجته، فما يعيد الشغل الملفات القديمة |
| **DataBrew** | ينظف البيانات بالواجهة بدون كود |

نمط معروف: ينزل ملف في S3، وحدث يشغّل شغل Glue، ويحوله إلى Parquet في مجلد ثاني. ولاحظ إن **Glue Ray Jobs** أقفلت على العملاء الجدد في 30 أبريل 2026، بينما شغل Spark مستمر عادي.

وممكن تقرأ عن **AWS Data Pipeline**، خدمة أقدم لنقل البيانات ومعالجتها بجدول. وهي مقفلة على العملاء الجدد وفي وضع الصيانة، فاستخدم Glue أو Step Functions للشغل الجديد.

## Lake Formation: صلاحيات البحيرة

S3 مع ملفات Parquet وفهرس هو اللي يسمونه **بحيرة بيانات (Data Lake)**. ولما تكبر، إدارة الوصول عبر [سياسات الحاوية](/posts/aws-15-s3-basics/) تصير صعبة، لأن S3 يعرف الملفات، مو الأعمدة.

**Lake Formation** يعطيك مكان واحد تمنح فيه الوصول بقاعدة البيانات والجدول والعمود وحتى الصف: فريق المبيعات يشوف الطلبات بدون أرقام البطاقات مثلاً. وهذي الصلاحيات تنطبق عبر خدمات مثل Athena وRedshift وEMR.

## البحث والشغل الكبير واللوحات

### OpenSearch

قاعدة البيانات شاطرة في الجلب بالمفتاح. **OpenSearch** شاطر في البحث بأي كلمة في أي حقل، وفي تحليل السجلات. ويجي كـ **مجموعات مُدارة** تتحكم في أحجامها، أو **Serverless** للحمل المتغير.

وغالباً يكون نسخة من بياناتك، مو المصدر. نمطين معروفين:

- **بحث على جدول:** DynamoDB Streams ثم Lambda ثم OpenSearch. تبحث هناك، ثم تجيب العنصر كامل من الجدول.
- **تحليل السجلات:** CloudWatch Logs ثم Firehose ثم OpenSearch.

### Amazon EMR

عندك شغل **Spark** أو **Hadoop** قائم؟ **EMR** يشغله، وتقدر تختار تشغيله على EC2 أو EKS أو كـ Serverless. وعلى EC2 فيه ثلاث أنواع من العقد:

| العقدة | دورها | خيار الشراء |
| --- | --- | --- |
| **Primary** | تنسق المجموعة | On-Demand أو Reserved |
| **Core** | تشغل المهام وتخزن البيانات | On-Demand أو Reserved |
| **Task** | تشغل المهام فقط، وهي اختيارية | [Spot](/posts/aws-04-ec2-pricing-networking/) مثالي لها |

### Quick Sight

**Amazon Quick Sight** يبني لوحات متابعة من Athena وRedshift وRDS وS3 وغيرها. كان اسمه QuickSight، ومن أكتوبر 2025 صار جزء من مجموعة أوسع اسمها Amazon Quick، مع إن الـ API لسا يستخدم الاسم القديم.

- **SPICE:** محرك في الذاكرة يخلي اللوحات سريعة، بدون ما يضغط على المصدر مع كل مشاهدة.
- **Analysis أو Dashboard:** تعدل في الـ Analysis، وتنشره كـ Dashboard للقراءة فقط.
- **أمان الصفوف:** كل مدير يشوف بيانات منطقته فقط.

## التيارات: Flink وKafka

[Kinesis وFirehose](/posts/aws-19-sqs-sns-kinesis/) يوصلون البيانات. طيب لو تبي تحللها وقت وصولها، مثل كشف نمط مشبوه خلال ثواني؟

**Managed Service for Apache Flink** (اسمه القديم Kinesis Data Analytics) يشغّل تطبيقات Flink تقرأ من تيار Kinesis أو من MSK، بدون ما تدير المجموعة.

**Amazon MSK** هو **Apache Kafka** مُدار، أشهر منصة تيارات في عالم المصادر المفتوحة. ويجي كمجموعات Provisioned بوسطاء Standard أو Express، أو كـ Serverless.

| | Kinesis Data Streams | Amazon MSK |
| --- | --- | --- |
| **ينقسم إلى** | Shards | Topics وPartitions |
| **الواجهات** | خاصة بـ AWS | Kafka القياسية |
| **حجم السجل** | 1 MiB افتراضياً، وحتى 10 MiB | 1 MB افتراضياً، وقابل للتعديل |
| **اختره لو** | تبي أبسط خيار على AWS | عندك تطبيقات وأدوات Kafka |

## كيف توصل البيانات؟

اختيار طريق الإدخال يبدأ من كم مرة توصل البيانات، وكم حجمها:

| البيانات | استخدم |
| --- | --- |
| **ملفات من سيرفر أو NAS بجدول** | [DataSync](/posts/aws-18-storage-transfer/) |
| **ملفات من شركاء عبر SFTP** | [Transfer Family](/posts/aws-18-storage-transfer/) |
| **سجلات صغيرة باستمرار، لأكثر من قارئ** | [Kinesis Data Streams](/posts/aws-19-sqs-sns-kinesis/) أو MSK |
| **سجلات صغيرة باستمرار، تنزل في التخزين** | [Data Firehose](/posts/aws-19-sqs-sns-kinesis/) |
| **صفوف تتغير في قاعدة بيانات** | Zero-ETL أو [DMS](/posts/aws-28-disaster-recovery-migration/) |
| **مجموعات بيانات من شركات ثانية** | **AWS Data Exchange**، وتشترك فيها من خلاله |

وأمّن كل طريق بنفس الأسلوب: أدوار IAM بأقل صلاحية، وتشفير أثناء النقل والتخزين، وطرق خاصة مثل [VPC Endpoints](/posts/aws-14-vpc-connectivity/) بدل الإنترنت العام لما تقدر.

## الصورة الكاملة

هذا كيف تجتمع القطع في مسار معتاد:

<figure class="diagram">
<svg viewBox="0 0 640 208" role="img" aria-labelledby="pipeline-caption">
<defs>
<marker id="pipeline-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="494" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="557" y="44" text-anchor="middle" class="d-label">المصادر</text>
<text x="557" y="64" text-anchor="middle" class="d-small">تطبيقات وسجلات</text>
<rect x="336" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="399" y="44" text-anchor="middle" class="d-label">Firehose</text>
<text x="399" y="64" text-anchor="middle" class="d-small">يجمع</text>
<rect x="178" y="14" width="126" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="241" y="44" text-anchor="middle" class="d-label">S3</text>
<text x="241" y="64" text-anchor="middle" class="d-small">بيانات خام</text>
<rect x="20" y="14" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="83" y="44" text-anchor="middle" class="d-label">Glue</text>
<text x="83" y="64" text-anchor="middle" class="d-small">ينظف ويحول</text>
<rect x="20" y="124" width="126" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="83" y="154" text-anchor="middle" class="d-label">S3</text>
<text x="83" y="174" text-anchor="middle" class="d-small">Parquet</text>
<rect x="178" y="124" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="154" text-anchor="middle" class="d-label">Athena</text>
<text x="241" y="174" text-anchor="middle" class="d-small">يجاوب بـ SQL</text>
<rect x="336" y="124" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="154" text-anchor="middle" class="d-label">Quick Sight</text>
<text x="399" y="174" text-anchor="middle" class="d-small">لوحات</text>
<rect x="494" y="124" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="557" y="154" text-anchor="middle" class="d-label">فريقك</text>
<text x="557" y="174" text-anchor="middle" class="d-small">يقرر</text>
<line x1="494" y1="49" x2="464" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="336" y1="49" x2="306" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="178" y1="49" x2="148" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="83" y1="84" x2="83" y2="122" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="146" y1="159" x2="176" y2="159" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="304" y1="159" x2="334" y2="159" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="462" y1="159" x2="492" y2="159" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
</svg>
<figcaption id="pipeline-caption">البيانات تنزل خام في S3، وGlue يحولها إلى Parquet، وAthena يجاوب منها، وQuick Sight يعرض النتيجة. وRedshift ممكن ياخذ مكان Athena في التقارير الثقيلة.</figcaption>
</figure>

## عملي: Parquet يقلل اللي يقرأه الاستعلام

بنولّد ملف فيه 200,000 طلب ونسأله نفس السؤال مرتين. من CloudShell:

```bash
BUCKET=series-data-$RANDOM$RANDOM
aws s3 mb s3://$BUCKET

awk 'BEGIN {
  srand(7)
  split("Riyadh Jeddah Dammam Abha Tabuk", city, " ")
  for (i = 1; i <= 200000; i++)
    printf "%d,%s,%d,%.2f\n", i, city[int(rand()*5)+1], 2024+int(rand()*3), rand()*500
}' > sales.csv

head -3 sales.csv
aws s3 cp sales.csv s3://$BUCKET/raw/sales.csv
```

هذي الدالة تشغّل استعلام وتنتظره، ثم تطبع حالته والبايتات اللي مسحها ونتيجته:

```bash
run_sql() {
  ID=$(aws athena start-query-execution --query-string "$1" \
    --result-configuration OutputLocation=s3://$BUCKET/results/ \
    --query QueryExecutionId --output text)
  while true; do
    STATE=$(aws athena get-query-execution --query-execution-id $ID \
      --query QueryExecution.Status.State --output text)
    [ "$STATE" = QUEUED ] || [ "$STATE" = RUNNING ] || break
    sleep 1
  done
  aws athena get-query-execution --query-execution-id $ID \
    --query "QueryExecution.[Status.State,Statistics.DataScannedInBytes]" \
    --output text
  aws athena get-query-results --query-execution-id $ID \
    --query "ResultSet.Rows[*].Data[*].VarCharValue" --output text
}
```

صف الملف كجدول. ما ينتقل شي، والبيانات تبقى في S3:

```bash
run_sql "CREATE DATABASE series_data"

run_sql "CREATE EXTERNAL TABLE series_data.sales_csv (
  order_id INT, city STRING, year INT, amount DOUBLE
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
LOCATION 's3://$BUCKET/raw/'"
```

اسأل السؤال:

```bash
run_sql "SELECT city, ROUND(SUM(amount)) AS total
FROM series_data.sales_csv WHERE year = 2025
GROUP BY city ORDER BY total DESC"
```

يطلع لك المجموع لكل مدينة، وأول سطر يبين إن الملف كله انمسح، أكثر من 5 MB بشوي، مع إن السؤال يخص سنة وحدة وعمودين. الحين أنشئ نسخة Parquet مقسمة باستعلام واحد:

```bash
run_sql "CREATE TABLE series_data.sales_parquet WITH (
  format = 'PARQUET',
  external_location = 's3://$BUCKET/parquet/',
  partitioned_by = ARRAY['year']
) AS SELECT order_id, city, amount, year FROM series_data.sales_csv"

aws s3 ls s3://$BUCKET/parquet/
```

بتشوف مجلد لكل سنة. اسأل نفس السؤال من الجدول الجديد:

```bash
run_sql "SELECT city, ROUND(SUM(amount)) AS total
FROM series_data.sales_parquet WHERE year = 2025
GROUP BY city ORDER BY total DESC"
```

الأرقام نفسها، بس البايتات الممسوحة جزء صغير من الرقم الأول. وعلى التيرابايتات، هذا الفرق هو فاتورتك.

::: security احذف بعد التجربة
التجربة تكلف جزء صغير من السنت. احذف الجداول والحاوية:
:::

```bash
run_sql "DROP TABLE series_data.sales_parquet"
run_sql "DROP TABLE series_data.sales_csv"
run_sql "DROP DATABASE series_data"
aws s3 rb s3://$BUCKET --force
```

## الخلاصة

- افصل **التحليل** عن قاعدة الإنتاج، وخزن البيانات **بالأعمدة**.
- **Athena** يستعلم من S3 بدون سيرفرات، وParquet والتقسيم يقللون تكلفته.
- **Redshift** للتقارير الثقيلة والمتكررة، و**Serverless** بداية سهلة.
- **Glue** يفهرس بياناتك ويحولها، و**Lake Formation** يحدد من يشوف أي عمود.
- **OpenSearch** للبحث، و**EMR** لشغل Spark، و**Quick Sight** للوحات، و**Flink** و**MSK** للتيارات.

## اختبر نفسك

::: quiz
محللو سلسلة متاجر يشغّلون تقارير ثقيلة طول اليوم، فيها ربط جداول كثير على مبيعات سنوات، وعشرات اللوحات تتحدث منها. أي خدمة مبنية لهذا؟

- [ ] Amazon Athena، يستعلم عن ملفات CSV في S3
- [ ] نسخة قراءة من RDS
- [x] Amazon Redshift
- [ ] Amazon OpenSearch Service

هذا شغل مستودع البيانات. Redshift يخزن البيانات بالأعمدة ويقسم كل استعلام على عدة عقد، فتشتغل التقارير الثقيلة المتكررة بسرعة.

- **A:** هذا يناسب الأسئلة العابرة، ومع هذا العدد من الاستعلامات بتدفع على كل مسح.
- **B:** هذا يخفف عن الإنتاج، بس لسا يخزن بالصفوف وما هو مبني لتحليل بهذا الحجم.
- **D:** هذا للبحث النصي وتحليل السجلات.

للمراجعة: [Athena أو Redshift؟](#athena-أو-redshift) في هذا الجزء، و[What is Amazon Redshift?](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html) في وثائق AWS.
:::

::: quiz
شركاء ينزلون ملفات CSV في حاوية S3 كل يوم. وفريق يبي يحولها إلى Parquet بجدول، بدون سيرفرات يشغلها وبدون إعادة معالجة الملفات اللي تحولت. وش يناسب؟

- [x] مهمة Glue ETL، مع تفعيل Job Bookmarks
- [ ] Glue Crawler يشتغل كل يوم
- [ ] مجموعة EMR على EC2
- [ ] قاعدة Lifecycle تنقل الملفات لفئة أرخص

مهمة Glue ETL تشغّل Spark بدون سيرفرات تديرها، وJob Bookmarks تتذكر اللي تعالج، فكل تشغيل يتعامل مع الملفات الجديدة فقط.

- **B:** الـ Crawler يستنتج الأعمدة ويحدث الفهرس، وما يحول شي.
- **C:** هذا يقدر يسوي التحويل، بس هو مجموعة لازم تشغلها.
- **D:** هذا ينقل الملفات بين الفئات، وما يغير تنسيقها.

للمراجعة: [AWS Glue: تجهيز البيانات](#aws-glue-تجهيز-البيانات) في هذا الجزء، و[Tracking processed data using job bookmarks](https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html) في وثائق AWS.
:::

::: quiz
بحيرة بيانات شركة فيها جدول طلبات في S3، ينستعلم عنه عبر Athena. وفريق المبيعات لازم يشوف الجدول، بس بدون عمود رقم البطاقة. وش يناسب؟

- [ ] سياسة حاوية تخفي هذا العمود عن الفريق
- [ ] Glue Crawler يتخطى هذا العمود
- [ ] S3 Access Point لفريق المبيعات
- [x] Lake Formation، بصلاحية على مستوى العمود

Lake Formation يعطي الوصول لحد العمود والصف، وهذي الصلاحيات تنطبق عبر خدمات مثل Athena.

- **A:** S3 تعرف الملفات، مو الأعمدة اللي داخلها.
- **B:** الـ Crawler يوصف البيانات بس، وما يتحكم في وصول أحد.
- **C:** هذا يعطي الفريق بوابته للحاوية، ولسا يشتغل على مستوى الملفات.

للمراجعة: [Lake Formation: صلاحيات البحيرة](#lake-formation-صلاحيات-البحيرة) في هذا الجزء، و[Data filtering and cell-level security in Lake Formation](https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html) في وثائق AWS.
:::

::: quiz
متجر يحفظ منتجاته في DynamoDB. والعملاء يبون يبحثون عن أي كلمة في اسم المنتج أو وصفه، والجدول لازم يبقى مصدر الحقيقة. وش يناسب؟

- [ ] فهرس ثانوي عام على الوصف
- [x] DynamoDB Streams وLambda، يغذون نسخة في OpenSearch
- [ ] مسح الجدول بفلتر مع كل بحث
- [ ] DAX قدام الجدول

OpenSearch يلقى أي كلمة في أي حقل. وStreams وLambda يبقونه محدث، فتبحث هناك، ثم تجيب العنصر كامل من الجدول.

- **A:** الفهرس يلقى العناصر بالمفتاح، مو بأي كلمة داخل نص طويل.
- **C:** هذا يقرأ الجدول كله مع كل بحث، فهو بطيء ومكلف.
- **D:** هذا يسرّع القراءة بالمفتاح، وما يضيف بحث نصي.

للمراجعة: [OpenSearch](#opensearch) في هذا الجزء، و[Loading streaming data into Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/integrations.html) في وثائق AWS.
:::

::: quiz
فاتورة Athena عند فريق عالية. واستعلاماته عادةً تقرأ عمودين من شهر واحد، بس كل البيانات في S3 في مجلد كبير من ملفات CSV. أي **تغييرين** يقللون التكلفة؟ (اختر اثنين.)

- [ ] نقل الملفات إلى Glacier Deep Archive
- [x] تحويل الملفات إلى Parquet
- [ ] تشغيل الاستعلامات بالليل
- [ ] تفعيل S3 Versioning
- [x] تقسيم البيانات حسب الشهر

Athena يحاسب على البيانات اللي يمسحها. وParquet يخلي الاستعلام يقرأ أعمدته فقط، والتقسيم يخليه يتجاهل باقي الشهور.

- **A:** الملفات في هذي الفئة لازم تنسترجع قبل ما تنقرأ.
- **C:** السعر يعتمد على اللي ينقرأ، مو على وقته.
- **D:** هذا يحتفظ بالإصدارات القديمة، وما يغير شي في اللي يقرأه الاستعلام.

للمراجعة: [اقرأ أقل، وادفع أقل](#اقرأ-أقل-وادفع-أقل) في هذا الجزء، و[Use columnar storage formats](https://docs.aws.amazon.com/athena/latest/ug/columnar-storage.html) و[Partition your data](https://docs.aws.amazon.com/athena/latest/ug/partitions.html) في وثائق AWS.
:::

::: quiz
فريق تحليل يبي بيانات طقس من مزود تجاري في بحيرة بياناته، تتحدث باشتراك، بدون بناء قناة خاصة. وش يناسب؟

- [x] AWS Data Exchange
- [ ] AWS Transfer Family
- [ ] Glue Crawlers
- [ ] Kinesis Data Streams

Data Exchange هو المكان اللي تلقى فيه مجموعات بيانات الشركات الثانية وتشترك فيها.

- **B:** هذا يستقبل ملفات عبر SFTP وأخواته، والمزود لازم يرسلها لك.
- **C:** هذا يوصف بيانات موجودة عندك، وما يجيب بيانات جديدة.
- **D:** لازم تكتب اللي يغذيه، وهذا الشغل اللي يبي الفريق يتجنبه.

للمراجعة: [كيف توصل البيانات؟](#كيف-توصل-البيانات) في هذا الجزء، و[What is AWS Data Exchange?](https://docs.aws.amazon.com/data-exchange/latest/userguide/what-is.html) في وثائق AWS.
:::

الحين فهمت البيانات اللي عندك. تقدر تطلع منها أكثر، مثل قراءة المستندات وفهم الكلام وتوليد النصوص؟ في [**الجزء الرابع والعشرين**](/posts/aws-24-ai-services/) نمر على خدمات الذكاء الاصطناعي الجاهزة في AWS.
