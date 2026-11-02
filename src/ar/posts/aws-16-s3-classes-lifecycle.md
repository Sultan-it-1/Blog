---
title: "S3: فئات التخزين ودورة الحياة"
description: مو كل ملف يستاهل نفس السعر. تعرف على فئات تخزين S3 من Standard إلى Deep Archive، ومتى تختار كل وحدة، وكيف تنقل قواعد دورة الحياة ملفاتك تلقائياً، وتوفر كثير على فاتورتك.
date: 2026-11-02
series: aws
part: 16
numbered: true
tags: [aws, s3]
---

في [الجزء الخامس عشر](/posts/aws-15-s3-basics/) خزّنا كل شي بالطريقة الافتراضية. بس فكر في تطبيقك: صورة منتج تنطلب كل ثانية، وفاتورة عمرها خمس سنين ما يفتحها أحد إلا وقت التدقيق. ليش تدفع عليهم نفس السعر؟

فئات التخزين تعطيك هذا الخيار: كل ما قل الوصول للملف، قل سعر تخزينه، وزادت تكلفة أو مدة استرجاعه.

## المتانة والتوفر

مصطلحين لازم تفرق بينهم:

- **المتانة (Durability):** هل بيضيع الملف؟ 99.999999999% لكل الفئات، مع ملاحظة إن الفئات بمنطقة توفر واحدة تضيع بياناتها لو تدمرت المنطقة.
- **التوفر (Availability):** هل تقدر توصل له الحين؟ يختلف من فئة لفئة، مثلاً 99.99% لـ Standard.

## الفئات

| الفئة | تناسب | الاسترجاع | أقل مدة | السعر التقريبي |
| --- | --- | --- | --- | --- |
| **Standard** | بيانات تنطلب كثير | فوري | ما فيه | 0.023 |
| **Intelligent-Tiering** | نمط وصول غير معروف | فوري في الطبقات التلقائية | ما فيه | حسب الطبقة |
| **Standard-IA** | مرة في الشهر تقريباً | فوري، مع رسم استرجاع | 30 يوم | 0.0125 |
| **One Zone-IA** | بيانات تقدر تعيد إنشاءها | فوري، مع رسم | 30 يوم | 0.01 |
| **Glacier Instant Retrieval** | مرة في ثلاثة أشهر | فوري، مع رسم أعلى | 90 يوم | 0.004 |
| **Glacier Flexible Retrieval** | مرة أو مرتين في السنة | من دقايق إلى ساعات | 90 يوم | 0.0036 |
| **Glacier Deep Archive** | أقل من مرة في السنة | من 12 إلى 48 ساعة | 180 يوم | 0.00099 |

الأسعار بالدولار لكل جيجابايت في الشهر، تقريبية لمناطق أمريكا، فراجع صفحة الأسعار لمنطقتك.

وكل هذي الفئات تحفظ البيانات في ثلاث مناطق توفر أو أكثر، إلا **One Zone-IA**. وعندك كمان **S3 Express One Zone**: أداء عالي جداً بزمن استجابة أقل من 10 ملي ثانية، في منطقة توفر واحدة، بحاوية من نوع خاص، وسعره أعلى. يناسب التحليل وتدريب النماذج اللي تحتاج سرعة كبيرة.

### Intelligent-Tiering: لو ما تعرف

لو ما تدري كم بينطلب الملف، هذي الفئة تنقله لحالها حسب الاستخدام:

| الطبقة | متى | الاسترجاع |
| --- | --- | --- |
| **Frequent Access** | البداية | فوري |
| **Infrequent Access** | بعد 30 يوم بدون وصول | فوري |
| **Archive Instant Access** | بعد 90 يوم بدون وصول | فوري |
| **Archive Access** | اختيارية، من 90 يوم | ساعات |
| **Deep Archive Access** | اختيارية، من 180 يوم | حتى 12 ساعة |

تدفع رسم مراقبة بسيط لكل كائن، وما فيه رسوم استرجاع، ولو انطلب الملف يرجع للطبقة الأولى.

### Glacier Flexible و Deep Archive: طلب قبل القراءة

في هذي الفئات ما تقدر تقرأ الملف مباشرة، لازم تطلب **استرجاعه** أول، وتختار السرعة:

| الفئة | Expedited | Standard | Bulk |
| --- | --- | --- | --- |
| **Flexible Retrieval** | 1 إلى 5 دقايق | 3 إلى 5 ساعات | 5 إلى 12 ساعة |
| **Deep Archive** | ما فيه | 12 ساعة | 48 ساعة |

