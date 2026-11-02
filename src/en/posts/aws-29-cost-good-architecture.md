---
title: "Cost and Good Architecture"
description: The series finale. Where your money goes on the network, the tools that watch your bill, the Well-Architected Framework, building everything from a template with CloudFormation, Systems Manager, and where to go after this series, with a hands-on.
date: 2026-11-02
series: aws
part: 29
numbered: true
tags: [aws, operations]
---

You've come a long way since [part one](/en/posts/aws-01-global-infrastructure/). In this final part we answer two questions that apply to everything we built: **how much does it cost?** and **is it designed well?** Then we turn it all into a file you can rebuild with one command.

## Where does the network money go?

Most people plan for servers and storage, then get surprised by data transfer. Prices here are approximate for US Regions:

<figure class="diagram">
<svg viewBox="0 0 640 290" role="img" aria-labelledby="netcost-caption">
<defs>
<marker id="netcost-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="14" y="14" width="420" height="262" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="224" y="38" text-anchor="middle" class="d-label">Region</text>
<rect x="30" y="50" width="180" height="124" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="120" y="70" text-anchor="middle" class="d-small">Availability Zone 1</text>
<rect x="45" y="82" width="70" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="109" text-anchor="middle" class="d-label">EC2</text>
<rect x="125" y="82" width="70" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="160" y="109" text-anchor="middle" class="d-label">EC2</text>
<line x1="115" y1="104" x2="123" y2="104" stroke="var(--color-accent)" stroke-width="2"/>
<text x="120" y="152" text-anchor="middle" class="d-small">Free with private IPs</text>
<rect x="238" y="50" width="180" height="124" rx="10" fill="none" stroke="var(--color-line-strong)"/>
<text x="328" y="70" text-anchor="middle" class="d-small">Availability Zone 2</text>
<rect x="293" y="82" width="70" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="328" y="109" text-anchor="middle" class="d-label">EC2</text>
<line x1="195" y1="104" x2="291" y2="104" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#netcost-arrow)"/>
<text x="224" y="204" text-anchor="middle" class="d-small">Between zones: $0.01 per GB each way</text>
<text x="224" y="240" text-anchor="middle" class="d-small">In from the internet: free</text>
<rect x="480" y="30" width="140" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="60" text-anchor="middle" class="d-label">Internet</text>
<text x="550" y="80" text-anchor="middle" class="d-small">About $0.09 per GB</text>
<rect x="480" y="170" width="140" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="550" y="200" text-anchor="middle" class="d-label">Other Region</text>
<text x="550" y="220" text-anchor="middle" class="d-small">From $0.02 per GB</text>
<line x1="434" y1="65" x2="478" y2="65" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#netcost-arrow)"/>
<line x1="434" y1="205" x2="478" y2="205" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#netcost-arrow)"/>
</svg>
<figcaption id="netcost-caption">Data going into AWS is free, and within a zone over private addresses too. You pay when it crosses a boundary: between zones, between Regions, or out to the internet.</figcaption>
</figure>

| Direction | Approx. price per GB |
| --- | --- |
| **Into AWS from the internet** | Free |
| **Inside one Availability Zone, using private IPs** | Free |
| **Between Availability Zones** | $0.01 in each direction |
| **Between Regions** | From about $0.02, and it varies by Region |
| **Out to the internet** | About $0.09 and falling with volume, with the first 100 GB a month free |

Small numbers add up quickly. Six things that cut them:

- **Use private IPs** inside the VPC instead of public ones, and note that every public IPv4 address also has an hourly charge.
- **Put CloudFront in front of your application.** Data from AWS to CloudFront is free, and out through it costs less than going out directly.
- **Add a gateway endpoint** for [S3 and DynamoDB](/en/posts/aws-14-vpc-connectivity/). It's free, and it spares you NAT charges per GB.
- **One NAT gateway per Availability Zone,** so traffic doesn't cross zones to reach it.
- **Keep chatty services close.** Balance this against availability, though, as splitting across zones is worth paying for.
- **Compress what you send,** and cache it as far forward as you can.

## Where's the caching?

Each layer saves work for the ones behind it, so the further forward the better, and we've seen them all:

| Layer | Tool | Saves |
| --- | --- | --- |
| **The edge** | [CloudFront](/en/posts/aws-12-cloudfront-global-accelerator/) | The whole trip, for content that's the same for everyone |
| **The API** | [API Gateway cache](/en/posts/aws-22-serverless-design/) | The function and the database |
| **The application** | [ElastiCache](/en/posts/aws-09-elasticache/) | Heavy queries and calculations |
| **The database** | [DAX](/en/posts/aws-21-lambda-api-dynamodb/) or a read replica | Reads from the main database |

## Tools that watch your bill

| Tool | What it does |
| --- | --- |
| **Cost Explorer** | Charts your spending by service, account and tag, forecasts it, and recommends Savings Plans |
| **Budgets** | Alerts you when you reach or are forecast to reach a limit, and monitoring is free |
| **Cost Anomaly Detection** | Uses machine learning to spot unusual spending, at no charge |
| **Cost Optimization Hub** | Gathers recommendations for savings in one place: resizing, idle resources and more |
| **Compute Optimizer** | Recommends suitable sizes based on your actual use |

