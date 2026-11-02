---
title: "المراقبة والتدقيق: CloudWatch وCloudTrail وConfig"
description: كيف تعرف إن تطبيقك بخير، ومين غيّر وش، وهل إعداداتك لسا زي ما لازم؟ المقاييس والسجلات والإنذارات في CloudWatch، وEventBridge وCloudTrail وConfig، مع تجربة عملية لإنذار يرسل لك إيميل.
date: 2026-11-02
series: aws
part: 25
numbered: true
tags: [aws, operations]
---

خلال الأجزاء السابقة بنينا تطبيق بقطع كثيرة. بناؤه هو النص السهل. النص الصعب يجي الساعة ثلاث الفجر: هو واقف؟ من متى؟ ومين غيّر هذاك الإعداد أمس؟

هذا القسم الأخير عن تشغيل اللي بنيته، ويبدأ بثلاث أسئلة، لكل واحد خدمته:

| السؤال | الخدمة |
| --- | --- |
| هو بخير الحين؟ | **CloudWatch** |
| مين سوى هذا، ومتى؟ | **CloudTrail** |
| الإعدادات زي ما لازم، وكيف تغيرت؟ | **Config** |

وخدمة رابعة ترد على كل هذا: **EventBridge**.

## مقاييس CloudWatch

**المقياس (Metric)** رقم ينقاس مع الوقت، مثل استخدام المعالج أو عدد الأخطاء. وأغلب خدمات AWS ترسل مقاييسها لحالها، مجمعة في **Namespaces** ومميزة بـ **Dimensions**، مثل رقم السيرفر.

| النقطة | التفاصيل |
| --- | --- |
| **الافتراضي في EC2** | كل 5 دقايق، أو كل دقيقة لو شغلت المراقبة التفصيلية |
| **المقاييس الخاصة** | ترسل اللي تبي، مثل عدد الطلبات الفاشلة، وبدقة توصل لثانية |
| **السجل التاريخي** | بيانات الدقيقة تبقى 15 يوم، وبيانات 5 دقايق 63 يوم، والساعة 455 يوم |
| **Metric Streams** | ترسل المقاييس باستمرار عبر Firehose إلى S3 أو أداة مراقبة ثانية |

::: warning EC2 ما يبلغ عن الذاكرة
المقاييس الافتراضية تجي من خارج السيرفر، فما فيها **الذاكرة** ولا **مساحة القرص**. عشان تجيبها، ثبّت **CloudWatch Agent** على السيرفر. وكثير يكتشفون هذا وهم يحاولون يفهمون ليه سيرفرهم بطأ.
:::

و**Dashboards** تجمع الرسوم اللي تهمك في صفحة وحدة، وتقدر تجمع مقاييس من مناطق وحسابات مختلفة.

## سجلات CloudWatch

كل اللي يطبعه تطبيقك ممكن ينزل هنا، مرتب في **Log Groups** تمثل عادةً تطبيق واحد، وداخلها **Log Streams**. وLambda وECS وAPI Gateway و[VPC Flow Logs](/posts/aws-13-vpc/) وغيرها ترسل سجلاتها مباشرة، وعلى EC2 أو سيرفرات مكتبك تستخدم نفس الـ Agent.

والسجلات تبقى **للأبد افتراضياً**، وأنت تدفع عليها. حدد مدة حفظ لكل مجموعة، من يوم إلى عشر سنوات.

و**Logs Insights** يبحث فيها بلغة استعلام بسيطة. هذا يجيب آخر الأخطاء:

