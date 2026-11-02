---
title: "Containers: ECS, Fargate and EKS"
description: What a container is and how it differs from a virtual machine, storing images in ECR, running them with ECS on Fargate, the difference between the two IAM roles, when to choose EKS, and a hands-on where a service replaces a stopped task.
date: 2026-11-02
series: aws
part: 20
numbered: true
tags: [aws, containers]
---

In [part nineteen](/en/posts/aws-19-sqs-sns-kinesis/) we separated the services from each other. Each service still needs somewhere to run, and on an EC2 server that means an image, updates, libraries and the famous sentence: "it works on my machine".

**Containers** solve this: you package the application with everything it needs in one unit, and it runs the same way on your laptop and in production.

## What's a container?

A container is an isolated process with its own files and libraries, which shares the host's operating system instead of carrying its own.

<figure class="diagram">
<svg viewBox="0 0 640 220" role="img" aria-labelledby="vmcontainer-caption">
<defs>
<marker id="vmcontainer-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="165" y="22" text-anchor="middle" class="d-label">Virtual machines</text>
<rect x="30" y="36" width="130" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="95" y="59" text-anchor="middle" class="d-label">App</text>
<rect x="170" y="36" width="130" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="235" y="59" text-anchor="middle" class="d-label">App</text>
<rect x="30" y="80" width="130" height="36" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="95" y="103" text-anchor="middle" class="d-label">Full OS</text>
<rect x="170" y="80" width="130" height="36" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="235" y="103" text-anchor="middle" class="d-label">Full OS</text>
<rect x="30" y="124" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="165" y="147" text-anchor="middle" class="d-label">Hypervisor</text>
<rect x="30" y="168" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="165" y="191" text-anchor="middle" class="d-label">Hardware</text>
<text x="475" y="22" text-anchor="middle" class="d-label">Containers</text>
<rect x="340" y="36" width="85" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="382.5" y="59" text-anchor="middle" class="d-label">App</text>
<rect x="433" y="36" width="85" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="475.5" y="59" text-anchor="middle" class="d-label">App</text>
<rect x="525" y="36" width="85" height="36" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="567.5" y="59" text-anchor="middle" class="d-label">App</text>
<rect x="340" y="80" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="475" y="103" text-anchor="middle" class="d-label">Container engine</text>
<rect x="340" y="124" width="270" height="36" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="475" y="147" text-anchor="middle" class="d-label">Shared OS</text>
<rect x="340" y="168" width="270" height="36" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="475" y="191" text-anchor="middle" class="d-label">Hardware</text>
</svg>
<figcaption id="vmcontainer-caption">Each virtual machine carries a full operating system. Containers share the host's system, so they are lighter and start in seconds.</figcaption>
</figure>

| | Virtual machine | Container |
| --- | --- | --- |
| **Contains** | A full operating system and the application | The application and its libraries |
| **Size** | Gigabytes | Often megabytes |
| **Startup** | Minutes | Seconds |
| **Isolation** | Stronger, with a separate system | Lighter, with a shared kernel |

### Image, container and registry

Three words you'll keep hearing:

- **Image:** a read-only package of the application and its libraries, like a recipe.
- **Container:** a running copy of an image. One image can run as a thousand containers.
- **Registry:** where images are stored, such as Docker Hub or Amazon ECR.

The most common tool for building images is **Docker**. You write what the image contains in a `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
```

Then you build it, try it on your machine, and push it to a registry:

```bash
docker build -t shop .
docker run -p 8080:80 shop
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/shop
```

## Amazon ECR: your images' home

**ECR** (Elastic Container Registry) is AWS's image registry, with storage on S3 behind the scenes:

- **Private repositories:** access to them goes through [IAM](/en/posts/aws-02-iam/), so a server or task needs permission to pull.
- **Public repositories:** anyone can pull from them, through the ECR Public Gallery.
- **Extras:** image scanning for vulnerabilities, versions with tags, and lifecycle rules that delete old images.

## Amazon ECS: AWS's way of running containers

**ECS** (Elastic Container Service) takes your images and runs them, keeps them running, and places them behind a load balancer. It's AWS's own service, simpler than Kubernetes, and the service itself has no extra charge. You pay for the capacity it runs on.

Four terms cover the whole service:

