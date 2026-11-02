---
title: "الحاويات: ECS وFargate وEKS"
description: وش هي الحاوية وكيف تختلف عن الجهاز الافتراضي، وتخزين الصور في ECR، وتشغيلها بـ ECS على Fargate، والفرق بين دوري IAM، ومتى تختار EKS، مع تجربة عملية تشوف فيها Service يعوض مهمة وقفت.
date: 2026-11-02
series: aws
part: 20
numbered: true
tags: [aws, containers]
---

في [الجزء التاسع عشر](/posts/aws-19-sqs-sns-kinesis/) فصلنا الخدمات عن بعض. بس كل خدمة لسا تحتاج مكان تشتغل فيه، وعلى سيرفر EC2 هذا يعني صورة نظام، وتحديثات، ومكتبات، والجملة المشهورة: "عندي يشتغل".

**الحاويات (Containers)** تحل هذا: تغلف التطبيق مع كل اللي يحتاجه في حزمة وحدة، ويشتغل بنفس الطريقة على جهازك وفي الإنتاج.

::: note لا تخلط بين الحاويتين
الحاوية هنا (Container) غير حاوية S3 (Bucket) اللي شفناها في [الجزء الخامس عشر](/posts/aws-15-s3-basics/). نفس الكلمة بالعربي، بس شيئين مختلفين تماماً.
:::

## وش هي الحاوية؟

الحاوية عملية معزولة لها ملفاتها ومكتباتها، وتتشارك نظام تشغيل المضيف بدل ما تحمل نظامها.

<figure class="diagram">
<svg viewBox="0 0 640 220" role="img" aria-labelledby="vmcontainer-caption">
<defs>
<marker id="vmcontainer-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="475" y="22" text-anchor="middle" class="d-label">الأجهزة الافتراضية</text>
<rect x="480" y="36" width="130" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="545" y="59" text-anchor="middle" class="d-label">تطبيق</text>
<rect x="340" y="36" width="130" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="405" y="59" text-anchor="middle" class="d-label">تطبيق</text>
<rect x="480" y="80" width="130" height="36" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="103" text-anchor="middle" class="d-label">نظام كامل</text>
<rect x="340" y="80" width="130" height="36" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="405" y="103" text-anchor="middle" class="d-label">نظام كامل</text>
<rect x="340" y="124" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="475" y="147" text-anchor="middle" class="d-label">Hypervisor</text>
<rect x="340" y="168" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="475" y="191" text-anchor="middle" class="d-label">العتاد</text>
<text x="165" y="22" text-anchor="middle" class="d-label">الحاويات</text>
<rect x="215" y="36" width="85" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="257.5" y="59" text-anchor="middle" class="d-label">تطبيق</text>
<rect x="122" y="36" width="85" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="164.5" y="59" text-anchor="middle" class="d-label">تطبيق</text>
<rect x="30" y="36" width="85" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="72.5" y="59" text-anchor="middle" class="d-label">تطبيق</text>
<rect x="30" y="80" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="165" y="103" text-anchor="middle" class="d-label">محرك الحاويات</text>
<rect x="30" y="124" width="270" height="36" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="165" y="147" text-anchor="middle" class="d-label">نظام واحد مشترك</text>
<rect x="30" y="168" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="165" y="191" text-anchor="middle" class="d-label">العتاد</text>
</svg>
<figcaption id="vmcontainer-caption">كل جهاز افتراضي يحمل نظام تشغيل كامل. الحاويات تتشارك نظام المضيف، فهي أخف وتشتغل في ثواني.</figcaption>
</figure>

| | الجهاز الافتراضي | الحاوية |
| --- | --- | --- |
| **يحتوي** | نظام تشغيل كامل والتطبيق | التطبيق ومكتباته |
| **الحجم** | جيجابايتات | غالباً ميجابايتات |
| **التشغيل** | دقايق | ثواني |
| **العزل** | أقوى بنظام مستقل | أخف بنواة مشتركة |

### الصورة والحاوية والمستودع

ثلاث كلمات بتتكرر عليك:

- **الصورة (Image):** حزمة للقراءة فقط فيها التطبيق ومكتباته، مثل الوصفة.
- **الحاوية (Container):** نسخة شغالة من الصورة. والصورة الوحدة تشتغل كألف حاوية.
- **المستودع (Registry):** مكان تخزين الصور، مثل Docker Hub أو Amazon ECR.

أشهر أداة لبناء الصور هي **Docker**. تكتب محتوى الصورة في ملف `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
```

ثم تبنيها، وتجربها على جهازك، وترفعها للمستودع:

```bash
docker build -t shop .
docker run -p 8080:80 shop
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/shop
```

## Amazon ECR: بيت صورك

**ECR** (Elastic Container Registry) مستودع الصور في AWS، وتخزينه على S3 من وراء الكواليس:

- **مستودعات خاصة:** الوصول لها عبر [IAM](/posts/aws-02-iam/)، فالسيرفر أو المهمة تحتاج صلاحية عشان تسحب.
- **مستودعات عامة:** أي أحد يسحب منها، عبر معرض ECR Public.
- **إضافات:** فحص الصور من الثغرات، وإصدارات بالوسوم، وقواعد دورة حياة تحذف الصور القديمة.

## Amazon ECS: طريقة AWS لتشغيل الحاويات

**ECS** (Elastic Container Service) ياخذ صورك ويشغلها، ويبقيها شغالة، ويحطها خلف موزع حمل. هو خدمة AWS الخاصة، وأبسط من Kubernetes، والخدمة نفسها ما عليها رسوم إضافية. تدفع على السعة اللي تشتغل عليها.

أربع مصطلحات تغطي الخدمة كلها:

| المصطلح | معناه | يشبه |
| --- | --- | --- |
| **Cluster** | مجموعة منطقية تشتغل فيها المهام | أسطول سيرفراتك |
| **Task Definition** | وصفة: الصورة والمعالج والذاكرة والمنافذ والأدوار | قالب التشغيل |
| **Task** | حاوية شغالة أو أكثر من هذي الوصفة | السيرفر |
| **Service** | يبقي عدد محدد من المهام شغال، ويعوض اللي تفشل | مجموعة Auto Scaling |

<figure class="diagram">
<svg viewBox="0 0 640 256" role="img" aria-labelledby="ecs-caption">
<defs>
<marker id="ecs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="510" y="98" width="110" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="565" y="123" text-anchor="middle" class="d-label">ALB</text>
<text x="565" y="143" text-anchor="middle" class="d-small">موزع الحمل</text>
<rect x="20" y="14" width="450" height="228" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="245" y="38" text-anchor="middle" class="d-label">مجموعة ECS</text>
<text x="245" y="60" text-anchor="middle" class="d-small">Service يبقي 3 مهام شغالة</text>
<rect x="250" y="74" width="200" height="152" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="350" y="94" text-anchor="middle" class="d-small">منطقة التوفر A</text>
<rect x="265" y="106" width="170" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="350" y="136" text-anchor="middle" class="d-label">مهمة 1</text>
<rect x="265" y="164" width="170" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="350" y="194" text-anchor="middle" class="d-label">مهمة 2</text>
<rect x="40" y="74" width="200" height="152" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="140" y="94" text-anchor="middle" class="d-small">منطقة التوفر B</text>
<rect x="55" y="106" width="170" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="140" y="136" text-anchor="middle" class="d-label">مهمة 3</text>
<rect x="55" y="164" width="170" height="50" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="140" y="194" text-anchor="middle" class="d-small">جديدة لما يزيد الحمل</text>
<line x1="510" y1="128" x2="452" y2="128" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#ecs-arrow)"/>
</svg>
<figcaption id="ecs-caption">الـ Service يحافظ على عدد المهام اللي طلبته في مناطق التوفر، وموزع الحمل يوجه الزوار للمهام السليمة.</figcaption>
</figure>

### مين يشغّل الحاويات؟

الحاويات تحتاج سعة حوسبة، وعندك ثلاث خيارات:

| الخيار | مين يدير السيرفرات | يناسب |
| --- | --- | --- |
| **Fargate** | AWS بالكامل، وما تشوف أي سيرفر | أغلب التطبيقات، وابدأ به |
| **Managed Instances** | AWS تديرها، وأنت تختار أنواع السيرفرات | تحتاج GPU أو سيرفرات معينة بدون إدارتها |
| **EC2** | أنت، عبر مجموعة Auto Scaling | تحكم كامل، أو تقليل تكلفة حمل ثابت |

مع **Fargate** تحدد المعالج والذاكرة للمهمة، وتدفع عليها طول ما هي شغالة. و**Fargate Spot** يخفض السعر كثير للمهام اللي تتحمل الانقطاع، بنفس فكرة سيرفرات [Spot](/posts/aws-04-ec2-pricing-networking/).

### دورين في IAM، والخلط بينهم كلاسيكي

كل مهمة على Fargate ممكن يكون لها دورين، وكل واحد له شغل مختلف:

| الدور | مين يستخدمه | مثال |
| --- | --- | --- |
| **Task Execution Role** | ECS نفسه، عشان يجهز المهمة | سحب الصورة من ECR وإرسال السجلات لـ CloudWatch |
| **Task Role** | كودك داخل الحاوية | القراءة من S3 أو الكتابة في DynamoDB |

لو فشلت المهمة عند التشغيل بخطأ في السحب، شوف Execution Role. ولو جاء كودك `AccessDenied` وهو شغال، شوف Task Role. وخل لكل خدمة دورها، مو دور واحد مشترك.

