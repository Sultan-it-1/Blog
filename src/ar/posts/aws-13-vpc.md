---
title: "VPC: شبكتك الخاصة"
description: افتح الشبكة اللي كانت سيرفراتك تشتغل فيها، وافهم نطاقات العناوين والشبكات الفرعية وبوابات الإنترنت وNAT وجداول التوجيه والوصول الآمن وجداري الحماية وسجلات الزيارات، ثم ابنِ VPC من الصفر.
date: 2026-11-02
series: aws
part: 13
numbered: true
tags: [aws, networking]
---

كل سيرفر شغّلناه في هذي السلسلة كان داخل شبكة ما بنيتها: الـ VPC الافتراضية اللي تنشئها AWS في كل Region. وهي تكفي للتجارب، بس التطبيق الحقيقي يحتاج تصميم تكون فيه قاعدة البيانات مخفية، ولكل طبقة مكانها.

## وش هي VPC؟

**VPC** (Virtual Private Cloud) شبكتك الخاصة داخل Region واحدة. تمتد على كل مناطق التوفر فيها، وما يدخلها أو يطلع منها شي إلا اللي تسمح له. هذا التصميم الشائع:

<figure class="diagram">
<svg viewBox="0 0 640 356" role="img" aria-labelledby="vpc-caption">
<defs>
<marker id="vpc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="14" y="28" width="612" height="320" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="530" y="54" text-anchor="middle" class="d-code">VPC 10.0.0.0/16</text>
<rect x="330" y="66" width="280" height="268" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="470" y="86" text-anchor="middle" class="d-small">منطقة توفر A</text>
<rect x="344" y="96" width="252" height="88" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="523" y="130" text-anchor="middle" class="d-label">شبكة عامة</text>
<text x="523" y="152" text-anchor="middle" class="d-code">10.0.1.0/24</text>
<rect x="354" y="116" width="96" height="48" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="402" y="145" text-anchor="middle" class="d-label">NAT</text>
<rect x="344" y="214" width="252" height="104" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="523" y="258" text-anchor="middle" class="d-label">شبكة خاصة</text>
<text x="523" y="280" text-anchor="middle" class="d-code">10.0.11.0/24</text>
<rect x="354" y="240" width="96" height="52" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="402" y="271" text-anchor="middle" class="d-label">سيرفرات</text>
<rect x="30" y="66" width="280" height="268" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="170" y="86" text-anchor="middle" class="d-small">منطقة توفر B</text>
<rect x="44" y="96" width="252" height="88" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="117" y="130" text-anchor="middle" class="d-label">شبكة عامة</text>
<text x="117" y="152" text-anchor="middle" class="d-code">10.0.2.0/24</text>
<rect x="190" y="116" width="96" height="48" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="238" y="145" text-anchor="middle" class="d-label">NAT</text>
<rect x="44" y="214" width="252" height="104" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="117" y="258" text-anchor="middle" class="d-label">شبكة خاصة</text>
<text x="117" y="280" text-anchor="middle" class="d-code">10.0.12.0/24</text>
<rect x="190" y="240" width="96" height="52" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="238" y="271" text-anchor="middle" class="d-label">سيرفرات</text>
<line x1="402" y1="240" x2="402" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<line x1="238" y1="240" x2="238" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<line x1="402" y1="116" x2="402" y2="46" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<line x1="238" y1="116" x2="238" y2="46" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<rect x="210" y="6" width="220" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-accent)"/>
<text x="320" y="30" text-anchor="middle" class="d-label">بوابة الإنترنت</text>
</svg>
<figcaption id="vpc-caption">السيرفرات في شبكات خاصة، وتطلع للإنترنت عبر NAT في الشبكة العامة ثم بوابة الإنترنت، وما أحد يبدأ اتصال بها من الخارج.</figcaption>
</figure>

## نطاقات العناوين: كيف تقرأ CIDR

تكتب نطاق العناوين بصيغة **CIDR**، مثل `10.0.0.0/16`. والرقم بعد الشرطة يقول كم بت ثابت من أصل 32، فكل ما صغر الرقم كبر النطاق:

| CIDR | عدد العناوين | استخدام شائع |
| --- | --- | --- |
| `/32` | 1 | عنوان واحد |
| `/28` | 16 | أصغر VPC أو شبكة فرعية |
| `/24` | 256 | شبكة فرعية |
| `/16` | 65,536 | أكبر VPC |
| `/0` | كل العناوين | `0.0.0.0/0` يعني أي مكان |

