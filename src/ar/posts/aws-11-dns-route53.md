---
title: "DNS وRoute 53: عنوان موقعك"
description: كيف يتحول اسم مثل example.com إلى عنوان، ووش تعني أنواع السجلات، والفرق بين CNAME وAlias، وسياسات التوجيه وفحوصات الصحة في Route 53، مع تجربة عملية بدون ما تشتري نطاق.
date: 2026-11-02
series: aws
part: 11
numbered: true
tags: [aws, networking]
---

موزّع الحمل في تطبيقنا من [الجزء السابع](/posts/aws-07-auto-scaling/) اسمه شي زي `web-alb-1234567890.eu-central-1.elb.amazonaws.com`. ما أحد بيكتب هذا. الزائر يبي `shop.example.com`، واللي يربط بينهم هو **DNS**.

هذا القسم عن طريق الزائر لتطبيقك: الاسم في هذا الجزء، والسرعة في الجزء الجاي، ثم الشبكة الخاصة اللي يعيش فيها كل شي.

## كيف يشتغل DNS؟

DNS دليل هاتف الإنترنت: تسأله باسم، ويجاوبك بعنوان. وما فيه سيرفر واحد يعرف كل شي، فالجواب يجي عبر سلسلة:

<figure class="diagram">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="dns-caption">
<defs>
<marker id="dns-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="500" y="110" width="120" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="560" y="150" text-anchor="middle" class="d-label">المتصفح</text>
<rect x="290" y="110" width="130" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="355" y="140" text-anchor="middle" class="d-label">Resolver</text>
<text x="355" y="162" text-anchor="middle" class="d-small">يسأل بدالك</text>
<rect x="20" y="14" width="170" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="105" y="40" text-anchor="middle" class="d-label">السيرفرات الجذرية</text>
<text x="105" y="62" text-anchor="middle" class="d-small">روح اسأل &#x200E;.com</text>
<rect x="20" y="116" width="170" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="105" y="142" text-anchor="middle" class="d-label">سيرفرات &#x200E;.com</text>
<text x="105" y="164" text-anchor="middle" class="d-small">روح اسأل Route 53</text>
<rect x="20" y="218" width="170" height="62" rx="10" fill="var(--color-sunken)" stroke="var(--color-accent)"/>
<text x="105" y="244" text-anchor="middle" class="d-label">Route 53</text>
<text x="105" y="266" text-anchor="middle" class="d-small">العنوان 192.0.2.10</text>
<line x1="500" y1="145" x2="422" y2="145" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="461" y="135" text-anchor="middle" class="d-label">1</text>
<text x="461" y="168" text-anchor="middle" class="d-label">5</text>
<line x1="290" y1="130" x2="192" y2="45" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="254" y="76" text-anchor="middle" class="d-label">2</text>
<line x1="290" y1="145" x2="192" y2="147" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="241" y="136" text-anchor="middle" class="d-label">3</text>
<line x1="290" y1="160" x2="192" y2="249" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="254" y="222" text-anchor="middle" class="d-label">4</text>
</svg>
<figcaption id="dns-caption">الـ Resolver يمر على السيرفرات الجذرية ثم سيرفرات &#x200E;.com ثم سيرفرات أسماء النطاق، ويرجع بالعنوان للمتصفح.</figcaption>
</figure>

1. متصفحك يسأل الـ **Resolver**، وهو عادةً من شركة الإنترنت أو خدمة عامة مثل `1.1.1.1`.
2. الـ Resolver يسأل **السيرفرات الجذرية**، وهي توجّهه لسيرفرات `.com`.
3. سيرفرات `.com` توجّهه لسيرفرات أسماء النطاق.
4. **سيرفرات أسماء النطاق** تعطيه الجواب النهائي.
5. الـ Resolver يرجّع العنوان للمتصفح، ويحتفظ به لمدة **TTL**، فاللي يسأل بعدك يلقى الجواب فوراً.

وهذي المصطلحات اللي بتمر عليك:

| المصطلح | معناه |
| --- | --- |
| **Domain** | `example.com`: الاسم اللي تملكه |
| **Subdomain** | `blog.example.com`: اسم تحته |
| **Registrar** | الشركة اللي تشتري منها الاسم |
| **Hosted Zone** | الحاوية اللي فيها سجلات النطاق |
| **Record** | سجل واحد: اسم يشير لقيمة |
| **TTL** | كم يقدر الـ Resolver يتذكر الجواب |

## Route 53