```text
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

وعشان ترسل السجلات لمكان ثاني عندك طريقين:

| الطريق | التوقيت | يناسب |
| --- | --- | --- |
| **التصدير إلى S3** | شغل دفعات، ومو فوري | أرشفة طويلة ورخيصة |
| **Subscription Filter** | شبه فوري | الإرسال إلى Lambda أو Kinesis أو Firehose، مثل [OpenSearch](/posts/aws-23-athena-redshift-glue/) |

## إنذارات CloudWatch

رسم ما يطالعه أحد ما له فايدة. **الإنذار (Alarm)** يراقب مقياس ويسوي شي لما يتجاوز حد.

<figure class="diagram">
<svg viewBox="0 0 640 170" role="img" aria-labelledby="alarm-caption">
<defs>
<marker id="alarm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="480" y="54" width="140" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="80" text-anchor="middle" class="d-label">مقياس</text>
<text x="550" y="100" text-anchor="middle" class="d-small">المعالج والأخطاء</text>
<rect x="270" y="54" width="140" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="340" y="80" text-anchor="middle" class="d-label">إنذار</text>
<text x="340" y="100" text-anchor="middle" class="d-small">فوق 80%؟</text>
<rect x="20" y="12" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="39" text-anchor="middle" class="d-label">SNS</text>
<rect x="20" y="63" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="90" text-anchor="middle" class="d-label">Auto Scaling</text>
<rect x="20" y="114" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="141" text-anchor="middle" class="d-label">إجراء EC2</text>
<line x1="480" y1="85" x2="412" y2="85" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
<line x1="270" y1="85" x2="172" y2="34" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
<line x1="270" y1="85" x2="172" y2="85" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
<line x1="270" y1="85" x2="172" y2="136" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
</svg>
<figcaption id="alarm-caption">الإنذار يراقب مقياس، ولما يتجاوز الحد، ينبه أحد أو يزيد السعة أو يتصرف مع السيرفر.</figcaption>
</figure>

والإنذار يكون في وحدة من ثلاث حالات: `OK` أو `ALARM` أو `INSUFFICIENT_DATA`. وهذي إضافات مفيدة:

- **إجراءات EC2:** إيقاف أو إعادة تشغيل أو حذف أو **استعادة**. والاستعادة تنقل السيرفر لعتاد جديد لو تعطل المضيف، مع الحفاظ على عناوين IP والإعدادات.
- **الإنذارات المركبة:** إنذار واحد لـ "معالج مرتفع **و**أخطاء كثيرة"، وهذا يقلل التنبيهات الكاذبة.
- **الاختبار:** `set-alarm-state` يحط الإنذار في أي حالة، فتتأكد من مسار التنبيه بدون ما تكسر شي. وبنجربه في التجربة العملية.

### رؤى جاهزة

| الأداة | وش تبين |
| --- | --- |
| **Container Insights** | مقاييس وسجلات ECS وEKS |
| **Lambda Insights** | أداء الدوال، ومعها الذاكرة والبداية الباردة |
| **Contributor Insights** | أكبر المساهمين، مثل عناوين IP اللي ترسل أكثر طلبات |
| **Application Insights** | تجهز المراقبة لتطبيق كامل وتشير للمشاكل المحتملة |

## EventBridge: الرد على الأحداث

تقريباً كل شي يصير في AWS هو **حدث**: سيرفر تغيرت حالته، أو حاوية انشأت، أو إنذار انطلق. **EventBridge** يستقبل هذي الأحداث على **Bus**، و**القواعد** ترسل المطابق منها لهدف.

<figure class="diagram">
<svg viewBox="0 0 640 214" role="img" aria-labelledby="eventbridge-caption">
<defs>
<marker id="eventbridge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="480" y="14" width="140" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="44" text-anchor="middle" class="d-label">خدمات AWS</text>
<rect x="480" y="80" width="140" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="110" text-anchor="middle" class="d-label">تطبيقاتك</text>
<rect x="480" y="146" width="140" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="176" text-anchor="middle" class="d-label">جدول زمني</text>
<rect x="240" y="46" width="170" height="118" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="325" y="100" text-anchor="middle" class="d-label">Event Bus</text>
<text x="325" y="120" text-anchor="middle" class="d-small">القواعد تفلتر الأحداث</text>
<rect x="20" y="14" width="150" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="44" text-anchor="middle" class="d-label">Lambda</text>
<rect x="20" y="80" width="150" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="110" text-anchor="middle" class="d-label">SQS</text>
<rect x="20" y="146" width="150" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="176" text-anchor="middle" class="d-label">Step Functions</text>
<line x1="480" y1="39" x2="412" y2="80" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="480" y1="105" x2="412" y2="105" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="480" y1="171" x2="412" y2="130" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="240" y1="80" x2="172" y2="39" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="240" y1="105" x2="172" y2="105" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="240" y1="130" x2="172" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
</svg>
<figcaption id="eventbridge-caption">الأحداث توصل على Bus من أي مكان، والقواعد ترسل كل حدث مطابق للخدمة اللي تعالجه.</figcaption>
</figure>

| الاستخدام | مثال |
| --- | --- |
| **الرد على تغيير** | سيرفر وقف، فنبّه الفريق |
| **جدول زمني** | شغّل دالة كل ليلة، و**EventBridge Scheduler** هو الخدمة لهذا الحين |
| **ربط خدماتك** | خدمة الطلبات تنشر حدث، واللي يهمه ياخذه |
| **أحداث الشركاء** | أحداث من تطبيقات SaaS على Bus خاص بالشريك |

وميزات تستاهل تعرفها: **الأرشفة وإعادة الإرسال** للأحداث القديمة، و**Schema Registry** يوصف شكل الأحداث، و**سياسات الموارد** عشان حساب ثاني يرسل لـ Bus حقك.

ولأغلب الأهداف، مثل Lambda وSQS وSNS، الصلاحية تكون بسياسة مورد على الهدف. ولغيرها، مثل تشغيل مهمة ECS، يستخدم EventBridge دور IAM.

## CloudTrail: مين سوى وش

كل استدعاء لـ AWS، من الكونسول أو CLI أو خدمة، يسجله **CloudTrail**: مين، ووش، ومتى، ومن وين. وهو شغال افتراضياً، وأول مكان تطالعه لما شي يتغير بغموض أو يختفي.

| نوع الحدث | وش يغطي | الافتراضي |
| --- | --- | --- |
| **Management Events** | تغييرات الموارد، مثل إنشاء سيرفر أو تعديل سياسة | شغال، و90 يوم مجانية في Event History |
| **Data Events** | عمليات داخل الموارد، مثل القراءة من S3 أو استدعاء Lambda | مقفل بسبب كثرتها |
| **Insights Events** | نشاط غير معتاد، مثل موجة حذف مفاجئة | مقفل وبتكلفة إضافية |

وعشان تحفظها أكثر من 90 يوم، أنشئ **Trail** يكتب إلى S3، لكل المناطق وحتى المنظمة كلها، وحللها بـ [Athena](/posts/aws-23-athena-redshift-glue/). ولاحظ إن **CloudTrail Lake** أقفل على العملاء الجدد في 2026، فالـ Trail هو الطريق.

ونمط قوي يجمعه مع EventBridge: أي أحد يحذف جدول، أو دخول بحساب Root، يطلق تنبيه فوري. CloudTrail يسجله، وEventBridge يطابقه، وSNS يبلغك.

## AWS Config: إعداداتك مع الوقت

CloudTrail يقول لك مين استدعى وش. **Config** يقول لك شكل المورد: يسجل إعدادات مواردك وكل تغيير عليها، فتقدر تسأل كيف كان شكل Security Group الثلاثاء الماضي.

و**قواعد Config** تحكم على هذي الإعدادات:

- **القواعد:** جاهزة، مثل "ما فيه حاويات S3 عامة"، أو خاصة فيك.
- **المنع:** ما يمنع شي. يعلّم المورد إنه غير ملتزم، وبس.
- **المعالجة:** القاعدة تقدر تشغل مستند Systems Manager Automation يصلح المشكلة تلقائياً.
- **التنبيهات:** عبر EventBridge أو SNS.
- **النطاق والتكلفة:** يشتغل لكل منطقة، وتدفع لكل عنصر مسجل ولكل تقييم قاعدة.

## X-Ray: تتبع طلب واحد

الطلب في التطبيقات الحديثة ممكن يمر على API وثلاث دوال وقاعدة بيانات. المقاييس تقول إن فيه شي بطيء، و**AWS X-Ray** يقول وين. يجمع **Traces** لكل طلب وهو يمر على خدماتك، بما فيها اتصالاته بقواعد البيانات وواجهات API الثانية، ويوريك أي خطوة بطيئة أو تفشل.

## أدوات ثانية للمتابعة

| الأداة | وش تعرض |
| --- | --- |
| **AWS Health Dashboard** | هل عند AWS نفسها مشكلة تأثر على خدماتك ومواردك، بدون تجهيز وبدون تكلفة |
| **Managed Grafana** | لوحات للمقاييس والسجلات والتتبع من عدة مصادر، بأداة Grafana المعروفة |
| **Managed Service for Prometheus** | مقاييس الحاويات بأدوات Prometheus مفتوحة المصدر، بدون سيرفرات تشغلها |

## أيها ومتى؟

خلنا ناخذ موزع حمل واحد:

| | مثال |
| --- | --- |
| **CloudWatch** | عدد الطلبات وأخطاء 5xx، ولوحة أو إنذار عليها |
| **CloudTrail** | مين غيّر قواعد المستمع، ومتى |
| **Config** | Security Group والشهادة الحالية وكيف تغيرت، وهل يلتزم بقواعدك؟ |

## عملي: إنذار يرسل لك إيميل

بنراقب مقياس وهمي للطلبات الفاشلة. من CloudShell، بدّل الإيميل بإيميلك:

```bash
EMAIL=you@example.com

