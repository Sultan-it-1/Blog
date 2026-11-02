---
title: "الكاش مع ElastiCache"
description: ليش القراءة من قاعدة البيانات في كل طلب بطيئة ومكلفة، وكيف يحلها الكاش في الذاكرة، ومحركات Valkey وRedis وMemcached، وطرق إبقاء البيانات محدّثة، مع تجربة عملية تبني فيها كاش ولوحة صدارة.
date: 2026-11-02
series: aws
part: 9
numbered: true
tags: [aws, databases]
---

في [الجزء الثامن](/posts/aws-08-rds-aurora/) بنينا قاعدة بيانات قوية. بس تخيل الصفحة الرئيسية في متجرك تعرض نفس 20 منتج لكل زائر. آلاف الزوار يعني قاعدة البيانات تنفذ نفس الاستعلام آلاف المرات، وترجع نفس الجواب.

الحل بسيط: احفظ الجواب في مكان سريع، وارجع له بدل ما تسأل قاعدة البيانات كل مرة. هذا **الكاش**.

## وش هو الكاش؟

الكاش نسخة مؤقتة من بيانات تكلّفك وقت أو جهد عشان تجيبها. والذاكرة أسرع بكثير من القرص، فالجواب يوصل عادةً في أقل من ملي ثانية. وهذا يعطيك:

- **سرعة أعلى** للمستخدم.
- **ضغط أقل** على قاعدة البيانات، فتقدر تخدم زوار أكثر بقاعدة أصغر.

والقاعدة الأهم: **الكاش مو مصدر الحقيقة.** لو ضاع كله، يصير تطبيقك أبطأ شوي، بس ما تضيع أي بيانات مهمة.

**ElastiCache** خدمة كاش مُدارة: AWS تتكفل بالسيرفرات والتحديثات والتحويل عند الأعطال. بس بخلاف RDS، لازم تعدّل كود تطبيقك، لأن التطبيق هو اللي يقرر وش يحفظ ومتى يقرأ.

## اختيار المحرك

| | Valkey وRedis OSS | Memcached |
| --- | --- | --- |
| **أنواع البيانات** | نصوص وقوائم ومجموعات ومجموعات مرتبة وغيرها | قيم بسيطة |
| **النسخ والتحويل** | نسخ قراءة وMulti-AZ وتحويل تلقائي | ما فيه نسخ في الكلستر اللي تصممه بنفسك |
| **الحفظ** | لقطات تسترجع منها | ما فيه، البيانات في الذاكرة فقط |
| **التوسّع** | تقسيم البيانات مع نسخ | تقسيم على عدة عقد، ومعالجة متعددة الخيوط |
| **يناسب** | أغلب الحالات: كاش وجلسات ولوحات صدارة | كاش بسيط ما يضر لو ضاع |

::: note Valkey أو Redis؟
**Valkey** مشروع مفتوح المصدر انفصل عن Redis في 2024 بعد ما غيّرت Redis رخصتها. الأوامر نفسها، وسعره في ElastiCache أقل. لأي مشروع جديد، ابدأ به.
:::

وعندك طريقتين للتشغيل:

| | Serverless | كلستر تصممه بنفسك |
| --- | --- | --- |
| **الإعداد** | اسم وخلاص تقريباً | تختار نوع العقد وعدد التقسيمات والنسخ |
| **التوسّع** | تلقائي | تخطط له بنفسك |
| **الحساب** | حجم البيانات والعمليات | بالساعة لكل عقدة |
| **يناسب** | الضغط المتقلب، وهو أسهل بداية | الضغط الثابت والتحكم الدقيق في التكلفة |

## كيف يستخدمه تطبيقك؟

### القراءة عند الطلب (Lazy Loading)

هذي أشهر طريقة، وتسمى كمان Cache-Aside: تطبيقك يسأل الكاش أول، ولو ما لقى الجواب يروح لقاعدة البيانات، ثم يحفظ الجواب للمرة الجاية.

