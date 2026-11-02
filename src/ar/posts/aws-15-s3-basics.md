---
title: "S3: أساسيات التخزين الكائني"
description: وش هو التخزين الكائني وكيف يختلف عن الأقراص، والحاويات والكائنات، ومين يقدر يوصل لها، والإصدارات والنسخ بين المناطق، واستضافة موقع ثابت، مع تجربة عملية تشوف فيها الإصدارات تنقذ ملف محذوف.
date: 2026-11-02
series: aws
part: 15
numbered: true
tags: [aws, s3]
---

في [الجزء الخامس](/posts/aws-05-ec2-storage/) شفنا تخزين مربوط بالسيرفرات. بس الصور والفيديوهات والنسخ الاحتياطية والسجلات ما تحتاج سيرفر أصلاً، تحتاج مكان يحفظها بأمان ويوصلها وقت الطلب، مهما كبر حجمها. هذا **S3**.

و**S3** (Simple Storage Service) من أقدم خدمات AWS وأكثرها استخداماً. ما فيها مساحة تحجزها، وتدفع على اللي تخزنه. وAWS تصممها لمتانة 99.999999999%، يعني احتمال ضياع ملف عندك شبه معدوم.

وتشوفها في كل مكان: نسخ احتياطية، وملفات المستخدمين، ومواقع ثابتة، وسجلات، وبحيرات بيانات للتحليل.

## التخزين الكائني مقابل الأقراص

| | كتلي (EBS) | ملفات (EFS) | كائني (S3) |
| --- | --- | --- | --- |
| **يشبه** | قرص | مجلد مشترك | مفتاح وملف عبر API |
| **يوصل له** | سيرفر واحد عادةً | عدة سيرفرات | أي أحد مسموح له عبر HTTP |
| **تعديل ملف** | جزء منه | جزء منه | تستبدل الكائن كامل |
| **الحجم** | تحجزه | يكبر لحاله | بلا حد عملي |

والنقطة اللي تفرق في التصميم: S3 مو قرص تركّبه وتشغّل منه قاعدة بيانات، بس هو مثالي لأي ملف تقراه أو تكتبه كامل.

## الحاويات والكائنات

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="s3-caption">
<defs>
<marker id="s3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="330" y="14" width="290" height="222" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="475" y="40" text-anchor="middle" class="d-code">series-files-12345</text>
<text x="475" y="62" text-anchor="middle" class="d-small">حاوية في Region واحدة</text>
<rect x="350" y="78" width="250" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="475" y="102" text-anchor="middle" class="d-code">index.html</text>
<rect x="350" y="126" width="250" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="475" y="150" text-anchor="middle" class="d-code">photos/2026/trip.jpg</text>
<rect x="350" y="174" width="250" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="475" y="198" text-anchor="middle" class="d-code">logs/app.log</text>
<rect x="20" y="14" width="250" height="222" rx="14" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="145" y="40" text-anchor="middle" class="d-label">كائن واحد</text>
<text x="230" y="78" text-anchor="middle" class="d-label">المفتاح</text>
<text x="110" y="78" text-anchor="middle" class="d-code">photos/2026/trip.jpg</text>
<text x="230" y="112" text-anchor="middle" class="d-label">البيانات</text>
<text x="110" y="112" text-anchor="middle" class="d-small">الملف نفسه</text>
<text x="230" y="146" text-anchor="middle" class="d-label">Metadata</text>
<text x="110" y="146" text-anchor="middle" class="d-small">النوع والحجم والتاريخ</text>
<text x="230" y="180" text-anchor="middle" class="d-label">الوسوم</text>
<text x="110" y="180" text-anchor="middle" class="d-code">team=media</text>
<text x="230" y="214" text-anchor="middle" class="d-label">الإصدار</text>
<text x="110" y="214" text-anchor="middle" class="d-code">3sL4kq...&#x200E;</text>
<line x1="350" y1="145" x2="272" y2="145" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#s3-arrow)"/>
</svg>
<figcaption id="s3-caption">الحاوية فيها كائنات، وكل كائن له مفتاح وبيانات ومعلومات عنه ووسوم وإصدار.</figcaption>
</figure>

**الحاوية (Bucket):**

- تعيش في Region واحدة تختارها، مع إن S3 تظهر كخدمة عامة في الكونسول.
- اسمها لازم يكون فريد على مستوى كل حسابات AWS، بحروف صغيرة وأرقام وشرطات.

**الكائن (Object):**

- حجمه لين 50 TB.
- **المفتاح** هو مساره الكامل، مثل `photos/2026/trip.jpg`.
- **ما فيه مجلدات حقيقية.** `photos/2026/` جزء من الاسم، والكونسول يعرضه كمجلد فقط.

