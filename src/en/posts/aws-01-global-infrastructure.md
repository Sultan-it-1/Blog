---
title: "What is AWS? The Global Infrastructure, from Regions to Edge Locations"
description: Part one of Learn AWS from Scratch. What cloud computing is, how AWS is spread across the world in Regions, Availability Zones and edge locations, how to pick a Region, and who is responsible for what.
date: 2026-11-02
series: aws
part: 1
numbered: true
tags: [aws, cloud]
---

This is the first step of **Learn AWS from Scratch**. Before launching a server or storing a single file, you need to understand the ground you're standing on: what "cloud" means, where your services actually run, and who is responsible for protecting them. Every later part builds on what we cover here.

You don't need any previous AWS experience, just the basics of computers and the internet.

## Cloud computing in brief

Instead of buying servers, putting them in a room and paying for them up front, you rent what you need from a cloud provider, when you need it, and pay for what you use. **AWS** (Amazon Web Services) is one of the largest cloud providers in the world, and opened its services to the public in 2006.

What sets the cloud apart from a server in your room:

- **On demand:** launch a server in minutes and switch it off when you're done.
- **Pay for what you use:** no hardware to buy up front. You pay by the hour, by the second or per request, depending on the service.
- **Elastic:** add resources when traffic peaks and remove them when it's quiet, without touching hardware.
- **Global reach:** run your application close to your users, wherever they are.

### Service models

Not every cloud service gives you the same level of control. The further down the table, the less you manage yourself:

| Model | What you manage | Example on AWS |
| --- | --- | --- |
| IaaS: infrastructure as a service | Operating system, software and data | EC2 (virtual servers) |
| PaaS: platform as a service | Your code and data only | Elastic Beanstalk |
| FaaS: functions without servers | The function itself | Lambda |
| SaaS: software as a service | Just your use of the software | Any ready-made app you open in a browser |

No need to memorize the table. What matters is that services differ in how much work they leave to you, and that makes a big difference once we get to responsibility.

## The AWS global infrastructure

AWS isn't one data center. It's a huge network arranged in three layers you need to understand before any service: **Regions**, **Availability Zones** and **edge locations**.

### Regions

A Region is a geographic location containing a group of AWS data centers. Each one has a name and a code you'll see everywhere:

- `us-east-1`: N. Virginia (USA)
- `eu-central-1`: Frankfurt (Germany)
- `me-south-1`: Bahrain
- `me-central-1`: UAE

Regions are independent of each other. A server you create in one Region stays there, and your data never leaves it unless you move it. Most AWS services are **regional**: you choose the Region before you create anything.

### Availability Zones

Each Region is divided into several **Availability Zones** (AZs), and newer Regions have at least three. An Availability Zone is one or more data centers with their own power, cooling and networking.

Availability Zones are far enough apart that a disaster in one (a fire, a power cut, a flood) doesn't reach the others, and close enough to be linked by a very fast network. Their names are the Region code followed by a letter: `me-central-1a`, `me-central-1b` and `me-central-1c`.

<figure class="diagram">
<svg viewBox="0 0 640 320" role="img" aria-labelledby="aws-region-diagram-caption">
<rect x="8" y="8" width="624" height="304" rx="16" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="320" y="42" text-anchor="middle" class="d-title">Region</text>
<g>
<rect x="32" y="64" width="176" height="200" rx="12" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="120" y="92" text-anchor="middle" class="d-label">Availability Zone 1</text>
<text x="120" y="112" text-anchor="middle" class="d-code">me-central-1a</text>
<rect x="56" y="128" width="128" height="48" rx="8" fill="var(--color-sunken)"/>
<text x="120" y="157" text-anchor="middle" class="d-small">Data center</text>
<rect x="56" y="192" width="128" height="48" rx="8" fill="var(--color-sunken)"/>
<text x="120" y="221" text-anchor="middle" class="d-small">Data center</text>
</g>
<g>
<rect x="232" y="64" width="176" height="200" rx="12" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="92" text-anchor="middle" class="d-label">Availability Zone 2</text>
<text x="320" y="112" text-anchor="middle" class="d-code">me-central-1b</text>
<rect x="256" y="128" width="128" height="48" rx="8" fill="var(--color-sunken)"/>
<text x="320" y="157" text-anchor="middle" class="d-small">Data center</text>
<rect x="256" y="192" width="128" height="48" rx="8" fill="var(--color-sunken)"/>
<text x="320" y="221" text-anchor="middle" class="d-small">Data center</text>
</g>
<g>
<rect x="432" y="64" width="176" height="200" rx="12" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="520" y="92" text-anchor="middle" class="d-label">Availability Zone 3</text>
<text x="520" y="112" text-anchor="middle" class="d-code">me-central-1c</text>
<rect x="456" y="128" width="128" height="48" rx="8" fill="var(--color-sunken)"/>
<text x="520" y="157" text-anchor="middle" class="d-small">Data center</text>
</g>
<line x1="208" y1="164" x2="232" y2="164" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round"/>
<line x1="408" y1="164" x2="432" y2="164" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round"/>
<text x="320" y="294" text-anchor="middle" class="d-small">Fast, low-latency links connect the Availability Zones</text>
</svg>
<figcaption id="aws-region-diagram-caption">One Region with three isolated Availability Zones, each made of one or more data centers.</figcaption>
</figure>

