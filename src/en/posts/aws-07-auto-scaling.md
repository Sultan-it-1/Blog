---
title: "Auto Scaling and Building a Full Application"
description: Let AWS add servers at peak times, remove them when it's quiet and replace failed ones, then bring everything together into the design of a full, fault-tolerant application, and see how Elastic Beanstalk shortens the work.
date: 2026-11-02
series: aws
part: 7
numbered: true
tags: [aws, ec2, scaling]
---

In [part six](/en/posts/aws-06-load-balancers/) we spread visitors across two servers and watched the site carry on when one failed. Two problems remain: a failed server stays failed until you step in, and the number of servers is fixed however busy or quiet things get.

Think of an online store: its night-time traffic is nothing like its traffic during a sale. Prepare servers for the peak and you pay for idle machines most of the time. Prepare fewer and the site falls over at the worst moment. The solution is an **Auto Scaling group**.

## Auto Scaling groups (ASG)

An **Auto Scaling group** manages a set of servers for you. Give it a recipe and three numbers, and it handles the rest:

| Number | Meaning | Example |
| --- | --- | --- |
| **Minimum** | The lowest count, however quiet it gets | 2, one in each Availability Zone |
| **Desired** | The count wanted right now, which changes with load | 2 |
| **Maximum** | The ceiling, which protects your bill | 6 |

It spreads servers across Availability Zones, registers them with the load balancer automatically, and replaces any that fail. The service itself is free; you pay only for the servers.

### Launch templates

To launch servers on its own, the group needs a **recipe**: the system image, instance type, security group, IAM role and User Data. Everything you chose by hand in [part three](/en/posts/aws-03-ec2-first-server/) is saved in a template.

This is where [ready-made AMIs](/en/posts/aws-05-ec2-storage/) pay off: the faster a server comes up, the faster the group responds to load.

### Health checks: don't miss this option

By default, the group checks only the server itself. If the server is running but the application on it has stopped, it won't be replaced. Turn on **ELB health checks** so it relies on the load balancer's check, and the server gets replaced when the application itself fails.

## When to grow and when to shrink

| Policy | How it works | Good for |
| --- | --- | --- |
| **Target tracking** | Set a target, such as 50% average CPU, and it adjusts the count | Most cases; start here |
| **Step scaling** | Define steps: above 70% add one server, above 90% add three | Finer control |
| **Scheduled** | Add capacity at a time you set in advance | Known peaks, such as a sale starting at 8 |
| **Predictive** | Forecasts load from your history and prepares ahead | Load that repeats daily or weekly |

The metric you choose matters. CPU is a good start, but for websites **requests per server** (`RequestCountPerTarget`) is often more honest, because it reflects visitors directly.

After each change, the group waits through a cooldown (300 seconds by default) before deciding again, giving new servers time to affect the numbers.

::: tip Save money with Spot
You can mix pricing in one group: the minimum at the regular price or under a Savings Plan, and the extras on [Spot](/en/posts/aws-04-ec2-pricing-networking/). A web application tolerates this because the load balancer drops any server that disappears.
:::

## Hands-on: watch the group grow and heal itself

We'll build on the load balancer and target group from part six.

1. **Template:** in EC2, open **Launch Templates**, then **Create launch template**. Name it `web-template`, choose Amazon Linux 2023, `t3.micro` and the servers' security group, and paste the User Data from part three.
2. **Group:** from **Auto Scaling Groups**, create `web-asg` from this template, and pick two subnets in different Availability Zones.
3. **Load balancer:** choose **Attach to an existing load balancer**, select the target group, and turn on **ELB health checks**.
4. **Numbers:** Desired 1, Minimum 1, Maximum 3.
5. **Policy:** choose **Target tracking** on average CPU with a 40% target.

Sign in to the server through EC2 Instance Connect and generate CPU load. A `t3.micro` has two virtual CPUs, so we run two processes:

```bash
yes > /dev/null &
yes > /dev/null &
```

After a few minutes, see what happened from CloudShell:

```bash
# What the group did, and why
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name web-asg --max-items 5 \
  --query "Activities[].[StatusCode,Description]" --output table

# The current servers, their zones and health
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names web-asg \
  --query "AutoScalingGroups[0].Instances[].[InstanceId,AvailabilityZone,HealthStatus]" \
  --output table
```

You'll see new servers come up and join the load balancer without you touching anything. Stop the load, and after about fifteen minutes the group shrinks on its own:

```bash
pkill yes
```

Now the fun part: **delete a server yourself** and watch what happens:

```bash
aws ec2 terminate-instances --instance-ids i-0123456789abcdef0
```

The group notices the count has dropped below what's wanted and launches a replacement within minutes. That's an application healing itself.