## مين يقدر يوصل؟

كل شي في S3 **خاص افتراضياً**. ولما يطلب أحد كائن، تجمع AWS كل القواعد: يوصل لو فيه قاعدة تسمح له وما فيه قاعدة تمنعه.

| الأداة | ترتبط بـ | تستخدمها لـ |
| --- | --- | --- |
| **سياسة IAM** | المستخدم أو الدور | صلاحيات موظفيك وخدماتك |
| **Bucket Policy** | الحاوية | الوصول العام، وحسابات ثانية، وفرض قواعد |
| **Block Public Access** | الحاوية أو الحساب | قفل أمان يمنع الوصول العام مهما كانت السياسات |

مثال: سيرفر EC2 يقرأ من S3؟ أعطه [دور IAM](/posts/aws-02-iam/). وحساب ثاني يقرأ؟ Bucket Policy تسمح له. وهذي سياسة تخلي حاوية كاملة عامة للقراءة، وهذا اللي يحتاجه موقع ثابت:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-site-bucket/*"
  }]
}
```

::: warning خل Block Public Access مفعّل
هو مفعّل افتراضياً، وكثير من تسريبات البيانات في S3 جات من حاويات انفتحت بالغلط. طفّه فقط لحاوية مقصود إنها عامة. وبنكمل الأمان بالتفصيل في [الجزء السابع عشر](/posts/aws-17-s3-security/).
:::

## الإصدارات (Versioning)

لما تفعّلها، أي استبدال لكائن ينشئ إصدار جديد بدل ما يمسح القديم:

- **الكتابة فوق ملف:** الإصدار القديم يبقى، وتقدر ترجع له.
- **الحذف:** يضيف علامة حذف (Delete Marker)، والبيانات تبقى. احذف العلامة ويرجع الملف.
- **الإيقاف:** ما يمسح الإصدارات الموجودة.

وكل إصدار تدفع عليه، فاربطها بـ[قواعد دورة الحياة](/posts/aws-16-s3-classes-lifecycle/) عشان تنظف القديم.

## النسخ بين الحاويات (Replication)

S3 تنسخ الكائنات الجديدة تلقائياً لحاوية ثانية، حتى في حساب ثاني. ولازم الإصدارات تكون مفعّلة في الجهتين.

| النوع | يناسب |
| --- | --- |
| **بين Regions (CRR)** | التوافق مع الأنظمة، والقرب من المستخدمين، والتعافي من الكوارث |
| **داخل Region (SRR)** | جمع السجلات في مكان واحد، أو نسخ الإنتاج لبيئة تجربة |

وانتبه: الكائنات القديمة ما تنتقل إلا بـ **Batch Replication**، والنسخ ما ينتقل عبر سلسلة حاويات، والحذف النهائي لإصدار ما ينسخ، عشان تبقى محمي من الحذف الخبيث.

## استضافة موقع ثابت

S3 تقدر تقدم موقع HTML كامل: تفعّل **Static website hosting**، وتحدد `index.html`، وتخلي الكائنات عامة بسياسة زي اللي فوق.

بس رابط الموقع هذا يشتغل بـ HTTP فقط. والأفضل في الإنتاج: حاوية خاصة قدامها [CloudFront](/posts/aws-12-cloudfront-global-accelerator/) مع OAC، فتحصل HTTPS وسرعة أعلى بدون ما تفتح الحاوية.

## التفاعل مع الأحداث

S3 تقدر ترسل إشعار لما يصير شي، مثل رفع صورة. وترسله لـ SQS أو SNS أو Lambda مباشرة، أو لـ **EventBridge** لو تبي فلترة متقدمة ووجهات أكثر. والمثال المشهور: كل صورة ترتفع، دالة Lambda تسوي لها نسخة مصغرة. وبنطبق هذا في [الجزء الثاني والعشرين](/posts/aws-22-serverless-design/).

## الأداء

S3 تتحمل على الأقل **3,500 كتابة و5,500 قراءة في الثانية لكل بادئة** (Prefix)، فتوزيع المفاتيح على عدة بادئات يكبر السعة. وعندك أدوات للملفات الكبيرة والمسافات البعيدة:

| الأداة | وش تسوي |
| --- | --- |
| **Multipart Upload** | ترفع الملف أجزاء بالتوازي، ولو فشل جزء تعيده فقط. مفضل فوق 100 MB، ولازم فوق 5 GB |
| **Transfer Acceleration** | الرفع يمر بأقرب موقع حافة ثم شبكة AWS، للمسافات البعيدة |
| **Byte-Range Fetches** | تحمّل جزء محدد من الملف، فتسرّع التحميل بالتوازي أو تجيب اللي تحتاجه فقط |

## عملي: الإصدارات تنقذ ملف محذوف

من CloudShell، أنشئ حاوية باسم فريد وارفع صفحة:

```bash
BUCKET=series-files-$RANDOM$RANDOM
aws s3 mb s3://$BUCKET

echo "<h1>Version 1</h1>" > index.html
aws s3 cp index.html s3://$BUCKET/
aws s3 ls s3://$BUCKET/
```

جرّب توصل للملف من الإنترنت. بيرجع `403`، لأن كل شي خاص:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://$BUCKET.s3.$AWS_REGION.amazonaws.com/index.html
```

الحين فعّل الإصدارات، واكتب فوق الملف، ثم احذفه:

```bash
aws s3api put-bucket-versioning --bucket $BUCKET \
  --versioning-configuration Status=Enabled

echo "<h1>Version 2</h1>" > index.html
aws s3 cp index.html s3://$BUCKET/

aws s3 rm s3://$BUCKET/index.html
aws s3 ls s3://$BUCKET/
```

الملف اختفى من القائمة. بس شوف وش صار فعلاً:

```bash
aws s3api list-object-versions --bucket $BUCKET --prefix index.html \
  --query "{Versions:Versions[].[VersionId,IsLatest],Markers:DeleteMarkers[].[VersionId,IsLatest]}"
```

الإصدارين موجودين، وفوقهم علامة حذف. احذف العلامة ويرجع الملف:

```bash
MARKER=$(aws s3api list-object-versions --bucket $BUCKET --prefix index.html \
  --query "DeleteMarkers[0].VersionId" --output text)

aws s3api delete-object --bucket $BUCKET --key index.html --version-id $MARKER

aws s3 cp s3://$BUCKET/index.html -
```

بيطبع `Version 2`. رجع الملف وكأن ما انحذف.

::: security احذف بعد التجربة
الحاوية اللي فيها إصدارات ما تنحذف بأمر بسيط. لو بتكمل الأجزاء الجاية خلها. وإلا من صفحة S3 حددها واختر **Empty** ثم **Delete**.
:::

## الخلاصة

- **S3** تخزين كائني بلا حد عملي، وتدفع على اللي تخزنه.
- **الحاوية** في Region واحدة باسم فريد، و**المفتاح** مسار الكائن الكامل.
- كل شي **خاص افتراضياً**، وخل Block Public Access مفعّل.
- **الإصدارات** تحميك من الحذف والكتابة بالغلط، و**النسخ** ينقل الكائنات لحاوية ثانية.
- لموقع ثابت في الإنتاج: حاوية خاصة مع CloudFront.

## اختبر نفسك

::: quiz
وكالة تصميم تحفظ ملفات عملائها في S3. والأسبوع اللي فات حذف موظف ملفات بالغلط، وسكربت كتب فوق ملفات ثانية. والوكالة تبي تقدر ترجّع النوعين من الحين وطالع، **بأقل جهد**. وش تفعّل؟

- [ ] Block Public Access
- [ ] Same-Region Replication
- [x] Versioning
- [ ] Transfer Acceleration

مع الإصدارات، الحذف يضيف علامة بس، والكتابة فوق الملف تنشئ إصدار جديد، فتبقى البيانات القديمة وتقدر ترجع لها.

- **A:** هذا يمنع الوصول العام، وما يسوي شي مع الحذف أو الكتابة فوق الملفات.
- **B:** هذا يحتاج الإصدارات أصلاً، ويضيف حاوية ثانية تدفع عليها.
- **D:** هذا يسرّع الرفع للمسافات الطويلة، وما يحتفظ بنسخ قديمة.

للمراجعة: [الإصدارات (Versioning)](#الإصدارات-versioning) في هذا الجزء، و[Retaining multiple versions of objects with S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) في وثائق AWS.
:::

::: quiz
شركة تحفظ موقعها التسويقي في S3. وتبيه يشتغل بـ HTTPS على نطاقها، والحاوية تبقى خاصة. وش يناسب؟

- [x] حاوية خاصة، قدامها CloudFront وOAC
- [ ] Static website hosting، مع حاوية عامة
- [ ] Static website hosting، مع إبقاء Block Public Access شغال
- [ ] سيرفر EC2 ينسخ الملفات من S3 ويقدمها

CloudFront يعطيك HTTPS على نطاقك، وOAC يخلي CloudFront وحده يقرأ من الحاوية، فتبقى مقفلة.

- **B:** رابط الموقع يشتغل بـ HTTP فقط، ولازم تكون الحاوية عامة.
- **C:** رابط الموقع يحتاج كائنات عامة، فمع القفل يطلع للزوار `403`.
- **D:** هذا يضيف سيرفر تشغله وتحدّثه، لموقع ما يحتاج سيرفر.

للمراجعة: [استضافة موقع ثابت](#استضافة-موقع-ثابت) في هذا الجزء، و[Website endpoints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html) في وثائق AWS.
:::

::: quiz
استوديو أفلام يرفع ملفات فيديو حجمها 40 جيجابايت إلى S3 عبر اتصال غير مستقر. والرفع يفشل كثير قرب النهاية ويبدأ من جديد. وش يحل هذا؟

- [ ] Byte-range fetches
- [ ] Transfer Acceleration لحاله
- [ ] Versioning على الحاوية
- [x] Multipart upload

Multipart upload يرفع الملف أجزاء بالتوازي، ولو فشل جزء تعيده هو بس. وهو كمان إلزامي لأي ملف فوق 5 جيجابايت.

- **A:** هذي لتحميل جزء من ملف، مو للرفع.
- **B:** هذا يختصر الطريق للمسافات الطويلة، بس الرفع الفاشل لسا يبدأ من جديد.
- **C:** هذا يحتفظ بالإصدارات القديمة، وما يساعد الرفع يكتمل.

للمراجعة: [الأداء](#الأداء) في هذا الجزء، و[Uploading and copying objects using multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) في وثائق AWS.
:::

::: quiz
جهة تنظيمية تطلب من شركة تحتفظ بنسخة من حاوية سجلاتها في Region ثانية، بما فيها الملفات الموجودة حالياً. والإصدارات شغالة في الطرفين. وش تجهز؟

- [ ] Cross-Region Replication لحاله
- [x] Cross-Region Replication، مع Batch Replication للملفات الموجودة
- [ ] Same-Region Replication، مع Batch Replication
- [ ] قاعدة Lifecycle تنقل الملفات إلى الـ Region الثانية

قاعدة النسخ تنسخ الكائنات الجديدة فقط، فالموجودة تحتاج Batch Replication. والاثنين مع بعض يعطونك نسخة كاملة في الـ Region الثانية تبقى محدثة.

- **A:** هذا ينسخ الكائنات اللي انكتبت بعد القاعدة فقط.
- **C:** هذا يبقي النسخة في نفس الـ Region، وهذا ما يحقق المطلوب.
- **D:** قواعد Lifecycle تغير فئة الملف أو تحذفه، وما تنقله بين Regions.

للمراجعة: [النسخ بين الحاويات (Replication)](#النسخ-بين-الحاويات-replication) في هذا الجزء، و[Replicating objects within and across Regions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html) في وثائق AWS.
:::

::: quiz
سيرفر EC2 لازم يقرأ من حاوية خاصة، وفريق تحليل في حساب AWS ثاني لازم يقرأ منها كمان. وBlock Public Access لازم يبقى شغال. أي **خطوتين** تناسب؟ (اختر اثنين.)

- [x] إعطاء السيرفر دور IAM بصلاحية قراءة
- [ ] حفظ مفاتيح وصول مستخدم في ملف على السيرفر
- [ ] جعل الحاوية مقروءة للعامة
- [x] إضافة سياسة حاوية تسمح للحساب الثاني
- [ ] نسخ الكائنات إلى قرص EBS يتشاركه الفريق

الدور يعطي السيرفر صلاحيات مؤقتة بدون مفاتيح تحفظها، وسياسة الحاوية هي طريقتك تدخّل فيها حساب ثاني. وما فيهم شي يخلي البيانات عامة.

- **B:** المفاتيح في ملف ممكن تتسرب، والدور يغنيك عنها تماماً.
- **C:** هذا يكشف البيانات للكل، والقفل بيمنعه أصلاً.
- **E:** هذا يزيد نسخ لازم تديرها، والقرص مو طريقة حساب ثاني يقرأ بياناتك.

للمراجعة: [مين يقدر يوصل؟](#مين-يقدر-يوصل) في هذا الجزء، و[Example 2: Bucket owner granting cross-account bucket permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-walkthroughs-managing-access-example2.html) و[Use an IAM role to grant permissions to applications running on Amazon EC2 instances](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html) في وثائق AWS.
:::

بس هل كل ملف يستاهل نفس السعر؟ ملف ما ينفتح من سنتين لازم ما يكلفك مثل صورة تنطلب كل ثانية. في [**الجزء السادس عشر**](/posts/aws-16-s3-classes-lifecycle/) نوفر كثير بفئات التخزين ودورة الحياة.