TOPIC_ARN=$(aws sns create-topic --name series-alerts \
  --query TopicArn --output text)

aws sns subscribe --topic-arn $TOPIC_ARN \
  --protocol email --notification-endpoint $EMAIL
```

افتح إيميلك واضغط **Confirm subscription**. ثم أنشئ إنذار ينطلق لو فشل أكثر من خمس طلبات في دقيقة:

```bash
aws cloudwatch put-metric-alarm --alarm-name series-failed-orders \
  --namespace Series/Shop --metric-name FailedOrders \
  --statistic Sum --period 60 --evaluation-periods 1 \
  --threshold 5 --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN
```

الحين أرسل قراءة التطبيق، كأن 12 طلب فشلت للتو:

```bash
aws cloudwatch put-metric-data --namespace Series/Shop \
  --metric-name FailedOrders --value 12
```

انتظر دقيقتين أو ثلاث وشيك على حالة الإنذار. والمفروض يوصلك إيميل بنفس الوقت:

```bash
aws cloudwatch describe-alarms --alarm-names series-failed-orders \
  --query "MetricAlarms[0].[StateValue,StateReason]" --output text
```

وما تحتاج تكسر شي عشان تختبر مسار التنبيه. جربه لما يرجع الإنذار إلى `OK`، ويوصلك إيميل ثاني:

```bash
aws cloudwatch set-alarm-state --alarm-name series-failed-orders \
  --state-value ALARM --state-reason "Testing the alert"