| Term | Meaning | Comparable to |
| --- | --- | --- |
| **Cluster** | A logical group that tasks run in | Your fleet of servers |
| **Task definition** | A recipe: the image, CPU, memory, ports and roles | A launch template |
| **Task** | One or more running containers from that recipe | A server |
| **Service** | Keeps a set number of tasks running, and replaces failed ones | An Auto Scaling group |

<figure class="diagram">
<svg viewBox="0 0 640 256" role="img" aria-labelledby="ecs-caption">
<defs>
<marker id="ecs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="98" width="110" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="123" text-anchor="middle" class="d-label">ALB</text>
<text x="75" y="143" text-anchor="middle" class="d-small">Load balancer</text>
<rect x="170" y="14" width="450" height="228" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="395" y="38" text-anchor="middle" class="d-label">ECS cluster</text>
<text x="395" y="60" text-anchor="middle" class="d-small">Service: keep 3 tasks running</text>
<rect x="190" y="74" width="200" height="152" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="290" y="94" text-anchor="middle" class="d-small">Availability Zone A</text>
<rect x="205" y="106" width="170" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="290" y="136" text-anchor="middle" class="d-label">Task 1</text>
<rect x="205" y="164" width="170" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="290" y="194" text-anchor="middle" class="d-label">Task 2</text>
<rect x="400" y="74" width="200" height="152" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="500" y="94" text-anchor="middle" class="d-small">Availability Zone B</text>
<rect x="415" y="106" width="170" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="500" y="136" text-anchor="middle" class="d-label">Task 3</text>
<rect x="415" y="164" width="170" height="50" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="500" y="194" text-anchor="middle" class="d-small">New when load grows</text>
<line x1="130" y1="128" x2="188" y2="128" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#ecs-arrow)"/>
</svg>
<figcaption id="ecs-caption">The service keeps the number of tasks you asked for across Availability Zones, and the load balancer sends visitors to whichever tasks are healthy.</figcaption>
</figure>

### Who runs the containers?

Containers need computing capacity, and you have three options:

| Option | Who manages the servers | Suits |
| --- | --- | --- |
| **Fargate** | AWS entirely, with no servers to see | Most applications; start here |
| **Managed Instances** | AWS manages them, and you choose the instance types | Needing GPUs or specific instances without the management |
| **EC2** | You, through an Auto Scaling group | Full control, or reducing the cost of steady load |

With **Fargate** you state the CPU and memory for a task, and pay for those while it runs. **Fargate Spot** cuts the price sharply for tasks that can tolerate interruption, in the same way as [Spot](/en/posts/aws-04-ec2-pricing-networking/) servers.

### Two IAM roles, and confusing them is a classic

Every Fargate task can have two roles, and they do different jobs:

| Role | Who uses it | Example |
| --- | --- | --- |
| **Task execution role** | ECS itself, to prepare the task | Pulling the image from ECR and sending logs to CloudWatch |
| **Task role** | Your code inside the container | Reading from S3 or writing to DynamoDB |

If the task fails at startup with a pull error, look at the execution role. If your code gets `AccessDenied` while it's running, look at the task role. And give each service its own task role, not one shared role.

### Network and load balancing

On Fargate each task gets its own network interface and private IP, so it has its own **security group** like a server. Put an [Application Load Balancer](/en/posts/aws-06-load-balancers/) in front of the service, and it registers new tasks automatically and removes failed ones. It suits most web applications, and you'd choose a Network Load Balancer for very high throughput or fixed IP addresses.

### Storage

A container's disk disappears with it. To share files between tasks, mount [EFS](/en/posts/aws-05-ec2-storage/), which works on both Fargate and EC2. And for anything that matters, store it outside the container in S3 or a database.

### Scaling

**Service Auto Scaling** changes the number of tasks based on average CPU or memory, requests per task from the load balancer, or a schedule. The policies are the same ones we saw in [part seven](/en/posts/aws-07-auto-scaling/).

On Fargate that's all you need. With EC2 there's a second layer, because you need servers for the new tasks to land on. A **capacity provider** links the service to an Auto Scaling group and adds servers when tasks need them.

### Not just web services

Tasks don't have to stay running. Three common patterns:

| Pattern | How it works |
| --- | --- |
| **Reacting to an event** | A file lands in S3, EventBridge starts a Fargate task to process it, and it stops when done |
| **Scheduled work** | EventBridge Scheduler starts a task every night for a batch job |
| **Queue workers** | A service pulls from [SQS](/en/posts/aws-19-sqs-sns-kinesis/), and scales by the number of messages waiting |

