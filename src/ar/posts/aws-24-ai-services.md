---
title: "خدمات الذكاء الاصطناعي الجاهزة"
description: أضف الذكاء الاصطناعي لتطبيقك بدون فريق تعلم آلة. خدمات للصور والكلام والترجمة والمستندات، ونماذج توليدية على Bedrock، وبناء نموذجك بـ SageMaker AI، وأيها يدعم العربية، مع تجربة عملية تربط عدة خدمات.
date: 2026-11-02
series: aws
part: 24
numbered: true
tags: [aws, ai]
---

في [الجزء الثالث والعشرين](/posts/aws-23-athena-redshift-glue/) طلّعنا إجابات من بيانات مرتبة أصلاً. بس كثير من بياناتك مو كذا: صور ومكالمات وفواتير ممسوحة. فهمها كان يحتاج فريق تعلم آلة، واليوم كثير منه استدعاء API واحد.

AWS تقدم ثلاث مستويات، وأغلب الناس يبدأون من فوق:

<figure class="diagram">
<svg viewBox="0 0 640 212" role="img" aria-labelledby="ailayers-caption">
<defs>
<marker id="ailayers-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="595" y="18" text-anchor="middle" class="d-small">أسهل</text>
<line x1="595" y1="28" x2="595" y2="176" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#ailayers-arrow)"/>
<text x="595" y="196" text-anchor="middle" class="d-small">تحكم أكثر</text>
<rect x="20" y="14" width="520" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="280" y="37" text-anchor="middle" class="d-label">الخدمات الجاهزة</text>
<text x="280" y="57" text-anchor="middle" class="d-small">Rekognition وPolly وTextract وغيرها: استدعاء API واحد</text>
<rect x="20" y="78" width="520" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="280" y="101" text-anchor="middle" class="d-label">Amazon Bedrock</text>
<text x="280" y="121" text-anchor="middle" class="d-small">نماذج جاهزة توجهها بالأوامر وبياناتك</text>
<rect x="20" y="142" width="520" height="56" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="280" y="165" text-anchor="middle" class="d-label">Amazon SageMaker AI</text>
<text x="280" y="185" text-anchor="middle" class="d-small">تدرّب نماذجك وتشغلها</text>
</svg>
<figcaption id="ailayers-caption">كل ما نزلت، زاد تحكمك في النموذج، وزادت الخبرة والشغل المطلوب.</figcaption>
</figure>

| تبي | استخدم |
| --- | --- |
| فهم الصور والفيديو | **Rekognition** |
| تحويل الكلام إلى نص | **Transcribe** |
| تحويل النص إلى كلام | **Polly** |
| الترجمة | **Translate** |
| روبوت محادثة أو نظام هاتف | **Lex** و**Connect** |
| فهم النص: المشاعر والكيانات | **Comprehend** |
| استخراج النص والجداول من المستندات | **Textract** |
| التوصيات | **Personalize** |
| نماذج توليدية على بياناتك | **Bedrock** |
| تدريب نموذج خاص فيك | **SageMaker AI** |

## الصور: Rekognition

**Rekognition** يحلل الصور والفيديو بدون أي تدريب منك:

- **التصنيفات:** وش في الصورة، مثل سيارة أو شاطئ أو زحمة.
- **النص:** قراءة الكلمات في الصور، مثل اللوحات.
- **فلترة المحتوى:** يكشف الصور غير المناسبة قبل نشرها، وتقدر تدربه أكثر على أمثلتك.
- **الوجوه:** كشفها ومقارنتها والبحث عنها.

ولاحظ إن ميزتي **Streaming Video** و**Batch Image Content Moderation** أقفلت على العملاء الجدد في 30 أبريل 2026. باقي الميزات ما تأثرت، وتقدر تعالج الإطارات أو الدفعات بنفسك عبر واجهة الصور.

::: warning انتبه مع الوجوه
التعرف على الأشخاص له تبعات قانونية وأخلاقية تختلف من بلد لبلد. خذ الموافقة، وتأكد من الأنظمة اللي تنطبق عليك قبل ما تستخدمه.
:::

## الكلام: Transcribe وPolly

**Transcribe** يحول الكلام إلى نص، من ملف في S3 أو بث مباشر. ويقدر يفرق بين المتحدثين، وتضيف له مفرداتك مثل أسماء المنتجات، ويخفي البيانات الشخصية في اللغات المدعومة.

**Polly** يسوي العكس، ويحول النص إلى كلام. وتقدر تتحكم في النطق بطريقتين:

- **القواميس (Lexicons):** تعلمه يقرأ `AWS` كـ "Amazon Web Services".
- **SSML:** وسوم في النص تضيف وقفات أو تأكيد أو حتى همس.

