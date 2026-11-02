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
- **Redshift:** مستودع بيانات للتقارير الضخمة. بنشرحه في [الجزء الثالث والعشرين](/posts/aws-23-athena-redshift-glue/).

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

## الخلاصة

- اسأل عن **شكل البيانات وطريقة قراءتها** قبل اسم الخدمة.
- ابدأ **علائقية** إلا لو عندك سبب واضح لغيرها.
- التطبيق الواحد يستخدم أكثر من نوع، وكل بيانات تروح للي يناسبها.
- أضف كل خدمة لما **تقيس مشكلة حقيقية**، مو قبلها.

## اختبر نفسك

::: quiz
عيادة تبني نظام حجوزات فيه مواعيد ومرضى ومدفوعات. البيانات مترابطة، والمدفوعات تحتاج معاملات صارمة، والفريق الصغير لسا ما يعرف كل التقارير اللي بيحتاجها. وين يبدأ؟

- [ ] DynamoDB، لأنها تتوسع بلا حدود
- [x] RDS أو Aurora، بتصميم علائقي
- [ ] ElastiCache، لأن الذاكرة أسرع شي
- [ ] Neptune، لأن البيانات فيها علاقات

البيانات المترابطة والمعاملات والاستعلامات اللي ما تقدر تتوقعها كلها تشير لقاعدة علائقية. وهي الخيار المعقول افتراضياً إلا لو فيه سبب واضح.

- **A:** بتصمم حول استعلامات معروفة من البداية، وبيصعب إضافة تقارير جديدة.
- **C:** الكاش مو مصدر الحقيقة، فما ينفع تكون المدفوعات فيه.
- **D:** Neptune يناسب شبكات العلاقات العميقة، مو الجداول المترابطة العادية.

للمراجعة: [علائقية أو NoSQL؟](#علائقية-أو-nosql) في هذا الجزء، و[Choosing an AWS database service](https://docs.aws.amazon.com/decision-guides/latest/databases-on-aws-how-to-choose/databases-on-aws-how-to-choose.html) في وثائق AWS.
:::

::: quiz
تطبيق اجتماعي يبي يقترح "ناس ممكن تعرفهم" بتتبع أصدقاء الأصدقاء عبر عدة خطوات، وبرد سريع. أي خدمة تناسب أكثر؟

- [ ] RDS، مع ربط جداول لكل خطوة
- [ ] ElastiCache، مع قائمة لكل مستخدم
- [ ] Timestream for InfluxDB
- [x] Amazon Neptune

القيمة هنا في العلاقات نفسها، وNeptune مبني يمشي عبر أعداد كبيرة منها بزمن استجابة منخفض.

- **A:** ينفع لخطوة أو خطوتين، بس الربط يثقل كل ما زادت الخطوات.
- **B:** تقدر تخزن قوائم جاهزة، بس لسا لازم شي يحسبها.
- **C:** هذا للقراءات عبر الوقت، وما له علاقة بالعلاقات.

للمراجعة: [خدمات بتمر عليك](#خدمات-بتمر-عليك) في هذا الجزء، و[Choosing an AWS database service](https://docs.aws.amazon.com/decision-guides/latest/databases-on-aws-how-to-choose/databases-on-aws-how-to-choose.html) في وثائق AWS.
:::

::: quiz
عشرة آلاف حساس ترسل قراءة حرارة كل دقيقة، والمهندسين يبون متوسط كل ساعة لكل حساس خلال آخر أسبوع. أي خدمة مبنية لهذا؟

- [x] Timestream for InfluxDB
- [ ] Amazon Neptune
- [ ] Amazon DocumentDB
- [ ] Amazon OpenSearch Service

هذي قراءات عبر الوقت، وقواعد السلاسل الزمنية مبنية تخزنها وتجمعها.

- **B:** هذا للعلاقات بين الأشياء.
- **C:** هذا لمستندات JSON بحقول مختلفة.
- **D:** هذا أساساً للبحث في النصوص وتحليل السجلات.

للمراجعة: [أنواع قواعد البيانات](#أنواع-قواعد-البيانات) في هذا الجزء، و[What is Timestream for InfluxDB?](https://docs.aws.amazon.com/timestream/latest/developerguide/timestream-for-influxdb.html) في وثائق AWS.
:::

::: quiz
شركة تبي تنقل تطبيق MongoDB قائم إلى خدمة مُدارة في AWS **بأقل تغيير في الكود**. أي خدمة تناسب؟

- [ ] Amazon DynamoDB
- [ ] Amazon Keyspaces
- [x] Amazon DocumentDB
- [ ] Amazon Aurora

DocumentDB متوافق مع MongoDB، فنموذج المستندات وكثير من الكود ممكن يبقون زي ما هم.

- **A:** واجهتها ونموذج بياناتها مختلفين، فبينكتب كود الوصول للبيانات من جديد.
- **B:** هذا متوافق مع Cassandra، مو MongoDB.
- **D:** هذا علائقي، فبتحتاج تعيد تصميم المستندات كجداول.

للمراجعة: [خدمات بتمر عليك](#خدمات-بتمر-عليك) في هذا الجزء، و[What is Amazon DocumentDB?](https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html) في وثائق AWS.
:::

::: quiz
فريق مبيعات يبي تقارير على طلبات خمس سنوات، يعني مليارات الصفوف، والاستعلامات ما لازم تبطئ قاعدة الإنتاج. أي **طريقتين** تناسب؟ (اختر اثنين.)

- [ ] تشغيل التقارير على قاعدة الإنتاج بالليل
- [x] تحميل البيانات إلى Amazon Redshift
- [ ] حفظ الطلبات في ElastiCache
- [ ] تشغيل التقارير على نسخة Multi-AZ الاحتياطية
- [x] تصدير البيانات إلى S3، والاستعلام منها بـ Athena

الطريقتين يبعدون التحليل الثقيل عن الإنتاج. وRedshift يناسب التقارير الثقيلة المتكررة، وAthena يناسب الأسئلة العابرة بدون سيرفرات تشغلها.

- **A:** استعلام ثقيل واحد ممكن يضر أي شي شغال وقتها، وهي قاعدة علائقية مو مبنية لتحليل بهذا الحجم.
- **C:** الكاش نسخة مؤقتة، وصغير وغالي جداً على بيانات خمس سنوات.
- **D:** النسخة الاحتياطية في Multi-AZ ما ينقرأ منها.

للمراجعة: [أخطاء شائعة](#أخطاء-شائعة) في هذا الجزء، و[What is Amazon Athena?](https://docs.aws.amazon.com/athena/latest/ug/what-is.html) في وثائق AWS.
:::

بهذا نكمل قسم قواعد البيانات. تطبيقك الحين يشتغل ويتوسّع، وبياناته في أمان، بس كيف يوصل له الزوار باسم موقعك؟ هذا موضوع القسم الجاي، ونبدأه في [**الجزء الحادي عشر**](/posts/aws-11-dns-route53/) مع DNS وRoute 53.
