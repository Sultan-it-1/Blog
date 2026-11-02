---
title: "التكلفة والتصميم الجيد"
description: ختام السلسلة. وين تروح فلوس الشبكة، والأدوات اللي تراقب فاتورتك، وإطار Well-Architected، وبناء كل شي من قالب بـ CloudFormation، وSystems Manager، ووين تروح بعد هذي السلسلة، مع تجربة عملية.
date: 2026-11-02
series: aws
part: 29
numbered: true
tags: [aws, operations]
---

مشيت طريق طويل من [الجزء الأول](/posts/aws-01-global-infrastructure/). في هذا الجزء الأخير نجاوب سؤالين ينطبقون على كل اللي بنيناه: **كم يكلف؟** و**هل هو مصمم صح؟** وبعدها نحول كل هذا لملف تقدر تعيد بناءه بأمر واحد.

## وين تروح فلوس الشبكة؟

أغلب الناس يخططون للسيرفرات والتخزين، ثم يتفاجأون بنقل البيانات. والأسعار هنا تقريبية لمناطق أمريكا:

<figure class="diagram">
<svg viewBox="0 0 640 290" role="img" aria-labelledby="netcost-caption">
<defs>
<marker id="netcost-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="206" y="14" width="420" height="262" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="416" y="38" text-anchor="middle" class="d-label">المنطقة</text>
<rect x="430" y="50" width="180" height="124" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="520" y="70" text-anchor="middle" class="d-small">منطقة توفر 1</text>
<rect x="525" y="82" width="70" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="560" y="109" text-anchor="middle" class="d-label">EC2</text>
<rect x="445" y="82" width="70" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="480" y="109" text-anchor="middle" class="d-label">EC2</text>
<line x1="525" y1="104" x2="517" y2="104" stroke="var(--color-accent)" stroke-width="2"/>
<text x="520" y="152" text-anchor="middle" class="d-small">مجاني بعناوين خاصة</text>
<rect x="222" y="50" width="180" height="124" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="312" y="70" text-anchor="middle" class="d-small">منطقة توفر 2</text>
<rect x="277" y="82" width="70" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="312" y="109" text-anchor="middle" class="d-label">EC2</text>
<line x1="445" y1="104" x2="349" y2="104" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#netcost-arrow)"/>
<text x="416" y="204" text-anchor="middle" class="d-small">بين مناطق التوفر: 0.01 دولار لكل GB بكل اتجاه</text>
<text x="416" y="240" text-anchor="middle" class="d-small">الداخل من الإنترنت: مجاني</text>
<rect x="20" y="30" width="140" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="60" text-anchor="middle" class="d-label">الإنترنت</text>
<text x="90" y="80" text-anchor="middle" class="d-small">حوالي 0.09 دولار</text>
<rect x="20" y="170" width="140" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="200" text-anchor="middle" class="d-label">منطقة ثانية</text>
<text x="90" y="220" text-anchor="middle" class="d-small">من 0.02 دولار</text>
<line x1="206" y1="65" x2="162" y2="65" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#netcost-arrow)"/>
<line x1="206" y1="205" x2="162" y2="205" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#netcost-arrow)"/>
</svg>
<figcaption id="netcost-caption">البيانات الداخلة إلى AWS مجانية، وداخل المنطقة بعناوين خاصة كمان. وتدفع لما تعبر حد: بين مناطق التوفر، أو بين المناطق، أو إلى الإنترنت.</figcaption>
</figure>

| الاتجاه | السعر التقريبي لكل GB |
| --- | --- |
| **إلى AWS من الإنترنت** | مجاني |
| **داخل منطقة توفر واحدة بعناوين خاصة** | مجاني |
| **بين مناطق التوفر** | 0.01 دولار لكل اتجاه |
| **بين المناطق** | من حوالي 0.02 دولار، ويختلف حسب المنطقة |
| **إلى الإنترنت** | حوالي 0.09 دولار وينزل مع الكمية، وأول 100 GB في الشهر مجانية |

الأرقام الصغيرة تتجمع بسرعة. ست أشياء تقللها:

- **استخدم العناوين الخاصة** داخل الـ VPC بدل العامة، ولاحظ إن كل عنوان IPv4 عام عليه رسوم بالساعة كمان.
- **حط CloudFront قدام تطبيقك.** البيانات من AWS إلى CloudFront مجانية، والخروج عبره أرخص من الخروج المباشر.
- **أضف Gateway Endpoint** لـ [S3 وDynamoDB](/posts/aws-14-vpc-connectivity/). مجاني، ويوفر عليك رسوم NAT لكل GB.
- **NAT Gateway لكل منطقة توفر،** عشان ما تعبر البيانات بين المناطق توصله.
- **قرّب الخدمات كثيرة الكلام.** بس وازن هذا مع التوفر، لأن التوزيع بين المناطق يستاهل الدفع.
- **اضغط اللي ترسله،** وخزنه مؤقتاً في أقرب مكان تقدر عليه.

## وين الكاش؟

كل طبقة توفر الشغل على اللي وراها، فكل ما كان قدام كان أفضل، وشفناها كلها:

| الطبقة | الأداة | توفر |
| --- | --- | --- |
| **الحافة** | [CloudFront](/posts/aws-12-cloudfront-global-accelerator/) | الرحلة كلها، للمحتوى اللي نفسه للكل |
| **الـ API** | [كاش API Gateway](/posts/aws-22-serverless-design/) | الدالة وقاعدة البيانات |
| **التطبيق** | [ElastiCache](/posts/aws-09-elasticache/) | الاستعلامات والحسابات الثقيلة |
| **قاعدة البيانات** | [DAX](/posts/aws-21-lambda-api-dynamodb/) أو نسخة قراءة | القراءات من القاعدة الأساسية |

## أدوات تراقب فاتورتك

| الأداة | وش تسوي |
| --- | --- |
| **Cost Explorer** | ترسم صرفك حسب الخدمة والحساب والوسم، وتتوقعه، وتوصي بـ Savings Plans |
| **Budgets** | تنبهك لما توصل حد أو يتوقع توصله، والمراقبة مجانية |
| **Cost Anomaly Detection** | تستخدم تعلم الآلة لكشف الصرف غير المعتاد، بدون رسوم |
| **Cost Optimization Hub** | تجمع توصيات التوفير في مكان واحد: تغيير الأحجام والموارد الخاملة وغيرها |
| **Compute Optimizer** | يوصي بالأحجام المناسبة حسب استخدامك الفعلي |

وأول خطوة هي **الوسوم**: بدون وسم `env` أو `team`، ما تعرف مين يصرف وش.

### توفير سريع

| الإجراء | وين شفناه |
| --- | --- |
| صغّر السيرفرات الكبيرة زيادة | [الجزء الثالث](/posts/aws-03-ec2-first-server/) |
| التزم بـ Savings Plans، واستخدم Spot للي يتحمل الانقطاع | [الجزء الرابع](/posts/aws-04-ec2-pricing-networking/) |
| أوقف سيرفرات التطوير بالليل، مثلاً بـ **Instance Scheduler on AWS** | هذا الجزء |
| قواعد دورة الحياة لـ S3 | [الجزء السادس عشر](/posts/aws-16-s3-classes-lifecycle/) |
| حدد مدة حفظ للسجلات | [الجزء الخامس والعشرين](/posts/aws-25-monitoring-auditing/) |
| احذف الأقراص واللقطات وموزعات الحمل المهملة | [الجزء الخامس](/posts/aws-05-ec2-storage/) |

## إطار Well-Architected

AWS لخصت اللي تعلمته من عملائها في ست ركائز. اعتبرها مراجعة لأي تصميم:

| الركيزة | السؤال | غطيناها في |
| --- | --- | --- |
| **التميز التشغيلي** | تقدر تشغله وتحسنه؟ | [المراقبة](/posts/aws-25-monitoring-auditing/) والقوالب |
| **الأمان** | البيانات والوصول محمية؟ | [IAM](/posts/aws-02-iam/) و[التشفير](/posts/aws-27-encryption-secrets-protection/) |
| **الاعتمادية** | ينجو من الأعطال ويتعافى؟ | [التوسع](/posts/aws-07-auto-scaling/) و[التعافي](/posts/aws-28-disaster-recovery-migration/) |
| **كفاءة الأداء** | تستخدم الموارد المناسبة؟ | [الكاش](/posts/aws-09-elasticache/) و[اختيار القاعدة](/posts/aws-10-choosing-database/) |
| **تحسين التكلفة** | تدفع على شي ما تحتاجه؟ | هذا الجزء |
| **الاستدامة** | تقلل استهلاكك وأثره؟ | الأحجام المناسبة و[Graviton](/posts/aws-03-ec2-first-server/) |

والركائز تتعارض أحياناً: نسخ أكثر تعني اعتمادية أفضل وتكلفة أعلى. والهدف مو إنك توصل الأقصى في كل شي، بل إنك تختار وأنت فاهم.

- **AWS Well-Architected Tool:** أداة مجانية في الكونسول تسألك عن شغلك وتبين المخاطر.
- **Trusted Advisor:** يفحص حسابك مقابل أفضل الممارسات. في الخطة المجانية تاخذ حدود الخدمات وكم فحص للأمان والتحمل، والباقي يحتاج خطة دعم مدفوعة. ولاحظ إن AWS تغير خطط الدعم، و**Developer** و**Business** تنتهي في 1 يناير 2027 لصالح **Business Support+**.

## CloudFormation: بنيتك في ملف

إلى الآن سوينا كل شي بيدنا أو بالأوامر. طيب لو تقدر توصف كل هذا في ملف؟ **AWS CloudFormation** يقرأ **قالب (Template)** ويبني **Stack** من الموارد بالترتيب الصحيح، و:

- **قابل للتكرار:** نفس البيئة للتطوير والاختبار والإنتاج.
- **قابل للمراجعة:** القالب في Git مثل الكود، وتراجع تغييراته.
- **تحت السيطرة:** **Change Set** يبين وش بيتغير قبل ما يصير، و**Drift Detection** يكشف التعديلات اليدوية.
- **نظيف:** حذف الـ Stack يحذف كل اللي فيه، فما يبقى شي يحاسبك.
- **مجاني:** تدفع على الموارد اللي ينشئها فقط.

و**Infrastructure Composer** يخليك ترسم القالب بالواجهة، و**AWS CDK** يكتبه بـ Python أو TypeScript. و**Service Role** يخلي المطور ينشر Stack بدون ما يكون عنده صلاحية على الموارد نفسها.

## Systems Manager: تشغيل سيرفراتك

**AWS Systems Manager** يدير أساطيل السيرفرات عبر وكيل، مثبت أصلاً في Amazon Linux، ودور IAM:

| الأداة | وش تسوي |
| --- | --- |
| **Session Manager** | طرفية بدون منفذ SSH وبدون مفاتيح، والجلسات تنسجل |
| **Run Command** | أمر واحد على ألف سيرفر |
| **Patch Manager** | يطبق التحديثات بجدول |
| **Maintenance Windows** | يحدد متى يسمح بهذي الأشياء |
| **Automation** | مستندات جاهزة لمهام معروفة، مثل معالجة [Config](/posts/aws-25-monitoring-auditing/) |

## خدمات تستاهل تعرفها

آخر مجموعة، وكل وحدة تستاهل سطر:

| الخدمة | لوش |
| --- | --- |
| **SES** | إرسال الإيميل، للمعاملات والتسويق، مع حماية سمعتك |
| **AWS Batch** | شغل دفعات بأي حجم، على EC2 أو Fargate، بدون حد 15 دقيقة مثل [Lambda](/posts/aws-21-lambda-api-dynamodb/) |
| **AWS Outposts** | سيرفرات AWS في مركز بياناتك، لما لازم تبقى البيانات عندك |
| **Amazon AppFlow** | نقل البيانات من تطبيقات SaaS مثل Salesforce إلى S3 أو Redshift بدون كود |
| **AWS Amplify** | بناء واستضافة تطبيقات الويب والجوال بسرعة |

ولو قرأت مقالات قديمة، **Amazon Pinpoint** وصل لنهاية دعمه في 30 أكتوبر 2026. وAWS توجّه لـ **SES** للإيميل، ولـ **AWS End User Messaging** للرسائل النصية وإشعارات الجوال.

