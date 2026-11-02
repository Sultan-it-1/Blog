---
title: "S3: الأمان والتشفير"
description: كيف تشفّر بياناتك في S3 ومن يمسك المفاتيح، وتفرض HTTPS، وتشارك ملف خاص برابط موقّع، وتفهم CORS، وتحمي بياناتك من الحذف بـ MFA Delete وObject Lock، مع تجربة عملية.
date: 2026-11-02
series: aws
part: 17
numbered: true
tags: [aws, s3, security]
---

في [الجزء الخامس عشر](/posts/aws-15-s3-basics/) عرفنا إن كل شي خاص افتراضياً، وإن Block Public Access يحميك من الفتح بالغلط. هذا الجزء يكمل الطبقات الباقية: التشفير، ومشاركة الملفات بأمان، وحماية البيانات حتى من مسؤولي الحساب نفسهم.

## التشفير المخزّن

عندك سؤالين: **وين يصير التشفير؟** و**مين يمسك المفتاح؟**

<figure class="diagram">
<svg viewBox="0 0 640 214" role="img" aria-labelledby="enc-caption">
<defs>
<marker id="enc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="320" y="22" text-anchor="middle" class="d-small">التشفير عند الخادم (SSE): S3 يشفّر الملف لما يوصل</text>
<rect x="470" y="34" width="150" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="58" text-anchor="middle" class="d-label">تطبيقك</text>
<text x="545" y="78" text-anchor="middle" class="d-small">ملف عادي</text>
<rect x="20" y="34" width="150" height="58" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="95" y="58" text-anchor="middle" class="d-label">S3</text>
<text x="95" y="78" text-anchor="middle" class="d-small">يشفّر ثم يخزّن</text>
<text x="320" y="54" text-anchor="middle" class="d-small">مشفّر أثناء النقل بـ TLS</text>
<line x1="470" y1="64" x2="172" y2="64" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#enc-arrow)"/>
<text x="320" y="130" text-anchor="middle" class="d-small">التشفير عند العميل: تشفّره أنت قبل الإرسال</text>
<rect x="470" y="144" width="150" height="58" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="545" y="168" text-anchor="middle" class="d-label">تطبيقك</text>
<text x="545" y="188" text-anchor="middle" class="d-small">يشفّر أولاً</text>
<rect x="20" y="144" width="150" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="168" text-anchor="middle" class="d-label">S3</text>
<text x="95" y="188" text-anchor="middle" class="d-small">يخزّن زي ما وصل</text>
<text x="320" y="164" text-anchor="middle" class="d-small">مشفّر قبل ما يطلع، وفوقه TLS</text>
<line x1="470" y1="174" x2="172" y2="174" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#enc-arrow)"/>
</svg>
<figcaption id="enc-caption">في SSE تشفّر S3 الملف بعد وصوله، وفي التشفير عند العميل ما تشوف S3 الملف بدون تشفير أبداً.</figcaption>
</figure>

| النوع | مين يمسك المفتاح | متى تختاره |
| --- | --- | --- |
| **SSE-S3** | S3 بالكامل | الافتراضي لكل كائن جديد، ويكفي لأغلب الحالات |
| **SSE-KMS** | KMS، وتتحكم أنت في صلاحياته | تبي سجل بكل استخدام للمفتاح، وتحكم أدق |
| **DSSE-KMS** | KMS، بطبقتين تشفير | متطلبات تنظيمية تفرض طبقتين |
| **SSE-C** | أنت، وترسله مع كل طلب | مقفل افتراضياً في الحاويات الجديدة منذ أبريل 2026 |
| **عند العميل** | أنت بالكامل | ما تبي AWS تشوف البيانات أبداً |

### انتبه مع SSE-KMS

كل قراءة أو كتابة تنادي KMS، وKMS له حد لعدد الطلبات في الثانية حسب الـ Region. فلو عندك ضغط عالي، فعّل **S3 Bucket Keys**: مفتاح وسيط على مستوى الحاوية يقلل طلبات KMS بنسبة كبيرة، ومعها التكلفة.

ولازم من يقرأ الكائن يكون عنده صلاحية على S3 **وعلى مفتاح KMS** معاً. وهذا سبب مشهور لخطأ `AccessDenied` رغم إن سياسة S3 صحيحة.

## التشفير أثناء النقل

S3 تقبل HTTP وHTTPS. وعشان تفرض HTTPS، ارفض أي طلب غير مشفّر عبر الشرط `aws:SecureTransport`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": [
      "arn:aws:s3:::my-bucket",
      "arn:aws:s3:::my-bucket/*"
    ],
    "Condition": { "Bool": { "aws:SecureTransport": "false" } }
  }]
}
```

وبنفس الطريقة تقدر تفرض نوع تشفير معين على كل رفع. والسياسة تُقيَّم قبل التشفير الافتراضي، فلو رفضت الطلب ما يوصل له أصلاً.

## مشاركة ملف خاص: الروابط الموقّعة

تبي عميل يحمّل فاتورته، بدون ما تفتح الحاوية ولا تعطيه حساب؟ **Pre-signed URL** رابط فيه توقيع وله مدة صلاحية:

- يحمل **صلاحيات اللي وقّعه**، فلو هو ما يقدر يقرأ الملف، الرابط ما يشتغل.
- ينفع **للتحميل والرفع**، مثل رفع صورة من المتصفح مباشرة لـ S3 بدون المرور بسيرفرك.
- مدته محدودة، ولو وقّعته بدور مؤقت ينتهي مع انتهاء الجلسة.

## CORS: لما يمنعك المتصفح

**CORS** حماية في المتصفح، مو في S3. **الأصل** (Origin) هو البروتوكول والنطاق والمنفذ. فلو صفحة على `https://app.example.com` طلبت ملف من `https://my-bucket.s3.amazonaws.com`، فالمتصفح يعتبرهم أصلين مختلفين، ويسأل الحاوية: تسمحين؟

