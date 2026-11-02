---
title: "ربط الخدمات: SQS وSNS وKinesis"
description: ليه ما تخلي الخدمات تتصل ببعض مباشرة، وكيف يمتص طابور SQS الضغط، وكيف يوصل SNS رسالة وحدة للكل، ومتى تحتاج تيار Kinesis، مع تجربة عملية تبني فيها Fan-out مع فلتر.
date: 2026-11-02
series: aws
part: 19
numbered: true
tags: [aws, messaging]
---

إلى الحين أجزاء تطبيقنا [تتصل ببعض مباشرة](/posts/aws-07-auto-scaling/). هذا تمام لين يبدأ العرض وما تلحق خدمة الفواتير، وفجأة العميل يطالع دائرة تحميل بسبب خدمة ما سمع فيها.

هذا القسم عن التطبيقات الحديثة، ويبدأ بالفكرة اللي وراء أغلبها: **افصل الخدمات عن بعض**، عشان كل وحدة تشتغل بسرعتها، وتعطل وحدة ما يوقف الباقي.

هذي خريطة الجزء:

| تبي | استخدم |
| --- | --- |
| شغلة ياخذها عامل واحد وما تضيع | **SQS** |
| حدث واحد يوصل لأطراف كثيرة بنفس الوقت | **SNS** |
| تيار مستمر يقرأه أكثر من طرف ويعيد قراءته | **Kinesis Data Streams** |
| تيار ينزل في S3 أو غيره بدون كتابة كود | **Data Firehose** |
| تطبيق قائم مبني على RabbitMQ أو ActiveMQ | **Amazon MQ** |

## ليه تفصل الخدمات؟

<figure class="diagram">
<svg viewBox="0 0 640 212" role="img" aria-labelledby="decouple-caption">
<defs>
<marker id="decouple-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="320" y="22" text-anchor="middle" class="d-small">اتصال مباشر: العميل ينتظر خدمة الفواتير</text>
<rect x="450" y="34" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="535" y="68" text-anchor="middle" class="d-label">تطبيق المتجر</text>
<rect x="20" y="34" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="105" y="58" text-anchor="middle" class="d-label">خدمة الفواتير</text>
<text x="105" y="78" text-anchor="middle" class="d-small">بطيئة أو واقفة</text>
<line x1="450" y1="63" x2="192" y2="63" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#decouple-arrow)"/>
<text x="320" y="130" text-anchor="middle" class="d-small">مع طابور: العميل يوصله الرد فوراً</text>
<rect x="450" y="142" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="535" y="176" text-anchor="middle" class="d-label">تطبيق المتجر</text>
<rect x="235" y="142" width="170" height="58" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="166" text-anchor="middle" class="d-label">طابور SQS</text>
<text x="320" y="186" text-anchor="middle" class="d-small">يحفظ الرسالة</text>
<rect x="20" y="142" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="105" y="166" text-anchor="middle" class="d-label">خدمة الفواتير</text>
<text x="105" y="186" text-anchor="middle" class="d-small">تشتغل بسرعتها</text>
<line x1="450" y1="171" x2="407" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#decouple-arrow)"/>
<line x1="235" y1="171" x2="192" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#decouple-arrow)"/>
</svg>
<figcaption id="decouple-caption">لما تتصل الخدمات ببعض مباشرة، خدمة بطيئة وحدة تعطل العميل. الطابور يخلي كل طرف يشتغل بسرعته.</figcaption>
</figure>

الاتصال المباشر يعني الطرفين لازم يكونون شغالين وسريعين في نفس اللحظة. ولما تحط طابور بينهم تكسب ثلاث أشياء:

- **العطل يبقى في مكانه.** لو وقفت خدمة الفواتير، الرسائل تنتظر في الطابور لين ترجع.
- **الضغط ينمتص.** ألف طلب في دقيقة ما توصل لقاعدة البيانات دفعة وحدة.
- **كل طرف يتوسع لحاله.** تزيد عمّال الفواتير بدون ما تلمس المتجر.

## SQS: الطابور

**SQS** (Simple Queue Service) طابور مُدار بالكامل بدون سيرفرات تديرها. **المنتج** يرسل الرسائل، وتنتظر في الطابور، و**المستهلك** يسحبها ويشتغل عليها ثم يحذفها.

