---
title: "EC2: خيارات الدفع والشبكة"
description: كيف تدفع أقل بكثير على نفس السيرفر بخطط التوفير وSpot، والفرق بين العناوين العامة والخاصة وElastic IP، ومجموعات الوضع، وبطاقات الشبكة، والسبات.
date: 2026-11-02
series: aws
part: 4
numbered: true
tags: [aws, ec2]
---

في [الجزء الثالث](/posts/aws-03-ec2-first-server/) شغّلنا سيرفر ودفعنا السعر العادي. بس نفس السيرفر ممكن تدفع عليه أقل بكثير، حسب طريقة استخدامك له. وفي هذا الجزء بنحل كمان مشكلة بقيت معلقة: عنوان IP اللي يتغيّر كل ما توقف السيرفر.

## خيارات الدفع

| الخيار | الفكرة | التوفير | يناسب |
| --- | --- | --- | --- |
| **On-Demand** | تدفع بالثانية بدون أي التزام | بدون خصم | التجارب والأحمال غير المتوقعة |
| **Savings Plans** | تلتزم بمبلغ بالساعة لمدة سنة أو ثلاث | كبير | الأحمال المستمرة، وهو الخيار الأول غالباً |
| **Reserved Instances** | تحجز نوع سيرفر محدد لسنة أو ثلاث | كبير | الأحمال الثابتة جداً |
| **Spot** | تستخدم السعة الفائضة عند AWS | الأكبر، حتى 90% | المهام اللي تتحمل الانقطاع |
| **Dedicated Hosts** | سيرفر فعلي كامل لك وحدك | لا، الأغلى | التراخيص المرتبطة بالجهاز والامتثال |
| **Dedicated Instances** | سيرفرك على جهاز ما يشاركك فيه حساب ثاني | لا | متطلبات العزل |
| **Capacity Reservations** | تضمن سعة في منطقة توفر معينة | لا، بس تضمن التوفر | أحداث مهمة ما تتحمل نقص السعة |

### Spot: أرخص شي، بشرط

سيرفرات **Spot** رخيصة جداً، لكن AWS تقدر تسترجعها متى ما احتاجت السعة، وتعطيك إشعار قبلها بدقيقتين فقط. فهي ممتازة للمهام اللي تقدر تتوقف وتكمّل: معالجة البيانات، وترميز الفيديو، وخطوط CI، والحاويات.

ولا تصلح لقاعدة بيانات أو أي شي ما يتحمل الانقطاع المفاجئ. وتقدر تشوف الأسعار الحالية بنفسك:

```bash
aws ec2 describe-spot-price-history \
  --instance-types t3.micro \
  --product-descriptions "Linux/UNIX" \
  --start-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
  --query "SpotPriceHistory[].[AvailabilityZone,SpotPrice]" \
  --output table
```

### كيف تختار؟

القاعدة العملية لأي مشروع حقيقي، هي خليط:

1. **الحد الأدنى اللي دايماً شغّال:** غطّيه بـ Savings Plans.
2. **الزيادات وقت الضغط:** On-Demand.
3. **المهام اللي تتحمل الانقطاع:** Spot.

ولا تلتزم بسنة قبل ما تعرف استهلاكك الفعلي. شغّل كم شهر على On-Demand أول، وشوف الأرقام في Cost Explorer.

## العناوين: خاصة وعامة وElastic IP

كل سيرفر له **عنوان خاص** للتواصل داخل شبكتك، وقد يكون له **عنوان عام** يوصله من الإنترنت.

| النوع | يوصله | إذا أوقفت السيرفر |
| --- | --- | --- |
| **خاص** (Private IP) | داخل الشبكة فقط | يبقى نفسه |
| **عام** (Public IP) | من الإنترنت | **يتغيّر** |
| **Elastic IP** | من الإنترنت | يبقى نفسه |

**Elastic IP** عنوان عام ثابت تملكه في حسابك وتربطه بأي سيرفر، وتقدر تنقله لسيرفر ثاني لو تعطّل الأول:

```bash
# احجز عنوان ثابت
aws ec2 allocate-address

# اربطه بالسيرفر (استبدل المعرّفات بالقيم عندك)
aws ec2 associate-address \
  --instance-id i-0123456789abcdef0 \
  --allocation-id eipalloc-0123456789abcdef0

# لما تخلص: افصله ثم حرّره عشان ما تدفع عليه
aws ec2 disassociate-address --association-id eipassoc-0123456789abcdef0
aws ec2 release-address --allocation-id eipalloc-0123456789abcdef0
```

::: note عناوين IPv4 العامة مدفوعة
AWS تحسب رسوم على كل عنوان IPv4 عام، سواء كان عادي أو Elastic IP، وسواء كان مربوط أو لا. فلا تترك عناوين محجوزة بدون استخدام.
:::