### الشبكة وتوزيع الحمل

على Fargate كل مهمة تاخذ واجهة شبكة خاصة فيها وIP خاص، فلها **Security Group** مثل السيرفر. وحط [موزع حمل ALB](/posts/aws-06-load-balancers/) قدام الـ Service، وهو يسجل المهام الجديدة تلقائياً ويشيل الفاشلة. وهذا يناسب أغلب تطبيقات الويب، وتختار NLB للسعة العالية جداً أو عناوين IP الثابتة.

### التخزين

قرص الحاوية يروح معها. ولمشاركة الملفات بين المهام، اربط [EFS](/posts/aws-05-ec2-storage/)، ويشتغل على Fargate وEC2. وأي شي مهم، خزنه خارج الحاوية في S3 أو قاعدة بيانات.

### التوسع

**Service Auto Scaling** يغيّر عدد المهام حسب متوسط المعالج أو الذاكرة، أو الطلبات لكل مهمة من موزع الحمل، أو جدول زمني. والسياسات هي نفسها اللي شفناها في [الجزء السابع](/posts/aws-07-auto-scaling/).

وعلى Fargate هذا كل اللي تحتاجه. أما مع EC2 فيه طبقة ثانية، لأنك تحتاج سيرفرات تنزل عليها المهام الجديدة. **Capacity Provider** يربط الـ Service بمجموعة Auto Scaling ويزيد السيرفرات لما تحتاجها المهام.

### مو بس خدمات ويب

المهام مو لازم تبقى شغالة دايماً. ثلاث أنماط معروفة:

| النمط | كيف يشتغل |
| --- | --- |
| **رد فعل على حدث** | ينزل ملف في S3، وEventBridge يشغّل مهمة Fargate تعالجه، وتوقف لما تخلص |
| **شغل مجدول** | EventBridge Scheduler يشغّل مهمة كل ليلة لشغل دفعات |
| **عمّال طابور** | Service يسحب من [SQS](/posts/aws-19-sqs-sns-kinesis/)، ويتوسع حسب عدد الرسائل المنتظرة |

### ECS Express Mode: الطريق المختصر

تبي تطبيق ويب من صورة بدون ما تجهز كل قطعة؟ **ECS Express Mode** ياخذ صورة ودورين، وينشئ Service على Fargate وموزع حمل وفحوصات صحة وتوسع ورابط. وكلها تبقى في حسابك، فتقدر تعدلها بعدين.

::: note وماذا عن App Runner؟
ممكن تقرأ عن **AWS App Runner**، وكان يسوي شي قريب. وقف استقبال العملاء الجدد في 30 أبريل 2026، وهو مستمر لعملائه الحاليين، وAWS توجّه العملاء الجدد لـ ECS Express Mode.
:::

## Amazon EKS: Kubernetes

**Kubernetes** نظام مفتوح المصدر لتشغيل الحاويات، منتشر في كل السحابات ومراكز البيانات. **EKS** (Elastic Kubernetes Service) يشغّل لك **طبقة التحكم** فيه عبر عدة مناطق توفر، بـ 0.10 دولار في الساعة لكل Cluster للإصدارات اللي تحت الدعم العادي، فوق تكلفة السعة. والإصدار اللي تجاوز هذي الفترة يكلف 0.60 دولار في الساعة.

المصطلحات تختلف عن ECS: المهمة اسمها **Pod**، والسيرفر اسمه **Node**.

| خيار الـ Nodes | كيف يشتغل |
| --- | --- |
| **EKS Auto Mode** | AWS تجهز الـ Nodes وتحدثها وتوسعها، وهو اللي توصي فيه AWS مستقبلاً |
| **Managed Node Groups** | AWS تنشئ السيرفرات وتحدثها، وأنت تختارها |
| **Self-managed Nodes** | أنت تتكفل بكل شي، للمتطلبات الخاصة |
| **Fargate** | كل Pod يشتغل معزول بدون Nodes، وهو متاح، بس Auto Mode مفضل عليه |

وللتخزين، يستخدم EKS **تعريفات CSI** لربط EBS أو EFS أو FSx.

### ECS أو EKS؟

| | ECS | EKS |
| --- | --- | --- |
| **التعقيد** | مفاهيم أقل وتعلم سريع | نظام كبير وفيه الكثير تتعلمه |
| **النقل** | AWS فقط | نفس الأدوات تشتغل في أي مكان |
| **المنظومة** | تكامل قريب مع AWS | منظومة مفتوحة ضخمة |
| **تكلفة الخدمة نفسها** | مجانية | بالساعة لكل Cluster |
| **اختره لو** | تبدأ من جديد وشغلك على AWS | فريقك يعرف Kubernetes أو تشتغل على أكثر من سحابة |

