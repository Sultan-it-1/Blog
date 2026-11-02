---
title: "VPC: ربط الشبكات ببعض"
description: كيف تربط شبكات VPC ببعض عبر Peering وTransit Gateway، وتوصل لخدمات AWS بشكل خاص عبر Endpoints، وتربط مكتبك بـ VPN أو Direct Connect، وتتحكم في تكلفة الشبكة، مع تجربة عملية لأكثر اتصالين فايدة.
date: 2026-11-02
series: aws
part: 14
numbered: true
tags: [aws, networking, vpn]
---

في [الجزء الثالث عشر](/posts/aws-13-vpc/) بنينا شبكة معزولة. بس التطبيقات الحقيقية نادراً تبقى لحالها: عندك VPC ثانية لفريق ثاني، وسيرفرات تحتاج S3، ومكتب يحتاج يوصل لقاعدة البيانات.

هذي خريطة الجزء، وارجع لها لما تحتار:

| تبي | استخدم |
| --- | --- |
| شبكتين VPC يتكلمون | **VPC Peering** |
| شبكة خاصة توصل لـ S3 أو DynamoDB بدون NAT | **Gateway Endpoint** |
| توصل لخدمات AWS ثانية أو خدمة شريك بشكل خاص | **Interface Endpoint** |
| مكتبك يوصل لـ AWS بسرعة عبر الإنترنت | **Site-to-Site VPN** |
| أجهزة الموظفين توصل للشبكة | **Client VPN** |
| خط ثابت وكبير بين مكتبك وAWS | **Direct Connect** |
| شبكات ومكاتب كثيرة | **Transit Gateway** |

## VPC Peering

**Peering** يربط شبكتين VPC مباشرة، فكأنهم شبكة وحدة. وتربط حتى بين حسابات مختلفة أو Regions مختلفة. وقواعده:

- **النطاقات ما تتداخل.** هذا اللي نبهناك له في الجزء السابق.
- **ما ينتقل.** لو A مربوطة بـ B، وB مربوطة بـ C، فـ A ما توصل لـ C.
- **تحتاج طريق في الجهتين.** تضيفه في جدول توجيه كل شبكة.

وما له رسم بالساعة، وتدفع فقط على نقل البيانات.

## VPC Endpoints: خدمات AWS بدون إنترنت

افتراضياً، طلب سيرفرك الخاص لخدمة S3 يطلع عبر NAT، وتدفع على كل جيجابايت، مع إن الوجهة داخل AWS أصلاً. **Endpoints** تعطيك طريق خاص ومباشر:

<figure class="diagram">
<svg viewBox="0 0 640 210" role="img" aria-labelledby="endpoint-caption">
<defs>
<marker id="endpoint-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="470" y="60" width="150" height="90" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="100" text-anchor="middle" class="d-label">سيرفر خاص</text>
<text x="545" y="122" text-anchor="middle" class="d-small">في شبكة خاصة</text>
<rect x="20" y="60" width="150" height="90" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="110" text-anchor="middle" class="d-label">S3</text>
<rect x="245" y="10" width="150" height="52" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="320" y="32" text-anchor="middle" class="d-label">NAT ثم الإنترنت</text>
<text x="320" y="52" text-anchor="middle" class="d-small">مدفوع لكل جيجابايت</text>
<rect x="245" y="148" width="150" height="52" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="170" text-anchor="middle" class="d-label">Gateway Endpoint</text>
<text x="320" y="190" text-anchor="middle" class="d-small">مجاني</text>
<line x1="470" y1="85" x2="397" y2="40" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="245" y1="40" x2="170" y2="85" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="470" y1="125" x2="397" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#endpoint-arrow)"/>
<line x1="245" y1="170" x2="172" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#endpoint-arrow)"/>
</svg>
<figcaption id="endpoint-caption">بدل الطريق المدفوع عبر NAT، يوصل السيرفر الخاص إلى S3 عبر Gateway Endpoint المجاني، بدون ما يطلع للإنترنت.</figcaption>
</figure>