::: warning ثلاث حفر في الفئات الرخيصة
- **أقل مدة تخزين:** لو حذفت ملف من Glacier Deep Archive بعد شهر، تدفع 180 يوم كاملة.
- **أقل حجم محسوب:** فئات IA وGlacier Instant تحسب أقل كائن 128 KB، فآلاف الملفات الصغيرة ممكن تكلف أكثر من Standard.
- **رسوم الاسترجاع:** لو تقرأ البيانات كثير، Standard-IA ممكن يصير أغلى من Standard.
:::

## دورة الحياة (Lifecycle)

ما تحتاج تنقل الملفات بيدك. قواعد **Lifecycle** تسوي هذا تلقائياً حسب عمر الملف. مثلاً سجلات تطبيق:

<figure class="diagram">
<svg viewBox="0 0 640 170" role="img" aria-labelledby="lifecycle-caption">
<defs>
<marker id="life-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="570" y="34" text-anchor="middle" class="d-small">يوم 0</text>
<rect x="520" y="46" width="100" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="570" y="82" text-anchor="middle" class="d-label">Standard</text>
<text x="445" y="34" text-anchor="middle" class="d-small">يوم 30</text>
<rect x="395" y="46" width="100" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="445" y="82" text-anchor="middle" class="d-label">Standard-IA</text>
<text x="320" y="34" text-anchor="middle" class="d-small">يوم 90</text>
<rect x="270" y="46" width="100" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="72" text-anchor="middle" class="d-label">Glacier</text>
<text x="320" y="92" text-anchor="middle" class="d-label">Flexible</text>
<text x="195" y="34" text-anchor="middle" class="d-small">يوم 365</text>
<rect x="145" y="46" width="100" height="62" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="195" y="72" text-anchor="middle" class="d-label">Deep</text>
<text x="195" y="92" text-anchor="middle" class="d-label">Archive</text>
<text x="70" y="34" text-anchor="middle" class="d-small">يوم 2555</text>
<rect x="20" y="46" width="100" height="62" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="70" y="82" text-anchor="middle" class="d-label">حذف</text>
<line x1="520" y1="77" x2="497" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<line x1="395" y1="77" x2="372" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<line x1="270" y1="77" x2="247" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<line x1="145" y1="77" x2="122" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<text x="320" y="136" text-anchor="middle" class="d-small">تخزين أرخص، واسترجاع أبطأ وأغلى</text>
<line x1="620" y1="150" x2="22" y2="150" stroke="var(--color-line-strong)" stroke-width="2" marker-end="url(#life-arrow)"/>
</svg>
<figcaption id="lifecycle-caption">قاعدة واحدة تنقل الملف عبر الفئات مع تقدم عمره، ثم تحذفه بعد سبع سنين.</figcaption>
</figure>

والقاعدة فيها نوعين من الإجراءات، وتطبقها على بادئة أو وسم محدد:

| الإجراء | أمثلة |
| --- | --- |
| **Transition** | انقل الملف لفئة أرخص بعد عدد أيام |
| **Expiration** | احذف الملف بعد مدة، أو الإصدارات القديمة، أو الرفعات اللي ما اكتملت |

وأشياء تنتبه لها:

- **النقل نازل فقط** على السلم، وأقل مدة قبل Standard-IA هي 30 يوم.
- **الملفات الأصغر من 128 KB** ما تنتقل افتراضياً، لأن تكلفة نقلها أكبر من توفيرها.
- **النقل نفسه له رسم** لكل ألف كائن، فانتبه للملايين من الملفات الصغيرة.

::: tip قاعدتين تضيفها لأي حاوية
احذف **الرفعات الناقصة** (Incomplete Multipart Uploads) بعد أسبوع، لأنها تنحسب وما تظهر في القائمة. ولو الإصدارات مفعّلة، احذف **الإصدارات القديمة** بعد مدة تناسبك.
:::

## كيف تعرف وش تختار؟

ما تحتاج تخمن. عندك أدوات تقرأ استخدامك الفعلي:

- **Storage Class Analysis:** تراقب الوصول لبادئة أو حاوية، وتقترح متى تنقل من Standard إلى Standard-IA.
- **Storage Lens:** لوحة على مستوى الحسابات كلها: الأحجام والنمو والحاويات اللي فيها رفعات ناقصة أو بدون تشفير. ولها مقاييس مجانية وأخرى متقدمة مدفوعة.

ولو عندك ملايين الملفات وتبي تسوي شي عليها مرة وحدة، زي تغيير الفئة أو النسخ، **S3 Batch Operations** تنفذه على قائمة من **S3 Inventory**، مع تقرير بالنتائج.

وفي المقابل، لو تشارك بيانات ضخمة مع جهة ثانية، **Requester Pays** تخليهم يدفعون تكلفة الطلبات والتحميل بدالك.