### الحوسبة عالية الأداء

لما تحتاج آلاف المعالجات تشتغل مع بعض:

| الحاجة | الأدوات |
| --- | --- |
| **الحوسبة** | [Placement Group](/posts/aws-04-ec2-pricing-networking/) من نوع Cluster، مع Enhanced Networking أو EFA، وSpot لو أمكن |
| **التخزين** | [FSx for Lustre](/posts/aws-18-storage-transfer/) وInstance Store وS3 |
| **التنسيق** | AWS Batch أو **AWS ParallelCluster** |
| **نقل البيانات** | [Direct Connect أو DataSync](/posts/aws-18-storage-transfer/) |

## عملي: Stack كامل من ملف، وميزانية بتبقيها

اكتب قالب صغير فيه حاوية وموضوع SNS. من CloudShell:

```bash
cat > stack.yaml <<'EOF'
AWSTemplateFormatVersion: "2010-09-09"
Description: A small stack from the AWS series
Parameters:
  Env:
    Type: String
    Default: dev
Resources:
  Files:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      Tags:
        - Key: env
          Value: !Ref Env
  Alerts:
    Type: AWS::SNS::Topic
Outputs:
  BucketName:
    Value: !Ref Files
EOF

aws cloudformation deploy --stack-name series-stack --template-file stack.yaml

aws cloudformation describe-stack-resources --stack-name series-stack \
  --query "StackResources[].[LogicalResourceId,ResourceType,ResourceStatus]" \
  --output table
```

CloudFormation بنى الموردين وسماهم بنفسه. الحين غيّر قيمة وحدة. يحدث اللي تغيّر فقط، بدون ما يلمس الباقي:

```bash
aws cloudformation deploy --stack-name series-stack \
  --template-file stack.yaml --parameter-overrides Env=prod

BUCKET=$(aws cloudformation describe-stacks --stack-name series-stack \
  --query "Stacks[0].Outputs[0].OutputValue" --output text)

aws s3api get-bucket-tagging --bucket $BUCKET \
  --query "TagSet[?Key=='env'].Value" --output text
```

يطبع `prod`. الحين أحلى جزء، حذف كل شي بأمر واحد:

```bash
aws cloudformation delete-stack --stack-name series-stack
aws cloudformation wait stack-delete-complete --stack-name series-stack
echo "Everything is gone"
```

وأخيراً، شي **تبقيه**: ميزانية 10 دولار في الشهر تنبهك لما يتوقع تتجاوز 80% منها. بدّل الإيميل بإيميلك:

```bash
EMAIL=you@example.com
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

cat > budget.json <<'EOF'
{
  "BudgetName": "series-monthly",
  "BudgetLimit": {"Amount": "10", "Unit": "USD"},
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
EOF

cat > notify.json <<EOF
[{
  "Notification": {
    "NotificationType": "FORECASTED",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 80,
    "ThresholdType": "PERCENTAGE"
  },
  "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "$EMAIL"}]
}]
EOF

aws budgets create-budget --account-id $ACCOUNT \
  --budget file://budget.json \
  --notifications-with-subscribers file://notify.json

aws budgets describe-budgets --account-id $ACCOUNT \
  --query "Budgets[].[BudgetName,BudgetLimit.Amount,BudgetLimit.Unit]" --output table
```

لو جاك `AccessDenied`، ممكن مستخدم IAM حقك يحتاج وصول للفوترة، وهذا يفعّله مستخدم Root من إعدادات الحساب.

::: security قبل ما تقفل الصفحة
هذي الميزانية مجانية، فخلها. والحين بعد ما خلصت السلسلة، طالع **Cost Explorer** وصفحة [EC2](/posts/aws-03-ec2-first-server/) في كل منطقة جربت فيها، عشان تتأكد ما فيه تجربة لسا شغالة.
:::

## الخلاصة