استخدم النطاقات الخاصة: `10.0.0.0/8` أو `172.16.0.0/12` أو `192.168.0.0/16`. والـ VPC الافتراضية تستخدم `172.31.0.0/16`.

::: warning اختر نطاق ما يتعارض
لو نطاقك يتداخل مع شبكة ثانية، ما تقدر تربطهم بسهولة بعدين. فكّر في مكتبك والشبكات الثانية اللي ممكن تتصل بها، وهذا موضوع [الجزء الرابع عشر](/posts/aws-14-vpc-connectivity/).
:::

## الشبكات الفرعية (Subnets)

الـ Subnet جزء من نطاق الـ VPC، وأهم شي تعرفه عنها:

- **تعيش في منطقة توفر واحدة.** فعشان التوفر العالي تحتاج شبكات في منطقتين على الأقل.
- **AWS تحجز 5 عناوين** في كل شبكة: أول أربعة وآخر عنوان. فـ `/24` يعطيك 251 عنوان مو 256.
- **"عامة" و"خاصة" مو إعداد.** الشبكة تصير عامة لما يكون في جدول توجيهها طريق لبوابة الإنترنت.

## جداول التوجيه وبوابة الإنترنت

**بوابة الإنترنت (Internet Gateway)** تربط الـ VPC بالإنترنت. و**جدول التوجيه (Route Table)** يحدد وين تروح كل زيارة. فجدول الشبكة العامة يكون كذا:

| الوجهة | الهدف | المعنى |
| --- | --- | --- |
| `10.0.0.0/16` | `local` | داخل الـ VPC، وهذا موجود دايماً |
| `0.0.0.0/0` | `igw-...` | أي شي ثاني يروح للإنترنت |

وعشان يوصل أحد للسيرفر من الخارج، يحتاج عنوان عام كمان. وتذكر من [الجزء الرابع](/posts/aws-04-ec2-pricing-networking/) إن كل عناوين IPv4 العامة مدفوعة.

## NAT Gateway: طلوع بدون دخول

السيرفر في الشبكة الخاصة يحتاج يطلع أحياناً، مثلاً لتحميل التحديثات، بس ما تبي أحد يدخل عليه. هذا دور **NAT Gateway**: يجلس في الشبكة العامة، ويطلّع طلبات السيرفرات الخاصة بعنوانه هو، وما يقبل اتصال يبدأ من الخارج.

وجدول الشبكة الخاصة فيه `0.0.0.0/0` يشير لـ `nat-...` بدل بوابة الإنترنت. وعندك أكثر من شكل:

| الشكل | كيف يشتغل |
| --- | --- |
| **NAT Gateway لمنطقة واحدة** | لازم واحد في كل منطقة توفر، وإلا تعطلت الشبكات الخاصة في باقي المناطق لو طاحت منطقته |
| **NAT Gateway إقليمي** | أحدث، ويتوسع تلقائياً للمناطق اللي فيها سيرفراتك، ويُحسب لكل منطقة شغّالة |
| **NAT Instance** | سيرفر EC2 تديره بنفسك. طريقة قديمة، وما تستخدمها في شي جديد |

::: warning مفاجأة الفاتورة
NAT Gateway ينحسب بالساعة، وعلى كل جيجابايت تمر من خلاله. وكثير يكتشفونه في الفاتورة متأخر. وفي الجزء الجاي بنشوف كيف تقلل هذي التكلفة.
:::

## كيف توصل لسيرفر خاص؟

ما له عنوان عام، فكيف تدخل عليه؟

| الطريقة | كيف | ملاحظات |
| --- | --- | --- |
| **Bastion Host** | سيرفر عام تدخل منه بـ SSH | قديمة: مفاتيح ومنفذ مفتوح وسيرفر زيادة تأمّنه |
| **EC2 Instance Connect Endpoint** | نقطة داخل شبكتك توصلك بالسيرفر بدون عنوان عام | مجانية، وبنستخدمها في التجربة |
| **Session Manager** | طرفية عبر خدمة SSM، بدون منفذ 22 | يحتاج دور IAM، ويسجّل الجلسات |

## جدارين حماية: مجموعات الأمان وNACL

[مجموعة الأمان](/posts/aws-03-ec2-first-server/) تعرفها، وهي حول السيرفر. وفيه جدار ثاني اسمه **NACL** حول الشبكة الفرعية:

| | مجموعة الأمان | NACL |
| --- | --- | --- |
| **المستوى** | السيرفر | الشبكة الفرعية |
| **القواعد** | سماح فقط | سماح ومنع |
| **الحالة** | تتذكر الاتصال، فالرد يطلع تلقائياً | ما تتذكر، فلازم تسمح للرد كمان |
| **التقييم** | كل القواعد | بالترتيب، وأول قاعدة تنطبق تكفي |
| **الافتراضي** | الدخول ممنوع والخروج مسموح | الافتراضية تسمح بالكل، والجديدة تمنع الكل |

وبما إن NACL ما تتذكر الاتصال، لازم تسمح لردود السيرفر عبر **المنافذ المؤقتة** (عادةً `1024-65535`)، وهذا يسبب أخطاء كثيرة.

القاعدة العملية: خل NACL الافتراضية على حالها، واشتغل بمجموعات الأمان. واستخدم NACL لو تبي **تمنع** نطاق عناوين بسرعة، لأن مجموعة الأمان ما تقدر تمنع.

## سجلات الزيارات (Flow Logs)

لما ما يوصل طلب وما تعرف ليش، **Flow Logs** تسجّل بيانات كل اتصال على مستوى VPC أو شبكة أو واجهة، وترسلها لـ CloudWatch Logs أو S3. والسطر يكون كذا:

```text
2 123456789012 eni-0abc 203.0.113.7 10.0.1.5 49152 22 6 5 300 1730000000 1730000060 REJECT OK
```

يعني: من `203.0.113.7` إلى `10.0.1.5` على المنفذ `22`، وانرفض. وكيف تشخّص:

- **الدخول مرفوض:** المشكلة في مجموعة الأمان أو NACL.
- **الدخول مقبول والخروج مرفوض:** المشكلة في NACL، لأن مجموعة الأمان تسمح للرد تلقائياً.

## عملي: ابنِ VPC من الصفر

بنبني شبكة فيها عامة وخاصة، ونشوف بأعيننا إن الفرق كله في جدول التوجيه. كل الأوامر من CloudShell. أول شي الشبكة والفروع:

```bash
VPC=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=series-vpc}]' \
  --query Vpc.VpcId --output text)

AZ=$(aws ec2 describe-availability-zones \
  --query "AvailabilityZones[0].ZoneName" --output text)

PUBLIC=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.1.0/24 \
  --availability-zone $AZ --query Subnet.SubnetId --output text)

PRIVATE=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.11.0/24 \
  --availability-zone $AZ --query Subnet.SubnetId --output text)
```

الحين بوابة الإنترنت وجدول توجيه للشبكة العامة فقط:

```bash
IGW=$(aws ec2 create-internet-gateway \
  --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC --internet-gateway-id $IGW

RT_PUBLIC=$(aws ec2 create-route-table --vpc-id $VPC \
  --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $RT_PUBLIC \
  --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW
aws ec2 associate-route-table --route-table-id $RT_PUBLIC --subnet-id $PUBLIC
```

مجموعة أمان تسمح من داخل الشبكة فقط، ونقطة دخول حتى نوصل للسيرفرات بدون فتح منفذ للعالم:

```bash
SG=$(aws ec2 create-security-group --group-name series-sg \
  --description "SSH and ping from inside the VPC" --vpc-id $VPC \
  --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG \
  --protocol tcp --port 22 --cidr 10.0.0.0/16
aws ec2 authorize-security-group-ingress --group-id $SG \
  --protocol icmp --port -1 --cidr 10.0.0.0/16

aws ec2 create-instance-connect-endpoint --subnet-id $PRIVATE \
  --security-group-ids $SG --no-preserve-client-ip
```

وسيرفر في كل شبكة:

```bash
AMI=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)

aws ec2 run-instances --image-id $AMI --instance-type t3.micro \
  --subnet-id $PUBLIC --security-group-ids $SG --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=public-server}]'

aws ec2 run-instances --image-id $AMI --instance-type t3.micro \
  --subnet-id $PRIVATE --security-group-ids $SG \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=private-server}]'
```

انتظر كم دقيقة لين تجهز نقطة الدخول. ثم من EC2 حدد السيرفر، واضغط **Connect**، وفي **EC2 Instance Connect** اختر الاتصال عبر نقطة الدخول. وعلى كل سيرفر جرّب:

```bash
curl -m 5 https://checkip.amazonaws.com
```

- **`public-server`:** يطبع عنوانه العام.
- **`private-server`:** ينتهي الوقت بدون جواب، لأن ما عنده طريق للإنترنت.

ومن الخاص جرّب `ping` على العنوان الخاص للعام، وبيرد لأن طريق `local` يربطهم.

### أضف NAT Gateway

