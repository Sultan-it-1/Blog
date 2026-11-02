---
title: "التشفير والأسرار والحماية من الهجمات"
description: كيف يحمي KMS مفاتيحك، ووين تحفظ كلمات المرور بـ Parameter Store وSecrets Manager، وشهادات مجانية من ACM، وصد الهجمات بـ WAF وShield، وكشف التهديدات بـ GuardDuty وInspector وMacie، مع تجربة عملية.
date: 2026-11-02
series: aws
part: 27
numbered: true
tags: [aws, security]
---

في [الجزء السادس والعشرين](/posts/aws-26-organizations-identity-center/) ضبطنا مين يدخل. هذا الجزء يفترض الأسوأ: قرص ينسرق، أو كلمة مرور تتسرب، أو أحد يهاجم موقعك. وش يحميك وقتها؟

| تبي | استخدم |
| --- | --- |
| مفاتيح تشفير تتحكم فيها | **KMS** |
| إعدادات وأسرار بسيطة | **Parameter Store** |
| كلمات مرور تتغير لحالها | **Secrets Manager** |
| شهادات HTTPS | **ACM** |
| صد هجمات الويب | **WAF** |
| تحمل هجمات DDoS | **Shield** |
| كشف التهديدات في حسابك | **GuardDuty** |
| إيجاد الثغرات في اللي تشغله | **Inspector** |
| إيجاد البيانات الحساسة في S3 | **Macie** |

## AWS KMS: خزنة المفاتيح

شفنا [أنواع التشفير في S3](/posts/aws-17-s3-security/). وخلف أغلبها **KMS** (Key Management Service): المفاتيح تنشأ وتنستخدم داخله وما تطلع منه بدون تشفير، والوصول تحكمه السياسات، وكل استخدام ينسجل في [CloudTrail](/posts/aws-25-monitoring-auditing/).

### التشفير بالمظروف (Envelope Encryption)

KMS ما يشفر ملفاتك الكبيرة بنفسه. يسوي **مفتاح بيانات** يشفر الملف، ويشفر مفتاح البيانات هذا بمفتاحك الرئيسي:

<figure class="diagram">
<svg viewBox="0 0 640 214" role="img" aria-labelledby="envelope-caption">
<defs>
<marker id="envelope-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="450" y="14" width="170" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="535" y="44" text-anchor="middle" class="d-label">مفتاح KMS</text>
<text x="535" y="64" text-anchor="middle" class="d-small">ما يطلع من KMS</text>
<rect x="235" y="14" width="170" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="44" text-anchor="middle" class="d-label">مفتاح البيانات</text>
<text x="320" y="64" text-anchor="middle" class="d-small">يشفر الملف</text>
<rect x="20" y="14" width="170" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="105" y="44" text-anchor="middle" class="d-label">ملفك</text>
<text x="105" y="64" text-anchor="middle" class="d-small">صار مشفر</text>
<rect x="235" y="130" width="170" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="320" y="160" text-anchor="middle" class="d-label">مفتاح البيانات مشفر</text>
<text x="320" y="180" text-anchor="middle" class="d-small">ينحفظ مع الملف</text>
<line x1="450" y1="49" x2="407" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
<line x1="235" y1="49" x2="192" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
<line x1="320" y1="84" x2="320" y2="128" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
<line x1="235" y1="165" x2="105" y2="86" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
</svg>
<figcaption id="envelope-caption">مفتاح البيانات يشفر الملف، ونسخة مشفرة منه تنحفظ جنب الملف. وKMS بس يقدر يفتح هذي النسخة، فالملف ما له فايدة بدون صلاحية.</figcaption>
</figure>

فحتى اللي يسرق القرص ياخذ بيانات مشفرة وجنبها مفتاح مشفر. وعشان تفك التشفير، تحتاج صلاحية تطلب من KMS يفتح مفتاح البيانات، وهنا مكان تحكمك.

### أنواع المفاتيح

| النوع | مين يتحكم فيه | التكلفة الشهرية | التدوير |
| --- | --- | --- | --- |
| **AWS Owned** | AWS، وما تشوفه أبداً | مجاني | من الخدمة |
| **AWS Managed** (مثل `aws/ebs`) | AWS، وتقدر تشوفه وتدقق عليه | مجاني | سنوي وما يتغير |
| **Customer Managed** | أنت بالكامل | دولار للمفتاح، مع استدعاءات API | اختياري، سنوي افتراضياً، أو من 90 إلى 2,560 يوم |