وفي أغلب الحالات ما تحتاج Elastic IP أصلاً. الحل الأنظف إنك تربط اسم نطاق بموزّع حمل، وهذا بنشوفه في [قسم التوفر العالي](/series/aws/#section-3).

## مجموعات الوضع (Placement Groups)

عادةً AWS تقرر وين يعيش سيرفرك. لو تبي تتحكم في هذا، تستخدم **مجموعة وضع**، ولها ثلاث استراتيجيات:

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="pg-caption">
<rect x="430" y="16" width="194" height="218" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="527" y="42" text-anchor="middle" class="d-label">عنقود (Cluster)</text>
<rect x="472" y="60" width="110" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="487" y="74" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="533" y="74" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="487" y="116" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="533" y="116" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<text x="527" y="176" text-anchor="middle" class="d-small">جهاز واحد</text>
<text x="527" y="216" text-anchor="middle" class="d-small">أسرع اتصال، أكبر خطر</text>
<rect x="223" y="16" width="194" height="218" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="320" y="42" text-anchor="middle" class="d-label">توزيع (Spread)</text>
<rect x="237" y="60" width="50" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="295" y="60" width="50" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="353" y="60" width="50" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="247" y="74" width="30" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="305" y="74" width="30" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="363" y="74" width="30" height="30" rx="5" fill="var(--color-accent)"/>
<text x="320" y="216" text-anchor="middle" class="d-small">كل سيرفر على جهاز مستقل</text>
<rect x="16" y="16" width="194" height="218" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="113" y="42" text-anchor="middle" class="d-label">تقسيم (Partition)</text>
<rect x="30" y="60" width="78" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="118" y="60" width="78" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="38" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="72" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="38" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="72" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="126" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="160" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="126" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="160" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<text x="113" y="216" text-anchor="middle" class="d-small">مجموعات معزولة عن بعض</text>
</svg>
<figcaption id="pg-caption">الاستراتيجيات الثلاث لمجموعات الوضع. المربعات الخضراء سيرفرات، والمستطيلات الرمادية أجهزة فعلية.</figcaption>
</figure>

| الاستراتيجية | الفكرة | تناسب | عيبها |
| --- | --- | --- | --- |
| **Cluster** | السيرفرات قريبة جداً في منطقة توفر واحدة | أقل تأخير: الحوسبة العالية والأنظمة المالية | تعطّل الجهاز يوقفهم كلهم |
| **Spread** | كل سيرفر على جهاز مختلف | عدد قليل من السيرفرات الحرجة | حد أقصى 7 سيرفرات لكل منطقة توفر |
| **Partition** | مجموعات سيرفرات، كل مجموعة على أجهزة مستقلة | الأنظمة الموزعة الضخمة مثل Kafka وCassandra وHadoop | تحتاج نظام يفهم هذا التوزيع |

## بطاقات الشبكة (ENI)

**ENI** (Elastic Network Interface) بطاقة شبكة افتراضية، تحمل العنوان الخاص ومجموعات الأمان. أهم ميزة فيها: تقدر تفصلها من سيرفر وتركّبها على سيرفر ثاني **في نفس منطقة التوفر**، فينتقل معها العنوان. وهذا يسهّل التحويل السريع لسيرفر احتياطي.

## السبات (Hibernate)

إذا أوقفت سيرفر عادي، ضاع كل اللي في الذاكرة (RAM)، ولما يقوم يعيد الإقلاع من أوله. أما **السبات** فيحفظ محتوى الذاكرة في قرص النظام، ولما تشغّله يكمل من حيث وقف، وهذا مفيد للتطبيقات اللي تاخذ وقت طويل في الإقلاع أو تجهيز الكاش.

بشروط: قرص النظام لازم يكون EBS **مشفّر** وفيه مساحة تكفي الذاكرة، وتفعّله وقت إنشاء السيرفر، وما يقدر يبقى في السبات أكثر من 60 يوم.

## الخلاصة

- **On-Demand** للمرونة، و**Savings Plans** للأحمال المستمرة، و**Spot** للمهام اللي تتحمل الانقطاع. والأذكى خليط منها.
- العنوان العام يتغيّر مع الإيقاف، وElastic IP ثابت، وكل عناوين IPv4 العامة مدفوعة.
- **Cluster** للسرعة، و**Spread** للعزل، و**Partition** للأنظمة الموزعة الضخمة.
- **ENI** بطاقة شبكة تنتقل بين السيرفرات، و**السبات** يحفظ الذاكرة ويسرّع الإقلاع.

في [**الجزء الخامس**](/posts/aws-05-ec2-storage/) نكمل قسم الخوادم بالتخزين: الأقراص وصور النظام وأنظمة الملفات المشتركة.