```

وأخيراً، سوّ نفسك محقق. مين أنشأ هذا الإنذار؟ CloudTrail يعرف، بس الأحداث ممكن تاخذ كم دقيقة عشان تظهر:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutMetricAlarm \
  --max-results 1 \
  --query "Events[0].[EventName,Username,EventTime]" --output text
```

::: security احذف بعد التجربة
هذا يبقى داخل المجاني أو يكلف شبه لا شي. والمقياس الخاص ينتهي لحاله:
:::

```bash
aws cloudwatch delete-alarms --alarm-names series-failed-orders
aws sns delete-topic --topic-arn $TOPIC_ARN
```

## الخلاصة

- **CloudWatch** للمقاييس والسجلات والإنذارات، والذاكرة تحتاج الـ Agent.
- حدد **مدة حفظ** لسجلاتك، لأنها تبقى للأبد افتراضياً.
- **EventBridge** يوجه الأحداث للي يعالجها، ويشغّل الأشياء بجدول زمني.
- **CloudTrail** يسجل مين سوى وش، و**Config** يسجل الإعدادات ويحكم عليها.
- اختبر **مسار التنبيه** قبل ما تحتاجه.

## اختبر نفسك

::: quiz
فريق يبي إنذار لما تتجاوز ذاكرة سيرفرات EC2 حقته 90%، بس ما يلقى مقياس للذاكرة في CloudWatch. وش يسوي؟

- [ ] تفعيل Detailed Monitoring
- [x] تثبيت CloudWatch Agent على السيرفرات
- [ ] إنشاء CloudTrail Trail
- [ ] تفعيل AWS Config

المقاييس الافتراضية تجي من خارج السيرفر، فما فيها الذاكرة. والـ Agent يرسلها من داخله، وبعدها تقدر تحط عليها إنذار.

- **A:** هذا يرسل نفس المقاييس بشكل أكثر، والذاكرة لسا مو منها.
- **C:** هذا يسجل مين نادى وش، مو كيف أداء السيرفر.
- **D:** هذا يسجل إعدادات الموارد، مو اللي يصير داخل السيرفر.

