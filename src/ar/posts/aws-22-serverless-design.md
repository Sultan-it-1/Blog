---
title: "تصميم تطبيقات بدون خوادم"
description: نجمع القطع مع بعض. سير عمل طويل بـ Step Functions، ومستخدمين بـ Cognito، وتصميمين لتطبيقات كاملة، والخدمات المصغرة وربح رخيص مع CloudFront، مع تجارب عملية على ملف يشغّل دالة وسير عمل يقرر.
date: 2026-11-02
series: aws
part: 22
numbered: true
tags: [aws, serverless, messaging]
---

في [الجزء الحادي والعشرين](/posts/aws-21-lambda-api-dynamodb/) بنينا API من ثلاث قطع. التطبيق الحقيقي يحتاج أكثر: عملية من عدة خطوات ممكن تفشل في النص، ومستخدمين يسجلون دخول، وأشياء لازم تصير بعد الطلب بدون ما ينتظرها أحد.

هذا الجزء يكمل الصورة بخدمتين زيادة، ثم يطبق كل شي على تصميمين.

## Step Functions: سير العمل

الطلب فيه فحص مخزون، ثم تحصيل المبلغ، ثم شحن. تقدر تخلي كل دالة تستدعي اللي بعدها، بس وين تكون إعادة المحاولة؟ وش يصير لو فشل الدفع بعد ما حجزت المخزون؟ ومين يقول لك وين الطلب 1001 الحين؟

**Step Functions** يطلع هذا المنطق من كودك إلى **آلة حالات (State Machine)**: تعريف للخطوات ووش يصير بعد كل وحدة، وتشوفه كرسم في الكونسول.

<figure class="diagram">
<svg viewBox="0 0 640 200" role="img" aria-labelledby="steps-caption">
<defs>
<marker id="steps-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="470" y="20" width="150" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="55" text-anchor="middle" class="d-label">فحص المخزون</text>
<rect x="245" y="20" width="150" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="45" text-anchor="middle" class="d-label">تحصيل المبلغ</text>
<text x="320" y="65" text-anchor="middle" class="d-small">يعيد المحاولة</text>
<rect x="20" y="20" width="150" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="95" y="55" text-anchor="middle" class="d-label">الشحن</text>
<line x1="470" y1="50" x2="397" y2="50" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<line x1="245" y1="50" x2="172" y2="50" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<rect x="245" y="128" width="150" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="320" y="162" text-anchor="middle" class="d-small">إلغاء وإشعار</text>
<line x1="545" y1="80" x2="397" y2="150" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<text x="520" y="130" text-anchor="middle" class="d-small">غير متوفر</text>
<line x1="320" y1="80" x2="320" y2="126" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<text x="275" y="108" text-anchor="middle" class="d-small">مرفوض</text>
</svg>
<figcaption id="steps-caption">سير العمل يعرف ترتيب الخطوات ووين يروح كل فشل، وكل خطوة تبقى صغيرة وبسيطة.</figcaption>
</figure>

كل خطوة تقدر تستدعي دالة Lambda أو خدمات AWS كثيرة مباشرة، والتعريف يتكفل باللي كنت بتكتبه بيدك:

| القدرة | وش تسوي |
| --- | --- |
| **Retry** | تعيد الخطوة الفاشلة، وتنتظر أطول كل مرة |
| **Catch** | ترسل الفشل لخطوة تعالجه، مثل استرجاع المبلغ |
| **Choice** | تختار المسار حسب البيانات |
| **Parallel وMap** | تشغل فروع مع بعض، أو خطوة لكل عنصر في قائمة |
| **Wait** | توقف لفترة، أو لموافقة بشرية تاخذ أيام |

هذا شكل إعادة محاولة الدفع والتقاط فشله:

```json
"TakePayment": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": { "FunctionName": "take-payment", "Payload.$": "$" },
  "Retry": [{
    "ErrorEquals": ["States.TaskFailed"],
    "IntervalSeconds": 2,
    "BackoffRate": 2,
    "MaxAttempts": 3
  }],
  "Catch": [{
    "ErrorEquals": ["States.ALL"],
    "Next": "CancelOrder"
  }],
  "Next": "Ship"
}
```

| | Standard | Express |
| --- | --- | --- |
| **أقصى مدة** | سنة | خمس دقايق |
| **التنفيذ** | مرة واحدة بالضبط | مرة على الأقل |
| **المحاسبة** | لكل انتقال بين الحالات، و4,000 مجانية كل شهر | عدد الطلبات والمدة والذاكرة |
| **يناسب** | عمليات طويلة مثل الطلبات والموافقات | أحداث قصيرة ومتكررة جداً |