وأغلب المفاتيح **متماثلة (Symmetric)**، مفتاح واحد للتشفير وفكه وما يطلع من KMS. وفيه أزواج **غير متماثلة (Asymmetric)**، يطلع منها المفتاح العام، للتوقيع أو لتشفير من أطراف خارج AWS.

وحذف المفتاح ما له رجعة، لأنه يدمر كل شي مشفر به. فـ KMS يفرض فترة انتظار من 7 إلى 30 يوم، تقدر تلغي خلالها. وعشان توقف استخدام المفتاح بالأثناء، عطّله.

### سياسات المفاتيح

كل مفتاح KMS له **Key Policy**، وعلى عكس الموارد الثانية، IAM لحاله ما يكفي بدونها. والسياسة الافتراضية تخلي سياسات IAM في الحساب تعطي الوصول للمفتاح.

وهذا مهم لما تنسخ بيانات مشفرة:

- **لمنطقة ثانية:** المفاتيح خاصة بالمنطقة، فنسخ اللقطة يعيد تشفيرها بمفتاح في منطقة الوجهة.
- **لحساب ثاني:** شارك اللقطة، واسمح لذاك الحساب في سياسة مفتاح **Customer Managed**. مفاتيح AWS Managed، مثل `aws/ebs`، ما تنشارك، فاللقطة المشفرة بها لازم تنسخها أول بمفتاحك.

### المفاتيح متعددة المناطق

**Multi-Region Keys** تتشارك نفس مادة المفتاح ومعرفه بين المناطق، فاللي انشفر في منطقة ينفك في ثانية بدون إعادة تشفير. وهي مو لكل شي، لأن AWS توصي بمفاتيح المنطقة الواحدة افتراضياً. وتناسب حالات مثل تشفير حقل من جهة العميل في [Global Tables](/posts/aws-21-lambda-api-dynamodb/) أو Aurora Global.

## وين تحفظ كلمات المرور؟

مو في الكود، ولا في Git. عندك خدمتين:

| | Parameter Store | Secrets Manager |
| --- | --- | --- |
| **يناسب** | إعدادات وأسرار بسيطة | أسرار لازم تتغير |
| **التشفير** | اختياري بـ KMS عبر `SecureString` | دايماً بـ KMS |
| **التدوير** | مو مبني فيه | مبني فيه بدالة Lambda، ومتكامل مع RDS وAurora |
| **نسخ في مناطق ثانية** | لا | نعم |
| **السعر** | Standard مجاني | 0.40 دولار للسر في الشهر، مع استدعاءات API |

### Parameter Store

أسماؤه تكوّن شجرة، مثل `/shop/prod/db-url`، فالتطبيق يقدر يجيب مسار كامل، وIAM يقدر يسمح بـ `/shop/prod/*` فقط.

| | Standard | Advanced |
| --- | --- | --- |
| **أقصى حجم** | 4 KB | 8 KB |
| **العدد في المنطقة** | 10,000 | 100,000 |
| **سياسات مثل الانتهاء** | لا | نعم |
| **السعر** | مجاني | 0.05 دولار للقيمة في الشهر |

### Secrets Manager

الفكرة هنا التدوير: كلمة المرور تتغير بجدول تحدده، والدالة تحدثها في قاعدة البيانات كمان. وتطبيقك يطلب القيمة الحالية كل مرة، فما يحس. وشفنا في [الجزء الثامن](/posts/aws-08-rds-aurora/) إن RDS يقدر يدير كلمة مروره هنا لك.

## ACM: شهادات بدون وجع راس

**AWS Certificate Manager** يصدر شهادات TLS عامة مجاناً لما تنستخدم مع خدمات مثل موزعات الحمل وCloudFront وAPI Gateway، ويجددها لحاله.

- **التحقق:** أثبت ملكية النطاق عبر DNS، والأفضل مع [Route 53](/posts/aws-11-dns-route53/)، أو عبر الإيميل.
- **الصلاحية:** الشهادات العامة تدوم الحين 198 يوم، حسب قواعد الصناعة الجديدة، والتجديد يصير تلقائياً قبل الانتهاء بحوالي 45 يوم. والفترة بتقصر أكثر في السنين الجاية، وهذا سبب زيادة تخليها للأتمتة.
- **الشهادات المستوردة:** تقدر تستورد شهاداتك، بس ACM ما يجددها، فحط تنبيه على انتهائها.
- **سيرفراتك:** شهادة ACM العادية ما تنثبت على سيرفرك. ولو تحتاج هذا، فيه **شهادات قابلة للتصدير** برسوم.