لو طلع عندك خطأ CORS في المتصفح، أضف الإعدادات للحاوية:

```json
[{
  "AllowedOrigins": ["https://app.example.com"],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}]
```

## الحماية من الحذف

حتى الصلاحيات الصحيحة ما تحميك من خطأ، أو حساب مخترق، أو برامج الفدية. عندك ثلاث طبقات:

| الأداة | وش تسوي | ملاحظات |
| --- | --- | --- |
| **MFA Delete** | تطلب رمز MFA لحذف إصدار نهائياً أو إيقاف الإصدارات | يفعّله المستخدم الجذر فقط، عبر الأوامر |
| **Object Lock** | يمنع حذف أو تعديل الإصدار لمدة | لازم الإصدارات مفعّلة |
| **Glacier Vault Lock** | يقفل سياسة مخزن Glacier القديم للأبد | للمخازن القديمة، وObject Lock أفضل لأي شي جديد |

### أوضاع Object Lock

| الوضع | مين يقدر يحذف قبل نهاية المدة |
| --- | --- |
| **Governance** | مستخدمين عندهم صلاحية خاصة فقط |
| **Compliance** | ما أحد، ولا حتى المستخدم الجذر |

وفيه كمان **Legal Hold**: قفل بدون مدة محددة، يبقى لين تشيله، ومفيد للقضايا القانونية.

::: warning Compliance ما له رجعة
لو قفلت ملف بوضع Compliance لمدة عشر سنين، بتدفع عليه عشر سنين، وما أحد يقدر يحذفه ولا دعم AWS. جرّب بوضع Governance ومدة قصيرة أول.
:::

## السجلات والمراقبة

- **Access Logs:** تسجّل كل طلب في حاوية **ثانية**. لا تخليها نفس الحاوية، لأن كل سجل يولّد سجل جديد، فتكبر بلا نهاية وتكبر الفاتورة.
- **CloudTrail:** يسجّل عمليات الإدارة، وعمليات البيانات لو فعّلتها، وبنشرحه في [الجزء الخامس والعشرين](/posts/aws-25-monitoring-auditing/).

## Access Points: لكل فريق بوابته

لو عندك حاوية كبيرة يستخدمها فرق كثيرة، Bucket Policy تصير طويلة وخطرة. **Access Points** تعطي كل فريق بوابة باسمها وسياستها:

- بوابة `finance` تسمح لفريق المالية على `finance/*` فقط.
- بوابة `sales` تسمح لفريق المبيعات على `sales/*` فقط.
- وتقدر تخلي بوابة تقبل من داخل VPC واحدة فقط.

## عملي: تشفير ورابط موقّع وفرض HTTPS

بنكمل بنفس الحاوية في `BUCKET`. ارفع ملف وشوف تشفيره الافتراضي، ثم ارفع واحد بـ KMS:

```bash
echo "secret invoice" > invoice.txt
aws s3 cp invoice.txt s3://$BUCKET/invoice.txt

aws s3api head-object --bucket $BUCKET --key invoice.txt \
  --query ServerSideEncryption

aws s3 cp invoice.txt s3://$BUCKET/invoice-kms.txt --sse aws:kms

aws s3api head-object --bucket $BUCKET --key invoice-kms.txt \
  --query "[ServerSideEncryption,SSEKMSKeyId]"
```

الأول `AES256` يعني SSE-S3، والثاني `aws:kms` مع معرّف المفتاح.

الحين سوّ رابط موقّع مدته 60 ثانية، وجرّبه:

```bash
URL=$(aws s3 presign s3://$BUCKET/invoice.txt --expires-in 60)

curl -s "$URL"
```

يطبع محتوى الملف، مع إن الحاوية خاصة. انتظر دقيقة وأعد نفس أمر `curl`، وبيرجع `AccessDenied` مع رسالة إن الطلب منتهي.

والآن افرض HTTPS على الحاوية:

```bash
aws s3api put-bucket-policy --bucket $BUCKET --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyHttp",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::'$BUCKET'", "arn:aws:s3:::'$BUCKET'/*"],
    "Condition": {"Bool": {"aws:SecureTransport": "false"}}
  }]
}'

URL=$(aws s3 presign s3://$BUCKET/invoice.txt --expires-in 300)

curl -s -o /dev/null -w "https: %{http_code}\n" "$URL"
curl -s -o /dev/null -w "http: %{http_code}\n" "${URL/https:/http:}"
```

نفس الرابط يرجع `200` مع HTTPS و`403` مع HTTP.

::: security احذف بعد التجربة
خلاص ما نحتاج هذي الحاوية. من صفحة S3 حددها واختر **Empty** ثم **Delete**.
:::

## الخلاصة

- كل كائن جديد مشفّر بـ **SSE-S3** تلقائياً، واختر **SSE-KMS** لو تبي تحكم وسجل، مع **Bucket Keys**.
- افرض **HTTPS** بشرط `aws:SecureTransport`.
- **الروابط الموقّعة** تشارك ملف خاص مؤقتاً بدون فتح الحاوية.
- **CORS** من المتصفح، وتحله بإعدادات الحاوية.
- **Object Lock** يحميك من الحذف، حتى من الجذر في وضع Compliance.

S3 مو الخيار الوحيد. لو عندك نظام Windows، أو مكتب يبي يوصل لتخزين السحابة، أو ملايين الملفات تبي تنقلها؟ في [**الجزء الثامن عشر**](/posts/aws-18-storage-transfer/) نغطي خدمات التخزين والنقل الباقية.