| | Gateway Endpoint | Interface Endpoint |
| --- | --- | --- |
| **الخدمات** | S3 وDynamoDB فقط | أغلب خدمات AWS، وخدمات شركاء |
| **كيف يشتغل** | طريق في جدول التوجيه | واجهة شبكة بعنوان خاص في شبكتك |
| **التكلفة** | مجاني | بالساعة لكل منطقة، ولكل جيجابايت |
| **من مكتبك** | ما يوصل | يوصل عبر VPN أو Direct Connect |

::: tip أسهل توفير في الفاتورة
فعّل Gateway Endpoint لـ S3 في كل VPC. مجاني، ويشيل زيارات S3 من حساب NAT.
:::

و**Interface Endpoint** مبني على **PrivateLink**، وهو يخليك كمان تقدم خدمتك لشبكات ثانية عبر NLB، بدون Peering وحتى لو نطاقاتهم متداخلة.

## ربط مكتبك: Site-to-Site VPN

**Site-to-Site VPN** يربط شبكة مكتبك بالـ VPC عبر الإنترنت بنفق مشفّر، وتجهزه في وقت قصير. وله ثلاث قطع:

1. **Customer Gateway:** يمثل جهازك في المكتب وعنوانه العام.
2. **Virtual Private Gateway:** بوابة VPN من جهة AWS، تركّبها على الـ VPC.
3. **VPN Connection:** الاتصال نفسه، ويجي بنفقين عشان التوفر.

وبعدها فعّل **Route Propagation** في جدول التوجيه عشان تعرف الـ VPC طرق المكتب. وكل نفق يعطيك لين 1.25 جيجابت، ولين 5 مع Transit Gateway.

- **VPN CloudHub:** يربط عدة مكاتب ببعض عبر نفس البوابة.
- **Client VPN:** لأجهزة الموظفين بدل المكاتب.

وإذا تبي VPN تتحكم فيه بالكامل على سيرفرك، شوف مقال [WireGuard](/posts/wireguard/).

## Direct Connect: خط خاص

**Direct Connect** خط فعلي خاص بين مكانك وAWS عبر موقع Direct Connect، فما يمر بالإنترنت العام. فسرعته ثابتة، ونقل البيانات الخارجة أرخص.

- **Dedicated:** منفذ خاص فيك من 1 إلى 400 جيجابت.
- **Hosted:** عن طريق شريك، بسرعات تبدأ أقل بكثير.
- **Direct Connect Gateway:** يوصلك بشبكات VPC في عدة Regions.

انتبه لثلاث نقاط: **التجهيز ياخذ أسابيع** وأحياناً أشهر، و**الخط مو مشفّر تلقائياً**، فاستخدم MACsec أو VPN فوقه، و**الخط الواحد نقطة فشل واحدة**، فلأهم الأنظمة خل خطين في موقعين، أو VPN احتياطي.

| | Site-to-Site VPN | Direct Connect |
| --- | --- | --- |
| **الطريق** | الإنترنت، مشفّر | خط خاص |
| **التجهيز** | دقايق أو ساعات | أسابيع أو أشهر |
| **السرعة** | 1.25 جيجابت للنفق، و5 مع Transit Gateway | من 1 إلى 400 جيجابت |
| **الأداء** | يتغير مع الإنترنت | ثابت |
| **التكلفة** | قليلة | أعلى في البداية، وأرخص لنقل كبير |

## Transit Gateway: محور واحد