::: security Delete the group first
If you delete the servers without deleting the group, it will launch them again! Delete the **group first**, then the load balancer and target group.
:::

## Putting the pieces together: a full application

You now have all the pieces of the server tier. This is the common design for a fault-tolerant web application:

<figure class="diagram">
<svg viewBox="0 0 640 372" role="img" aria-labelledby="full-app-caption">
<defs>
<marker id="app-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="240" y="10" width="160" height="38" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="35" text-anchor="middle" class="d-label">Visitors</text>
<line x1="320" y1="48" x2="320" y2="74" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#app-arrow)"/>
<rect x="150" y="76" width="340" height="42" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="103" text-anchor="middle" class="d-label">Load balancer (ALB)</text>
<rect x="20" y="130" width="600" height="118" rx="14" fill="none" stroke="var(--color-accent)" stroke-dasharray="6 6"/>
<text x="320" y="232" text-anchor="middle" class="d-small">Auto Scaling group (ASG), spanning two Availability Zones</text>
<rect x="40" y="144" width="255" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="167" y="169" text-anchor="middle" class="d-label">Servers</text>
<text x="167" y="191" text-anchor="middle" class="d-small">Availability Zone A</text>
<rect x="345" y="144" width="255" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="472" y="169" text-anchor="middle" class="d-label">Servers</text>
<text x="472" y="191" text-anchor="middle" class="d-small">Availability Zone B</text>
<line x1="240" y1="118" x2="180" y2="142" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#app-arrow)"/>
<line x1="400" y1="118" x2="460" y2="142" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#app-arrow)"/>
<line x1="167" y1="248" x2="167" y2="274" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#app-arrow)"/>
<line x1="472" y1="248" x2="167" y2="274" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#app-arrow)"/>
<line x1="472" y1="248" x2="472" y2="274" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<rect x="40" y="276" width="255" height="78" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="167" y="309" text-anchor="middle" class="d-label">Database</text>
<text x="167" y="333" text-anchor="middle" class="d-small">Primary copy</text>
<rect x="345" y="276" width="255" height="78" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="472" y="309" text-anchor="middle" class="d-label">Cache and shared files</text>
<text x="472" y="333" text-anchor="middle" class="d-small">Outside the servers</text>
</svg>
<figcaption id="full-app-caption">Visitors reach the load balancer, which spreads them across servers in two Availability Zones managed by the Auto Scaling group, and the data lives outside the servers.</figcaption>
</figure>

### The key rule: a server is replaceable

In this design, any server can vanish at any moment: scaled in by the group, replaced after a failure, or reclaimed by Spot. So **nothing important stays on it**. This is what's called a **stateless** application. Each kind of data has its place off the server:

| Data | If you keep it on the server | The right place |
| --- | --- | --- |
| **User sessions** | Users get signed out when their server changes | A shared cache such as ElastiCache |
| **Uploaded files** | They appear on one server and not another | S3 or EFS |
| **Core data** | It's lost with the server | A managed database such as RDS |
| **Images and static files** | Extra load on the servers | S3 with CloudFront |

We haven't reached some of these services yet; the coming sections cover them. What matters now is the idea: whenever you design something, ask "what happens if this server disappears right now?" If the answer is "nothing", you're on the right track.

### Cost in this design

- Cover the minimum with a Savings Plan, since it runs all the time.
- Keep the extras on On-Demand or Spot.
- Review your minimum regularly; many people set it too high.

## Elastic Beanstalk: the shortcut

Assembling all this by hand is work. **Elastic Beanstalk** does it for you: upload your code and choose the language, and it creates the load balancer, Auto Scaling group, servers and monitoring. The service itself is free; you pay for the resources it creates.

- **Two common environments:** one low-cost server for development, or several servers behind a load balancer for production.
- **Two kinds of tier:** Web Server for direct requests, Worker for processing jobs from a queue.
- **Ordinary, visible resources:** you can see them in your account and change them; it isn't a closed box.

It suits you if you want to focus on the code of a conventional application. If you have special requirements or many systems, you'll usually build it yourself or move to the containers covered in the [modern applications section](/en/series/aws/#section-7).

## Summary

- An **ASG** keeps the server count between a minimum and maximum, replaces failures and works with the load balancer.
- A **launch template** is the server's recipe, and a ready-made AMI speeds up the response.
- Turn on **ELB health checks** so a server is replaced when the application itself fails.
- Start with a **target tracking** policy, and pick a metric that truly reflects load.
- Keep servers **stateless**: anything important lives off them.

That completes the high availability section. The question left is where the data lives once it's off the server. That's the next section's subject, starting in [**part eight**](/en/posts/aws-08-rds-aurora/) with the managed databases RDS and Aurora.