انتبه للاتجاه: المستهلكين هم اللي يطلبون الرسائل من الطابور، والطابور ما يدفعها لأحد.

| الخاصية | القيمة |
| --- | --- |
| **السعة** | بدون حد عملي في الطابور العادي |
| **حجم الرسالة** | حتى 1 MiB |
| **مدة الحفظ** | 4 أيام افتراضياً، من دقيقة إلى 14 يوم |
| **التوصيل** | مرة على الأقل، فممكن تجيك الرسالة مرتين |
| **الترتيب** | أفضل محاولة، وغير مضمون |

آخر نقطتين تأثر على كودك. بما إن الرسالة ممكن توصل مرتين، خل معالجتها مرتين ما تضر. رقم طلب تتأكد منه قبل الخصم يكفي.

وأي شي أكبر من رسالة، خزّن الملف في S3 وأرسل مساره في الرسالة.

### مهلة الإخفاء (Visibility Timeout)

وش يمنع مستهلكين ياخذون نفس الرسالة؟ لما يستلمها واحد، يخفيها SQS عن الباقين لفترة اسمها **Visibility Timeout**. ولازم المستهلك يحذفها قبل ما تخلص الفترة.

<figure class="diagram">
<svg viewBox="0 0 640 154" role="img" aria-labelledby="visibility-caption">
<defs>
<marker id="visibility-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="470" y="49" width="150" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="545" y="72" text-anchor="middle" class="d-label">استلام</text>
<text x="545" y="92" text-anchor="middle" class="d-small">تنخفي عن الباقين</text>
<rect x="245" y="49" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="72" text-anchor="middle" class="d-label">معالجة</text>
<text x="320" y="92" text-anchor="middle" class="d-small">30 ثانية افتراضياً</text>
<rect x="20" y="14" width="150" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="95" y="37" text-anchor="middle" class="d-label">حذف</text>
<text x="95" y="57" text-anchor="middle" class="d-small">انتهى الشغل</text>
<rect x="20" y="84" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="95" y="107" text-anchor="middle" class="d-label">بدون حذف</text>
<text x="95" y="127" text-anchor="middle" class="d-small">ترجع تظهر</text>
<line x1="470" y1="77" x2="397" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#visibility-arrow)"/>
<line x1="245" y1="77" x2="172" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#visibility-arrow)"/>
<line x1="245" y1="77" x2="172" y2="112" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#visibility-arrow)"/>
</svg>
<figcaption id="visibility-caption">الرسالة المستلمة تنخفي بس ما تنحذف. لو ما حذفها المستهلك قبل نهاية المهلة، ترجع تظهر لمستهلك ثاني.</figcaption>
</figure>

هذي الآلية هي اللي تحميك من ضياع الشغل: لو طاح السيرفر في نص المعالجة، الرسالة ترجع لحالها.

اختر الفترة حسب وقت معالجتك. هي 30 ثانية افتراضياً، وتوصل إلى 12 ساعة:

- **قصيرة زيادة:** الرسالة ترجع تظهر وهي لسا تحت المعالجة، فتنعالج مرتين.
- **طويلة زيادة:** لو فشل مستهلك، الرسالة تنتظر طويل قبل ما أحد يعيد المحاولة.

ولو شغلة أخذت وقت أطول من المعتاد، المستهلك يقدر يمدد الفترة لهذي الرسالة بـ `ChangeMessageVisibility`.

### الانتظار الطويل (Long Polling)

افتراضياً، لما تسأل طابور فاضي يرجع لك رد فاضي فوراً، فمستهلكينك يملون فاتورتك بطلبات ما لها داعي. مع **Long Polling** الطلب ينتظر حتى 20 ثانية لين تجي رسالة. يعني طلبات أقل، وتكلفة أقل، ووصول أسرع، فشغّله دايماً.

### طابور الرسائل الفاشلة (DLQ)

طيب ورسالة تفشل كل مرة بسبب خطأ في الكود أو بيانات غلط؟ بترجع للأبد. اربط **Dead-Letter Queue**: بعد عدد محاولات تحدده، الرسالة تنتقل له، فتفحصها بدون ما تعطل شي. وبعد ما تصلح المشكلة، تقدر تعيدها للطابور الأصلي بـ **Redrive**.

وخل مدة الحفظ في طابور الرسائل الفاشلة أطول من الأصلي، عشان ما تنتهي الرسائل قبل ما تشوفها.

