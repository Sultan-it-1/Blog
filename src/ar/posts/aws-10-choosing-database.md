---
title: "أي قاعدة بيانات تختار؟"
description: علائقية أو مفتاح وقيمة أو مستندات أو رسم بياني أو سلاسل زمنية أو بحث. وش يناسب كل نوع، وكيف تختار من قواعد بيانات AWS الكثيرة بأسئلة بسيطة، وكيف تكبر طبقة البيانات في تطبيق حقيقي خطوة بخطوة.
date: 2026-11-02
series: aws
part: 10
numbered: true
tags: [aws, databases]
---

في [الجزء الثامن](/posts/aws-08-rds-aurora/) و[التاسع](/posts/aws-09-elasticache/) شفنا RDS وAurora وElastiCache. بس لو فتحت قائمة AWS بتلقى أكثر من عشر خدمات قواعد بيانات، وهنا يبدأ الضياع.

السؤال الصحيح مو "وش أفضل قاعدة بيانات؟"، لأن ما فيه جواب واحد. السؤال: **وش يناسب هذي البيانات بالذات؟**

## أسئلة تبدأ بها

قبل ما تفتح أي خدمة، جاوب على هذي الأسئلة:

| السؤال | ليش يهم |
| --- | --- |
| **وش شكل البيانات؟** | جداول مترابطة، أو مستندات متغيرة، أو علاقات، أو قراءات عبر الزمن |
| **كيف بتقراها؟** | بمفتاح، أو باستعلامات معقدة تربط جداول، أو ببحث في النص، أو بتجميع ملايين الصفوف |
| **كم القراءة مقابل الكتابة؟** | الكثير من القراءة يتحل بكاش ونسخ قراءة، والكثير من الكتابة يحتاج تصميم مختلف |
| **كم الحجم وكم النمو؟** | جيجابايت عادية أو بيانات تكبر بلا سقف |
| **كم لازم تكون دقيقة؟** | تحويل مبلغ يحتاج معاملات صارمة، وعدد الإعجابات يتحمل تأخير |
| **كم تقدر تدير؟** | فريق صغير يفضل خدمة تتوسّع لحالها |
| **وش يعرف فريقك؟** | معرفة الفريق تختصر عليك أخطاء كثيرة |

## أنواع قواعد البيانات

| النوع | شكل البيانات | خدمة AWS | مثال |
| --- | --- | --- | --- |
| **علائقية** | جداول مترابطة ومعاملات | RDS وAurora | طلبات وحسابات وفواتير |
| **مفتاح وقيمة** | قيمة تجيبها بمفتاحها، بحجم ضخم | DynamoDB | سلات شراء وملفات مستخدمين |
| **مستندات** | JSON بحقول مختلفة | DocumentDB وDynamoDB | كتالوجات ومحتوى |
| **في الذاكرة** | بيانات سريعة | ElastiCache وMemoryDB | كاش وجلسات |
| **أعمدة واسعة** | صفوف بأسلوب Cassandra وكتابة عالية | Keyspaces | أنظمة Cassandra قائمة |
| **رسم بياني** | روابط بين الأشياء | Neptune | شبكات اجتماعية وكشف احتيال |
| **سلاسل زمنية** | قراءات عبر الزمن | Timestream for InfluxDB | حساسات ومقاييس |
| **بحث** | نصوص تبحث داخلها | OpenSearch | بحث الموقع والسجلات |
| **تحليلات** | تجميع على بيانات ضخمة | Redshift | تقارير الإدارة |
| **ملفات** | ملفات بأي شكل | S3 مع Athena | سجلات وأرشيف |

### علائقية أو NoSQL؟

هذا أول قرار، والفرق الحقيقي في طريقة التفكير:

| | علائقية (SQL) | NoSQL |
| --- | --- | --- |
| **التصميم** | تصمم الجداول، ثم تكتب أي استعلام | تحدد الاستعلامات أولاً، ثم تصمم عليها |
| **الاستعلامات** | مرنة، مع ربط الجداول | محدودة، وسريعة في المسار اللي صممته |
| **المعاملات** | قوية | تختلف من خدمة لخدمة |
| **التوسّع** | القراءة سهلة، والكتابة غالباً بسيرفر أكبر | أفقي، بأداء ثابت مع الحجم |

::: tip ابدأ علائقية إلا لو عندك سبب
أغلب التطبيقات تناسبها قاعدة علائقية، خصوصاً لو ما تعرف كل استعلاماتك من البداية. واختر NoSQL لسبب واضح، مو لأنها "تتوسّع" وبس.
:::