لما تكثر الشبكات، يصير Peering متعب، لأنه ما ينتقل، فتحتاج وصلة لكل زوج:

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="tgw-caption">
<text x="480" y="28" text-anchor="middle" class="d-label">Peering: عشر وصلات</text>
<g stroke="var(--color-line-strong)" stroke-width="2">
<line x1="480" y1="65" x2="561" y2="124"/>
<line x1="480" y1="65" x2="530" y2="219"/>
<line x1="480" y1="65" x2="430" y2="219"/>
<line x1="480" y1="65" x2="399" y2="124"/>
<line x1="561" y1="124" x2="530" y2="219"/>
<line x1="561" y1="124" x2="430" y2="219"/>
<line x1="561" y1="124" x2="399" y2="124"/>
<line x1="530" y1="219" x2="430" y2="219"/>
<line x1="530" y1="219" x2="399" y2="124"/>
<line x1="430" y1="219" x2="399" y2="124"/>
</g>
<rect x="454" y="50" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="480" y="70" text-anchor="middle" class="d-small">VPC</text>
<rect x="535" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="561" y="129" text-anchor="middle" class="d-small">VPC</text>
<rect x="504" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="530" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="404" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="430" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="373" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="399" y="129" text-anchor="middle" class="d-small">VPC</text>
<text x="160" y="28" text-anchor="middle" class="d-label">Transit Gateway: خمس وصلات</text>
<g stroke="var(--color-accent)" stroke-width="2">
<line x1="160" y1="150" x2="160" y2="65"/>
<line x1="160" y1="150" x2="241" y2="124"/>
<line x1="160" y1="150" x2="210" y2="219"/>
<line x1="160" y1="150" x2="110" y2="219"/>
<line x1="160" y1="150" x2="79" y2="124"/>
</g>
<rect x="134" y="50" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="160" y="70" text-anchor="middle" class="d-small">VPC</text>
<rect x="215" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="241" y="129" text-anchor="middle" class="d-small">VPC</text>
<rect x="184" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="210" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="84" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="110" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="53" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="79" y="129" text-anchor="middle" class="d-small">VPC</text>
<rect x="112" y="130" width="96" height="40" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="160" y="155" text-anchor="middle" class="d-label">Transit GW</text>
</svg>
<figcaption id="tgw-caption">خمس شبكات تحتاج عشر وصلات Peering، أو خمس وصلات فقط لمحور Transit Gateway واحد.</figcaption>
</figure>

**Transit Gateway** محور مركزي تربط فيه الشبكات، وكل وحدة توصل لغيرها عبره:

- **يربط كل شي:** شبكات VPC، واتصالات VPN، وDirect Connect، وTransit Gateway في Regions ثانية.
- **جداول توجيه خاصة فيه:** تحدد مين يكلم مين، مثلاً تفصل الإنتاج عن التطوير.
- **بين الحسابات:** تشاركه مع حسابات ثانية عبر خدمة RAM.
- **سرعة VPN أعلى:** توزّع الزيارات على عدة أنفاق.

وتدفع بالساعة على كل وصلة، وعلى البيانات. فلشبكتين أو ثلاث، Peering أبسط وأرخص.

## تكلفة الشبكة

نقل البيانات أكثر بند يفاجئ الناس. وهذي أسعار تقريبية في مناطق أمريكا، فراجع منطقتك:

| الزيارات | التكلفة لكل جيجابايت |
| --- | --- |
| **داخل لـ AWS** | مجاني |
| **داخل نفس منطقة التوفر بعنوان خاص** | مجاني |
| **بين مناطق التوفر** | حوالي 0.01 دولار في كل اتجاه |
| **بين Regions** | حوالي 0.02 دولار |
| **خارج للإنترنت** | حوالي 0.09 دولار، ويقل مع الحجم |
| **عبر NAT Gateway** | حوالي 0.045 دولار زيادة |
| **S3 عبر Gateway Endpoint** | مجاني |

وكيف توفر:

- استخدم **العناوين الخاصة** بين السيرفرات، لا العامة.
- خل الخدمات اللي تتكلم كثير في **نفس منطقة التوفر**، لو يسمح تصميم التوفر عندك.
- فعّل **Gateway Endpoint** لـ S3.
- قدّم المحتوى عبر **CloudFront**، لأن النقل من مصدرك إليه مجاني.

## طبقات الحماية

| الطبقة | الخدمة | تحمي من |
| --- | --- | --- |
| **الشبكة الفرعية** | NACL | عناوين تبي تمنعها |
| **السيرفر** | مجموعة الأمان | أي منفذ ومصدر ما سمحت له |
| **تطبيق الويب** | WAF | هجمات الويب مثل SQL Injection |
| **الهجمات الكبيرة** | Shield | DDoS |
| **الـ VPC كلها** | Network Firewall | فحص الزيارات والنطاقات عند الحدود |

وعن **IPv6**: تقدر تضيفه للـ VPC، بس كل عناوينه عامة. فلو تبي السيرفرات تطلع بدون دخول، استخدم **Egress-only Internet Gateway**، وهو مثل NAT لـ IPv6.

## عملي: Endpoint وPeering