::: warning فخ المنطقة
لازم الشهادة تكون في نفس منطقة اللي يستخدمها، مع استثناء لازم تتذكره: **CloudFront** وAPI Gateway من نوع Edge-optimized يحتاجون الشهادة في **`us-east-1`**، وين ما كان تطبيقك.
:::

## صد الهجمات

هذا كيف تقعد طبقات الحماية مع بعض في تصميم معتاد:

<figure class="diagram">
<svg viewBox="0 0 640 150" role="img" aria-labelledby="edge-caption">
<defs>
<marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="510" y="40" width="110" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="80" text-anchor="middle" class="d-label">الزوار</text>
<rect x="340" y="26" width="130" height="98" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="405" y="70" text-anchor="middle" class="d-label">CloudFront</text>
<text x="405" y="90" text-anchor="middle" class="d-small">WAF وShield</text>
<rect x="170" y="40" width="130" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="235" y="70" text-anchor="middle" class="d-label">ALB</text>
<text x="235" y="90" text-anchor="middle" class="d-small">من CloudFront فقط</text>
<rect x="20" y="40" width="110" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="75" y="70" text-anchor="middle" class="d-label">السيرفرات</text>
<text x="75" y="90" text-anchor="middle" class="d-small">خاصة</text>
<line x1="510" y1="75" x2="472" y2="75" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#edge-arrow)"/>
<line x1="340" y1="75" x2="302" y2="75" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#edge-arrow)"/>
<line x1="170" y1="75" x2="132" y2="75" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#edge-arrow)"/>
</svg>
<figcaption id="edge-caption">الهجمات تنمتص عند الحافة، وSecurity Group لموزع الحمل يقبل من CloudFront فقط، فما أحد يقدر يلتف عليه.</figcaption>
</figure>

| الخدمة | الطبقة | وش تسوي | التكلفة |
| --- | --- | --- | --- |
| **WAF** | التطبيق (7) | قواعد على الطلبات: SQL Injection وXSS والدولة وقوائم IP وحدود المعدل | لكل قاعدة وطلب |
| **Shield Standard** | الشبكة (3 و4) | حماية من هجمات DDoS المعروفة | مجاني وتلقائي |
| **Shield Advanced** | حتى 7 | فريق استجابة متخصص، وحماية التكلفة وقت الهجوم | اشتراك شهري وهو غالي |
| **Firewall Manager** | الإدارة | يطبق قواعد WAF وShield وSecurity Groups وغيرها على كل حسابات منظمتك | لكل سياسة |

وWAF ينربط بـ **CloudFront وALB وAPI Gateway وAppSync**، بس مو بموزع NLB. ولو تحتاج IP ثابت مع WAF، حط [Global Accelerator](/posts/aws-12-cloudfront-global-accelerator/) قدام موزع الحمل. و**القواعد حسب المعدل** بسيطة وفعالة: احجب أي عنوان يرسل أكثر من عدد محدد من الطلبات.

### تحمل DDoS

[الأجزاء السابقة](/posts/aws-12-cloudfront-global-accelerator/) أعطتك أغلب المطلوب:

- **CloudFront وRoute 53** يمتصون الهجمات عند الحافة، بعيد عن سيرفراتك.
- **Auto Scaling** يكبر لو عدى شي، بس انتبه للتكلفة.
- **Security Group** يسمح لموزع الحمل من CloudFront فقط، فما أحد يتخطاه.
- **WAF** بحدود المعدل وBot Control للهجمات اللي تشبه الطلبات العادية.

### حجب عنوان واحد: وين؟

| تصميمك | وين تحجب | ليه |
| --- | --- | --- |
| **EC2 بـ IP عام** | Network ACL | Security Groups تسمح فقط، وما تقدر تمنع |
| **موزع حمل** | Network ACL على الـ Subnet حقه، أو WAF | السيرفر يشوف موزع الحمل فقط |
| **CloudFront قدامه** | WAF على CloudFront، أو القيود الجغرافية | Network ACL ما يفيد، لأن الطلبات توصل من عناوين CloudFront |

وللحماية عند حدود الـ VPC، فيه [Network Firewall](/posts/aws-14-vpc-connectivity/) اللي غطيناه في الجزء الرابع عشر.

## كشف التهديدات

المنع مو كل شي. تحتاج كمان شي يقول لك لما يكون فيه مشكلة:

| الخدمة | السؤال اللي تجاوبه | تشتغل من |
| --- | --- | --- |
| **GuardDuty** | فيه شي مشبوه يصير في حسابي؟ | CloudTrail وVPC Flow Logs وسجلات DNS، بدون Agents |
| **Inspector** | اللي أشغله فيه ثغرات معروفة؟ | سيرفرات EC2 وصور ECR ودوال Lambda |
| **Macie** | فيه بيانات حساسة في مكان ما لازم تكون فيه؟ | S3 |
| **Security Hub** | كيف أماني بشكل عام؟ | يجمع نتائج الباقين ويرتبها |

GuardDuty يكشف أشياء مثل تعدين العملات، أو بيانات دخول مستخدمة من مكان غريب. وأرسل نتائجه عبر EventBridge إلى SNS أو Lambda عشان تتصرف. وتشغيله بضغطة وحدة، فشغله من البداية في أي حساب جاد، وله فترة تجربة مجانية.

## عملي: مفتاح وقيمة وسر

من CloudShell، أنشئ مفتاح باسم سهل، وشفر نص:

```bash
KEY_ID=$(aws kms create-key --description "Series demo key" \
  --query KeyMetadata.KeyId --output text)
aws kms create-alias --alias-name alias/series-demo --target-key-id $KEY_ID

CIPHER=$(aws kms encrypt --key-id alias/series-demo \
  --plaintext "my secret note" --cli-binary-format raw-in-base64-out \
  --query CiphertextBlob --output text)

echo $CIPHER
```

بتشوف نص ما ينقرأ. فك تشفيره. وللمفتاح المتماثل، ما يلزم تحدد أي مفتاح:

```bash
aws kms decrypt --ciphertext-blob "$CIPHER" \
  --query Plaintext --output text | base64 -d; echo
```

الحين شوف وين التحكم الحقيقي. عطّل المفتاح، وجرب مرة ثانية:

```bash
aws kms disable-key --key-id $KEY_ID

aws kms decrypt --ciphertext-blob "$CIPHER" \
  --query Plaintext --output text

aws kms enable-key --key-id $KEY_ID
```

بيجيك `DisabledException`. البيانات ما تغيرت، بس ما لها فايدة بدون المفتاح. الحين احفظ كلمة مرور في Parameter Store، مشفرة بنفس المفتاح، واقرأها مع فك التشفير وبدونه:

```bash
aws ssm put-parameter --name /series/prod/db-password \
  --type SecureString --key-id alias/series-demo --value "S3cret-pass"

aws ssm get-parameter --name /series/prod/db-password \
  --query Parameter.Value --output text

aws ssm get-parameter --name /series/prod/db-password --with-decryption \
  --query Parameter.Value --output text

aws ssm get-parameters-by-path --path /series/prod \
  --query "Parameters[].Name"
```

وسر في Secrets Manager، بالطريقة اللي يقرأه فيها تطبيقك:

```bash
aws secretsmanager create-secret --name series/api-key \
  --secret-string '{"key":"abc123"}' --query Name --output text

aws secretsmanager get-secret-value --secret-id series/api-key \
  --query SecretString --output text
```

وأخيراً، وش خلّى كل هذا وراه؟ [CloudTrail](/posts/aws-25-monitoring-auditing/) سجل مين استخدم المفتاح، بس ممكن ياخذ كم دقيقة:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt \
  --max-results 3 --query "Events[].[EventName,Username,EventTime]" --output table
```

::: security احذف بعد التجربة
المفتاح يكلف دولار في الشهر محسوب بالساعة، ويوقف الحساب لما تجدوله للحذف، فهذا يكلف أقل من سنت أو سنتين:
:::

```bash
aws secretsmanager delete-secret --secret-id series/api-key \
  --force-delete-without-recovery
aws ssm delete-parameter --name /series/prod/db-password
aws kms delete-alias --alias-name alias/series-demo
aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 7
```

## الخلاصة

- **KMS** يحفظ مفاتيحك، ويستخدم التشفير بالمظروف، ويسجل كل استخدام.
- المفاتيح **خاصة بالمنطقة**، ومفاتيح AWS Managed ما تنشارك بين الحسابات.
- **Parameter Store** للإعدادات، و**Secrets Manager** للي لازم يتغير.
- شهادات **ACM** مجانية وتتجدد لحالها، وCloudFront يحتاجها في `us-east-1`.
- **WAF** و**Shield** يصدون الهجمات، و**GuardDuty** و**Inspector** و**Macie** يكشفون اللي يعدي.

حميت نفسك من الناس. طيب لو طاحت منطقة كاملة، أو لازم تنقل مركز بيانات إلى AWS؟ في [**الجزء الثامن والعشرين**](/posts/aws-28-disaster-recovery-migration/) نغطي التعافي من الكوارث والترحيل.