### طوابير FIFO

لما يكون الترتيب مهم، مثل عمليات على نفس الحساب، استخدم طابور **FIFO**. ولازم اسمه ينتهي بـ `.fifo`.

| | العادي | FIFO |
| --- | --- | --- |
| **الترتيب** | غير مضمون | مضمون داخل مجموعة الرسائل |
| **التكرار** | ممكن | ينحذف خلال نافذة 5 دقايق |
| **السعة** | بدون حد عملي | 300 رسالة في الثانية، أو 3,000 مع الدفعات |

الترتيب يكون داخل **مجموعة الرسائل (Message Group)**، فلو خليت مجموعة لكل عميل، رسائل العملاء المختلفين تنعالج بالتوازي. ولو احتجت سعة أكبر، **وضع السعة العالية** يرفع الحد كثير، والرقم يختلف حسب المنطقة.

### التوسع مع الطابور

نمط كلاسيكي: [مجموعة Auto Scaling](/posts/aws-07-auto-scaling/) من العمّال تكبر وتصغر حسب طول الطابور. مقياس `ApproximateNumberOfMessagesVisible` يقول لك كم رسالة تنتظر، فلما يطول الطابور يزيد العمّال.

وهذا يحمي قاعدة بياناتك كمان. بدل ما تضرب موجة طلبات RDS مباشرة، تدخل في طابور، والعمّال يكتبونها بسرعة تتحملها القاعدة. وهذا يناسب الشغل اللي ما يحتاج جواب فوري فقط، فالعميل يوصله "استلمنا طلبك"، مو "اكتمل طلبك".

### الأمان

الرسائل مشفرة أثناء النقل بـ HTTPS، وفي التخزين بـ SSE-SQS افتراضياً أو بمفتاح KMS خاص فيك. ومين يوصل للطابور تحدده سياسات IAM، مع **سياسة وصول** على الطابور نفسه، وتحتاجها لحسابات ثانية أو لخدمات مثل SNS وS3 عشان ترسل له. وبنكتب وحدة في التجربة العملية.

## SNS: رسالة وحدة للكل

الطابور يناسب شغلة يسويها طرف واحد. بس لما يطلب عميل، خدمات الشحن والفواتير والتحليل كلها تبي تدري. وما تبي تطبيقك يعرف كل وحدة فيها، ويتغير كل ما أضفت وحدة.

**SNS** (Simple Notification Service) يشتغل بـ **النشر والاشتراك**: تطبيقك ينشر رسالة وحدة في **موضوع (Topic)**، وSNS يوصلها لكل المشتركين فوراً. والموضوع العادي يتحمل حتى 12.5 مليون اشتراك.

| نوع المشترك | مثال |
| --- | --- |
| **SQS** | خدمة تعالج بسرعتها |
| **Lambda** | دالة صغيرة تشتغل مع كل رسالة |
| **HTTP أو HTTPS** | رابط Webhook في نظام ثاني |
| **Data Firehose** | تخزين كل رسالة في S3 |
| **إيميل وSMS وإشعارات الجوال** | تنبيه الناس مباشرة |

وعلى عكس الطابور، SNS ما يخزن الرسائل. لو كان مشترك واقف يعيد المحاولة لفترة، بس هو مو مكان تنتظر فيه الرسائل.

وحجم الرسالة 256 KiB افتراضياً، وتقدر ترفعه على الموضوع إلى 1 MiB، بس هذا يحصره في 100 اشتراك ولمشتركي SQS وLambda وFirehose فقط.

### Fan-out: SNS مع SQS

أهم نمط هنا يجمع الخدمتين: SNS ينشر الرسالة، وطابور لكل خدمة يحفظها لين تكون الخدمة جاهزة.