بنكمل على شبكة [الجزء الثالث عشر](/posts/aws-13-vpc/)، بعد حذف NAT Gateway. فـ `private-server` ما عنده طريق للإنترنت. والأوامر تستخدم المتغيرات `VPC` و`RT_PRIVATE`، ولو انتهت جلسة CloudShell حددها بيدك من صفحة VPC.

### Gateway Endpoint

أعطِ `private-server` دور IAM فيه `AmazonS3ReadOnlyAccess`، مثل ما شرحنا في [الجزء الثاني](/posts/aws-02-iam/). وعلى السيرفر جرّب:

```bash
aws s3 ls --cli-connect-timeout 5
```

ينتهي الوقت بعد عدة محاولات، لأن ما فيه طريق لـ S3. الحين من CloudShell أضف Endpoint:

```bash
aws ec2 create-vpc-endpoint --vpc-id $VPC \
  --service-name com.amazonaws.$AWS_REGION.s3 \
  --route-table-ids $RT_PRIVATE

aws ec2 describe-route-tables --route-table-ids $RT_PRIVATE \
  --query "RouteTables[0].Routes[].[DestinationCidrBlock,DestinationPrefixListId,GatewayId]" \
  --output table
```

بتشوف طريق جديد يبدأ بـ `pl-` ويشير لـ `vpce-`. وأعد أمر `aws s3 ls` على السيرفر، وبيرجع فوراً بقائمة الحاويات، أو فاضي لو ما عندك حاويات، بدون أي إنترنت.

### VPC Peering

الحين نربط هذي الشبكة بالافتراضية، اللي فيها `web-1` من [الجزء الثالث](/posts/aws-03-ec2-first-server/). هات عنوانه الخاص:

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=web-1" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PrivateIpAddress" --output text
```

من `private-server` جرّب `curl -m 5 http://WEB-PRIVATE-IP`، وبينتهي الوقت. الحين أنشئ الربط واقبله:

```bash
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)

PEER=$(aws ec2 create-vpc-peering-connection \
  --vpc-id $VPC --peer-vpc-id $DEFAULT_VPC \
  --query VpcPeeringConnection.VpcPeeringConnectionId --output text)

aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id $PEER
```

الربط وحده ما يكفي، فأضف الطريق في الجهتين:

```bash
aws ec2 create-route --route-table-id $RT_PRIVATE \
  --destination-cidr-block 172.31.0.0/16 --vpc-peering-connection-id $PEER

DEFAULT_RT=$(aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=$DEFAULT_VPC Name=association.main,Values=true \
  --query "RouteTables[0].RouteTableId" --output text)

aws ec2 create-route --route-table-id $DEFAULT_RT \
  --destination-cidr-block 10.0.0.0/16 --vpc-peering-connection-id $PEER
```

أعد `curl` من `private-server`، وبترجع صفحة `web-1` عبر العنوان الخاص.

::: security احذف بعد التجربة
احذف طريق الشبكة الافتراضية والربط بالأوامر تحت. ثم من صفحاتها احذف السيرفرين ونقطة الدخول والدور، وبعدها حدد `series-vpc` واختر **Actions** ثم **Delete VPC**.
:::

```bash
aws ec2 delete-route --route-table-id $DEFAULT_RT \
  --destination-cidr-block 10.0.0.0/16

aws ec2 delete-vpc-peering-connection --vpc-peering-connection-id $PEER
```

## الخلاصة

- **Peering** لشبكتين، وما ينتقل، و**Transit Gateway** لما تكثر الشبكات.
- **Gateway Endpoint** مجاني لـ S3 وDynamoDB، و**Interface Endpoint** لباقي الخدمات.
- **VPN** سريع التجهيز عبر الإنترنت، و**Direct Connect** خط خاص ياخذ وقت.
- **نقل البيانات** من أكبر المفاجآت في الفاتورة، فخطط له من البداية.

بهذا نكمل قسم الشبكات. الآن تعرف طريق الزائر من اسم موقعك لين بياناته، وبقي لنا مكان يتخزن فيه أي شي بأي حجم. هذا موضوع القسم الجاي، ونبدأه في [**الجزء الخامس عشر**](/posts/aws-15-s3-basics/) مع أساسيات S3.