The key idea: if you run your application in **more than one Availability Zone**, losing one of them doesn't take your application down. That's the foundation of high availability, which comes up again and again in this series.

::: note An AZ name can differ between accounts
AWS may map the name `us-east-1a` in your account to a different data center than `us-east-1a` in someone else's, to spread the load. If you need to compare across accounts, use the **Availability Zone ID** (such as `use1-az1`), which is the same for everyone.
:::

### Edge locations

Edge locations are AWS sites in many cities around the world, far more numerous than Regions. You don't run your servers there. Services such as **CloudFront** (the content delivery network) and **Route 53** (DNS) use them to serve each user from the nearest point, so content arrives faster.

For example: your site is hosted in Frankfurt and a visitor is in Riyadh. Instead of every image travelling the full distance, CloudFront keeps a copy at the edge location nearest the visitor and serves it from there.

## Global and regional services

Since most services are regional, you need to know which ones are tied to a Region and which aren't:

| Type | Examples | What it means for you |
| --- | --- | --- |
| Global | IAM, Route 53, CloudFront | The same settings apply across all Regions |
| Regional | EC2, Lambda, RDS, and most services | You pick a Region, and the resource lives only there |

**S3** is a special case: a bucket is created in a specific Region and its data stays there, but its name must be unique across all of AWS.

::: tip Can't find the server you created?
The classic beginner moment: you launch a server, come back to the console later, and it's gone. Almost always the selected Region has changed. Check the Region selector at the top of the console, since each Region only shows its own resources.
:::

## How to choose a Region

When you start a new project, four things decide the Region:

1. **Regulation and compliance:** some organizations and laws require data to stay within a specific country or area.
2. **Proximity to users:** the closer the Region is to your users, the lower the latency and the faster your application feels.
3. **Service availability:** not every service and feature exists in every Region. New services usually launch in a few Regions first.
4. **Cost:** prices for the same service vary between Regions.

If your users are in the Gulf, `me-central-1` (UAE) or `me-south-1` (Bahrain) gives you the lowest latency, but check that the services you need are available there. For learning and experiments, many people use `us-east-1`, which offers almost every service and is usually among the cheapest.

::: note Newer Regions need to be enabled
Some Regions (including Bahrain and the UAE) are disabled by default in new accounts. Enable them once from your account settings (Account → AWS Regions) before you can use them.
:::

## The shared responsibility model

Security on AWS is split between you and AWS. In short: AWS protects **the cloud itself**, and you protect **what you put in it**.

| AWS is responsible for | You are responsible for |
| --- | --- |
| Buildings, data centers and their physical security | Your data and who can reach it |
| Hardware and the global network | Users and permissions (IAM) |
| The virtualization layer under your servers | Your server's operating system and its updates (on EC2) |
| Running the managed services themselves | Network settings, firewalls and encryption |

The more managed a service is, the less you're responsible for. On EC2 you own the whole operating system; see what that means in practice in [Setting Up a Secure Linux Server from Scratch](/en/posts/linux-server/). With a service like Lambda, AWS takes care of the servers and operating system, and you look after your code and its permissions.

## How you work with AWS

There are four ways in, all reaching the same services:

- **Management Console:** the web interface, the easiest place to start.
- **AWS CLI:** commands in a terminal, ideal for automation and scripts.
- **SDKs:** libraries for languages such as Python, JavaScript, Java and Go, used inside your application.
- **CloudShell:** a terminal inside the console with the CLI installed and already signed in as you. The quickest way to try commands with no setup.

Try it now. Open CloudShell from the terminal icon at the top of the console and run:

```bash
# Who am I? Shows the account number and the identity you're using
aws sts get-caller-identity

# The Regions enabled in your account
aws ec2 describe-regions --query "Regions[].RegionName" --output table

# The Availability Zones in Frankfurt, with each one's ID
aws ec2 describe-availability-zones --region eu-central-1 \
  --query "AvailabilityZones[].[ZoneName,ZoneId]" --output table
```

The last command prints a table with each Availability Zone's name (`eu-central-1a`…) and its ID (`euc1-az2`…), which is the name-versus-ID difference explained above.

## Before you continue: protect your account and your bill

The biggest risk to a new AWS account isn't only being hacked, it's also a bill you didn't expect. Do these from day one:

::: security Three steps for day one
- **Turn on multi-factor authentication (MFA) for the root user.** The root user is the account you signed up with your email; it can do everything.
- **Don't use the root user for daily work.** The next part shows how to create users with limited permissions.
- **Set up a budget alert.** In Billing and Cost Management, open Budgets, then Create budget, and choose the **Zero spend budget** template so you get an email as soon as anything is charged.
:::

AWS gives new accounts limited free usage, but the terms change over time. Check the [official free tier page](https://aws.amazon.com/free/) before running any service, and don't leave resources running once you've finished experimenting.

## Summary

- The cloud means resources on demand: you pay for what you use and scale up or down as needed.
- A **Region** is an independent geographic location, and most services live inside a single Region.
- An **Availability Zone** is one or more isolated data centers. Spreading across several protects your application from failures.
- **Edge locations** bring content closer to users through CloudFront and Route 53.
- You choose a Region by regulation, proximity, service availability and cost.
- AWS protects the cloud; you protect what's inside it.

If you want to see these ideas in practice, there's a hands-on guide: [How to create a server on AWS](/en/posts/aws/).

In **part two** we'll get into identity and permissions (IAM): users, groups and policies, and how to actually secure your account.