And the first step is **tags**: without an `env` or `team` tag, you won't know who's spending what.

### Quick savings

| Action | Where we saw it |
| --- | --- |
| Resize oversized servers | [Part three](/en/posts/aws-03-ec2-first-server/) |
| Commit with Savings Plans, and use Spot for what tolerates interruption | [Part four](/en/posts/aws-04-ec2-pricing-networking/) |
| Stop dev servers at night, for example with **Instance Scheduler on AWS** | This part |
| Lifecycle rules for S3 | [Part sixteen](/en/posts/aws-16-s3-classes-lifecycle/) |
| Set a retention period on logs | [Part twenty-five](/en/posts/aws-25-monitoring-auditing/) |
| Delete orphaned disks, snapshots and load balancers | [Part five](/en/posts/aws-05-ec2-storage/) |

## The Well-Architected Framework

AWS has summarized what it's learned from its customers in six pillars. Consider it a review for any design:

| Pillar | The question | We covered it in |
| --- | --- | --- |
| **Operational excellence** | Can you run it and improve it? | [Monitoring](/en/posts/aws-25-monitoring-auditing/) and templates |
| **Security** | Are data and access protected? | [IAM](/en/posts/aws-02-iam/) and [encryption](/en/posts/aws-27-encryption-secrets-protection/) |
| **Reliability** | Does it survive failures and recover? | [Scaling](/en/posts/aws-07-auto-scaling/) and [recovery](/en/posts/aws-28-disaster-recovery-migration/) |
| **Performance efficiency** | Are you using the right resources? | [Caching](/en/posts/aws-09-elasticache/) and [choosing a database](/en/posts/aws-10-choosing-database/) |
| **Cost optimization** | Are you paying for what you don't need? | This part |
| **Sustainability** | Are you reducing your consumption and its impact? | Right sizing and [Graviton](/en/posts/aws-03-ec2-first-server/) |

The pillars pull against each other at times: more copies mean better reliability and higher cost. The aim isn't to max out everything, but to make the trade-off knowingly.

- **AWS Well-Architected Tool:** a free tool in the console that asks you questions about your workload and shows the risks.
- **Trusted Advisor:** checks your account against best practices. On the free plan you get service limits and a few security and fault-tolerance checks, and the rest need a paid support plan. Note that AWS is changing its support plans, with **Developer** and **Business** ending on January 1, 2027 in favor of **Business Support+**.

## CloudFormation: your infrastructure in a file

So far we've created everything by hand or by command. What if you could describe it all in a file? **AWS CloudFormation** reads a **template** and builds a **stack** of resources, in the right order, and:

- **Repeatable:** the same environment for development, testing and production.
- **Reviewable:** the template sits in Git like code, and you review its changes.
- **Controlled:** a **change set** shows what will change before it happens, and **drift detection** reveals manual changes.
- **Clean:** deleting a stack deletes everything in it, so nothing's left billing you.
- **Free:** you pay only for the resources it creates.

**Infrastructure Composer** lets you draw a template visually, and **AWS CDK** writes it in Python or TypeScript. A **service role** lets a developer deploy a stack without having permission over the resources themselves.

## Systems Manager: running your servers

**AWS Systems Manager** manages fleets of servers through an agent, already installed on Amazon Linux, and an IAM role:

| Tool | What it does |
| --- | --- |
| **Session Manager** | A terminal with no SSH port and no keys, with sessions logged |
| **Run Command** | One command across a thousand servers |
| **Patch Manager** | Applies updates on a schedule |
| **Maintenance Windows** | Sets when these things are allowed to happen |
| **Automation** | Ready documents for common tasks, like [Config](/en/posts/aws-25-monitoring-auditing/) remediation |

## Services worth knowing

A last group that deserves a line each:

| Service | What it's for |
| --- | --- |
| **SES** | Sending email, for transactions and marketing, with protection for your reputation |
| **AWS Batch** | Batch jobs at any scale, on EC2 or Fargate, with no 15-minute limit like [Lambda](/en/posts/aws-21-lambda-api-dynamodb/) |
| **AWS Outposts** | AWS servers in your own data center, for when the data must stay with you |
| **Amazon AppFlow** | Moving data from SaaS applications such as Salesforce into S3 or Redshift, with no code |
| **AWS Amplify** | Quickly building and hosting web and mobile applications |

If you read older articles, **Amazon Pinpoint** reached its end of support on October 30, 2026. AWS points to **SES** for email, and to **AWS End User Messaging** for SMS and push notifications.

### High performance computing

When you need thousands of processors working together:

| Need | Tools |
| --- | --- |
| **Compute** | A cluster [placement group](/en/posts/aws-04-ec2-pricing-networking/), with Enhanced Networking or EFA, and Spot where possible |
| **Storage** | [FSx for Lustre](/en/posts/aws-18-storage-transfer/), Instance Store and S3 |
| **Orchestration** | AWS Batch or **AWS ParallelCluster** |
| **Moving data** | [Direct Connect or DataSync](/en/posts/aws-18-storage-transfer/) |

## Hands-on: a whole stack from a file, and a budget you'll keep

Write a small template with a bucket and an SNS topic. From CloudShell:

```bash
cat > stack.yaml <<'EOF'
AWSTemplateFormatVersion: "2010-09-09"
Description: A small stack from the AWS series
Parameters:
  Env:
    Type: String
    Default: dev
Resources:
  Files:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      Tags:
        - Key: env
          Value: !Ref Env
  Alerts:
    Type: AWS::SNS::Topic
Outputs:
  BucketName:
    Value: !Ref Files
EOF

aws cloudformation deploy --stack-name series-stack --template-file stack.yaml

aws cloudformation describe-stack-resources --stack-name series-stack \
  --query "StackResources[].[LogicalResourceId,ResourceType,ResourceStatus]" \
  --output table
```

CloudFormation built both resources and named them itself. Now change one value. It updates only what changed, without touching the rest:

```bash
aws cloudformation deploy --stack-name series-stack \
  --template-file stack.yaml --parameter-overrides Env=prod

BUCKET=$(aws cloudformation describe-stacks --stack-name series-stack \
  --query "Stacks[0].Outputs[0].OutputValue" --output text)

aws s3api get-bucket-tagging --bucket $BUCKET \
  --query "TagSet[?Key=='env'].Value" --output text
```

It prints `prod`. Now the nicest part, deleting everything with one command:

```bash
aws cloudformation delete-stack --stack-name series-stack
aws cloudformation wait stack-delete-complete --stack-name series-stack
echo "Everything is gone"
```

Finally, one thing to **keep**: a budget of $10 a month that warns you when you're forecast to exceed 80% of it. Replace the email address with yours:

```bash
EMAIL=you@example.com
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

cat > budget.json <<'EOF'
{
  "BudgetName": "series-monthly",
  "BudgetLimit": {"Amount": "10", "Unit": "USD"},
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
EOF

cat > notify.json <<EOF
[{
  "Notification": {
    "NotificationType": "FORECASTED",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 80,
    "ThresholdType": "PERCENTAGE"
  },
  "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "$EMAIL"}]
}]
EOF

aws budgets create-budget --account-id $ACCOUNT \
  --budget file://budget.json \
  --notifications-with-subscribers file://notify.json

aws budgets describe-budgets --account-id $ACCOUNT \
  --query "Budgets[].[BudgetName,BudgetLimit.Amount,BudgetLimit.Unit]" --output table
```

If you get `AccessDenied`, your IAM user may need billing access, which the root user enables from the account settings.

::: security Before you close the tab
This budget is free, so leave it. And now that the series is over, take a look at **Cost Explorer** and the [EC2](/en/posts/aws-03-ec2-first-server/) page in every Region you tried, to make sure no experiment is still running.
:::

## Summary

- **Data transfer** is the hidden cost: between zones, between Regions, and out to the internet.
- **Budgets** and **Cost Anomaly Detection** warn you before the bill does.
- The **Well-Architected Framework** has six pillars, and the point is to make trade-offs knowingly.
- **CloudFormation** turns your infrastructure into a reviewable, deletable file.
- **Systems Manager** manages your servers without SSH.

## What you've learned

Twenty-nine parts in nine sections. Look at what you can do now:

| Section | You can now |
| --- | --- |
| [Fundamentals](/en/series/aws/#section-1) | Understand the global infrastructure and control permissions |
| [Servers and their storage](/en/series/aws/#section-2) | Run a server, choose its pricing and keep its data |
| [High availability and scaling](/en/series/aws/#section-3) | Build an application that survives failures and grows by itself |
| [Databases](/en/series/aws/#section-4) | Choose the right database and speed it up |
| [Networking and content delivery](/en/series/aws/#section-5) | Design a private network and deliver content around the world |
| [Object storage](/en/series/aws/#section-6) | Store anything in S3 at the right price, and securely |
| [Modern applications](/en/series/aws/#section-7) | Separate services, and run containers and serverless |
| [Data and AI](/en/series/aws/#section-8) | Analyze your data and add AI to your application |
| [Security and operations](/en/series/aws/#section-9) | Monitor, protect, recover and control your costs |

### Where to go from here

- **Build something real.** A small project of your own teaches you more than any article, even a little site with an API.
- **Read the FAQs.** Each service's FAQ page is a short, rich and accurate summary.
- **Consider a certification.** **Solutions Architect Associate** covers most of what's in this series, and the exam tests how you choose between services. Read each question for its deciding phrase, such as "lowest cost" or "least operational effort", and eliminate the wrong answers first.
- **Follow the changes.** AWS changes quickly, and several things in this series changed even as it was being written. Check the docs before any decision.

Thanks for coming along to the end, and good luck with what you build.