<figure class="diagram">
<svg viewBox="0 0 640 246" role="img" aria-labelledby="fanout-caption">
<defs>
<marker id="fanout-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="490" y="93" width="130" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="555" y="118" text-anchor="middle" class="d-label">تطبيق المتجر</text>
<text x="555" y="138" text-anchor="middle" class="d-small">ينشر مرة وحدة</text>
<rect x="310" y="93" width="130" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="375" y="118" text-anchor="middle" class="d-label">موضوع SNS</text>
<text x="375" y="138" text-anchor="middle" class="d-code">orders</text>
<rect x="140" y="14" width="120" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="200" y="39" text-anchor="middle" class="d-label">الشحن</text>
<text x="200" y="59" text-anchor="middle" class="d-small">المادية فقط</text>
<rect x="140" y="93" width="120" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="200" y="118" text-anchor="middle" class="d-label">الفواتير</text>
<text x="200" y="138" text-anchor="middle" class="d-small">كل الطلبات</text>
<rect x="140" y="172" width="120" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="200" y="197" text-anchor="middle" class="d-label">التحليل</text>
<text x="200" y="217" text-anchor="middle" class="d-small">كل الطلبات</text>
<rect x="20" y="14" width="90" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="65" y="49" text-anchor="middle" class="d-label">EC2</text>
<rect x="20" y="93" width="90" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="65" y="128" text-anchor="middle" class="d-label">Lambda</text>
<rect x="20" y="172" width="90" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="65" y="207" text-anchor="middle" class="d-label">Fargate</text>
<line x1="490" y1="123" x2="442" y2="123" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="310" y1="123" x2="262" y2="44" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="310" y1="123" x2="262" y2="123" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="310" y1="123" x2="262" y2="202" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="140" y1="44" x2="112" y2="44" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="140" y1="123" x2="112" y2="123" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="140" y1="202" x2="112" y2="202" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
</svg>
<figcaption id="fanout-caption">التطبيق ينشر مرة وحدة، وSNS ينسخ الرسالة لكل طابور، وكل خدمة تقرأ من طابورها. والفلتر يرسل الطلبات المادية فقط للشحن.</figcaption>
</figure>

ليه هذا الجمع؟

- **ما يضيع شي:** لو وقفت خدمة الشحن، رسائلها تنتظر في طابورها.
- **كل خدمة لها سرعتها،** ومحاولاتها، وطابور رسائلها الفاشلة.
- **إضافة خدمة سهلة:** طابور جديد يشترك في الموضوع، بدون تغيير الناشر.

ونفس الشي مع [أحداث S3](/posts/aws-15-s3-basics/): S3 ما يقبل قاعدتين ببادئات متداخلة لنفس نوع الحدث. فعشان توصل لأكثر من وجهة، أرسل الحدث لموضوع SNS واحد ووزعه من هناك.

### فلترة الرسائل

افتراضياً كل مشترك يستلم كل شي. **سياسة الفلترة** على الاشتراك تخلي طابور الشحن يستلم اللي يخصه فقط:

```json
{ "type": ["physical"] }
```

الرسائل اللي `type` فيها `digital` ما توصله، وما تدفع على معالجتها.

### مواضيع FIFO

عشان الترتيب في الـ Fan-out، SNS عنده مواضيع **FIFO**، وأسماؤها تنتهي بـ `.fifo` برضو، مع ترتيب وحذف للتكرار مثل طوابير FIFO. ومحدودة بـ 100 اشتراك للموضوع، وتناسب حالات مثل إرسال نفس تسلسل التحديثات لأكثر من طابور.

## Kinesis Data Streams: تيار يبقى

تخيل مليون حساس يرسلون قراءات كل ثانية، وثلاث أطراف تبي تقرأها: واحد للتنبيهات الفورية، وواحد للوحات المتابعة، وواحد للأرشفة. الطابور ما يناسب هنا، لأن الرسالة تروح بعد معالجتها.

**Kinesis Data Streams** تيار: السجلات تبقى فيه طول مدة الحفظ سواء انقرأت أو لا، وكل مستهلك يقرأ من موضعه، فيقدر يرجع و**يعيد القراءة**.