### ECS Express Mode: the short way

Just want a web application from an image, without setting up every piece? **ECS Express Mode** takes an image and two roles, and creates the Fargate service, load balancer, health checks, scaling and a link. All of it stays in your account, so you can customize it later.

::: note What about App Runner?
You may read about **AWS App Runner**, which did something similar. It stopped accepting new customers on April 30, 2026, though it keeps running for existing customers, and AWS points new customers to ECS Express Mode.
:::

## Amazon EKS: Kubernetes

**Kubernetes** is an open-source system for running containers, widely used across clouds and data centers. **EKS** (Elastic Kubernetes Service) runs its **control plane** for you, across several Availability Zones, at $0.10 per hour per cluster for versions under standard support, on top of the capacity. A version that's past that period costs $0.60 per hour.

Terms differ from ECS: a task is a **Pod**, and a server is a **Node**.

| Node option | How it works |
| --- | --- |
| **EKS Auto Mode** | AWS provisions, updates and scales the nodes; it's what AWS recommends going forward |
| **Managed node groups** | AWS creates and updates the servers, and you choose them |
| **Self-managed nodes** | You handle everything, for special requirements |
| **Fargate** | Each Pod runs in isolation without nodes; still available, though Auto Mode is preferred |

For storage, EKS uses **CSI drivers** to mount EBS, EFS or FSx.

### ECS or EKS?

| | ECS | EKS |
| --- | --- | --- |
| **Complexity** | Fewer concepts, and quick to learn | A big system with a lot to learn |
| **Portability** | AWS only | The same tools work elsewhere |
| **Ecosystem** | Close integration with AWS | A huge open-source ecosystem |
| **Cost of the service itself** | Free | Per hour per cluster |
| **Choose it if** | You're starting out, and your work is on AWS | Your team knows Kubernetes, or you run across several clouds |

If nothing is pushing you toward Kubernetes, start with **ECS on Fargate**.

## Hands-on: a service replaces a stopped task

We'll run a public Nginx image on Fargate, with no build needed. From CloudShell, create the cluster and write the recipe. An image from a public registry with no logs doesn't need an execution role:

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

Prepare the network: the default VPC, a subnet, and a security group that allows port 80 from your CloudShell only:

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

Run a single task. If this is your first use of ECS and you get an error about the service-linked role, wait a little and repeat the command:

```bash
TASK=$(aws ecs run-task --cluster series-cluster --task-definition web \
  --launch-type FARGATE --network-configuration "$NET" \
  --query "tasks[0].taskArn" --output text)

aws ecs wait tasks-running --cluster series-cluster --tasks $TASK
```

Get its address and try it:

```bash
ENI=$(aws ecs describe-tasks --cluster series-cluster --tasks $TASK \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" \
  --output text)
IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI \
  --query "NetworkInterfaces[0].Association.PublicIp" --output text)

curl -s http://$IP | grep -i "<title>"
```

You'll see `<title>Welcome to nginx!</title>`. Your first container is running, with no server you can see. Now stop it, and it stays stopped, because nothing is looking after it:

```bash
aws ecs stop-task --cluster series-cluster --task $TASK \
  --query task.lastStatus
```

Create a **service** that keeps one task running:

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

Wait a minute, then list the tasks:

```bash
aws ecs list-tasks --cluster series-cluster --service-name web \
  --query taskArns
```

The ID has changed. The service noticed the task was gone and started another without you lifting a finger.

::: security Delete after experimenting
This task costs about a cent or two per hour, but it carries on as long as the service exists. If a command complains that something is still in use, wait a minute and repeat it:
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

## Summary

- A **container** packages the application and its libraries, and shares the host's system, so it's light and fast.
- **ECR** stores images, and **ECS** runs them through a task definition, tasks and a service.
- **Fargate** spares you from managing servers, and it's the best starting point.
- The **execution role** belongs to ECS, and the **task role** belongs to your code.
- **EKS** is for those who need Kubernetes, and **ECS Express Mode** is the short way for a web application.

Containers still run and cost money while waiting. What if your code only ran when there was something to do, and you paid nothing otherwise? In [**part twenty-one**](/en/posts/aws-21-lambda-api-dynamodb/) we build an API with Lambda, API Gateway and DynamoDB.