## عملي: فئات وقاعدة دورة حياة

بنكمل بالحاوية من الجزء السابق. لو انتهت جلسة CloudShell، حط اسمها في `BUCKET` من جديد. ارفع ملف في فئة محددة، وشوف الفئة:

```bash
echo "monthly report" > report.txt

aws s3 cp report.txt s3://$BUCKET/reports/report.txt --storage-class STANDARD_IA

aws s3api head-object --bucket $BUCKET --key reports/report.txt \
  --query StorageClass
```

الحين أضف قاعدة دورة الحياة اللي في الرسم على بادئة `logs/`:

```bash
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET \
  --lifecycle-configuration '{
  "Rules": [{
    "ID": "logs-rule",
    "Status": "Enabled",
    "Filter": {"Prefix": "logs/"},
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER"},
      {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
    ],
    "Expiration": {"Days": 2555},
    "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
  }]
}'

aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET \
  --query "Rules[0].Transitions" --output table
```

وهذا الجزء الممتع: ارفع ملف لـ Glacier، وحاول تقراه:

```bash
echo "old invoice" > old.txt
aws s3 cp old.txt s3://$BUCKET/archive/old.txt --storage-class GLACIER

aws s3 cp s3://$BUCKET/archive/old.txt -
```

بيرجع خطأ `InvalidObjectState`، لأن الملف محفوظ لكنه ما ينقرأ مباشرة. اطلب استرجاعه:

```bash
aws s3api restore-object --bucket $BUCKET --key archive/old.txt \
  --restore-request '{"Days": 1, "GlacierJobParameters": {"Tier": "Standard"}}'

aws s3api head-object --bucket $BUCKET --key archive/old.txt \
  --query "[StorageClass,Restore]"
```

بتشوف `ongoing-request="true"`. وبعد 3 إلى 5 ساعات يصير `false`، ويتوفر نسخة مؤقتة تقراها ليوم واحد.

::: security التكلفة في هذي التجربة
الملفات صغيرة جداً، فتكلفتها أقل من سنت حتى مع أقل مدة في Glacier. وخل الحاوية لو بتكمل الجزء الجاي.
:::

## الخلاصة

- **كل ما قل الوصول، قل سعر التخزين**، وزادت تكلفة الاسترجاع أو مدته.
- لو ما تعرف نمط الوصول، **Intelligent-Tiering** ينقل الملفات لحاله.
- انتبه لـ **أقل مدة تخزين** و**أقل حجم محسوب** و**رسوم الاسترجاع**.
- **Lifecycle** تنقل الملفات وتحذفها تلقائياً، وأضف قاعدة للرفعات الناقصة دايماً.
- **Storage Lens وStorage Class Analysis** تقرر بأرقام، مو بالتخمين.

## اختبر نفسك

::: quiz
شركة ناشئة تطلق منصة بيانات جديدة. بعض الملفات ممكن تبقى أشهر ما أحد يلمسها وبعدين تنقرأ كثير، وما أحد يقدر يتوقع أيها. وتبي تخفض تكلفة التخزين، بدون رسوم استرجاع وبدون قواعد تديرها. أي فئة تناسب؟

- [ ] Standard-IA
- [ ] One Zone-IA
- [ ] Glacier Flexible Retrieval
- [x] Intelligent-Tiering

تراقب استخدام كل ملف وتنقله بين الطبقات لحالها، مقابل رسم مراقبة بسيط وبدون رسوم استرجاع.

- **A:** هذي فيها رسم على كل استرجاع، فالملف اللي ينقرأ كثير ممكن تصير تكلفته أعلى.
- **B:** هذي فيها رسم استرجاع كمان، وتحفظ البيانات في منطقة توفر وحدة.
- **C:** الملفات هنا تحتاج استرجاع قبل القراءة، وممكن ياخذ ساعات.