لو ما فيه شي يدفعك لـ Kubernetes، ابدأ بـ **ECS على Fargate**.

## عملي: Service يعوض مهمة وقفت

بنشغل صورة Nginx عامة على Fargate، بدون بناء شي. من CloudShell، أنشئ الـ Cluster واكتب الوصفة. والصورة من مستودع عام بدون سجلات ما تحتاج Execution Role:

```bash
aws ecs create-cluster --cluster-name series-cluster \
  --query cluster.status

cat > task.json <<'EOF'
{
  "family": "web",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "web",
    "image": "public.ecr.aws/nginx/nginx:latest",
    "portMappings": [{"containerPort": 80}],
    "essential": true
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file://task.json \
  --query taskDefinition.family
```

جهز الشبكة: الـ VPC الافتراضي، وSubnet، وSecurity Group يسمح بالمنفذ 80 من CloudShell حقك فقط:

```bash
VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)
SUBNET=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC \
  --query "Subnets[0].SubnetId" --output text)

SG=$(aws ec2 create-security-group --group-name series-web \
  --description "Series web task" --vpc-id $VPC \
  --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG \
  --protocol tcp --port 80 \
  --cidr $(curl -s https://checkip.amazonaws.com)/32

NET="awsvpcConfiguration={subnets=[$SUBNET],securityGroups=[$SG],assignPublicIp=ENABLED}"
```

شغّل مهمة وحدة. لو هذا أول استخدام لك لـ ECS وجاك خطأ عن الدور المرتبط بالخدمة، انتظر شوي وأعد الأمر:

```bash
TASK=$(aws ecs run-task --cluster series-cluster --task-definition web \
  --launch-type FARGATE --network-configuration "$NET" \
  --query "tasks[0].taskArn" --output text)

aws ecs wait tasks-running --cluster series-cluster --tasks $TASK
```

خذ عنوانها وجربها:

```bash
ENI=$(aws ecs describe-tasks --cluster series-cluster --tasks $TASK \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
  --output text)
IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI \
  --query "NetworkInterfaces[0].Association.PublicIp" --output text)

curl -s http://$IP | grep -i "<title>"
```

بتشوف `<title>Welcome to nginx!</title>`. أول حاوية لك شغالة، بدون أي سيرفر تشوفه. الحين أوقفها، وبتبقى واقفة لأن ما فيه أحد يهتم فيها:

```bash
aws ecs stop-task --cluster series-cluster --task $TASK \
  --query task.lastStatus
```

أنشئ **Service** يبقي مهمة وحدة شغالة:

```bash
aws ecs create-service --cluster series-cluster --service-name web \
  --task-definition web --desired-count 1 --launch-type FARGATE \
  --network-configuration "$NET" --query service.status

aws ecs wait services-stable --cluster series-cluster --services web

FIRST=$(aws ecs list-tasks --cluster series-cluster --service-name web \
  --query "taskArns[0]" --output text)
echo $FIRST

aws ecs stop-task --cluster series-cluster --task $FIRST \
  --query task.lastStatus
```

انتظر دقيقة، ثم اعرض المهام:

```bash
aws ecs list-tasks --cluster series-cluster --service-name web \
  --query taskArns
```

الرقم تغير. الـ Service لاحظ إن المهمة راحت وشغل غيرها بدون ما تحرك إصبع.

::: security احذف بعد التجربة
المهمة تكلف حوالي سنت أو سنتين في الساعة، بس تستمر طول ما الـ Service موجود. ولو اشتكى أمر إن شي لسا مستخدم، انتظر دقيقة وأعده:
:::

```bash
aws ecs delete-service --cluster series-cluster --service web --force \
  --query service.status
aws ecs wait services-inactive --cluster series-cluster --services web
aws ecs delete-cluster --cluster series-cluster --query cluster.status
aws ecs deregister-task-definition --task-definition web:1 \
  --query taskDefinition.status
aws ec2 delete-security-group --group-id $SG
```

## الخلاصة

- **الحاوية** تغلف التطبيق ومكتباته وتتشارك نظام المضيف، فهي خفيفة وسريعة.
- **ECR** يخزن الصور، و**ECS** يشغلها عبر Task Definition وTask وService.
- **Fargate** يريحك من إدارة السيرفرات، وهو أفضل بداية.
- **Execution Role** لـ ECS، و**Task Role** لكودك.
- **EKS** لمن يحتاج Kubernetes، و**ECS Express Mode** الطريق المختصر لتطبيق ويب.

الحاويات لسا تشتغل وتكلف وهي منتظرة. طيب لو كودك يشتغل بس لما يكون فيه شغل، وما تدفع شي غير كذا؟ في [**الجزء الحادي والعشرين**](/posts/aws-21-lambda-api-dynamodb/) نبني API بـ Lambda وAPI Gateway وDynamoDB.