### خدمات بتمر عليك

- **DynamoDB:** مفتاح وقيمة بدون سيرفرات، وأداء ثابت بأي حجم. بنشرحها في [الجزء الحادي والعشرين](/posts/aws-21-lambda-api-dynamodb/).
- **DocumentDB:** مستندات متوافقة مع MongoDB، فتناسبك لو تنقل تطبيق MongoDB قائم.
- **MemoryDB:** ذاكرة سريعة مثل Valkey لكن بيانات تدوم، فتقدر تستخدمها كقاعدة أساسية وليس كاش فقط.
- **Keyspaces:** متوافقة مع Apache Cassandra، بدون سيرفرات تديرها.
- **Neptune:** للبيانات اللي قيمتها في العلاقات، زي "أصدقاء أصدقائي اللي اشتروا هذا".
- **Timestream for InfluxDB:** لقراءات الحساسات والمقاييس. والنسخة القديمة LiveAnalytics مقفلة على العملاء الجدد.
- **OpenSearch:** بحث نصي وتحليل سجلات، وعادةً نسخة من بياناتك مو المصدر الأساسي.
- **Redshift:** مستودع بيانات للتقارير الضخمة. بنشرحه في [قسم البيانات والذكاء الاصطناعي](/series/aws/#section-8).

## كيف تقرر؟

مر على الأسئلة من فوق لتحت، وأول "نعم" هي نقطة بدايتك:

<figure class="diagram">
<svg viewBox="0 0 640 406" role="img" aria-labelledby="choose-caption">
<defs>
<marker id="choose-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="220" y="10" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="34" text-anchor="middle" class="d-label">نسخة مؤقتة تسرّع القراءة؟</text>
<rect x="20" y="10" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="34" text-anchor="middle" class="d-label">ElastiCache</text>
<line x1="220" y1="29" x2="162" y2="29" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="191" y="23" text-anchor="middle" class="d-small">نعم</text>
<line x1="420" y1="48" x2="420" y2="66" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="404" y="62" text-anchor="middle" class="d-small">لا</text>
<rect x="220" y="68" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="92" text-anchor="middle" class="d-label">بحث داخل نصوص أو سجلات؟</text>
<rect x="20" y="68" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="92" text-anchor="middle" class="d-label">OpenSearch</text>
<line x1="220" y1="87" x2="162" y2="87" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="191" y="81" text-anchor="middle" class="d-small">نعم</text>
<line x1="420" y1="106" x2="420" y2="124" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="404" y="120" text-anchor="middle" class="d-small">لا</text>
<rect x="220" y="126" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="150" text-anchor="middle" class="d-label">تقارير على بيانات ضخمة؟</text>
<rect x="20" y="126" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="150" text-anchor="middle" class="d-label">Redshift, Athena</text>
<line x1="220" y1="145" x2="162" y2="145" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="191" y="139" text-anchor="middle" class="d-small">نعم</text>
<line x1="420" y1="164" x2="420" y2="182" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="404" y="178" text-anchor="middle" class="d-small">لا</text>
<rect x="220" y="184" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="208" text-anchor="middle" class="d-label">قيمة البيانات في العلاقات بين الأشياء؟</text>
<rect x="20" y="184" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="208" text-anchor="middle" class="d-label">Neptune</text>
<line x1="220" y1="203" x2="162" y2="203" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="191" y="197" text-anchor="middle" class="d-small">نعم</text>
<line x1="420" y1="222" x2="420" y2="240" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="404" y="236" text-anchor="middle" class="d-small">لا</text>
<rect x="220" y="242" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="266" text-anchor="middle" class="d-label">قراءات عبر الزمن من حساسات مثلاً؟</text>
<rect x="20" y="242" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="266" text-anchor="middle" class="d-label">Timestream</text>
<line x1="220" y1="261" x2="162" y2="261" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="191" y="255" text-anchor="middle" class="d-small">نعم</text>
<line x1="420" y1="280" x2="420" y2="298" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="404" y="294" text-anchor="middle" class="d-small">لا</text>
<rect x="220" y="300" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="324" text-anchor="middle" class="d-label">قراءة بمفتاح بسيط على حجم ضخم؟</text>
<rect x="20" y="300" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="324" text-anchor="middle" class="d-label">DynamoDB</text>
<line x1="220" y1="319" x2="162" y2="319" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="191" y="313" text-anchor="middle" class="d-small">نعم</text>
<line x1="420" y1="338" x2="420" y2="356" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="404" y="352" text-anchor="middle" class="d-small">لا</text>
<rect x="220" y="358" width="400" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="420" y="382" text-anchor="middle" class="d-label">بيانات تطبيق عادية</text>
<rect x="20" y="358" width="140" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="90" y="382" text-anchor="middle" class="d-label">RDS, Aurora</text>
<line x1="220" y1="377" x2="162" y2="377" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
</svg>
<figcaption id="choose-caption">تبدأ من أعلى، وكل "نعم" تعطيك خدمة تبدأ بها، ولو ما انطبق شي فقاعدة علائقية هي الاختيار الافتراضي.</figcaption>
</figure>

وهذا دليل بداية مو قانون. التطبيق الواحد عادةً يستخدم أكثر من نوع، وكل نوع بيانات يروح للي يناسبه.

## طبقة بيانات تكبر مع تطبيقك

ما تحتاج كل هذا من أول يوم. تخيل متجر إلكتروني يكبر مع الوقت:

1. **الإطلاق:** قاعدة RDS واحدة تكفي. ولما تبدأ تستقبل طلبات حقيقية، فعّل **Multi-AZ**.
2. **الزوار زادوا والقراءة ثقلت:** أضف **ElastiCache** للصفحات الرئيسية والجلسات.
3. **التقارير صارت تبطّئ الموقع:** وجّهها لـ **نسخة قراءة**.
4. **بحث المنتجات ضعيف:** أضف **OpenSearch** وعبّيه من قاعدة البيانات.
5. **الإدارة تبي تحليلات سنوات:** انقل البيانات لـ **S3 مع Athena** أو **Redshift**.
6. **صار عندك زوار حول العالم:** انتقل لـ **Aurora Global Database**.

كل خطوة جات بعد مشكلة حقيقية قستها، مو قبلها. أي خدمة زايدة تعني تكلفة وتعقيد وشي ثاني ممكن يتعطّل.

### أخطاء شائعة

- **اختيار NoSQL لأنها "تتوسّع":** ثم تكتشف إنك تحتاج استعلامات ما صممت لها.
- **تشغيل التقارير على قاعدة الإنتاج:** استعلام واحد ثقيل يبطّئ الموقع كله.
- **تخزين الملفات داخل قاعدة البيانات:** حطها في S3، واحفظ رابطها في القاعدة.
- **معاملة الكاش كمصدر للحقيقة:** لو ضاع، لازم ما يضيع معه شي مهم.
- **Multi-AZ في بيئة التطوير:** تكلفة مضاعفة بدون فايدة غالباً.

## اختبر نفسك

وش تختار لكل حالة؟ فكّر قبل ما تشوف الأجوبة:

1. نظام حجوزات عيادة فيه مواعيد ومرضى ومدفوعات.
2. لعبة جوال تعرض أفضل 100 لاعب مباشرة.
3. تطبيق يقترح "ناس ممكن تعرفهم".
4. عشرة آلاف حساس يرسل درجة الحرارة كل دقيقة.
5. فريق المبيعات يبي تقارير على طلبات خمس سنين.

::: note الأجوبة
1. **RDS أو Aurora:** بيانات مترابطة ومعاملات.
2. **ElastiCache:** مجموعة مرتبة تعطيك الأوائل فوراً.
3. **Neptune:** القيمة في العلاقات.
4. **Timestream for InfluxDB:** قراءات عبر الزمن.
5. **Redshift أو Athena:** تقارير ضخمة بعيد عن قاعدة الإنتاج.
:::

## الخلاصة

- اسأل عن **شكل البيانات وطريقة قراءتها** قبل اسم الخدمة.
- ابدأ **علائقية** إلا لو عندك سبب واضح لغيرها.
- التطبيق الواحد يستخدم أكثر من نوع، وكل بيانات تروح للي يناسبها.
- أضف كل خدمة لما **تقيس مشكلة حقيقية**، مو قبلها.

بهذا نكمل قسم قواعد البيانات. تطبيقك الحين يشتغل ويتوسّع، وبياناته في أمان، بس كيف يوصل له الزوار باسم موقعك؟ هذا موضوع القسم الجاي، ونبدأه في [**الجزء الحادي عشر**](/posts/aws-11-dns-route53/) مع DNS وRoute 53.