<figure class="diagram">
<svg viewBox="0 0 640 232" role="img" aria-labelledby="kinesis-caption">
<defs>
<marker id="kinesis-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="510" y="24" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="54" text-anchor="middle" class="d-label">التطبيق</text>
<rect x="510" y="91" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="121" text-anchor="middle" class="d-label">الحساسات</text>
<rect x="510" y="158" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="188" text-anchor="middle" class="d-label">السجلات</text>
<rect x="180" y="14" width="280" height="204" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="320" y="38" text-anchor="middle" class="d-label">Kinesis Data Stream</text>
<rect x="200" y="50" width="240" height="40" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="75" text-anchor="middle" class="d-label">Shard 1</text>
<rect x="200" y="98" width="240" height="40" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="123" text-anchor="middle" class="d-label">Shard 2</text>
<rect x="200" y="146" width="240" height="40" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="171" text-anchor="middle" class="d-label">Shard 3</text>
<text x="320" y="206" text-anchor="middle" class="d-small">تبقى من 24 ساعة إلى 365 يوم</text>
<rect x="20" y="24" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="54" text-anchor="middle" class="d-label">Lambda</text>
<rect x="20" y="91" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="121" text-anchor="middle" class="d-label">تطبيقك</text>
<rect x="20" y="158" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="188" text-anchor="middle" class="d-label">Firehose</text>
<line x1="510" y1="49" x2="462" y2="70" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="510" y1="116" x2="462" y2="116" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="510" y1="183" x2="462" y2="162" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="180" y1="70" x2="132" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="180" y1="116" x2="132" y2="116" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="180" y1="162" x2="132" y2="183" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
</svg>
<figcaption id="kinesis-caption">المنتجين يكتبون في الـ Shards، والسجلات بنفس المفتاح تبقى مرتبة داخل Shard واحد، وأكثر من مستهلك يقرأ نفس البيانات، كل واحد من موضعه.</figcaption>
</figure>

- **Shards:** التيار ينقسم إلى أجزاء. في السعة المحددة، كل واحد ياخذ 1 MB في الثانية كتابة و2 MB في الثانية قراءة.
- **مفتاح التقسيم:** يحدد أي Shard يروح له السجل. السجلات بنفس المفتاح تبقى مرتبة، فرقم الحساس مفتاح ممتاز.
- **مدة الحفظ:** 24 ساعة افتراضياً، وتوصل إلى 365 يوم.
- **حجم السجل:** 1 MiB افتراضياً، وتقدر ترفعه إلى 10 MiB لكل تيار.

### أوضاع السعة

| الوضع | كيف يشتغل | متى |
| --- | --- | --- |
| **On-demand** | يبدأ بـ 4 MB في الثانية كتابة ويتوسع لحاله، وتدفع على البيانات | حمل مجهول أو متغير، وابدأ به |
| **Provisioned** | تحدد عدد الـ Shards وتدفع على كل واحد بالساعة | حمل ثابت ومعروف، وممكن يكون أرخص |

وسقف On-demand يختلف حسب المنطقة: حتى 10 GB في الثانية كتابة في أكبر المناطق، و200 MB في الثانية في غيرها.

## Data Firehose: للتخزين بدون كود

كثير من الأحيان كل اللي تبيه إن التيار ينزل في مكان. **Amazon Data Firehose** (اسمه القديم Kinesis Data Firehose) ياخذ البيانات، ويجمعها، ويوصلها بدون كود ولا سيرفرات:

- **المصادر:** تطبيقك مباشرة، أو تيار Kinesis، أو غيرها مثل SNS وCloudWatch Logs.
- **المعالجة:** يقدر يحوّل السجلات بدالة Lambda لو تبي، ويحولها إلى Parquet.
- **الوجهات:** S3 وRedshift وOpenSearch وSnowflake وجداول Apache Iceberg، أو رابط HTTP.
- **التجميع:** يجمع البيانات لين توصل حجم أو مدة، مثل 5 MiB أو 5 دقايق لـ S3، واللي يجي أول يطلق التوصيل. فهو يناسب التحميل شبه الفوري، مو رد الفعل اللحظي.

| | Kinesis Data Streams | Data Firehose |
| --- | --- | --- |
| **الغرض** | تيار يقرأه مستهلكينك | أنبوب يوصل للتخزين |
| **المستهلكين** | أنت تكتبهم | الوجهة جاهزة |
| **إعادة القراءة** | نعم، خلال مدة الحفظ | لا |
| **التوقيت** | فوري | حسب التجميع اللي تحدده |

## أيها أختار؟

| | SQS | SNS | Kinesis Data Streams |
| --- | --- | --- | --- |
| **الطريقة** | المستهلك يسحب | يدفع للمشتركين | المستهلك يسحب |
| **من يقرأ الرسالة** | واحد، ثم تنحذف | كل المشتركين | الكل، خلال مدة الحفظ |
| **تنحفظ؟** | حتى 14 يوم | لا | حتى 365 يوم |
| **الترتيب** | مع FIFO | مع FIFO | داخل الـ Shard |
| **الاستخدام المعتاد** | شغل في الخلفية | إشعارات وFan-out | تحليل وسجلات وبيانات متدفقة |