## الترجمة: Translate

**Amazon Translate** يترجم بين 75 لغة، فورياً أو بدفعات من S3. وأضف **مصطلحات خاصة** عشان تبقى أسماء علامتك ومصطلحاتك كما هي. وربطه مع Polly وTranscribe يعطيك محادثة مترجمة كاملة.

## المحادثة: Lex وConnect

**Lex** يبني روبوتات محادثة كتابية وصوتية. تحدد وش ممكن يبي المستخدم، وهذا **Intent**، والتفاصيل اللي تحتاجها عشان تنفذه، واسمها **Slots**.

**Connect** مركز اتصال في السحابة: أرقام هاتف وطوابير ومسارات وموظفين، بدون أجهزة، وتدفع حسب الاستخدام. ومع بعض ممكن يشتغلون كذا:

1. عميل يتصل على الرقم في **Connect**.
2. يقول "أبي أغير موعدي"، و**Lex** يفهم الطلب ويسأل عن التاريخ.
3. دالة [Lambda](/posts/aws-21-lambda-api-dynamodb/) تحدث الموعد في نظامك.
4. ولو تعثر الروبوت، Connect يحول المكالمة لموظف.

## النص: Comprehend

**Comprehend** يقرأ النص ويطلع معناه: اللغة، و**المشاعر**، والكيانات مثل الأشخاص والأماكن، والعبارات المهمة، والبيانات الشخصية. وتقدر تدربه يصنف فئاتك، مثل نوع تذكرة الدعم.

**Comprehend Medical** يسوي هذا للنصوص الطبية: الحالات والأدوية والجرعات والفحوصات، ويكشف المعلومات الصحية المحمية.

وميزات **Topic Modeling** و**Event Detection** و**Prompt Safety Classification** فيه أقفلت على العملاء الجدد في 30 أبريل 2026.

## المستندات: Textract

**Textract** أبعد من قراءة النص في ملف ممسوح: يفهم البنية، فيرجع لك **النماذج** كأزواج حقل وقيمة، و**الجداول** كصفوف وأعمدة. وله مسارات خاصة للفواتير والإيصالات والهويات.

## التوصيات: Personalize

**Personalize** يبني "ممكن يعجبك كمان" من سلوك مستخدمينك: تعطيه مين شاف أو اشترى وش، وتاخذ API يرجع توصيات فورية، أو دفعات لحملات الإيميل. وما تحتاج تصمم نموذج بنفسك.

## البحث في مستنداتك: وماذا عن Kendra؟

ممكن تقرأ عن **Amazon Kendra**، وهي خدمة بحث ذكي في المستندات الداخلية. وقفت استقبال العملاء الجدد في 30 يوليو 2026، وAWS توجّه لـ **Bedrock Knowledge Bases** كبديل، وهذا يوصلنا للقسم الجاي.

## النماذج التوليدية: Amazon Bedrock

**Bedrock** يعطيك نماذج أساسية من مزودين كثير، مثل Anthropic وAmazon وMeta وMistral، عبر API واحد وبدون سيرفرات. وتدفع لكل Token، يعني حسب كمية النص الداخل والخارج. وواجهة **Converse** لها شكل واحد بين النماذج، فتغيير النموذج يعني تغيير قيمة وحدة.

وما عاد تحتاج تفعّل النماذج واحد واحد، لأن الوصول صار يتحكم فيه IAM. والاستثناء نماذج Anthropic، وتحتاج نموذج لمرة وحدة قبل أول استخدام.

### Knowledge Bases: إجابات من مستنداتك

النموذج ما يعرف سياسات شركتك. وبدل ما تدربه، تلقى المقاطع المناسبة وتعطيه إياها مع السؤال. هذا اسمه **RAG**، و**Knowledge Bases** يتكفل فيه:

<figure class="diagram">
<svg viewBox="0 0 640 204" role="img" aria-labelledby="rag-caption">
<defs>
<marker id="rag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="494" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="557" y="54" text-anchor="middle" class="d-label">السؤال</text>
<rect x="336" y="14" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="44" text-anchor="middle" class="d-label">Knowledge Base</text>
<text x="399" y="64" text-anchor="middle" class="d-small">يلقى المقاطع</text>
<rect x="178" y="14" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="44" text-anchor="middle" class="d-label">النموذج</text>
<text x="241" y="64" text-anchor="middle" class="d-small">يجاوب منها</text>
<rect x="20" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="83" y="44" text-anchor="middle" class="d-label">الجواب</text>
<text x="83" y="64" text-anchor="middle" class="d-small">مع مصادره</text>
<line x1="494" y1="49" x2="464" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
<line x1="336" y1="49" x2="306" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
<line x1="178" y1="49" x2="148" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
<rect x="336" y="124" width="126" height="66" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="399" y="152" text-anchor="middle" class="d-label">مستنداتك</text>
<text x="399" y="172" text-anchor="middle" class="d-small">في S3 وغيره</text>
<line x1="399" y1="124" x2="399" y2="86" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rag-arrow)"/>
</svg>
<figcaption id="rag-caption">الـ Knowledge Base يلقى أقرب المقاطع للسؤال في مستنداتك، والنموذج يجاوب منها بدل ذاكرته.</figcaption>
</figure>