## Cognito: مستخدمينك

[IAM](/posts/aws-02-iam/) لفريقك وخدماتك، مو لمليون شخص يستخدمون تطبيقك. **Amazon Cognito** يعطي تطبيقك مستخدمينه، وله جزئين سهل تخلط بينهم:

| | User Pool | Identity Pool |
| --- | --- | --- |
| **السؤال اللي يجاوبه** | من هذا المستخدم؟ | وش يقدر يسوي في AWS؟ |
| **يعطي** | توكن بعد الدخول | مفاتيح AWS مؤقتة |
| **يستخدم لـ** | تطبيقك والـ API حقك | وصول مباشر لـ S3 أو DynamoDB |

**User Pools** تتكفل بالتسجيل والدخول، واستعادة كلمة المرور، والتحقق بعدة عوامل، والدخول بحسابات مثل Google أو هوية الشركة. وAPI Gateway وموزع الحمل ALB يقدرون يتحققون من توكناته مباشرة. والمجموعات الجديدة تستخدم خطة **Essentials** افتراضياً، وفيه كمان **Lite** الأرخص بميزات أقل، و**Plus** بحماية متقدمة.

**Identity Pools** تبدل التوكن بمفاتيح مؤقتة مربوطة بدور IAM، ومتغير في السياسة يحصرها في بيانات المستخدم نفسه. مثلاً كل مستخدم يوصل لمجلده فقط في S3:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::recipe-photos/users/${cognito-identity.amazonaws.com:sub}/*"
}
```

## التصميم الأول: تطبيق جوال

خلنا نصمم تطبيق لمشاركة الوصفات: المستخدمين يسجلون دخول، ويكتبون وصفات، ويرفعون صور، والوصفات المشهورة تنقرأ أكثر بكثير مما تنكتب. كل متطلب له قطعته:

| المتطلب | الحل |
| --- | --- |
| دخول المستخدمين | **User Pool** في Cognito |
| API لقراءة الوصفات وكتابتها | **API Gateway** و**Lambda** و**DynamoDB** |
| رفع الصور مباشرة | **Identity Pool** بمفاتيح مؤقتة إلى S3 |
| قراءات هائلة لنفس الوصفات | **DAX** قدام الجدول |
| طلبات متطابقة متكررة | **كاش API Gateway** في REST API |

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="cognito-caption">
<defs>
<marker id="cognito-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="520" y="60" width="100" height="130" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="570" y="130" text-anchor="middle" class="d-label">التطبيق</text>
<rect x="330" y="14" width="140" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="400" y="37" text-anchor="middle" class="d-label">User Pool</text>
<text x="400" y="57" text-anchor="middle" class="d-small">دخول وتوكن</text>
<rect x="330" y="97" width="140" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="400" y="120" text-anchor="middle" class="d-label">API Gateway</text>
<text x="400" y="140" text-anchor="middle" class="d-small">يتحقق من التوكن</text>
<rect x="180" y="97" width="110" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="235" y="130" text-anchor="middle" class="d-label">Lambda</text>
<rect x="20" y="97" width="120" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="130" text-anchor="middle" class="d-label">DynamoDB</text>
<rect x="330" y="180" width="140" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="400" y="203" text-anchor="middle" class="d-label">Identity Pool</text>
<text x="400" y="223" text-anchor="middle" class="d-small">مفاتيح مؤقتة</text>
<rect x="20" y="180" width="270" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="155" y="203" text-anchor="middle" class="d-label">S3</text>
<text x="155" y="223" text-anchor="middle" class="d-code">users/ID/&#x200E;</text>
<line x1="520" y1="80" x2="472" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="520" y1="125" x2="472" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="520" y1="170" x2="472" y2="208" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="330" y1="125" x2="292" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="180" y1="125" x2="142" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="330" y1="208" x2="292" y2="208" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
</svg>
<figcaption id="cognito-caption">الـ User Pool يسجل دخول المستخدم ويعطيه توكن. API Gateway يتحقق منه، والـ Identity Pool يبدله بمفاتيح مؤقتة محصورة في مجلد المستخدم.</figcaption>
</figure>

ليه الصورة تروح مباشرة لـ S3 بدل ما تمر عبر الـ API؟ لأن API Gateway حده 10 MB، ولأنك بتدفع وقت Lambda بس عشان تمرر بايتات. و[الروابط الموقّعة](/posts/aws-17-s3-security/) خيار ثاني ممتاز هنا، لو ما تحتاج Identity Pools.

ولاحظ وين يقع كل كاش: كاش API Gateway يوقف الطلب قبل ما يوصل للدالة، فيناسب الردود اللي ما تختلف من مستخدم لآخر. وDAX يخلي الدالة تشتغل، ويريح الجدول من القراءة.

## التصميم الثاني: موقع عالمي

الحين دليل سفر ينقرأ حول العالم: صفحات ثابتة، وAPI صغير، وإيميل ترحيب لما يسجل أحد، وصور مصغرة للصور اللي يرفعها المستخدمين.

<figure class="diagram">
<svg viewBox="0 0 640 248" role="img" aria-labelledby="site-caption">
<defs>
<marker id="site-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="520" y="14" width="100" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="570" y="47" text-anchor="middle" class="d-label">الزوار</text>
<rect x="370" y="14" width="110" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="425" y="47" text-anchor="middle" class="d-label">CloudFront</text>
<rect x="180" y="14" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="255" y="37" text-anchor="middle" class="d-label">S3</text>
<text x="255" y="57" text-anchor="middle" class="d-small">صفحات وصور</text>
<rect x="20" y="14" width="120" height="56" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="80" y="37" text-anchor="middle" class="d-label">Lambda</text>
<text x="80" y="57" text-anchor="middle" class="d-small">صور مصغرة</text>
<rect x="370" y="96" width="110" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="425" y="129" text-anchor="middle" class="d-label">API Gateway</text>
<rect x="180" y="96" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="255" y="119" text-anchor="middle" class="d-label">Lambda</text>
<text x="255" y="139" text-anchor="middle" class="d-small">منطقك</text>
<rect x="20" y="96" width="120" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="80" y="119" text-anchor="middle" class="d-label">DynamoDB</text>
<text x="80" y="139" text-anchor="middle" class="d-small">Global Tables</text>
<rect x="20" y="178" width="120" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="211" text-anchor="middle" class="d-label">Streams</text>
<rect x="180" y="178" width="150" height="56" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="255" y="201" text-anchor="middle" class="d-label">Lambda</text>
<text x="255" y="221" text-anchor="middle" class="d-small">إيميل ترحيب</text>
<rect x="370" y="178" width="110" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="425" y="211" text-anchor="middle" class="d-label">SES</text>
<line x1="520" y1="42" x2="482" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="370" y1="42" x2="332" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="180" y1="42" x2="142" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="425" y1="70" x2="425" y2="94" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="370" y1="124" x2="332" y2="124" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="180" y1="124" x2="142" y2="124" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="80" y1="152" x2="80" y2="176" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="140" y1="206" x2="178" y2="206" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="330" y1="206" x2="368" y2="206" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
</svg>
<figcaption id="site-caption">CloudFront يقدم الصفحات ويمرر طلبات الـ API. وكل شي بعد الكتابة يصير بالأحداث: مستخدم جديد يشغّل الإيميل، وصورة جديدة تشغّل الصورة المصغرة.</figcaption>
</figure>

تابعه قطعة قطعة:

- **الصفحات:** حاوية S3 خاصة وقدامها [CloudFront مع OAC](/posts/aws-12-cloudfront-global-accelerator/)، فالحاوية تبقى مقفلة والموقع سريع في كل مكان.
- **الـ API:** API Gateway وLambda وDynamoDB، و**Global Tables** تقرب البيانات من المستخدمين في كل منطقة.
- **إيميل الترحيب:** الـ API ما يرسله. المستخدم الجديد ينكتب في الجدول، و**DynamoDB Streams** يشغّل دالة، وهي ترسل عبر **SES**. ولو فشل الإيميل، التسجيل ما يتأثر.
- **الصور المصغرة:** صورة تنزل في S3 تشغّل دالة Lambda تكتب نسخة أصغر. وللتعامل مع الموجات أو الوصول لأكثر من خدمة، حط [SQS أو SNS](/posts/aws-19-sqs-sns-kinesis/) بينهم.

ما فيه سيرفر واحد هنا، ولما ما يكون فيه زوار، الفاتورة تقرب من تكلفة التخزين فقط. والفكرة في آخر مسارين وحدة: **الطلب يخلص بسرعة، والباقي يصير بالأحداث.**

## الخدمات المصغرة (Microservices)

لما يكبر التطبيق، الفرق تقسمه إلى خدمات صغيرة، كل وحدة لها شغلها وقاعدة بياناتها وجدول إطلاقها. وعندهم طريقتين للتواصل:

| الأسلوب | الأدوات | يناسب |
| --- | --- | --- |
| **متزامن** | API Gateway أو موزع حمل | تحتاج الجواب الحين، مثل سعر |
| **غير متزامن** | SQS وSNS وKinesis ومشغلات Lambda | الشغل ممكن يجي بعدين، مثل فاتورة |

وكل خدمة تقدر تختار اللي يناسبها: Lambda للطلبات المتفرقة، وFargate للحمل الثابت، وEC2 للمتطلبات الخاصة. بس لهذا كله ثمن: إطلاقات أكثر، ومراقبة أكثر، وأعطال أصعب في تتبعها بين الخدمات. فلا تبدأ من هنا لتطبيق صغير، وقسّم بس لما تحتاج فعلاً.

## ربح رخيص: CloudFront قدام اللي عندك

مو كل تحسين يحتاج إعادة كتابة. تخيل تطبيق على مجموعة Auto Scaling يوزع ملفات تحديث كبيرة. يوم الإطلاق، كل مستخدمينك يحملون بنفس الوقت: السيرفرات تتضاعف، وفاتورة نقل البيانات تقفز.

حط **CloudFront** قدامه، وما تغير شي ثاني. الملفات ما تتغير، فتناسب الكاش جداً: أغلب الطلبات توقف عند الحافة، والمجموعة بالكاد تكبر، والبيانات الخارجة عبر CloudFront أرخص من الخروج المباشر. شغل دقايق ممكن يرجع لك أكثر من إعادة تصميم.

## مبادئ التصميم

| المبدأ | ليه |
| --- | --- |
| **خل المعالجة آمنة لو تكررت** | SQS وSNS وLambda غير المتزامنة توصل مرة على الأقل |
| **طابور فشل لكل شي غير متزامن** | الفشل الصامت أسوأ أنواع الفشل |
| **دور واحد لكل دالة بأقل صلاحية** | ثغرة في وحدة ما تفتح كل شي |
| **دوال صغيرة بشغلة وحدة** | أسهل في الاختبار وأسرع في التشغيل |
| **احسب التكلفة** | مع حمل كبير وثابت، الحاويات ممكن تطلع أرخص |
| **راقب كل شي** | الطلب يمر بخدمات كثيرة، وبنغطي الأدوات في [قسم الأمان والتشغيل](/series/aws/#section-9) |

## عملي: ملف يشغّل دالة

في [الجزء الخامس عشر](/posts/aws-15-s3-basics/) وعدنا نطبق أحداث S3. بنسوي مسار الصور المصغرة بتبسيط واحد: بدل مكتبة صور، الدالة تحول ملف نصي إلى حروف كبيرة. والمسار نفسه تماماً. من CloudShell:

```bash
BUCKET=series-events-$RANDOM$RANDOM
aws s3 mb s3://$BUCKET

cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role --role-name series-events-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

aws iam attach-role-policy --role-name series-events-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy --role-name series-events-role \
  --policy-name bucket-access --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"s3:GetObject\", \"s3:PutObject\"],
      \"Resource\": \"arn:aws:s3:::$BUCKET/*\"
    }]
  }"
```

اكتب الدالة وأنشئها. ولو جاك خطأ عن الدور، انتظر كم ثانية وأعد الأمر:

```bash
cat > app.py <<'EOF'
from urllib.parse import unquote_plus
import boto3

s3 = boto3.client("s3")

def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = unquote_plus(record["s3"]["object"]["key"])
        body = s3.get_object(Bucket=bucket, Key=key)["Body"].read().decode()
        name = key.split("/")[-1]
        s3.put_object(Bucket=bucket, Key=f"processed/{name}", Body=body.upper())
EOF

zip -q function.zip app.py

FN_ARN=$(aws lambda create-function --function-name series-events \
  --runtime python3.13 --handler app.handler --role $ROLE_ARN \
  --zip-file fileb://function.zip \
  --query FunctionArn --output text)

aws lambda wait function-active-v2 --function-name series-events
```

اسمح لـ S3 يستدعي الدالة، ثم قل للحاوية ترسل لها أحداث مجلد `uploads/` فقط:

```bash
aws lambda add-permission --function-name series-events \
  --statement-id s3-trigger --action lambda:InvokeFunction \
  --principal s3.amazonaws.com --source-arn arn:aws:s3:::$BUCKET \
  --query Statement --output text > /dev/null

cat > notify.json <<EOF
{
  "LambdaFunctionConfigurations": [{
    "LambdaFunctionArn": "$FN_ARN",
    "Events": ["s3:ObjectCreated:*"],
    "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": "uploads/"}]}}
  }]
}
EOF

aws s3api put-bucket-notification-configuration --bucket $BUCKET \
  --notification-configuration file://notify.json
```

ارفع ملف، وانتظر كم ثانية، ثم اقرأ النتيجة:

```bash
echo "hello from s3" > note.txt
aws s3 cp note.txt s3://$BUCKET/uploads/note.txt
```

```bash
aws s3 cp s3://$BUCKET/processed/note.txt -
```

يطبع `HELLO FROM S3`. رفعت ملف، وكود اشتغل لحاله.

::: warning احذر من الدوران بلا نهاية
هنا الدالة تكتب في `processed/` وتستمع لـ `uploads/`. لو كتبت في نفس المجلد اللي تستمع له، كل ناتج بيشغلها مرة ثانية، وفاتورتك تطلع معها. افصل بينهم دايماً ببادئة أو بحاويتين.
:::

نظّف قبل ما تكمل:

```bash
aws s3 rb s3://$BUCKET --force
aws lambda delete-function --function-name series-events
aws logs delete-log-group --log-group-name /aws/lambda/series-events
aws iam delete-role-policy --role-name series-events-role \
  --policy-name bucket-access
aws iam detach-role-policy --role-name series-events-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name series-events-role
```

## عملي: سير عمل يقرر

بنكتب آلة حالات تطالع مبلغ الطلب: المبلغ السالب يفشل، والكبير يروح للمراجعة، والباقي ينقبل. وتستخدم خطوات داخلية فقط، فتحتاج دور بدون صلاحيات:

```bash
cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "states.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

FLOW_ROLE=$(aws iam create-role --role-name series-flow-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

cat > flow.json <<'EOF'
{
  "StartAt": "CheckAmount",
  "States": {
    "CheckAmount": {
      "Type": "Choice",
      "Choices": [
        {"Variable": "$.amount", "NumericLessThanEquals": 0, "Next": "Rejected"},
        {"Variable": "$.amount", "NumericGreaterThan": 1000, "Next": "NeedsReview"}
      ],
      "Default": "Approved"
    },
    "NeedsReview": {"Type": "Pass", "Result": {"status": "review"}, "End": true},
    "Approved": {"Type": "Pass", "Result": {"status": "approved"}, "End": true},
    "Rejected": {"Type": "Fail", "Error": "InvalidAmount", "Cause": "The amount must be positive"}
  }
}
EOF
```

أنشئها. وهنا برضو، لو جاك خطأ عن الدور، انتظر كم ثانية وأعد الأمر:

```bash
FLOW_ARN=$(aws stepfunctions create-state-machine --name series-order \
  --definition file://flow.json --role-arn $FLOW_ROLE \
  --query stateMachineArn --output text)
```

شغّلها بثلاث طلبات:

```bash
try_order() {
  RUN=$(aws stepfunctions start-execution --state-machine-arn $FLOW_ARN \
    --input "$1" --query executionArn --output text)
  sleep 2
  aws stepfunctions describe-execution --execution-arn $RUN \
    --query "[status,output]" --output text
}

try_order '{"amount": 250}'
try_order '{"amount": 5000}'
try_order '{"amount": -5}'
```

بيطلع لك `approved`، ثم `review`، ثم `FAILED`. الحين افتح **Step Functions** في الكونسول، واختر `series-order`، ثم أي تنفيذ. بتشوف الرسم والمسار اللي مشى عليه ملوّن، وهذا اللي بتطالعه لما يعلق طلب في الإنتاج.

::: security احذف بعد التجربة
كم انتقال يدخل ضمن الـ 4,000 المجانية كل شهر. احذف الآلة ودورها:
:::

```bash
aws stepfunctions delete-state-machine --state-machine-arn $FLOW_ARN
aws iam delete-role --role-name series-flow-role
```

## الخلاصة

- **Step Functions** يطلع الخطوات وإعادة المحاولة والفشل من كودك إلى سير عمل تشوفه.
- **User Pool** يجاوب من هو المستخدم، و**Identity Pool** يعطيه مفاتيح مؤقتة لـ AWS.
- التصميم الجيد **يخلص الطلب بسرعة**، ويترك الباقي للأحداث.
- خل الملفات الكبيرة تروح **مباشرة لـ S3**، وحط **الكاش** وين يوقف أكبر قدر من الشغل.
- **الخدمات المصغرة** لها ثمن، فقسّم بس لما تحتاج فعلاً.

بهذا نكمل قسم التطبيقات الحديثة. تطبيقك الحين يطلع بيانات كثيرة، بس وش تقول لك؟ في **الجزء الثالث والعشرين** نبدأ قسم البيانات والذكاء الاصطناعي، ونحلل البيانات بـ Athena وRedshift وGlue.