الحين خل الخاص يطلع للإنترنت. وهذي الخطوة مدفوعة بالساعة، فاحذفها بعد التجربة:

```bash
ALLOC=$(aws ec2 allocate-address --domain vpc \
  --query AllocationId --output text)

NAT=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC --allocation-id $ALLOC \
  --query NatGateway.NatGatewayId --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT

RT_PRIVATE=$(aws ec2 create-route-table --vpc-id $VPC \
  --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $RT_PRIVATE \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT
aws ec2 associate-route-table --route-table-id $RT_PRIVATE --subnet-id $PRIVATE
```

أعد نفس أمر `curl` على `private-server`. هذي المرة يطبع عنوان، وهو عنوان NAT Gateway مو عنوان السيرفر. فالسيرفر طلع للإنترنت، وما زال ما أحد يقدر يبدأ اتصال به.

::: security احذف بعد التجربة
احذف NAT Gateway من صفحته في VPC، وبعد ما يختفي حرر الـ Elastic IP من صفحته في EC2. لو بتكمل [الجزء الرابع عشر](/posts/aws-14-vpc-connectivity/) مباشرة، خل الـ VPC والسيرفرات. وإلا احذف السيرفرات ونقطة الدخول، ثم حدد الـ VPC واختر **Actions** ثم **Delete VPC**، وهي تحذف الباقي معها.
:::

## الخلاصة

- **VPC** شبكتك الخاصة في Region، وتقسمها لشبكات فرعية في مناطق التوفر.
- الشبكة **عامة** لو في جدولها طريق لبوابة الإنترنت، وإلا فهي **خاصة**.
- **NAT Gateway** يخلي الخاصة تطلع بدون ما أحد يدخل، وانتبه لتكلفته.
- **مجموعات الأمان** تتذكر الاتصال وتسمح فقط، و**NACL** ما تتذكر وتقدر تمنع.
- **Flow Logs** تقول لك وين انرفض الاتصال.

## اختبر نفسك

::: quiz
سيرفر جديد له عنوان عام، ومجموعة الأمان حقته تسمح بـ HTTPS من أي مكان، ومع هذا ما أحد يقدر يوصل له من الإنترنت. والـ VPC مربوط فيها بوابة إنترنت، وجدول توجيه الشبكة الفرعية فيه مسار `local` فقط. وش الناقص؟

- [x] مسار `0.0.0.0/0` لبوابة الإنترنت في جدول توجيه الشبكة الفرعية
- [ ] NAT Gateway في نفس الشبكة الفرعية
- [ ] قاعدة خروج للردود في مجموعة الأمان
- [ ] اتصال Peering مع الـ VPC الافتراضية

الشبكة الفرعية تصير عامة لما يكون جدول توجيهها يشير لبوابة إنترنت. وبدون هذا المسار، ما فيه طريق للخروج، حتى مع وجود عنوان عام.

- **B:** NAT يخلي السيرفرات الخاصة تطلع، وما يقبل اتصال يبدأ من الخارج.
- **C:** مجموعة الأمان تتذكر الاتصال، فالرد يطلع تلقائياً.
- **D:** Peering يربط شبكتين VPC، وما يعطي طريق للإنترنت.