### باقي الأدوات

| الأداة | وش تسوي |
| --- | --- |
| **Guardrails** | تمنع المواضيع غير المرغوبة، وتخفي البيانات الشخصية، وتساعد في تقليل الإجابات المختلقة |
| **AgentCore** | يشغّل ويدير وكلاء ينفذون إجراءات، مع أي إطار عمل ونموذج |
| **الدفعات والكاش** | تقلل تكلفة الشغل الكبير والأوامر المتكررة |

و**Bedrock Agents Classic** أقفل على العملاء الجدد لصالح AgentCore، فلا تبدأ فيه لو شفته في مقال قديم.

## نموذجك الخاص: SageMaker AI

لما ما يكفي الجاهز، مثل توقع المخاطر من بيانات عندك أنت بس، **Amazon SageMaker AI** (اسمه القديم SageMaker) يغطي الرحلة: دفاتر العمل، وتجهيز البيانات، والتدريب، ثم نقطة وصول تقدم التوقعات. و**JumpStart** يعطيك مئات النماذج الجاهزة تبدأ منها.

لا تخلط بينه وبين **Amazon SageMaker** الجديد، وهو مظلة تجمع البيانات والتحليل والذكاء الاصطناعي في استوديو واحد. وكمان عدة إضافات فيه، مثل Ground Truth وClarify وModel Monitor، أقفلت على العملاء الجدد في منتصف 2026، فتأكد من حالة الميزة قبل ما تعتمد عليها.

### Bedrock أو SageMaker AI؟

| | Bedrock | SageMaker AI |
| --- | --- | --- |
| **يبدأ من** | نموذج جاهز | بياناتك، أو نموذج تخصصه |
| **الإدارة** | بدون سيرفرات | تختار الحوسبة، أو تخصيص بدون سيرفرات |
| **تدفع** | لكل Token | غالباً على الحوسبة |
| **الخبرة** | المطور يكفي | تعلم الآلة يفيد كثير |

ونصيحة AWS نفسها: ابدأ بـ Bedrock مع الأوامر وKnowledge Bases، وانتقل لـ SageMaker AI لما تحتاج تغيّر سلوك النموذج.

## وماذا عن العربية؟

لو تطبيقك يخدم متحدثين بالعربية، شيك على هذا أول، لأن الخدمات مو سواء:

| الخدمة | دعم العربية |
| --- | --- |
| **Translate** | نعم |
| **Comprehend** | نعم، ومعها المشاعر |
| **Transcribe** | الخليجية (`ar-AE`) والفصحى (`ar-SA`)، بس إخفاء البيانات الشخصية مو مدعوم لهم |
| **Polly** | زينة بالفصحى، وهالة وزيد بالخليجية |
| **Textract** | لا: الإنجليزية والفرنسية والألمانية والإيطالية والبرتغالية والإسبانية فقط |
| **Bedrock** | حسب النموذج، فجرب نموذجك على نصوصك |

## ربط الخدمات

القوة الحقيقية في ربطها مع اللي تعلمته. تخيل تسجيلات مكالمات تنزل في S3، وكل خطوة تشغّل اللي بعدها عبر [الأحداث أو Step Functions](/posts/aws-22-serverless-design/):

<figure class="diagram">
<svg viewBox="0 0 640 118" role="img" aria-labelledby="chain-caption">
<defs>
<marker id="chain-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="494" y="28" width="126" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="557" y="54" text-anchor="middle" class="d-label">تسجيل المكالمة</text>
<text x="557" y="74" text-anchor="middle" class="d-small">في S3</text>
<rect x="336" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="54" text-anchor="middle" class="d-label">Transcribe</text>
<text x="399" y="74" text-anchor="middle" class="d-small">إلى نص</text>
<rect x="178" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="54" text-anchor="middle" class="d-label">Comprehend</text>
<text x="241" y="74" text-anchor="middle" class="d-small">المشاعر</text>
<rect x="20" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="83" y="54" text-anchor="middle" class="d-label">Bedrock</text>
<text x="83" y="74" text-anchor="middle" class="d-small">ملخص</text>
<line x1="494" y1="59" x2="464" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#chain-arrow)"/>
<line x1="336" y1="59" x2="306" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#chain-arrow)"/>
<line x1="178" y1="59" x2="148" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#chain-arrow)"/>
</svg>
<figcaption id="chain-caption">كل خدمة تسوي شغلة وحدة وتسلم نتيجتها للي بعدها، بدون أي نموذج تدربه.</figcaption>
</figure>