قاعدة سريعة: **شغلة**؟ SQS. **حدث** يهم كثيرين؟ SNS. **تيار بيانات** يقرأه كثيرين ويعيدون قراءته؟ Kinesis.

وفيه كمان **EventBridge** يوزع الأحداث بقواعد من خدمات AWS وتطبيقات ثانية، وبنشرحه في [الجزء الخامس والعشرين](/posts/aws-25-monitoring-auditing/).

## Amazon MQ: للي موجود أصلاً

SQS وSNS خدمات AWS الخاصة بواجهاتها الخاصة. لو تنقل تطبيق مبني على بروتوكولات مفتوحة مثل **AMQP** أو **MQTT** أو **STOMP**، ما تبي تعيد كتابته. **Amazon MQ** يشغّل لك وسيط معروف كخدمة مُدارة، بمحركين:

| المحرك | التوفر العالي |
| --- | --- |
| **ActiveMQ** | وسيطين في منطقتي توفر، نشط واحتياطي، بتخزين مشترك على EFS |
| **RabbitMQ** | مجموعة من ثلاث عقد في مناطق توفر مختلفة، خلف نقطة وصول وحدة |

ولاحظ إنه يشتغل على وسطاء تختار حجمهم، فما يتوسع بلا حدود مثل SQS وSNS. وللتطبيق الجديد، ابدأ بهذيك الخدمتين.

## عملي: Fan-out مع فلتر

بنبني تصميم الرسم بطابورين. من CloudShell، أنشئ الموضوع والطوابير:

```bash
TOPIC_ARN=$(aws sns create-topic --name orders \
  --query TopicArn --output text)

SHIP_URL=$(aws sqs create-queue --queue-name shipping \
  --query QueueUrl --output text)
BILL_URL=$(aws sqs create-queue --queue-name billing \
  --query QueueUrl --output text)

SHIP_ARN=$(aws sqs get-queue-attributes --queue-url $SHIP_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)
BILL_ARN=$(aws sqs get-queue-attributes --queue-url $BILL_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)
```

الطوابير خاصة، فاسمح لهذا الموضوع فقط يرسل لها:

```bash
allow_topic() {
  POLICY=$(jq -nc --arg q "$2" --arg t "$TOPIC_ARN" '{
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: {Service: "sns.amazonaws.com"},
      Action: "sqs:SendMessage",
      Resource: $q,
      Condition: {ArnEquals: {"aws:SourceArn": $t}}
    }]
  }')
  aws sqs set-queue-attributes --queue-url "$1" \
    --attributes "$(jq -nc --arg p "$POLICY" '{Policy: $p}')"
}

allow_topic $SHIP_URL $SHIP_ARN
allow_topic $BILL_URL $BILL_ARN
```

اشترك بالطوابير في الموضوع: الفواتير تاخذ كل شي، والشحن ياخذ الطلبات المادية فقط:

```bash
aws sns subscribe --topic-arn $TOPIC_ARN \
  --protocol sqs --notification-endpoint $BILL_ARN \
  --attributes RawMessageDelivery=true

aws sns subscribe --topic-arn $TOPIC_ARN \
  --protocol sqs --notification-endpoint $SHIP_ARN \
  --attributes '{"RawMessageDelivery":"true","FilterPolicy":"{\"type\":[\"physical\"]}"}'
```

انشر طلبين، واحد مادي وواحد رقمي:

```bash
aws sns publish --topic-arn $TOPIC_ARN --message "order 1: a book" \
  --message-attributes '{"type":{"DataType":"String","StringValue":"physical"}}'

aws sns publish --topic-arn $TOPIC_ARN --message "order 2: an e-book" \
  --message-attributes '{"type":{"DataType":"String","StringValue":"digital"}}'
```

عطه كم ثانية، ثم عد الرسائل في كل طابور:

```bash
for url in $BILL_URL $SHIP_URL; do
  aws sqs get-queue-attributes --queue-url $url \
    --attribute-names ApproximateNumberOfMessages \
    --query Attributes.ApproximateNumberOfMessages --output text
done
```

بتشوف `2` للفواتير و`1` للشحن، يعني الفلتر اشتغل. الحين جرب مهلة الإخفاء. استلم رسالة الشحن، ثم حاول مرة ثانية على طول:

```bash
aws sqs receive-message --queue-url $SHIP_URL --wait-time-seconds 5 \
  --query "Messages[0].Body" --output text

aws sqs receive-message --queue-url $SHIP_URL --wait-time-seconds 5 \
  --query "Messages[0].Body" --output text
```

الأول يطبع `order 1: a book`، والثاني ينتظر خمس ثواني ويطبع `None`، لأن الرسالة مخفية. وما حذفناها، فانتظر 30 ثانية واستلمها مرة ثانية، وهالمرة احذفها عشان ينتهي الشغل:

```bash
HANDLE=$(aws sqs receive-message --queue-url $SHIP_URL --wait-time-seconds 20 \
  --query "Messages[0].ReceiptHandle" --output text)

aws sqs delete-message --queue-url $SHIP_URL --receipt-handle "$HANDLE"
```

الحين الرسالة راحت نهائياً.

::: security احذف بعد التجربة
التجربة تكلفتها شبه صفر، بس نظّف على أي حال. وحذف الموضوع يحذف اشتراكاته:
:::

```bash
aws sns delete-topic --topic-arn $TOPIC_ARN
aws sqs delete-queue --queue-url $SHIP_URL
aws sqs delete-queue --queue-url $BILL_URL
```

## الخلاصة

- **فصل الخدمات** يحصر الأعطال، ويمتص الضغط، ويخلي كل طرف يتوسع لحاله.
- **SQS** طابور: الرسالة تروح لمستهلك واحد، ولازم يحذفها قبل نهاية مهلة الإخفاء.
- أضف دايماً **Long Polling** و**DLQ**، وخل المعالجة آمنة لو تكررت.
- **SNS** يوصل رسالة وحدة للكل، و**Fan-out** مع SQS يضمن ما تفوت أحد.
- **Kinesis Data Streams** يحفظ البيانات لأكثر من قارئ يعيد قراءتها، و**Firehose** يوصلها للتخزين بدون كود.

## اختبر نفسك

::: quiz
صفحة الطلبات في موقع تذاكر تكتب مباشرة على RDS. ولما تنفتح تذاكر حفلة كبيرة، تنضغط القاعدة وتفشل الطلبات. والعملاء يتقبلون رسالة "استلمنا طلبك"، والتأكيد يوصل بعد دقيقة. وش يمتص الضغط؟

- [ ] نسخة قراءة للقاعدة
- [x] طابور SQS، وعمال يكتبون بسرعة تتحملها القاعدة
- [ ] موضوع SNS يدفع كل طلب للقاعدة
- [ ] Multi-AZ على القاعدة

الطابور يحفظ الطلبات، والعمال يكتبونها بسرعة تتحملها القاعدة. وهذا يناسب الحالة لأن العميل ما يحتاج الجواب النهائي فوراً.

- **A:** نسخ القراءة تخدم القراءة، والضغط هنا من الكتابة.
- **C:** SNS يوصّل فوراً وما يحفظ الرسائل، فالضغط بيوصل كله مرة وحدة.
- **D:** النسخة الاحتياطية ما تاخذ أي حمل، فيبقى الضغط.