**Route 53** خدمة DNS من AWS، واسمها من منفذ DNS رقم 53. وعندها ثلاث مهام: تحفظ سجلات نطاقك وتجاوب عنها، وتسجّل النطاقات، وتراقب صحة تطبيقك وتوجّه الزوار على أساسها. وAWS تلتزم فيها بتوفر 100%.

### Hosted Zones

| النوع | يجاوب مين | مثال |
| --- | --- | --- |
| **عامة** | أي أحد على الإنترنت | `example.com` |
| **خاصة** | داخل شبكات VPC تحددها فقط | `db.series.internal` |

كل واحدة تكلف حوالي نص دولار في الشهر، مع مبلغ بسيط على الاستعلامات.

### أنواع السجلات

| النوع | يشير إلى | مثال |
| --- | --- | --- |
| **A** | عنوان IPv4 | `blog.example.com` إلى `192.0.2.10` |
| **AAAA** | عنوان IPv6 | `blog.example.com` إلى `2001:db8::10` |
| **CNAME** | اسم ثاني | `www.example.com` إلى `example.com` |
| **NS** | سيرفرات أسماء النطاق | `ns-1.awsdns-01.org` |
| **MX** | سيرفرات البريد | `mail.example.com` |
| **TXT** | نص حر، مثل إثبات ملكية النطاق | `v=spf1 ...` |

### CNAME أو Alias؟

عندك مشكلة شائعة: CNAME ما ينفع على النطاق الأساسي `example.com`، وأنت تبيه يشير لموزّع الحمل. الحل هو **Alias**، وهو نوع خاص في Route 53:

| | CNAME | Alias |
| --- | --- | --- |
| **يشير إلى** | أي اسم | موارد AWS مثل ALB وCloudFront وAPI Gateway |
| **النطاق الأساسي** | ما ينفع | ينفع |
| **الاستعلامات** | مدفوعة | مجانية لموارد AWS |
| **TTL** | تحدده أنت | تحدده Route 53 |
| **صحة الهدف** | ما يتابعها | يقدر يتابعها |

القاعدة بسيطة: لو الهدف على AWS، استخدم Alias. ولاحظ إنه ما يشير لاسم DNS حق سيرفر EC2.

### اختيار TTL

- **مدة طويلة:** استعلامات أقل وتكلفة أقل، بس أي تغيير ياخذ وقت عشان ينتشر.
- **مدة قصيرة:** التغيير ينتشر بسرعة، بس الاستعلامات تزيد.

::: tip قبل أي نقل
لو بتنقل موقعك لسيرفر ثاني، قلّل TTL إلى 60 ثانية قبلها بيوم. سوّ النقل، وتأكد إن كل شي تمام، ثم ارجع زوّدها.
:::

## سياسات التوجيه

"التوجيه" هنا ما يعني إن الزيارات تمر عبر Route 53. هي تختار وش الجواب اللي تعطيه فقط، وبعدها يتصل الزائر مباشرة بالعنوان.

| السياسة | كيف تجاوب | استخدام شائع |
| --- | --- | --- |
| **Simple** | سجل واحد، وممكن فيه أكثر من قيمة | سيرفر واحد |
| **Weighted** | بنسب تحددها | تجربة نسخة جديدة على 10% من الزوار |
| **Latency** | الـ Region الأقل تأخير للزائر | تطبيق في أكثر من Region |
| **Failover** | الأساسي طالما سليم، وإلا الاحتياطي | التعافي من الكوارث |
| **Geolocation** | حسب دولة الزائر أو قارته | لغة أو محتوى حسب البلد |
| **Geoproximity** | حسب المسافة، مع تكبير أو تصغير نطاق كل موقع | نقل الزيارات تدريجياً بين المناطق |
| **IP-based** | حسب نطاق IP الزائر | شبكات معروفة عندك |
| **Multivalue** | لين 8 سجلات سليمة | توزيع بسيط، وما يغني عن موزّع الحمل |

::: note الأقرب مو دايماً الأسرع
**Geolocation** يختار حسب مكان الزائر، حتى لو فيه موقع أسرع له، فهو يناسب القوانين واللغة. لو هدفك السرعة، اختر **Latency**.
:::

## فحوصات الصحة

عشان Failover وغيرها تشتغل، لازم Route 53 تعرف مين سليم:

| النوع | كيف يفحص |
| --- | --- |
| **Endpoint** | أجهزة فحص حول العالم تطلب عنوانك عبر HTTP أو HTTPS أو TCP |
| **Calculated** | يجمع نتائج عدة فحوصات في نتيجة وحدة |
| **CloudWatch Alarm** | يعتمد على إنذار، وهذا الحل للموارد الخاصة |

