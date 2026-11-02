---
title: "الهوية المتقدمة: Organizations وIdentity Center"
description: إدارة عدة حسابات بـ Organizations وSCP، والشروط في سياسات IAM، والأدوار مقابل سياسات الموارد، وحدود الصلاحيات وكيف تقرر AWS، والدخول الموحد بـ Identity Center، مع تجربة عملية تحاكي فيها السياسات.
date: 2026-11-02
series: aws
part: 26
numbered: true
tags: [aws, iam, security]
---

في [الجزء الثاني](/posts/aws-02-iam/) كان عندنا حساب واحد وكم مستخدم. الحين تخيل شركة فيها خمسين حساب وخمسمية موظف: إنشاء مستخدم في كل حساب لكل شخص بيكون كابوس، وغلطة وحدة ممكن توصل لكل شي.

هذا الجزء يغطي أدوات هذا الحجم، ويكمل [IAM](/posts/aws-02-iam/) باللي تركناه في البداية.

## AWS Organizations

**Organizations** يجمع عدة حسابات تحت **حساب إدارة** واحد، مرتبة في **وحدات تنظيمية (OUs)**.

<figure class="diagram">
<svg viewBox="0 0 640 246" role="img" aria-labelledby="org-caption">
<defs>
<marker id="org-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="250" y="14" width="140" height="44" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="41" text-anchor="middle" class="d-label">الجذر</text>
<rect x="440" y="92" width="180" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="530" y="119" text-anchor="middle" class="d-label">وحدة الأمان</text>
<rect x="230" y="92" width="180" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="119" text-anchor="middle" class="d-label">وحدة الإنتاج</text>
<rect x="20" y="92" width="180" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="110" y="119" text-anchor="middle" class="d-label">وحدة التطوير</text>
<rect x="535" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="577.5" y="207" text-anchor="middle" class="d-label">السجلات</text>
<rect x="440" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="482.5" y="207" text-anchor="middle" class="d-label">التدقيق</text>
<rect x="325" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="367.5" y="207" text-anchor="middle" class="d-label">المتجر</text>
<rect x="230" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="272.5" y="207" text-anchor="middle" class="d-label">API</text>
<rect x="115" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="157.5" y="207" text-anchor="middle" class="d-label">فريق أ</text>
<rect x="20" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="62.5" y="207" text-anchor="middle" class="d-label">فريق ب</text>
<line x1="320" y1="58" x2="530" y2="90" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="58" x2="320" y2="90" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="58" x2="110" y2="90" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="530" y1="136" x2="578" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="530" y1="136" x2="483" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="136" x2="368" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="136" x2="273" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="110" y1="136" x2="158" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="110" y1="136" x2="63" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
</svg>
<figcaption id="org-caption">الحسابات تقعد في وحدات تنظيمية تحت جذر واحد، والسياسة المربوطة بوحدة تنطبق على كل الحسابات تحتها.</figcaption>
</figure>

ليه حسابات كثيرة، مو حساب واحد كبير؟

- **العزل:** غلطة أو اختراق في حساب التطوير ما توصل للإنتاج.
- **تكاليف واضحة:** كل حساب يبين فاتورة فريقه.
- **الحدود:** كل حساب له حصص خدماته.

ووش تكسب من Organizations؟

- **فاتورة موحدة:** فاتورة وحدة، والاستخدام المجمع يوصل لخصومات الكمية أسرع. وSavings Plans وReserved Instances ممكن تتشارك بين الحسابات.
- **إدارة مركزية:** إنشاء حسابات عبر API، و[CloudTrail Trail](/posts/aws-25-monitoring-auditing/) واحد للكل.
- **السياسات:** قواعد تنطبق على مجموعات كاملة من الحسابات.

### سياسات المنظمة

| السياسة | وش تسوي |
| --- | --- |
| **SCP** | تحدد أقصى ما يقدر يسويه المستخدمين والأدوار في الحساب |
| **RCP** | تحدد أقصى ما ينعمل على موارد الحساب |
| **Declarative Policies** | تثبت إعدادات أساسية لخدمة عبر الحسابات |
| **Tag Policies** | توحد الوسوم، مثل فرض كتابة معينة لـ `CostCenter` |

### Service Control Policies (SCP)

النقطة الأهم: **SCP ما تعطي أي شي**. تحدد سقف بس، وكل مستخدم لسا يحتاج صلاحية IAM. هي سقف على المسموح:

- لما تنربط بـ OU تنطبق على كل اللي تحتها، ولازم كل مستوى يسمح بالإجراء.
- ما تأثر على **حساب الإدارة**، فلا تشغّل شغلك فيه.
- تنطبق على الكل في الحساب العضو، ومعهم Root حق الحساب.

مثلاً هذي الـ SCP تمنع الشغل خارج منطقتين، إلا الخدمات العالمية:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "OnlyTwoRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "support:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": { "aws:RequestedRegion": ["me-central-1", "eu-west-1"] }
    }
  }]
}
```

## الشروط في سياسات IAM

عنصر **Condition** في السياسة يضيق متى تنطبق الصلاحية. وهذي أشهرها:

| الشرط | الاستخدام |
| --- | --- |
| `aws:SourceIp` | من شبكة المكتب فقط |
| `aws:RequestedRegion` | في مناطق محددة فقط |
| `aws:MultiFactorAuthPresent` | فقط لو سجل الدخول بـ MFA |
| `aws:ResourceTag` و`aws:PrincipalTag` | لازم وسم المستخدم يطابق وسم المورد |
| `aws:PrincipalOrgID` | من حسابات منظمتك فقط |

والأخير هدية للحاويات المشتركة. بدل ما تعدد خمسين حساب في سياسة الحاوية، سطر واحد يسمح لمنظمتك كلها:

```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::shared-files/*",
  "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
}
```

### غلطة S3 الكلاسيكية

إجراءات S3 تشتغل على مستويين، وكل واحد يحتاج ARN خاص فيه:

| الإجراء | ينطبق على | ARN |
| --- | --- | --- |
| `s3:ListBucket` | الحاوية | `arn:aws:s3:::my-bucket` |
| `s3:GetObject` | الكائن | `arn:aws:s3:::my-bucket/*` |

حط الغلط ويجيك `AccessDenied`، مهما بدت السياسة صحيحة. وبنجرب هذا في التجربة العملية.

## دور أو سياسة مورد؟

عشان تخلي مستخدم في حساب A يوصل لشي في حساب B، عندك طريقين:

| | تقمص دور | سياسة مورد |
| --- | --- | --- |
| **كيف** | المستخدم يصير الدور في B | المورد في B يسمح للمستخدم مباشرة |
| **صلاحياته الأصلية** | يتركها طول ما هو في الدور | يحتفظ فيها |
| **يناسب** | الشغل بالكامل داخل الحساب الثاني | القراءة من جدول في A والكتابة في حاوية في B بنفس الوقت |
| **متاح في** | كل الخدمات | اللي تدعمها فقط، مثل S3 وSNS وSQS وLambda |

ووراء كل دور تفترضه خدمة **AWS STS** (Security Token Service). هي اللي تعطي الصلاحيات المؤقتة، وتنتهي لحالها. وبهذي الطريقة يشتغل الوصول بين الحسابات بدون مشاركة مفاتيح طويلة المدى: مستخدم أو خدمة تنادي `AssumeRole`، وSTS تفحص سياسة الثقة في الدور، وترجع مفاتيح تشتغل فترة محدودة.

## حدود الصلاحيات (Permissions Boundaries)

تبي قادة الفرق ينشئون أدوار لخدماتهم، بدون ما يقدرون يعطون أحد أكثر مما لازم. **Permissions Boundary** يحدد الحد الأقصى لمستخدم أو دور معين، ومثل SCP ما يعطي شي.

والصلاحية الفعلية هي المسموح في سياسة الهوية **و**الحد **و**SCP مع بعض. وهي طريقة ممتازة للتفويض بأمان.

### كيف تقرر AWS؟

كل طلب يمر بهذا التفكير. وهذي نسخة مبسطة:

<figure class="diagram">
<svg viewBox="0 0 640 344" role="img" aria-labelledby="evalflow-caption">
<defs>
<marker id="evalflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="220" y="14" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="43" text-anchor="middle" class="d-label">فيه منع صريح في أي مكان؟</text>
<rect x="220" y="82" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="111" text-anchor="middle" class="d-label">SCP وRCP تسمح به؟</text>
<rect x="220" y="150" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="179" text-anchor="middle" class="d-label">سياسة هوية أو مورد تسمح به؟</text>
<rect x="220" y="218" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="420" y="247" text-anchor="middle" class="d-label">حد الصلاحيات يسمح به؟</text>
<rect x="220" y="286" width="400" height="44" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="420" y="313" text-anchor="middle" class="d-label">مسموح</text>
<rect x="20" y="14" width="140" height="252" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="90" y="145" text-anchor="middle" class="d-label">مرفوض</text>
<line x1="220" y1="38" x2="162" y2="38" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="220" y1="106" x2="162" y2="106" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="220" y1="174" x2="162" y2="174" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="220" y1="242" x2="162" y2="242" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<text x="191" y="30" text-anchor="middle" class="d-small">نعم</text>
<text x="191" y="98" text-anchor="middle" class="d-small">لا</text>
<text x="191" y="166" text-anchor="middle" class="d-small">لا</text>
<text x="191" y="234" text-anchor="middle" class="d-small">لا</text>
<line x1="420" y1="62" x2="420" y2="80" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="420" y1="130" x2="420" y2="148" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="420" y1="198" x2="420" y2="216" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="420" y1="266" x2="420" y2="284" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
</svg>
<figcaption id="evalflow-caption">صورة مبسطة لقرار AWS: أي منع صريح ينهي الموضوع، وكل طبقة تنطبق لازم تسمح بالإجراء.</figcaption>
</figure>

تذكر ثلاث قواعد: **المنع الصريح يكسب دايماً**، و**أي شي غير مسموح ممنوع**، وداخل الحساب الواحد، سياسة المورد تقدر تعطي الوصول لحالها في حالات كثيرة.

## IAM Identity Center: دخول واحد

بدل مستخدم في كل حساب، **IAM Identity Center** يعطي كل موظف دخول واحد وبوابة فيها الحسابات والأدوار المتاحة له، وياخذ بيانات دخول مؤقتة بدون مفاتيح دائمة.

| الجزء | وش يسوي |
| --- | --- |
| **مصدر الهوية** | دليله الخاص، أو Active Directory، أو مزود خارجي مثل Okta أو Microsoft Entra ID |
| **Permission Sets** | مجموعة سياسات تصير دور في كل حساب تربطها فيه |
| **الربط** | "مجموعة المطورين تاخذ Admin على حساب التطوير، وReadOnly على الإنتاج" |
| **التطبيقات** | دخول موحد لتطبيقات SAML كمان |

وللـ CLI، الأمر `aws configure sso` يسجل دخولك عبر المتصفح ويعطيك بيانات مؤقتة. وهذي الطريقة الموصى فيها للناس عشان يشتغلون مع AWS هالأيام، بدل مستخدمي IAM بمفاتيح طويلة الأمد.

### الدخول من هوية خارجية (Federation)

**Federation** يعني أشخاص أو أنظمة يدخلون بهوية موجودة خارج AWS وياخذون صلاحيات مؤقتة، بدون إنشاء مستخدم IAM. واختيارك يعتمد على مين يدخل:

| مين | استخدم |
| --- | --- |
| **موظفين على حسابات كثيرة** | Identity Center زي ما شرحنا، وهذي توصية AWS |
| **حساب واحد، أو أنظمة مثل GitHub Actions** | Identity Provider في IAM عبر SAML 2.0 أو OIDC، مع دور يفترضونه |
| **مستخدمي تطبيقك** | [Identity Pools في Cognito](/posts/aws-22-serverless-design/) |

### Active Directory على AWS

شركات كثيرة تحفظ مستخدميها في **Microsoft Active Directory**. و**AWS Directory Service** يربطه بـ AWS:

| الخيار | كيف يشتغل | يناسب |
| --- | --- | --- |
| **Managed Microsoft AD** | AD حقيقي مُدار في AWS، ويقدر يثق في حقك | تطبيقات تعتمد على AD وتشتغل على AWS |
| **AD Connector** | وسيط يمرر الطلبات لـ AD حقك وما يخزن شي | إبقاء المستخدمين في AD حقك |
| **Simple AD** | دليل صغير مبني على Samba | مقفل على العملاء الجدد منذ يوليو 2026 |

## AWS Control Tower

تجهيز كل هذا بيدك ياخذ أسابيع. **Control Tower** يبني **Landing Zone** بأفضل الممارسات فوق Organizations، ومعها حسابات السجلات والتدقيق، ويضيف:

- **Account Factory:** إنشاء حسابات جديدة بإعدادات جاهزة.
- **Controls:** وقائية عبر SCP، وكشفية عبر [Config](/posts/aws-25-monitoring-auditing/)، واستباقية تفحص الموارد قبل إنشائها.
- **لوحة:** تبين الملتزم من غيره بنظرة وحدة.

لو تبدأ بيئة حسابات متعددة من الصفر، ابدأ من هنا.

## عملي: اختبر السياسات بدون ما تلمس شي

**محاكي السياسات** يقيّم السياسة بدون ما ينشئ شي أو ينفذ الإجراء، وهذا ممتاز للتعلم. من CloudShell، اكتب سياسة تسمح بـ S3 وEC2، وحد يسمح بـ S3 فقط:

```bash
cat > identity.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:*", "ec2:*"],
    "Resource": "*"
  }]
}
EOF

cat > boundary.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": "*"
  }]
}
EOF
```

اختبر ثلاث إجراءات بالسياسة لحالها:

```bash
aws iam simulate-custom-policy --policy-input-list file://identity.json \
  --action-names s3:GetObject ec2:RunInstances iam:CreateUser \
  --query "EvaluationResults[].[EvalActionName,EvalDecision]" --output table
```

S3 وEC2 يطلع لهم `allowed`، وIAM يطلع له `implicitDeny` لأن ما فيه شي يسمح به. الحين أضف الحد:

```bash
aws iam simulate-custom-policy --policy-input-list file://identity.json \
  --permissions-boundary-policy-input-list file://boundary.json \
  --action-names s3:GetObject ec2:RunInstances \
  --query "EvaluationResults[].[EvalActionName,EvalDecision]" --output table
```

EC2 صار `implicitDeny`، مع إن السياسة تسمح به. الحين شوف إن **المنع يكسب دايماً**، بإضافة منع صريح لحذف الحاويات:

```bash
cat > deny.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "s3:DeleteBucket",
    "Resource": "*"
  }]
}
EOF

aws iam simulate-custom-policy \
  --policy-input-list file://identity.json file://deny.json \
  --action-names s3:GetObject s3:DeleteBucket \
  --query "EvaluationResults[].[EvalActionName,EvalDecision]" --output table
```

`s3:GetObject` يبقى `allowed`، و`s3:DeleteBucket` يطلع له `explicitDeny`، مع إن السياسة الأولى تسمح بـ `s3:*`. جرب بعدها شرط: الوصول من شبكة المكتب فقط، واختبر من عنوانين:

```bash
cat > office.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "*",
    "Condition": { "IpAddress": { "aws:SourceIp": "203.0.113.0/24" } }
  }]
}
EOF

for ip in 203.0.113.10 198.51.100.7; do
  aws iam simulate-custom-policy --policy-input-list file://office.json \
    --action-names s3:GetObject \
    --context-entries "ContextKeyName=aws:SourceIp,ContextKeyValues=$ip,ContextKeyType=ip" \
    --query "EvaluationResults[0].EvalDecision" --output text
done
```

العنوان الأول `allowed`، والثاني `implicitDeny`. وأخيراً، غلطة S3 الكلاسيكية، صلاحية عرض مع ARN الكائن:

```bash
cat > list.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:ListBucket",
    "Resource": "arn:aws:s3:::shop/*"
  }]
}
EOF

aws iam simulate-custom-policy --policy-input-list file://list.json \
  --action-names s3:ListBucket --resource-arns arn:aws:s3:::shop \
  --query "EvaluationResults[0].EvalDecision" --output text
```

يطلع `implicitDeny`. السياسة تبدو صحيحة، بس الصلاحية تنطبق على الحاوية، مو على اللي فيها. غيّر المورد إلى `arn:aws:s3:::shop` وجرب مرة ثانية، وبيطلع `allowed`.

::: security ما فيه شي تحذفه
المحاكي ما ينشئ شي وما يكلف شي. تقدر تختبر أي سياسة بهذي الطريقة قبل ما تطبقها، والكونسول فيه نسخة مرئية كمان اسمها **IAM Policy Simulator**.
:::

## الخلاصة

- **Organizations** يجمع الحسابات تحت فاتورة وحدة، و**SCP** تحدد سقف وما تعطي شي.
- **الشروط** تضيق الصلاحيات بالشبكة والمنطقة وMFA والوسوم، و`aws:PrincipalOrgID` يفتح الوصول لمنظمتك فقط.
- **الدور** يخليك تترك صلاحياتك الأصلية، و**سياسة المورد** تبقيها.
- **Permissions Boundary** يفوض بأمان، و**المنع الصريح يكسب دايماً**.
- **Identity Center** يعطي دخول واحد ببيانات مؤقتة، و**Control Tower** يبني كل هذا بأفضل الممارسات.

## اختبر نفسك

::: quiz
شركة تبي تتأكد إن ما أحد في حسابات التطوير يقدر يشغّل أي شي خارج Regionين، ولا حتى مدراء هذي الحسابات. وش يناسب؟

- [ ] سياسة IAM على كل مستخدم
- [ ] Permissions Boundary على كل دور
- [x] SCP على وحدة التطوير (OU)
- [ ] قاعدة Config تبلغ عن الـ Regions الثانية

الـ SCP تحدد سقف لكل مستخدم ودور في الحسابات اللي تحتها، بما فيهم المستخدم الجذر. وهي ما تعطي شي، فالناس لسا يحتاجون صلاحيات IAM خاصة فيهم.

- **A:** مدراء الحساب يقدرون يغيرونها ببساطة.
- **B:** هذا يحد مستخدم أو دور واحد في كل مرة، والمدير يقدر يشيله.
- **D:** هذا يعلّم الموارد غير ملتزمة، وما يوقف شي.

للمراجعة: [Service Control Policies (SCP)](#service-control-policies-scp) في هذا الجزء، و[Service control policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html) في وثائق AWS.
:::

::: quiz
شركة تبي قادة الفرق ينشئون أدوار لخدماتهم، بدون ما يقدرون يعطون أكثر من وصول S3 وDynamoDB. وش يناسب؟

- [x] Permissions Boundary على الأدوار اللي ينشئونها
- [ ] SCP على حساب الفريق
- [ ] صلاحية مدير، مع قاعدة مكتوبة
- [ ] Permission Sets في Identity Center

الـ Permissions Boundary يحدد الحد الأقصى لمستخدم أو دور وما يعطي شي بنفسه، فالدور ما يتجاوزه أبداً مهما كانت سياسته.

- **B:** هذا يحد الحساب كامل، والشغل الثاني فيه ممكن يحتاج خدمات ثانية.
- **C:** القاعدة المكتوبة ما توقف أحد.
- **D:** هذي تعطي الناس وصول للحسابات، وما تحد الأدوار اللي ينشئونها.

للمراجعة: [حدود الصلاحيات (Permissions Boundaries)](#حدود-الصلاحيات-permissions-boundaries) في هذا الجزء، و[Permissions boundaries for IAM entities](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html) في وثائق AWS.
:::

::: quiz
شركة عندها 50 حساب و500 موظف، وتحفظ مستخدميها في Microsoft Entra ID. وتبي دخول واحد، بدون مفاتيح طويلة المدى، ووصول مختلف لكل حساب. وش يناسب؟

- [ ] مستخدم IAM لكل موظف في كل حساب
- [ ] مستخدم IAM مشترك لكل فريق
- [ ] AWS Control Tower، مع Account Factory
- [x] IAM Identity Center، مع Permission Sets

الموظف يدخل مرة وحدة ويشوف الحسابات والأدوار المتاحة له، بصلاحيات مؤقتة. والـ Permission Set يصير دور في كل حساب تربطه فيه.

- **A:** هذا يعني آلاف المستخدمين والمفاتيح طويلة المدى اللي لازم تديرها.
- **B:** هذا يضيّع مين سوى وش، ويشارك مفاتيح طويلة المدى.
- **C:** هذا يبني Landing Zone وينشئ الحسابات، وما يعطي الناس دخولهم لحاله.

للمراجعة: [IAM Identity Center: دخول واحد](#iam-identity-center-دخول-واحد) في هذا الجزء، و[Manage AWS accounts with permission sets](https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html) في وثائق AWS.
:::

::: quiz
تطبيق في الحساب A لازم يقرأ من جدول DynamoDB في الحساب A ويكتب في حاوية S3 في الحساب B بنفس الوقت، بهوية وحدة. وش يناسب؟

- [ ] افتراض دور في الحساب B
- [x] سياسة حاوية في الحساب B تسمح لدور التطبيق
- [ ] SCP تسمح بالإجراء
- [ ] Permissions Boundary يسمح بالإجراء

مع سياسة المورد يحتفظ التطبيق بصلاحياته، فيقدر يستخدم الجدول في A والحاوية في B مع بعض.

- **A:** وهو في الدور يتخلى عن صلاحياته الأصلية، فيفقد الجدول في A.
- **C:** الـ SCP ما تعطي شي.
- **D:** الـ Boundary ما يعطي شي.

للمراجعة: [دور أو سياسة مورد؟](#دور-أو-سياسة-مورد) في هذا الجزء، و[Cross account resource access in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_compare-resource-policies.html) في وثائق AWS.
:::

::: quiz
دور لازم يعرض الكائنات في حاوية اسمها `reports` ويقرأها. أي **عبارتين** لازم يكونون في سياسته؟ (اختر اثنين.)

- [ ] `s3:ListBucket` على `arn:aws:s3:::reports/*`
- [x] `s3:ListBucket` على `arn:aws:s3:::reports`
- [ ] `s3:GetObject` على `arn:aws:s3:::reports`
- [x] `s3:GetObject` على `arn:aws:s3:::reports/*`
- [ ] `s3:*` على `*`

إجراءات S3 تشتغل على مستويين: العرض على الحاوية، والقراءة على الكائنات، فكل واحد يحتاج ARN خاص فيه.

- **A:** العرض على الحاوية، فهذا الـ ARN يعطي `AccessDenied`.
- **C:** القراءة على الكائنات، فهذا الـ ARN يعطي `AccessDenied`.
- **E:** هذا يشتغل، بس يعطي أكثر بكثير من اللازم، وعلى كل الحاويات.

للمراجعة: [غلطة S3 الكلاسيكية](#غلطة-s3-الكلاسيكية) في هذا الجزء، و[Grant read and write access to Amazon S3 bucket objects](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_rw-bucket.html) في وثائق AWS.
:::

::: quiz
مهمة ليلية في الحساب A لازم تشتغل بالكامل داخل الحساب B كم دقيقة. وفريق الأمان يمنع المفاتيح طويلة المدى. وش يناسب؟

- [ ] مستخدم IAM في الحساب B، ومفاتيحه محفوظة في المهمة
- [ ] نسخ دور المهمة إلى الحساب B
- [ ] SCP تسمح للمهمة
- [x] دور في الحساب B يثق في الحساب A، تفترضه المهمة عبر STS

المهمة تنادي `AssumeRole`، وSTS تفحص سياسة الثقة في الدور وترجع صلاحيات مؤقتة، فما فيه مفاتيح طويلة المدى تحفظها.

- **A:** هذي المفاتيح طويلة المدى اللي يمنعها الفريق.
- **B:** الأدوار ما تنسخ بين الحسابات، والوصول لسا يحتاج سياسة ثقة.
- **C:** الـ SCP ما تعطي شي.

للمراجعة: [دور أو سياسة مورد؟](#دور-أو-سياسة-مورد) في هذا الجزء، و[Temporary security credentials in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html) في وثائق AWS.
:::

::: quiz
مسار GitHub Actions ينشر على حساب AWS واحد، ومفاتيح الوصول محفوظة كأسرار في المستودع. والفريق يبي يوقف حفظ المفاتيح. وش يناسب؟

- [ ] تغيير مفاتيح الوصول كل أسبوع
- [x] OIDC Identity Provider في IAM، مع دور يفترضه المسار
- [ ] IAM Identity Center، مع مستخدم للمسار
- [ ] Cognito User Pool للمسار

المسار يثبت هويته بتوكن من GitHub، وياخذ صلاحيات مؤقتة عبر الدور، فما فيه مفاتيح تحفظها.

- **A:** هذا يقصر عمر المفاتيح، ولسا محفوظة.
- **C:** هذا لدخول الأشخاص، مو لأنظمة مثل مسار النشر.
- **D:** هذا لمستخدمي تطبيقك، مو للوصول لحساب AWS.

للمراجعة: [الدخول من هوية خارجية (Federation)](#الدخول-من-هوية-خارجية-federation) في هذا الجزء، و[Identity providers and federation into AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers.html) في وثائق AWS.
:::

ضبطت مين يوصل لبياناتك. طيب لو وصل لها أحد بأي طريقة، أو هاجم موقعك من برا؟ في [**الجزء السابع والعشرين**](/posts/aws-27-encryption-secrets-protection/) نغطي التشفير والأسرار والحماية من الهجمات.
