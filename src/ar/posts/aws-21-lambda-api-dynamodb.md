---
title: "بدون خوادم: Lambda وAPI Gateway وDynamoDB"
description: شغّل كودك بدون سيرفرات وادفع بس لما يشتغل. كيف تعمل Lambda وحدودها، والبداية الباردة، وجداول DynamoDB ومفاتيحها، وAPI Gateway كبوابة أمامية، مع تجربة عملية تبني فيها API شغال.
date: 2026-11-02
series: aws
part: 21
numbered: true
tags: [aws, serverless, databases]
---

في [الجزء العشرين](/posts/aws-20-ecs-fargate-eks/) تركنا إدارة السيرفرات، بس المهام لسا شغالة طول الوقت، تنتظر زوار يمكن ما يجون. طيب لو كودك يشتغل بس لما يجي طلب، وما تدفع شي غير كذا؟

هذا هو **بدون خوادم (Serverless)**. طبعاً السيرفرات موجودة، بس تجهيزها وتحديثها وتوسيعها ما عاد مشكلتك.

| | EC2 | Fargate | Lambda |
| --- | --- | --- | --- |
| **تدير** | النظام والتطبيق | الصورة والتطبيق | الكود |
| **تدفع على** | وقت التشغيل | وقت التشغيل | كل طلب ومدته |
| **وقت الفراغ** | تدفع | تدفع | شبه لا شي |
| **التوسع** | أنت تجهزه | أنت تجهزه | لحاله |
| **مدة التشغيل** | كيف ما تبي | كيف ما تبي | حتى 15 دقيقة للطلب |

## AWS Lambda

**Lambda** تشغّل **دالة (Function)** تكتبها لما يطلقها **حدث**. تسوي شغلها، ثم تتوقف.

<figure class="diagram">
<svg viewBox="0 0 640 240" role="img" aria-labelledby="lambda-caption">
<defs>
<marker id="lambda-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="470" y="14" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="41" text-anchor="middle" class="d-label">رفع على S3</text>
<rect x="470" y="70" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="97" text-anchor="middle" class="d-label">رسالة SQS</text>
<rect x="470" y="126" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="153" text-anchor="middle" class="d-label">طلب API</text>
<rect x="470" y="182" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="209" text-anchor="middle" class="d-label">جدول زمني</text>
<rect x="245" y="74" width="150" height="92" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="115" text-anchor="middle" class="d-label">Lambda</text>
<text x="320" y="135" text-anchor="middle" class="d-small">كودك يشتغل</text>
<rect x="20" y="28" width="150" height="44" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="55" text-anchor="middle" class="d-label">DynamoDB</text>
<rect x="20" y="98" width="150" height="44" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="125" text-anchor="middle" class="d-label">S3</text>
<rect x="20" y="168" width="150" height="44" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="195" text-anchor="middle" class="d-label">SNS</text>
<line x1="470" y1="36" x2="397" y2="96" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="470" y1="92" x2="397" y2="112" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="470" y1="148" x2="397" y2="128" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="470" y1="204" x2="397" y2="144" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="245" y1="120" x2="172" y2="50" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="245" y1="120" x2="172" y2="120" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="245" y1="120" x2="172" y2="190" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
</svg>
<figcaption id="lambda-caption">حدث يشغّل الدالة، تسوي شغلها وتتوقف. وتدفع على وقت تشغيلها فقط.</figcaption>
</figure>

تدعم Python وNode.js وJava و.NET وRuby مباشرة، وأي لغة ثانية عبر Runtime خاص أو صورة حاوية. وهذي شكل الدالة في Python:

```python
def handler(event, context):
    name = event.get("name", "world")
    return {"message": f"Hello {name}"}
```

الـ `event` يحمل تفاصيل اللي صار، وشكله يعتمد على المصدر: حدث S3 فيه الحاوية والمفتاح مثلاً، وحدث API فيه المسار والهيدرز.

### كم تكلف؟

تدفع على عدد الطلبات، وعلى المدة مضروبة في الذاكرة بوحدة **GB-second**. الأسعار هنا لـ x86 في مناطق أمريكا، والمجاني يغطي مليون طلب و400,000 GB-second كل شهر.

مثال: دالة بذاكرة 512 MB تشتغل 200 ملي ثانية، 5 مليون مرة في الشهر:

| البند | الحساب | التكلفة |
| --- | --- | --- |
| **المدة** | `5,000,000 x 0.2 s x 0.5 GB = 500,000` GB-second، ناقص 400,000 مجانية | 1.67 دولار |
| **الطلبات** | 5 مليون ناقص مليون مجانية، بـ 0.20 دولار للمليون | 0.80 دولار |
| **المجموع** | | **حوالي 2.47 دولار** |

خمسة مليون طلب بأقل من قيمة قهوة. بس الحساب ممكن ينقلب: مع حمل كبير وثابت، السيرفر أو الحاوية ممكن تطلع أرخص، فاحسبها.

### حدود لازم تعرفها

| الحد | القيمة |
| --- | --- |
| **الذاكرة** | من 128 MB إلى 10,240 MB، والمعالج يرتفع معها |
| **المدة** | 15 دقيقة للطلب |
| **التخزين المؤقت** | `/tmp` من 512 MB إلى 10 GB |
| **حجم الحزمة** | 50 MB مضغوطة و250 MB بعد الفك، أو صورة حاوية 10 GB |
| **التزامن** | 1,000 لكل منطقة افتراضياً، وممكن أقل في الحسابات الجديدة |
| **حجم البيانات** | 6 MB للاستدعاء المتزامن، و1 MB لغير المتزامن |

لو شغلك ياخذ أكثر من 15 دقيقة، قسّمه بـ [Step Functions](/posts/aws-22-serverless-design/)، أو استخدم حاوية.

### التزامن (Concurrency)

كل بيئة تشغيل تخدم طلب واحد في نفس الوقت، فـ 100 طلب متزامن تحتاج 100 بيئة. وهذا الرقم هو **التزامن**، وكل الدوال في المنطقة تتشارك حد واحد. وش يصير لما توصله؟

- **الاستدعاء المتزامن،** مثل من API، يجيه خطأ `429`.
- **الاستدعاء غير المتزامن،** مثل من S3، ينحفظ ويعيد المحاولة حتى 6 ساعات، ثم يروح لطابور الفشل أو وجهة الفشل لو حددتها.

والفخ المخفي إن دالة مشغولة وحدة ممكن تاكل الحد كله وتعطل الباقي. **Reserved Concurrency** يحجز حصة للدالة، وهي سقف لها كمان، فما تنحرم وما تحرم غيرها.

### البداية الباردة (Cold Start)

لما يجي طلب وما فيه بيئة جاهزة، Lambda تنشئ وحدة وتحمل كودك أول. هذي **البداية الباردة**، وممكن تضيف من جزء من الثانية إلى عدة ثواني حسب اللغة وحجم الكود. وبعدها البيئة تبقى فترة وتخدم الطلبات اللي بعدها بسرعة. ووقت التجهيز هذا صار يتحاسب كمان منذ أغسطس 2025.

| الأداة | كيف تشتغل | التكلفة |
| --- | --- | --- |
| **Provisioned Concurrency** | تبقي عدد من البيئات جاهز دايماً، فما فيه بداية باردة لها | تدفع عليها طول ما هي جاهزة |
| **SnapStart** | تحفظ لقطة بعد التجهيز وتستعيد منها، لـ Java 11 وأحدث وPython 3.12 وأحدث و.NET 8 وأحدث | مجاني لـ Java، وبرسوم لـ Python و.NET |

وما تقدر تجمع الاثنين على نفس الدالة. وSnapStart يقلل وقت البداية بس ما يضمن إزالته، فلو تحتاج استجابة سريعة جداً وثابتة، استخدم Provisioned Concurrency.

### Lambda داخل VPC

افتراضياً الدالة تشتغل خارج VPC حقك، فتوصل للإنترنت وخدمات AWS العامة، بس ما توصل لـ RDS الخاص حقك. اربطها بـ [VPC](/posts/aws-13-vpc/) وتوصل له، مع نقطتين:

- تفقد الوصول للإنترنت، إلا لو الـ Subnet يمر عبر NAT Gateway أو تستخدم [نقاط اتصال](/posts/aws-14-vpc-connectivity/).
- ألف بيئة ممكن تفتح ألف اتصال بالقاعدة. وهذا اللي يحله [RDS Proxy](/posts/aws-08-rds-aurora/) بإعادة استخدام اتصالات قليلة.

### كود عند الحافة

ذكرنا طريقتين لتشغيل كود قصير على [CloudFront](/posts/aws-12-cloudfront-global-accelerator/). وهذا الفرق:

| | CloudFront Functions | Lambda@Edge |
| --- | --- | --- |
| **اللغات** | JavaScript | Node.js وPython |
| **المدة** | أقل من ملي ثانية | حتى 30 ثانية في أحداث المصدر |
| **الوصول للشبكة** | لا | نعم |
| **الأحداث** | طلب الزائر والرد عليه | هذي، مع طلب المصدر ورده |
| **تناسب** | التحويلات والهيدرز ومفاتيح الكاش | منطق أثقل والاتصال بخدمات ثانية |

## Amazon DynamoDB

Lambda تتوسع في ثواني لآلاف النسخ، وقاعدة البيانات التقليدية ما تحب هذا. **DynamoDB** قاعدة مفتاح وقيمة بدون خوادم: ما فيه سيرفرات، ولا اتصالات تديرها، واستجابة بالملي ثانية عند أي حجم، والبيانات منسوخة بين عدة مناطق توفر تلقائياً.

### الجداول والعناصر والمفاتيح

الجدول فيه **عناصر (Items)**، وكل عنصر له **حقول (Attributes)**، وما يلزم يكون لعنصرين نفس الحقول. وأقصى حجم للعنصر 400 KB. والثابت هو **المفتاح الأساسي**:

| `customer` (مفتاح التقسيم) | `order_id` (مفتاح الترتيب) | `total` | `status` | `coupon` |
| --- | --- | --- | --- | --- |
| sara | 1001 | 120 | shipped | |
| sara | 1002 | 40 | new | SAVE10 |
| omar | 1003 | 75 | new | |

- **مفتاح التقسيم (Partition Key):** يحدد وين ينحفظ العنصر. اختر واحد قيمه كثيرة ومتنوعة عشان يتوزع الحمل.
- **مفتاح الترتيب (Sort Key):** اختياري، ويرتب العناصر اللي لها نفس مفتاح التقسيم، فتقدر تطلب "آخر طلبات سارة".

هذا الفرق الكبير عن [القواعد العلائقية](/posts/aws-10-choosing-database/): ما فيه Joins، وتجيب العناصر بمفتاحها. فـ **ابدأ من استعلاماتك** وصمم الجدول عليها. ولو تبي تستعلم بحقل ثاني مثل `status`، أضف **فهرس ثانوي عام (GSI)**.

### أوضاع السعة

| الوضع | كيف يشتغل | متى |
| --- | --- | --- |
| **On-demand** | يتوسع لحاله وتدفع لكل طلب | حمل مجهول أو متغير، وابدأ به |
| **Provisioned** | تحدد القراءات والكتابات في الثانية، ومعها توسع تلقائي لو تبي | حمل ثابت ومتوقع، ويطلع أرخص |

### إضافات تستاهل تعرفها

| الميزة | وش تسوي |
| --- | --- |
| **DAX** | كاش قدام الجدول، ينزل القراءة من الملي ثانية إلى الميكرو ثانية |
| **Streams** | سجل لكل تغيير يبقى 24 ساعة، ويقدر يشغّل Lambda |
| **Global Tables** | نسخ في عدة مناطق، وكلها تقبل الكتابة |
| **TTL** | يحذف العناصر تلقائياً بعد وقت تحدده، مثل الجلسات القديمة |
| **Point-in-time Recovery** | يرجع الجدول لأي ثانية خلال آخر 1 إلى 35 يوم |
| **التكامل مع S3** | يصدّر الجدول إلى S3 للتحليل، أو يستورد من S3 إلى جدول جديد |

وين يقف **DAX** مقابل [ElastiCache](/posts/aws-09-elasticache/)؟ DAX كاش شفاف لـ DynamoDB بدون تغيير يذكر في الكود. وElastiCache أعم، مثل حفظ نتائج محسوبة يديرها تطبيقك بنفسه.

و**Global Tables** متطابقة في النهاية افتراضياً، يعني الكتابة في منطقة توصل الباقي بعد تأخير بسيط. ولو تحتاج القراءة في أي منطقة تشوف آخر كتابة، فيه وضع **التطابق القوي**، ويحتاج ثلاث مناطق بالضبط وله قيود.

## API Gateway: البوابة الأمامية

الدالة ما لها رابط ويب افتراضياً. **API Gateway** يستقبل الطلب عبر HTTPS ويمرره للدالة، ويتكفل باللي ما تبي تكتبه بنفسك: التحقق من الدخول، والتقييد، والإصدارات وغيرها.