للمراجعة: [التوسع مع الطابور](#التوسع-مع-الطابور) في هذا الجزء، و[What is Amazon Simple Queue Service?](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) في وثائق AWS.
:::

::: quiz
عامل ياخذ حوالي دقيقتين لإنتاج كل فاتورة، ومهلة الإخفاء في الطابور لسا على قيمتها الافتراضية. والعملاء يوصلهم نفس الفاتورة كم مرة. وش يغيّر الفريق؟

- [x] رفع مهلة الإخفاء فوق وقت المعالجة
- [ ] تفعيل Long Polling
- [ ] ربط طابور رسائل فاشلة (DLQ)
- [ ] إضافة عمال أكثر

بعد 30 ثانية ترجع الرسالة تظهر والعامل الأول لسا شغال عليها، فياخذها عامل ثاني كمان. ولازم تكون المهلة أطول من وقت الشغل.

- **B:** هذا يقلل الردود الفاضية، وما يغير متى ترجع الرسالة.
- **C:** هذا يلقط الرسائل اللي تفشل دايماً، وهذي تنجح وتتكرر.
- **D:** العمال الزيادة بس ياخذون الرسائل اللي ترجع بشكل أسرع.

للمراجعة: [مهلة الإخفاء (Visibility Timeout)](#مهلة-الإخفاء-visibility-timeout) في هذا الجزء، و[Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) في وثائق AWS.
:::

::: quiz
لما ينعمل طلب، خدمات الشحن والفوترة والتحليل كلها تحتاج تعرف. وأي واحدة منها ممكن تتعطل ساعات، وإضافة خدمة جديدة ما لازم تغير الناشر. وش يناسب؟

- [ ] طابور SQS واحد تقرأ منه الخدمات الثلاث
- [ ] الناشر يرسل مباشرة لطابور كل خدمة
- [ ] موضوع SNS مع مشترك HTTP لكل خدمة
- [x] موضوع SNS، مع طابور SQS لكل خدمة مشترك فيه

SNS يوصّل الرسالة الوحدة لكل مشترك، وطابور كل خدمة يحفظها لين تكون الخدمة جاهزة. والخدمة الجديدة بس تشترك بطابور جديد.

- **A:** كل رسالة تروح لمستهلك واحد، فباقي الخدمات تفوتها.
- **B:** الناشر لازم يتغير مع كل خدمة جديدة.
- **C:** SNS يعيد المحاولة فترة بس وما يحفظ الرسائل، فالعطل الطويل ممكن يضيعها.

للمراجعة: [Fan-out: SNS مع SQS](#fan-out-sns-مع-sqs) في هذا الجزء، و[What is Amazon SNS?](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) في وثائق AWS.
:::

::: quiz
حساسات مزرعة رياح ترسل قراءات كل ثانية. وثلاث تطبيقات منفصلة تقرأ نفس البيانات مباشرة، وبعد إصلاح خطأ لازم واحد منها يعيد قراءة آخر ثلاثة أيام. أي خيار يناسب؟

- [ ] طابور SQS عادي
- [ ] موضوع SNS عادي
- [x] Kinesis Data Streams، مع رفع مدة الاحتفاظ إلى ثلاثة أيام على الأقل
- [ ] Data Firehose، يوصّل إلى S3

السجلات تبقى في التيار طول مدة الاحتفاظ سواء انقرأت أو لا، وكل مستهلك يقرأ من موقعه، فيقدر واحد يرجع ورا بدون ما يأثر على الباقي. والمدة الافتراضية 24 ساعة فقط.

- **A:** الرسالة تروح لمستهلك واحد، وتروح لما تنحذف.
- **B:** SNS ما يحفظ الرسائل، فما فيه شي تعيد قراءته.
- **D:** هذا يجمّع البيانات ويوصلها للتخزين، فما يعطي قراءة فورية ولا إعادة قراءة.

للمراجعة: [Kinesis Data Streams: تيار يبقى](#kinesis-data-streams-تيار-يبقى) في هذا الجزء، و[Change the data retention period](https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html) في وثائق AWS.
:::

::: quiz
بنك يعالج المعاملات عبر طابور. وداخل كل حساب لازم تمشي بالترتيب مع إزالة التكرار، والحسابات المختلفة لازم تتعالج بالتوازي. أي **خيارين** يناسبون؟ (اختر اثنين.)

- [ ] طابور عادي
- [x] طابور FIFO
- [ ] مجموعة رسائل وحدة لكل الحسابات
- [x] مجموعة رسائل لكل حساب
- [ ] مهلة إخفاء أطول

طابور FIFO يحافظ على الترتيب داخل مجموعة الرسائل ويزيل التكرار خلال 5 دقايق، ومجموعة لكل حساب تخلي الحسابات المختلفة تمشي بالتوازي.

- **A:** هذا ما يضمن الترتيب، والرسالة ممكن توصل مرتين.
- **C:** هذا يحط كل المعاملات في صف واحد، فما يمشي شي بالتوازي.
- **E:** هذا يعطي العمال وقت أكثر، وما يأثر على الترتيب.

للمراجعة: [طوابير FIFO](#طوابير-fifo) في هذا الجزء، و[FIFO queue delivery logic in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html) في وثائق AWS.
:::

الخدمات الحين مفصولة، بس وين يشتغل الكود نفسه؟ إلى الآن جوابنا سيرفر EC2 بكل إعداداته. في [**الجزء العشرين**](/posts/aws-20-ecs-fargate-eks/) نغلف التطبيقات في حاويات ونشغلها بـ ECS وFargate وEKS.