<figure class="diagram">
<svg viewBox="0 0 640 318" role="img" aria-labelledby="cache-caption">
<defs>
<marker id="cache-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<line x1="550" y1="48" x2="550" y2="306" stroke="var(--color-line-strong)" stroke-dasharray="2 5"/>
<line x1="320" y1="48" x2="320" y2="306" stroke="var(--color-line-strong)" stroke-dasharray="2 5"/>
<line x1="90" y1="48" x2="90" y2="306" stroke="var(--color-line-strong)" stroke-dasharray="2 5"/>
<rect x="480" y="10" width="140" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="34" text-anchor="middle" class="d-label">التطبيق</text>
<rect x="250" y="10" width="140" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="34" text-anchor="middle" class="d-label">الكاش</text>
<rect x="20" y="10" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90" y="34" text-anchor="middle" class="d-label">قاعدة البيانات</text>
<text x="435" y="76" text-anchor="middle" class="d-small">1. هل الجواب في الكاش؟</text>
<line x1="550" y1="84" x2="322" y2="84" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="435" y="114" text-anchor="middle" class="d-small">موجود: جواب فوري</text>
<line x1="320" y1="122" x2="548" y2="122" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="205" y="114" text-anchor="middle" class="d-small">وقاعدة البيانات ما تعبت</text>
<line x1="20" y1="142" x2="620" y2="142" stroke="var(--color-line-strong)"/>
<text x="435" y="164" text-anchor="middle" class="d-small">مو موجود</text>
<line x1="320" y1="172" x2="548" y2="172" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<text x="205" y="206" text-anchor="middle" class="d-small">2. اقرأ من قاعدة البيانات</text>
<line x1="550" y1="214" x2="92" y2="214" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="205" y="246" text-anchor="middle" class="d-small">الجواب</text>
<line x1="90" y1="254" x2="548" y2="254" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="435" y="286" text-anchor="middle" class="d-small">3. احفظه بمدة صلاحية</text>
<line x1="550" y1="294" x2="322" y2="294" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
</svg>
<figcaption id="cache-caption">التطبيق يسأل الكاش أول. لو لقى الجواب انتهى الطلب، ولو ما لقاه يقرأ من قاعدة البيانات ويحفظ الجواب للمرة الجاية.</figcaption>
</figure>

وبالكود تقريباً كذا:

```python
def get_product(product_id):
    key = f"product:{product_id}"

    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    product = db.fetch_product(product_id)
    cache.set(key, json.dumps(product), ex=300)  # صالح 5 دقايق
    return product
```

- **المزايا:** ما يخزّن إلا اللي ينطلب فعلاً، ولو تعطّل الكاش يكمل التطبيق من قاعدة البيانات.
- **العيوب:** أول طلب بطيء، والبيانات ممكن تكون قديمة لين تنتهي صلاحيتها.

### الكتابة المباشرة (Write-Through)

كل ما كتبت في قاعدة البيانات، تكتب في الكاش معها.

- **المزايا:** الكاش محدّث دايماً.
- **العيوب:** كتابة زيادة في كل مرة، وممكن يمتلي الكاش ببيانات ما أحد يقرأها.

وكثير يجمعون الطريقتين: قراءة عند الطلب مع تحديث الكاش عند الكتابة في البيانات المهمة.

### مدة الصلاحية والإخراج

لكل مفتاح مدة صلاحية (**TTL**)، وبعدها يختفي، فما تبقى البيانات القديمة للأبد. واختيارها يعتمد على البيانات:

| البيانات | مدة مناسبة | السبب |
| --- | --- | --- |
| **الصفحة الرئيسية والقوائم** | 30 إلى 60 ثانية | حتى مدة قصيرة تشيل أغلب الضغط |
| **تفاصيل منتج** | دقايق | ما يضر لو تأخر شوي |
| **جلسة مستخدم** | طول الجلسة، مثل 30 دقيقة | تتجدد مع النشاط |
| **رصيد أو مخزون نهائي** | لا تخزنه | لازم يكون دقيق |

ولما تمتلي الذاكرة، يخرج الكاش بعض المفاتيح (Eviction)، عادةً الأقل استخداماً. ولو هذا يتكرر كثير، فالكاش صغير عليك.

::: warning لا تخزّن كل شي
الكاش يناسب البيانات اللي تنقرأ كثير وتتغير قليل. وثمنه إن البيانات ممكن تكون قديمة شوي، فاسأل دايماً: "وش يصير لو شاف المستخدم قيمة عمرها دقيقة؟"
:::

::: tip انتبه لانتهاء الصلاحية الجماعي
لو انتهت صلاحية مفتاح مطلوب جداً، آلاف الطلبات تروح لقاعدة البيانات مرة وحدة. وأضف فرق عشوائي بسيط للمدد، عشان ما تنتهي مفاتيح كثيرة في نفس اللحظة.
:::

## أكثر من مجرد كاش

**الجلسات:** تذكر جدول [الجزء السابع](/posts/aws-07-auto-scaling/)؟ لما تحفظ الجلسة في ElastiCache، أي سيرفر يقدر يقراها، فالمستخدم ما يخرج لو اختفى سيرفره.