للمراجعة: [مقاييس CloudWatch](#مقاييس-cloudwatch) في هذا الجزء، و[Metrics collected by the CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html) في وثائق AWS.
:::

::: quiz
بدأ عطل بعد ما غيّر أحد مجموعة أمان البارحة بالليل. والفريق يبي يعرف مين سوى التغيير، ومن وين. وين يدور أول؟

- [ ] مقاييس CloudWatch
- [ ] VPC Flow Logs
- [ ] CloudWatch Logs Insights
- [x] CloudTrail Event history

CloudTrail يسجل مين نادى وش، ومتى، ومن وين. والأحداث الإدارية مثل هذا تبقى هناك 90 يوم، بدون أي تجهيز.

- **A:** هذي تعرض أرقام مع الوقت، مو مين سوى شي.
- **B:** هذي تعرض الزيارات المقبولة والمرفوضة، مو مين غيّر قاعدة.
- **C:** هذا يبحث في السجلات اللي ترسلها تطبيقاتك، مو الاستدعاءات إلى AWS.

للمراجعة: [CloudTrail: مين سوى وش](#cloudtrail-مين-سوى-وش) في هذا الجزء، و[Working with CloudTrail event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html) في وثائق AWS.
:::

::: quiz
شركة تبي تنتبه لما تصير أي حاوية S3 عامة، وتصلحها تلقائياً. وش يناسب؟

- [x] قاعدة Config، مع Remediation تلقائي
- [ ] إنذار CloudWatch على حجم الحاوية
- [ ] أحداث CloudTrail Insights
- [ ] استعلام Logs Insights

قاعدة Config تحكم على إعدادات كل حاوية وتعلّمها غير ملتزمة، والـ Remediation يقدر يشغّل مستند Systems Manager Automation يصلحها. والقاعدة لحالها ما تمنع شي.

- **B:** الحجم ما يقول شي عن مين يقدر يوصل للحاوية.
- **C:** هذا يكشف النشاط غير العادي، وما يحكم على الإعدادات ولا يصلحها.
- **D:** هذا يبحث في السجلات لما تطلب، وما يصلح شي.

للمراجعة: [AWS Config: إعداداتك مع الوقت](#aws-config-إعداداتك-مع-الوقت) في هذا الجزء، و[Remediating Noncompliant Resources with AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/remediation.html) في وثائق AWS.
:::

::: quiz
فريق الأمان يبي تنبيه فوري كل ما حذف أحد جدول DynamoDB أو دخل بالمستخدم الجذر. وش يناسب؟

- [ ] استعلام Athena أسبوعي على سجلات CloudTrail
- [ ] لوحة CloudWatch
- [x] قاعدة EventBridge تطابق أحداث CloudTrail هذي، وهدفها SNS
- [ ] قاعدة Config على كل جدول

CloudTrail يسجل الاستدعاء، وEventBridge يطابقه، وSNS يخبرك على طول.

- **A:** هذا يلقاها في النهاية، بس ممكن متأخر بأيام.
- **B:** اللوحة اللي ما يطالعها أحد ما تنبه أحد.
- **D:** هذا يحكم على الإعدادات، وما يتفاعل مع حذف جدول أو تسجيل دخول.

للمراجعة: [CloudTrail: مين سوى وش](#cloudtrail-مين-سوى-وش) في هذا الجزء، و[AWS service events delivered via AWS CloudTrail](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html) في وثائق AWS.
:::

::: quiz
فاتورة CloudWatch Logs عند فريق تكبر لأن السجلات القديمة ما تنحذف أبداً، ونظام ثاني لازم يستلم سطور الأخطاء خلال ثواني. أي **تغييرين** يناسبون؟ (اختر اثنين.)

- [x] تحديد مدة احتفاظ على الـ Log Groups
- [ ] تصدير السجلات إلى S3 كل ليلة
- [ ] تفعيل Detailed Monitoring
- [x] إضافة Subscription Filter يرسل سطور الأخطاء إلى Lambda
- [ ] تفعيل CloudTrail Data Events

السجلات تبقى للأبد افتراضياً، فمدة الاحتفاظ تشيل القديمة. والـ Subscription Filter يوصّل السطور المطابقة شبه فوري.

- **B:** هذا شغل دفعي مو فوري، والأصول تبقى وتستمر تكلف.
- **C:** هذا يرسل مقاييس EC2 بشكل أكثر، وما له علاقة بالسجلات.
- **E:** هذا يسجل العمليات داخل الموارد، وما له علاقة بفاتورة سجلاتك ولا سطور الأخطاء.

للمراجعة: [سجلات CloudWatch](#سجلات-cloudwatch) في هذا الجزء، و[Working with log groups and log streams](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html) و[Real-time processing of log data with subscriptions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Subscriptions.html) في وثائق AWS.
:::

الحين تعرف وش يصير في حساب واحد. بس الشركات عندها عشرات الحسابات ومئات الموظفين. في [**الجزء السادس والعشرين**](/posts/aws-26-organizations-identity-center/) نديرهم بـ Organizations وIdentity Center.