وبدون أي تعلم آلة، المدير الحين يقرأ ملخص كل مكالمة ويشوف أيها انتهت بشكل سيئ.

## عملي: تعليق يمر على أربع خدمات

بناخذ تعليق عميل، ونحلله، ونترجمه، ونقرأه بصوت، ونرد عليه. وكلها استدعاءات مباشرة بدون أي تجهيز. وهذي الخدمات مو في كل المناطق، فلو قال أمر إنه ما قدر يتصل، أضف له `--region us-east-1`. من CloudShell:

```bash
REVIEW="The app is great, but delivery was very slow and support never replied."

aws comprehend detect-dominant-language --text "$REVIEW" \
  --query "Languages[0]"

aws comprehend detect-sentiment --language-code en --text "$REVIEW" \
  --query "[Sentiment,SentimentScore]"

aws comprehend detect-key-phrases --language-code en --text "$REVIEW" \
  --query "KeyPhrases[].Text"
```

بتشوف اللغة، والمشاعر مع درجاتها، والعبارات المهمة. الحين ترجمه للعربية، وتأكد إن Comprehend يفهم الترجمة كمان:

```bash
ARABIC=$(aws translate translate-text --text "$REVIEW" \
  --source-language-code en --target-language-code ar \
  --query TranslatedText --output text)

echo "$ARABIC"

aws comprehend detect-sentiment --language-code ar --text "$ARABIC" \
  --query Sentiment --output text
```

حوّل الترجمة إلى صوت بـ Polly:

```bash
aws polly synthesize-speech --voice-id Zeina --output-format mp3 \
  --text "$ARABIC" review.mp3

ls -lh review.mp3
```

عشان تسمعه، من قائمة **Actions** في CloudShell اختر **Download file**، واكتب `review.mp3`.

وأخيراً، اطلب من نموذج على Bedrock يرد على العميل. الأمر الأول يجيب معرف نموذج Amazon Nova Lite منخفض التكلفة في منطقتك. ولو طبع `None`، أضف `--region us-east-1` للأمرين:

```bash
MODEL=$(aws bedrock list-inference-profiles \
  --query "inferenceProfileSummaries[?contains(inferenceProfileId,'nova') && contains(inferenceProfileId,'lite')].inferenceProfileId | [0]" \
  --output text)
echo $MODEL

aws bedrock-runtime converse --model-id $MODEL \
  --messages "[{\"role\":\"user\",\"content\":[{\"text\":\"Reply to this customer in two short sentences: $REVIEW\"}]}]" \
  --query "output.message.content[0].text" --output text
```

عندك صورة؟ ارفعها من **Actions** ثم **Upload file**، واسأل Rekognition وش فيها:

```bash
aws rekognition detect-labels --image-bytes fileb://photo.jpg \
  --max-labels 5 --query "Labels[].[Name,Confidence]" --output table
```

::: security ما فيه شي تحذفه
هذي الاستدعاءات ما تنشئ موارد، وتكلف جزء صغير من السنت. بس لاحظ إن نصك يروح لهذي الخدمات، فراجع قواعد البيانات لكل وحدة قبل ما ترسل بيانات عملائك الحقيقية.
:::

## الخلاصة

- ابدأ من **الخدمات الجاهزة**، ثم **Bedrock**، وبعدها فقط **SageMaker AI**.
- **Rekognition** للصور، و**Transcribe** و**Polly** للكلام، و**Translate** للترجمة، و**Comprehend** للنص.
- **Textract** يقرأ المستندات المنظمة، بس ما يدعم العربية.
- **Knowledge Bases** يجاوب من مستنداتك بدون تدريب نموذج، وهو البديل عن Kendra.
- ربط هذي الخدمات بالأحداث هو مكان القيمة الحقيقية.

بهذا نكمل قسم البيانات والذكاء الاصطناعي. تطبيقك صار كبير وفيه أشياء كثيرة شغالة. كيف تعرف إنه بخير، ومين غيّر وش؟ في [**الجزء الخامس والعشرين**](/posts/aws-25-monitoring-auditing/) نبدأ القسم الأخير، مع المراقبة والتدقيق عبر CloudWatch وCloudTrail وConfig.