**لوحات الصدارة:** المجموعة المرتبة (Sorted Set) تبقي العناصر مرتبة حسب النقاط، وتعطيك الأوائل فوراً، بدل ما ترتب ملايين الصفوف في قاعدة البيانات.

**تحديد المعدل:** عدّاد `INCR` مع مدة صلاحية يحسب طلبات كل مستخدم في الدقيقة، ويوقف اللي يتجاوز الحد.

## الأمان والمراقبة

- **الشبكة:** الكاش افتراضياً ما يتوصل له إلا من داخل شبكتك، فخل مجموعة الأمان تقبل من مجموعة أمان السيرفرات فقط.
- **التشفير:** فعّله أثناء النقل وفي التخزين، وهو مفعّل دايماً في Serverless.
- **الدخول:** في Valkey وRedis استخدم مستخدمين وصلاحيات أو مصادقة IAM، وفي Memcached استخدم SASL.

ومن CloudWatch راقب هذي المقاييس:

| المقياس | يقول لك |
| --- | --- |
| `CacheHitRate` | كم طلب لقى جوابه في الكاش. لو منخفض، راجع وش تخزن ومدة الصلاحية |
| `Evictions` | كم مفتاح انطرد لضيق الذاكرة |
| استهلاك الذاكرة | هل تحتاج كاش أكبر |

## عملي: كاش ولوحة صدارة

بنستخدم سيرفرك من [الجزء الثالث](/posts/aws-03-ec2-first-server/). من CloudShell، سوّ مجموعة أمان تقبل من مجموعة أمان السيرفر. وخدمة Serverless تستخدم المنفذين `6379` و`6380`:

```bash
aws ec2 create-security-group --group-name cache-sg \
  --description "Cache access" --query GroupId --output text

aws ec2 authorize-security-group-ingress --group-id sg-CACHE-GROUP \
  --protocol tcp --port 6379-6380 --source-group sg-SERVER-GROUP
```

ثم أنشئ الكاش بالمعرّف اللي طلع لك:

```bash
aws elasticache create-serverless-cache \
  --serverless-cache-name series-cache \
  --engine valkey \
  --security-group-ids sg-CACHE-GROUP

aws elasticache describe-serverless-caches \
  --serverless-cache-name series-cache \
  --query "ServerlessCaches[0].[Status,Endpoint.Address]" --output table
```

لما تصير الحالة `available`، ادخل على السيرفر من EC2 Instance Connect واتصل:

```bash
sudo dnf install -y valkey
valkey-cli -h YOUR-CACHE-ENDPOINT --tls -c -p 6379
```

جرّب مدة الصلاحية:

```text
SET product:1 "Keyboard"
GET product:1

SET offer:today "20% off" EX 30
TTL offer:today
```

أعد `TTL` كم مرة وشوف العد التنازلي. وبعد 30 ثانية، `GET offer:today` يرجع `(nil)`.

الحين لوحة صدارة:

```text
ZADD leaderboard 120 sara 300 omar 90 lina
ZINCRBY leaderboard 250 lina
ZREVRANGE leaderboard 0 2 WITHSCORES
```

بتشوف `lina` صارت الأولى بـ 340 نقطة، بدون أي ترتيب من جهتك. اخرج بـ `exit`.

::: security احذف بعد التجربة
الكاش ينحسب حتى لو ما أحد يستخدمه، لأن فيه حد أدنى لحجم البيانات. احذفه، وبعد ما يختفي احذف مجموعة الأمان:
:::

```bash
aws elasticache delete-serverless-cache --serverless-cache-name series-cache

aws ec2 delete-security-group --group-id sg-CACHE-GROUP
```

## الخلاصة

- **الكاش** نسخة مؤقتة وسريعة، ومو مصدر الحقيقة.
- ابدأ بـ **Valkey**، وبـ **Serverless** لو ضغطك متقلب أو تبي بداية سهلة.
- **القراءة عند الطلب** أشهر طريقة، و**الكتابة المباشرة** تبقيه محدّث.
- **مدة الصلاحية** تحدد كم تتحمل بيانات قديمة، وبعض البيانات ما ينفع تخزنها.
- ينفع كمان للجلسات ولوحات الصدارة وتحديد المعدل.

عرفت الحين RDS وAurora وElastiCache، وAWS عندها خدمات أكثر بكثير. في [**الجزء العاشر**](/posts/aws-10-choosing-database/) نجاوب على السؤال اللي يحيّر الكل: أي قاعدة بيانات تختار؟