<figure class="diagram">
<svg viewBox="0 0 640 118" role="img" aria-labelledby="api-caption">
<defs>
<marker id="api-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="494" y="28" width="126" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="557" y="64" text-anchor="middle" class="d-label">التطبيق</text>
<rect x="336" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="54" text-anchor="middle" class="d-label">API Gateway</text>
<text x="399" y="74" text-anchor="middle" class="d-small">دخول وتقييد</text>
<rect x="178" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="54" text-anchor="middle" class="d-label">Lambda</text>
<text x="241" y="74" text-anchor="middle" class="d-small">منطقك</text>
<rect x="20" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="83" y="54" text-anchor="middle" class="d-label">DynamoDB</text>
<text x="83" y="74" text-anchor="middle" class="d-small">بياناتك</text>
<line x1="494" y1="59" x2="464" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#api-arrow)"/>
<line x1="336" y1="59" x2="306" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#api-arrow)"/>
<line x1="178" y1="59" x2="148" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#api-arrow)"/>
</svg>
<figcaption id="api-caption">الـ API الكلاسيكي بدون خوادم: كل جزء يتوسع مع الطلبات، وبدون زيارات ما تدفع شي تقريباً.</figcaption>
</figure>

| النوع | يناسب |
| --- | --- |
| **HTTP API** | أغلب الواجهات: أبسط وأرخص، وبحد ثابت 30 ثانية |
| **REST API** | ميزات أكثر: كاش ومفاتيح API والتحقق من الطلبات |
| **WebSocket API** | اتصالات باتجاهين، مثل الدردشة |

وREST API له ثلاث أنواع: **Edge-optimized** عبر CloudFront لمستخدمين حول العالم، و**Regional** للمستخدمين القريبين، و**Private** لداخل VPC فقط.

وتقدر تحط خلفه دالة Lambda، أو أي عنوان HTTP، أو خدمة AWS مباشرة. مثلاً يرسل الطلب إلى SQS على طول بدون دالة بينهم. ولنقطة وصول وحدة بسيطة، Lambda عندها كمان **Function URLs**: رابط HTTPS مباشر للدالة، بدون هذي الإضافات.

### مين يقدر يستدعي الـ API؟

| الطريقة | تناسب |
| --- | --- |
| **IAM** | خدماتك وتطبيقاتك داخل AWS |
| **Cognito** | مستخدمين تطبيقك، وبنشرحه في الجزء الجاي |
| **Lambda Authorizer** | منطقك الخاص، مثل توكن من نظام ثاني |

::: warning انتبه لحدود الوقت والحجم
REST API ينتظر الرد 29 ثانية افتراضياً، وتقدر ترفعها في Regional وPrivate، بس ممكن هذا ينزل حصة طلباتك. والنوعين حدهم 10 MB للبيانات، فخل الملفات الكبيرة تروح مباشرة لـ S3 بـ [الروابط الموقّعة](/posts/aws-17-s3-security/).
:::

## عملي: API شغال

بنبني عداد زيارات صفحات من قطع الرسم الثلاث. وكل شي هنا داخل المجاني لتجربة مثل هذي. من CloudShell، أنشئ الجدول:

```bash
aws dynamodb create-table --table-name series-visits \
  --attribute-definitions AttributeName=page,AttributeType=S \
  --key-schema AttributeName=page,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --query TableDescription.TableStatus

aws dynamodb wait table-exists --table-name series-visits

TABLE_ARN=$(aws dynamodb describe-table --table-name series-visits \
  --query Table.TableArn --output text)
```

أعط الدالة دور يكتب السجلات ويحدث هذا الجدول فقط:

```bash
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

ROLE_ARN=$(aws iam create-role --role-name series-visits-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

aws iam attach-role-policy --role-name series-visits-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy --role-name series-visits-role \
  --policy-name table-access --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": \"dynamodb:UpdateItem\",
      \"Resource\": \"$TABLE_ARN\"
    }]
  }"
```

اكتب الدالة. تزيد واحد على عداد المسار المطلوب، والتحديث بهذي الطريقة آمن حتى مع الطلبات المتزامنة:

```bash
cat > app.py <<'EOF'
import json
import os
import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE"])

def handler(event, context):
    page = event.get("rawPath", "/")
    result = table.update_item(
        Key={"page": page},
        UpdateExpression="ADD visits :one",
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    visits = int(result["Attributes"]["visits"])
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"page": page, "visits": visits}),
    }
EOF

zip -q function.zip app.py
```

أنشئ الدالة. الدور الجديد ياخذ كم ثانية عشان يفعّل، فلو جاك خطأ عن الدور، انتظر شوي وأعد الأمر:

```bash
FN_ARN=$(aws lambda create-function --function-name series-visits \
  --runtime python3.13 --handler app.handler --role $ROLE_ARN \
  --zip-file fileb://function.zip \
  --environment "Variables={TABLE=series-visits}" \
  --query FunctionArn --output text)

aws lambda wait function-active-v2 --function-name series-visits
```

الحين البوابة. هذا الأمر ينشئ HTTP API يرسل كل المسارات للدالة، وبعدها نسمح له يستدعيها:

```bash
API_ID=$(aws apigatewayv2 create-api --name series-visits \
  --protocol-type HTTP --target $FN_ARN \
  --query ApiId --output text)

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

aws lambda add-permission --function-name series-visits \
  --statement-id api-gateway --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT:$API_ID/*" \
  --query Statement --output text > /dev/null

URL=$(aws apigatewayv2 get-api --api-id $API_ID \
  --query ApiEndpoint --output text)
echo $URL
```

جربه. وتقدر تفتح الرابط في متصفحك كمان:

```bash
curl -s $URL/home; echo
curl -s $URL/home; echo
curl -s $URL/about; echo
```

العداد يزيد: `home` يوصل 2 و`about` عند 1. شوف البيانات في الجدول:

```bash
aws dynamodb scan --table-name series-visits \
  --query "Items[].[page.S,visits.N]" --output table
```

وأخيراً، شوف البداية الباردة في سجلات الدالة:

```bash
aws logs tail /aws/lambda/series-visits --since 10m | grep REPORT
```

أول طلب بس فيه حقل `Init Duration`، وهو وقت تجهيز البيئة، واللي بعده أسرع بكثير. ولو كانت السجلات فاضية، انتظر كم ثانية وحاول مرة ثانية.

::: security احذف بعد التجربة
المورد اللي ما ينستخدم ما يكلف شي هنا، وهذي فكرة Serverless. بس نظّف على أي حال، ومعها الدور وصلاحياته:
:::

```bash
aws apigatewayv2 delete-api --api-id $API_ID
aws lambda delete-function --function-name series-visits
aws dynamodb delete-table --table-name series-visits \
  --query TableDescription.TableStatus
aws logs delete-log-group --log-group-name /aws/lambda/series-visits

aws iam delete-role-policy --role-name series-visits-role \
  --policy-name table-access
aws iam detach-role-policy --role-name series-visits-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name series-visits-role
```

## الخلاصة

- **Serverless** يعني تكتب الكود والبيانات، وتدفع على الاستخدام فقط.
- **Lambda** تشتغل حتى 15 دقيقة، وتدفع لكل طلب ولكل GB-second.
- **البداية الباردة** تخففها بـ Provisioned Concurrency أو SnapStart، و**Reserved Concurrency** يحمي الدوال من بعضها.
- **DynamoDB** تجيب العناصر بالمفتاح، فصمم الجدول على استعلاماتك.
- **API Gateway** البوابة الأمامية، يتكفل بالدخول والتقييد، وابدأ بـ HTTP API.

## اختبر نفسك

::: quiz
دالة Lambda مربوطة بـ VPC عشان توصل لقاعدة RDS خاصة. وهذا شغال، بس الحين اتصالاتها بمزود دفع على الإنترنت تنتهي مهلتها. وش يحل هذا؟

- [ ] ربط الدالة بشبكة عامة
- [ ] رفع مهلة الدالة
- [x] توجيه شبكة الدالة الخاصة عبر NAT Gateway
- [ ] وضع RDS Proxy بين الدالة والقاعدة

لما تنربط الدالة بـ VPC تفقد الوصول للإنترنت، إلا لو كانت شبكتها تمر عبر NAT Gateway.

- **A:** الشبكة العامة ما تعطي الدالة وصول للإنترنت ولا عنوان عام.
- **B:** ما فيه طريق للإنترنت أصلاً، فالوقت الزيادة ما يفيد.
- **D:** هذا يدير اتصالات القاعدة، والمشكلة في طريق الخروج.