- **نقل البيانات** هو التكلفة المخفية: بين مناطق التوفر، وبين المناطق، وإلى الإنترنت.
- **Budgets** و**Cost Anomaly Detection** ينبهونك قبل الفاتورة.
- **إطار Well-Architected** ست ركائز، والفكرة إنك تختار وأنت فاهم.
- **CloudFormation** يحول بنيتك إلى ملف تراجعه وتحذفه.
- **Systems Manager** يدير سيرفراتك بدون SSH.

## اختبر نفسك

::: quiz
سيرفرين EC2 في نفس منطقة التوفر يتبادلون تيرابايتات كل شهر عبر عناوين IP العامة لبعض، والنقل يطلع في الفاتورة. وش أبسط حل؟

- [ ] نقل سيرفر إلى منطقة توفر ثانية
- [x] استخدام عناوينهم الخاصة بدلها
- [ ] وضع NAT Gateway بينهم
- [ ] الانتقال لأنواع سيرفرات أكبر

البيانات بين السيرفرات في منطقة توفر واحدة مجانية عبر العناوين الخاصة، والزيارات عبر العنوان العام مدفوعة.

- **A:** عبور المناطق مدفوع في كل اتجاه.
- **C:** الـ NAT Gateway يضيف رسم على كل جيجابايت.
- **D:** حجم السيرفر ما يغير تكلفة النقل.