للمراجعة: [Intelligent-Tiering: لو ما تعرف](#intelligent-tiering-لو-ما-تعرف) في هذا الجزء، و[Managing storage costs with Amazon S3 Intelligent-Tiering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html) في وثائق AWS.
:::

::: quiz
خدمة فيديو تحتفظ بنسخ منخفضة الدقة من أفلامها، وتقدر تعيد إنتاجها من الأصول في أي وقت. وكل نسخة تنقرأ مرة في الشهر تقريباً، ولازم تفتح فوراً. أي فئة أقل تكلفة وتحقق هذا؟

- [ ] Standard
- [x] One Zone-IA
- [ ] Glacier Deep Archive
- [ ] Glacier Flexible Retrieval

النسخ ممكن تنعاد، فخسارتها مع منطقة توفر مو كارثة، وما تحتاج تدفع على ثلاث مناطق. والاسترجاع يبقى فوري.

- **A:** هذي تنفع، بس بسعر أعلى على حماية هذي البيانات ما تحتاجها.
- **C:** الاسترجاع هنا ياخذ من 12 إلى 48 ساعة.
- **D:** الملفات هنا تحتاج استرجاع قبل القراءة، ياخذ من دقايق لساعات.

للمراجعة: [الفئات](#الفئات) في هذا الجزء، و[Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html) في وثائق AWS.
:::

::: quiz
سجلات تطبيق شركة لازم تبقى مقروءة فوراً 30 يوم، ثم تتأرشف بسعر رخيص سنة، ثم تنحذف. والفريق ما يبي أي سكربتات يشغلها. وش يناسب؟

- [x] قاعدة Lifecycle على بادئة `logs/`، فيها Transition وExpiration
- [ ] دالة Lambda مجدولة تنقل الملفات وتحذفها
- [ ] Storage Lens، بمقاييسه المتقدمة
- [ ] Cross-Region Replication إلى Region أرخص

قاعدة Lifecycle تنقل الملفات لفئة أرخص عند العمر اللي تحدده، وتحذفها بعدين، بدون أي شي تشغله أنت.

- **B:** هذا ينفع، بس هو كود لازم تكتبه وتصونه.
- **C:** هذا يعرض لك أرقام، وما ينقل ولا يحذف شي.
- **D:** هذا يزيد النسخ، وما يأرشف الأصول ولا يحذفها.

للمراجعة: [دورة الحياة (Lifecycle)](#دورة-الحياة-lifecycle) في هذا الجزء، و[Managing the lifecycle of objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) في وثائق AWS.
:::

::: quiz
سكربت مدقق يحاول يقرأ ملف حجمه 20 ميجابايت محفوظ في Glacier Flexible Retrieval، ويطلع له خطأ `InvalidObjectState`. والمدقق يحتاج الملف خلال 10 دقايق. وش يسوي الفريق؟

- [ ] إعطاء دور السكربت صلاحية `s3:GetObject`
- [ ] طلب استرجاع بخيار Bulk
- [x] طلب استرجاع بخيار Expedited
- [ ] إضافة قاعدة Lifecycle ترجّع الملف إلى Standard

في هذي الفئة لازم ينسترجع الملف قبل ما ينقرأ، وExpedited عادةً يجهز ملف بهذا الحجم خلال 1 إلى 5 دقايق.

- **A:** الصلاحية الناقصة ترجّع `AccessDenied`، مو هذا الخطأ.
- **B:** هذا أرخص خيار، بس ياخذ من 5 إلى 12 ساعة.
- **D:** نقل Lifecycle ينزل مع الدرج بس، وما يرجع أبداً إلى Standard.

للمراجعة: [Glacier Flexible و Deep Archive: طلب قبل القراءة](#glacier-flexible-و-deep-archive-طلب-قبل-القراءة) في هذا الجزء، و[Understanding archive retrieval options](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html) في وثائق AWS.
:::

::: quiz
عشان يوفر، رفع فريق ملايين الصور بحجم 10 كيلوبايت إلى Standard-IA. والتطبيق يقرأها طول اليوم، والفاتورة زادت. أي **سببين** يفسرون هذا؟ (اختر اثنين.)

- [ ] Standard-IA فيها رسم مراقبة لكل كائن
- [x] كل كائن ينحسب 128 كيلوبايت على الأقل
- [x] كل قراءة عليها رسم استرجاع
- [ ] Standard-IA سعر الجيجابايت فيها أعلى من Standard
- [ ] Standard-IA تحفظ نسخة زيادة في منطقة توفر رابعة

الصورة بحجم 10 كيلوبايت تنحسب 128 كيلوبايت في هذي الفئة، وسعر التخزين المنخفض ما يفيد إلا مع البيانات اللي نادراً تنقرأ. وبيانات بهذا الصغر وهذا الاستخدام مكانها Standard.

- **A:** رسم المراقبة حق Intelligent-Tiering.
- **D:** سعر الجيجابايت فيها أقل، وعشان كذا تبدو مغرية.
- **E:** تستخدم ثلاث مناطق أو أكثر زي Standard، فالتكلفة الزيادة مو من هنا.

للمراجعة: [الفئات](#الفئات) في هذا الجزء، و[Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html) في وثائق AWS.
:::

بياناتك الحين في المكان المناسب بالسعر المناسب، بس مين يقدر يوصل لها؟ في [**الجزء السابع عشر**](/posts/aws-17-s3-security/) نغطي التشفير والروابط الموقّعة والقفل ضد الحذف.