للمراجعة: [Lambda داخل VPC](#lambda-داخل-vpc) في هذا الجزء، و[Enable internet access for VPC-connected Lambda Event Functions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html) في وثائق AWS.
:::

::: quiz
جدول طلبات مفتاح التقسيم فيه `customer` ومفتاح الترتيب `order_id`. والفريق يحتاج الحين كل الطلبات اللي `status` فيها `new`، بسرعة وبشكل متكرر. وش يسوي؟

- [ ] قراءة الجدول كامل (Scan) مع كل طلب
- [ ] ربط الجدول بجدول `status` عبر Join
- [ ] وضع DAX قدام الجدول
- [x] إضافة فهرس ثانوي عام (GSI) على `status`

الفهرس الثانوي العام يرتب البيانات بمفتاح مختلف، فتقدر تستعلم بـ `status` مباشرة.

- **A:** هذا يقرأ كل العناصر كل مرة، فيبطأ وتزيد تكلفته كل ما كبر الجدول.
- **B:** DynamoDB ما فيها Joins.
- **C:** هذا يسرّع القراءات اللي تقدر عليها أصلاً، وما يضيف طريقة استعلام جديدة.

للمراجعة: [الجداول والعناصر والمفاتيح](#الجداول-والعناصر-والمفاتيح) في هذا الجزء، و[Using Global Secondary Indexes in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html) في وثائق AWS.
:::

::: quiz
صفحة منتج تقرأ نفس عناصر DynamoDB ملايين المرات في اليوم. والفريق يبي القراءة تاخذ ميكرو ثانية، **بأقل تغيير في الكود**. وش يناسب؟

- [x] DynamoDB Accelerator (DAX)
- [ ] ElastiCache، والتطبيق يدير الكاش
- [ ] DynamoDB Global Tables
- [ ] DynamoDB Streams

DAX كاش قدام الجدول يتوافق مع واجهة DynamoDB، فيحتاج تغييرات بسيطة فقط.

- **B:** هذا ممكن يكون سريع كمان، بس تطبيقك لازم يدير اللي يدخل ويطلع من الكاش.
- **C:** هذا يحط نسخ في عدة Regions، وما ينزل القراءة إلى الميكرو ثانية.
- **D:** هذا سجل بالتغييرات، وما يسرّع القراءة.

للمراجعة: [إضافات تستاهل تعرفها](#إضافات-تستاهل-تعرفها) في هذا الجزء، و[In-memory acceleration with DynamoDB Accelerator (DAX)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html) في وثائق AWS.
:::

::: quiz
شركة تبيع الوصول لواجهة API حقها. وتحتاج مفاتيح API لكل عميل، وتحديد سرعة لكل عميل، وكاش للردود. أي خيار يناسب؟

- [ ] HTTP API
- [x] REST API
- [ ] WebSocket API
- [ ] Lambda Function URL

REST API فيه كل هذا. وHTTP API أبسط وأرخص لأنه يترك هذي الميزات.

- **A:** هذا ما فيه مفاتيح API ولا كاش.
- **C:** هذا للاتصالات باتجاهين، مثل المحادثة.
- **D:** هذا رابط مباشر للدالة، بدون أي من هذي الإضافات.

للمراجعة: [API Gateway: البوابة الأمامية](#api-gateway-البوابة-الأمامية) في هذا الجزء، و[Choose between REST APIs and HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html) في وثائق AWS.
:::

::: quiz
دالة تقارير أحياناً تاكل حد التزامن كله في الـ Region، فتبدأ دالة الدفع ترجّع `429`. ودالة الدفع لازم كمان ترد باستجابة ثابتة وسريعة جداً. أي **إعدادين** يناسبون دالة الدفع؟ (اختر اثنين.)

- [x] Reserved Concurrency
- [ ] SnapStart
- [x] Provisioned Concurrency
- [ ] مساحة `/tmp` أكبر
- [ ] ذاكرة أقل

Reserved Concurrency يحجز لدالة الدفع حصة ما تاخذها أي دالة ثانية، وProvisioned Concurrency يبقي البيئات جاهزة فما فيه بداية باردة لها.

- **B:** هذا يقلل وقت البداية بدون ما يضمن إزالته، وما ينجمع مع Provisioned Concurrency.
- **D:** هذا يزيد مساحة القرص المؤقت، وما له علاقة بأي مشكلة منهم.
- **E:** المعالج يزيد مع الذاكرة، فهذا يبطئ الردود.

للمراجعة: [التزامن (Concurrency)](#التزامن-concurrency) و[البداية الباردة (Cold Start)](#البداية-الباردة-cold-start) في هذا الجزء، و[Configuring reserved concurrency for an Event Function](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html) و[Configuring provisioned concurrency for an Event Function](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) في وثائق AWS.
:::

عندك الحين قطع البناء. كيف تبني منها تطبيق كامل، فيه مستخدمين وسير عمل طويل وأحداث تمشي بين الخدمات؟ هذا اللي بنغطيه في [**الجزء الثاني والعشرين**](/posts/aws-22-serverless-design/).