للمراجعة: [وين تروح فلوس الشبكة؟](#وين-تروح-فلوس-الشبكة) في هذا الجزء، و[EC2 On-Demand Instance Pricing](https://aws.amazon.com/ec2/pricing/on-demand/) في موقع AWS.
:::

::: quiz
فريق صغير يبي إيميل لما يتوقع إن صرف AWS هذا الشهر بيتجاوز حده، مو بعد ما توصل الفاتورة. وش يناسب؟

- [x] AWS Budgets
- [ ] Cost Explorer، يفتحونه كل صباح
- [ ] Compute Optimizer
- [ ] AWS Config

الميزانية تقدر تنبه على الصرف المتوقع والصرف الفعلي، والمراقبة نفسها مجانية.

- **B:** هذا يرسم صرفك ويتوقعه، بس لازم أحد يروح يشوفه.
- **C:** هذا يقترح الأحجام المناسبة، وما يرسل تنبيهات صرف.
- **D:** هذا يسجل الإعدادات، مو الصرف.

للمراجعة: [أدوات تراقب فاتورتك](#أدوات-تراقب-فاتورتك) في هذا الجزء، و[Managing your costs with AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html) في وثائق AWS.
:::

::: quiz
فريق يبي يراجع تصميم تطبيق واحد مقابل أفضل ممارسات AWS، بالإجابة على أسئلة عنه ورؤية المخاطر. وش يناسب؟

- [ ] Amazon Inspector
- [ ] AWS Trusted Advisor
- [ ] AWS CloudTrail
- [x] AWS Well-Architected Tool

الأداة تسألك عن شغلك وتبين لك المخاطر، وهي مجانية في الكونسول.

- **A:** هذا يفحص اللي تشغله عن الثغرات المعروفة، وما يراجع التصميم.
- **B:** هذا يفحص موارد حسابك لحاله، وما يسأل عن تطبيق معين.
- **C:** هذا يسجل مين نادى وش.

للمراجعة: [إطار Well-Architected](#إطار-well-architected) في هذا الجزء، و[AWS Well-Architected Tool FAQs](https://aws.amazon.com/well-architected-tool/faqs/) في موقع AWS.
:::

::: quiz
فريق يبي نفس البيئة في التطوير والإنتاج من ملف واحد في Git، ويشوف وش بيغيره التحديث قبل ما يصير، ويعرف لو عدّل أحد مورد يدوياً. وش يناسب؟

- [ ] Systems Manager Run Command
- [ ] صورة AMI جاهزة، تنسخ بين الحسابات
- [x] CloudFormation، مع Change Sets وDrift Detection
- [ ] AWS Config لحاله

القالب يبني نفس الـ Stack كل مرة ويبقى في Git. وChange Sets تبين وش بيتغير، وDrift Detection يكشف التعديلات اليدوية.

- **A:** هذا يشغّل أوامر على السيرفرات، وما يوصف البنية.
- **B:** هذا يكرر محتوى السيرفر، مو الشبكة والموارد اللي حوله.
- **D:** هذا يسجل الإعدادات ويحكم عليها، بس ما يبني شي.

للمراجعة: [CloudFormation: بنيتك في ملف](#cloudformation-بنيتك-في-ملف) في هذا الجزء، و[Update CloudFormation stacks using change sets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html) و[Detect unmanaged configuration changes to stacks and resources with drift detection](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html) في وثائق AWS.
:::

::: quiz
شركة لازم تطبق تحديثات الأمان على 500 سيرفر EC2، في وقت محدد ليلة السبت فقط، وبدون وصول SSH. أي **أداتين** يناسبون؟ (اختر اثنين.)

- [ ] Session Manager
- [x] Patch Manager
- [ ] Parameter Store
- [ ] Compute Optimizer
- [x] Maintenance Windows

Patch Manager يطبق التحديثات، وMaintenance Windows يحدد متى يسمح لها تصير.

- **A:** هذا يعطيك طرفية، جلسة وحدة كل مرة.
- **C:** هذا يخزن الإعدادات والأسرار البسيطة.
- **D:** هذا يقترح الأحجام المناسبة حسب استخدامك.

للمراجعة: [Systems Manager: تشغيل سيرفراتك](#systems-manager-تشغيل-سيرفراتك) في هذا الجزء، و[AWS Systems Manager Patch Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html) و[AWS Systems Manager Maintenance Windows](https://docs.aws.amazon.com/systems-manager/latest/userguide/maintenance-windows.html) في وثائق AWS.
:::

## اللي تعلمته

تسعة وعشرين جزء في تسعة أقسام. شوف وش تقدر تسويه الحين:

| القسم | الحين تقدر |
| --- | --- |
| [الأساسيات](/series/aws/#section-1) | تفهم البنية العالمية وتضبط الصلاحيات |
| [الخوادم وتخزينها](/series/aws/#section-2) | تشغل سيرفر، وتختار تسعيره، وتحفظ بياناته |
| [التوفر العالي والتوسّع](/series/aws/#section-3) | تبني تطبيق ينجو من الأعطال ويكبر لحاله |
| [قواعد البيانات](/series/aws/#section-4) | تختار القاعدة المناسبة وتسرعها |
| [الشبكات وتوصيل المحتوى](/series/aws/#section-5) | تصمم شبكة خاصة وتوصل المحتوى حول العالم |
| [التخزين الكائني](/series/aws/#section-6) | تخزن أي شي في S3 بالسعر المناسب وبأمان |
| [التطبيقات الحديثة](/series/aws/#section-7) | تفصل الخدمات، وتشغل الحاويات وبدون خوادم |
| [البيانات والذكاء الاصطناعي](/series/aws/#section-8) | تحلل بياناتك وتضيف الذكاء الاصطناعي لتطبيقك |
| [الأمان والتشغيل](/series/aws/#section-9) | تراقب وتحمي وتتعافى وتضبط تكاليفك |

### وين تروح من هنا

- **ابن شي حقيقي.** مشروع صغير خاص فيك يعلمك أكثر من أي مقال، حتى لو موقع صغير مع API.
- **جرّب [الاختبار الشامل](/series/aws/quiz/).** يختار لك أسئلة عشوائية من كل الأجزاء، فتعرف وش ثبت عندك ووش تراجعه.
- **اقرأ الأسئلة الشائعة.** صفحة FAQ لكل خدمة ملخص قصير وغني ودقيق.
- **فكر في شهادة.** **Solutions Architect Associate** تغطي أغلب اللي في هذي السلسلة، والاختبار يقيس كيف تختار بين الخدمات. اقرأ كل سؤال بحثاً عن العبارة اللي تحسم، مثل "أقل تكلفة" أو "أقل جهد تشغيلي"، واستبعد الإجابات الغلط أول.
- **تابع التغييرات.** AWS تتغير بسرعة، وكذا شي في هذي السلسلة تغير وهي تنكتب. راجع الوثائق قبل أي قرار.

شكراً إنك كملت للنهاية، وبالتوفيق في اللي بتبنيه.