وأجهزة الفحص من الإنترنت، فما توصل لسيرفر في شبكة خاصة، ولازم مجموعة الأمان تسمح لنطاقاتها لو تفحص هدف عام.

## نطاق مشترى من مكان ثاني

شراء النطاق وإدارة سجلاته شيئين منفصلين. لو اشتريت نطاقك من شركة ثانية وتبي Route 53 تجاوب عنه:

1. أنشئ **Hosted Zone** عامة باسم النطاق.
2. انسخ سيرفرات الأسماء الأربعة من سجل **NS** فيها.
3. الصقها في إعدادات النطاق عند الشركة اللي اشتريت منها.

بعد ما ينتشر التغيير، Route 53 تصير هي اللي تجاوب.

ولو عندك شبكة في مكتبك، تقدر تربط DNS حقها مع AWS عبر **Resolver Endpoints**: الداخلي (Inbound) يخلي شبكتك تسأل عن أسماء AWS الخاصة، والخارجي (Outbound) يخلي AWS تسأل عن أسماء شبكتك. وهذا يحتاج اتصال بين الشبكتين، وهو موضوع [الجزء الرابع عشر](/posts/aws-14-vpc-connectivity/).

## عملي: توجيه بالنسب بدون شراء نطاق

الـ Hosted Zone الخاصة تخليك تجرب كل هذا بدون نطاق حقيقي. وبنستخدم سيرفرك `web-1` من [الجزء الثالث](/posts/aws-03-ec2-first-server/) داخل الشبكة الافتراضية. من CloudShell، أنشئ النطاق الخاص:

```bash
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)

ZONE_ID=$(aws route53 create-hosted-zone --name series.internal \
  --caller-reference "demo-$(date +%s)" \
  --vpc VPCRegion=$AWS_REGION,VPCId=$VPC_ID \
  --query HostedZone.Id --output text)
```

الحين أضف سجلين لنفس الاسم، 80% للنسخة القديمة و20% للجديدة. والعناوين هنا وهمية، لأن DNS يجاوب فقط وما يتصل بها:

```bash
CHANGES='{"Changes":[
  {"Action":"CREATE","ResourceRecordSet":{"Name":"app.series.internal","Type":"A","TTL":5,
    "SetIdentifier":"old","Weight":80,"ResourceRecords":[{"Value":"10.0.0.80"}]}},
  {"Action":"CREATE","ResourceRecordSet":{"Name":"app.series.internal","Type":"A","TTL":5,
    "SetIdentifier":"new","Weight":20,"ResourceRecords":[{"Value":"10.0.0.20"}]}}
]}'

aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" --change-batch "$CHANGES"
```

ادخل على السيرفر من EC2 Instance Connect، وأرسل 20 سؤال. والتجربة تاخذ دقيقتين لأننا ننتظر انتهاء TTL في كل مرة:

```bash
sudo dnf install -y bind-utils

for i in $(seq 1 20); do
  dig +short app.series.internal
  sleep 6
done | sort | uniq -c
```

بتشوف توزيع قريب من 16 مقابل 4. جرّب كمان `dig +trace aws.amazon.com`، وبتشوف السلسلة اللي في الرسم خطوة بخطوة.

ولو عندك نطاق، أضف سجل **A** من نوع **Alias** يشير لموزّع الحمل، وصار موقعك باسمك.

::: security احذف بعد التجربة
الـ Hosted Zone اللي تنحذف خلال 12 ساعة من إنشائها ما تنحسب. لازم تحذف السجلات أولاً، ثم النطاق:
:::

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" --change-batch "${CHANGES//CREATE/DELETE}"

aws route53 delete-hosted-zone --id "$ZONE_ID"
```

## الخلاصة

- **DNS** يحول الاسم لعنوان عبر سلسلة، والجواب ينحفظ لمدة **TTL**.
- **Route 53** تحفظ سجلاتك، وHosted Zone ممكن تكون عامة أو خاصة.
- لو الهدف على AWS استخدم **Alias**، وهو ينفع على النطاق الأساسي.
- **سياسات التوجيه** تختار الجواب فقط، والزيارات ما تمر عبرها.
- **فحوصات الصحة** هي اللي تخلي Failover يشتغل.

الحين موقعك له اسم، بس سيرفره لسا في مكان واحد، والزائر البعيد ينتظر. في [**الجزء الثاني عشر**](/posts/aws-12-cloudfront-global-accelerator/) نقرّبه منه مع CloudFront وGlobal Accelerator.