للمراجعة: [جداول التوجيه وبوابة الإنترنت](#جداول-التوجيه-وبوابة-الإنترنت) في هذا الجزء، و[Enable internet access for a VPC using an internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html) في وثائق AWS.
:::

::: quiz
فريق يخطط لشبكة فرعية لازم تستوعب 30 سيرفر. والعناوين محدودة، فيبي أصغر نطاق يكفي. أي واحد يختار؟

- [ ] `/29`
- [ ] `/28`
- [ ] `/27`
- [x] `/26`

AWS تحجز 5 عناوين في كل شبكة فرعية. و`/27` فيه 32، يبقى منها 27، فما يكفي. و`/26` فيه 64، يبقى منها 59.

- **A:** أصغر شبكة فرعية تسمح فيها AWS هي `/28`، فهذا ما ينشأ أصلاً.
- **B:** هذا يبقى منه 11 عنوان بس.
- **C:** هذا يبقى منه 27 عنوان، ناقص ثلاثة عن المطلوب.

للمراجعة: [الشبكات الفرعية (Subnets)](#الشبكات-الفرعية-subnets) في هذا الجزء، و[Subnet CIDR blocks](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) في وثائق AWS.
:::

::: quiz
تطبيق يشتغل في شبكات خاصة على منطقتي توفر، ويتشاركون NAT Gateway لمنطقة واحدة في المنطقة الأولى. ولما تعطلت هذي المنطقة، بقت سيرفرات المنطقة الثانية سليمة، بس انقطع عنها الإنترنت. وش يحل هذا؟

- [ ] بوابة إنترنت إضافية للمنطقة الثانية
- [x] NAT Gateway في المنطقة الثانية، وكل شبكة خاصة توجّه للي في منطقتها
- [ ] Elastic IP ثاني على الـ NAT Gateway الحالي
- [ ] نقل الـ NAT Gateway إلى شبكة خاصة

الـ NAT Gateway لمنطقة واحدة يعيش في منطقته، فلو طاحت انقطع كل اللي يعتمدون عليه. ولما يكون فيه واحد في كل منطقة، يبقى العطل في منطقته. وRegional NAT Gateway يعطيك نفس النتيجة تلقائياً.

- **A:** الـ VPC لها بوابة إنترنت وحدة، والشبكات الخاصة ما توجّه لها.
- **C:** العناوين الزيادة ما تطلعه من المنطقة المعطلة.
- **D:** الـ NAT Gateway يجلس في الشبكة العامة، وهذا يقطعه عن الإنترنت.

للمراجعة: [NAT Gateway: طلوع بدون دخول](#nat-gateway-طلوع-بدون-دخول) في هذا الجزء، و[NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html) في وثائق AWS.
:::

::: quiz
عشان يمنع فريق نطاق عناوين مزعج، أنشأ NACL جديدة فيها قاعدة منع لهذا النطاق، وقاعدة سماح دخول للمنفذ 443. والحين ما أحد من الزوار يقدر يفتح الموقع. وFlow Logs تعرض الطلبات `ACCEPT` والردود `REJECT`. وش يسوي الفريق؟

- [ ] إضافة قاعدة منع للنطاق في مجموعة الأمان
- [ ] إضافة قاعدة خروج للردود في مجموعة الأمان
- [x] إضافة قاعدة خروج في NACL تسمح للمنافذ المؤقتة
- [ ] حذف قاعدة سماح الدخول من NACL

NACL ما تتذكر الاتصال، والجديدة تمنع كل شي ما سمحت له، فالردود تحتاج قاعدة خاصة فيها. والدخول المقبول مع الخروج المرفوض يشير مباشرة لـ NACL.

- **A:** مجموعة الأمان تسمح فقط، فما تقبل قاعدة منع.
- **B:** مجموعة الأمان تتذكر الاتصال، فكانت تخلي الرد يطلع من الأساس.
- **D:** هذا يمنع الطلبات كمان.

للمراجعة: [جدارين حماية: مجموعات الأمان وNACL](#جدارين-حماية-مجموعات-الأمان-وnacl) و[سجلات الزيارات (Flow Logs)](#سجلات-الزيارات-flow-logs) في هذا الجزء، و[Custom network ACLs for your VPC](https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html) في وثائق AWS.
:::

::: quiz
المهندسين يحتاجون طرفية على سيرفرات في شبكة خاصة. والسيرفرات لازم تبقى بدون عناوين عامة، والفريق ما يبي سيرفر زيادة يحدّثه ويأمّنه. أي **خيارين** يناسبون؟ (اختر اثنين.)

- [ ] Bastion Host في شبكة عامة
- [ ] NAT Gateway، مع قاعدة SSH
- [x] Session Manager، مع دور IAM على السيرفرات
- [ ] Elastic IP على كل سيرفر
- [x] EC2 Instance Connect Endpoint في الـ VPC

الاثنين يوصلون للسيرفر بدون عنوان عام وبدون سيرفر زيادة تشغله. وSession Manager كمان ما يحتاج منفذ 22، ويسجّل الجلسات.

- **A:** هذا هو السيرفر الزيادة اللي الفريق ما يبيه.
- **B:** الـ NAT Gateway يطلّع الزيارات فقط، وما يقبل اتصال يبدأ من الخارج.
- **D:** هذا يعطي السيرفرات عناوين عامة، وهذا الممنوع بالضبط.

للمراجعة: [كيف توصل لسيرفر خاص؟](#كيف-توصل-لسيرفر-خاص) في هذا الجزء، و[Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) و[EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-ec2-instance-connect-endpoint.html) في وثائق AWS.
:::

شبكتك الحين جاهزة، بس معزولة. في [**الجزء الرابع عشر**](/posts/aws-14-vpc-connectivity/) نربطها بشبكات ثانية، وبخدمات AWS، وبمكتبك.
