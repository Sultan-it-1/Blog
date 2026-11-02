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

To give new servers time to affect the numbers, target tracking and step policies wait out an **instance warmup** period. If you haven't set one, they use the default cooldown of 300 seconds.

An Auto Scaling group scales servers. If your application also has ECS services, DynamoDB tables or Aurora replicas, the **AWS Auto Scaling** service can manage a scaling plan for all of them in one place.

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

The same thinking leads to **immutable infrastructure**: you don't update a running server. You build a new image, put it in a new launch template, and let **instance refresh** replace the group's servers gradually. Every server then matches what you tested, and going back means returning to the previous image.

### Cost in this design

- Cover the minimum with a Savings Plan, since it runs all the time.
- Keep the extras on On-Demand or Spot.
- Review your minimum regularly; many people set it too high.

## Elastic Beanstalk: the shortcut

Assembling all this by hand is work. **Elastic Beanstalk** does it for you: upload your code and choose the language, and it creates the load balancer, Auto Scaling group, servers and monitoring. The service itself is free; you pay for the resources it creates.

- **Two common environments:** one low-cost server for development, or several servers behind a load balancer for production.
- **Two kinds of tier:** Web Server for direct requests, Worker for processing jobs from a queue.
- **Ordinary, visible resources:** you can see them in your account and change them; it isn't a closed box.

It suits you if you want to focus on the code of a conventional application. If you have special requirements or many systems, you'll usually build it yourself or move to the containers covered in [part twenty](/en/posts/aws-20-ecs-fargate-eks/).

## Summary

- An **ASG** keeps the server count between a minimum and maximum, replaces failures and works with the load balancer.
- A **launch template** is the server's recipe, and a ready-made AMI speeds up the response.
- Turn on **ELB health checks** so a server is replaced when the application itself fails.
- Start with a **target tracking** policy, and pick a metric that truly reflects load.
- Keep servers **stateless**: anything important lives off them.

## Test yourself

::: quiz
An application crashes on one server in an Auto Scaling group. The server keeps running, the load balancer marks it unhealthy, but the group doesn't replace it. What should change?

- [x] Turn on ELB health checks for the Auto Scaling group
- [ ] Raise the group's maximum capacity
- [ ] Add a scheduled action to the group
- [ ] Add more instance types to the launch template

By default, the group looks only at the server's own status, and that's fine here. With ELB health checks on, it also treats a server the load balancer reports as failed as unhealthy, and replaces it.

- **B:** This allows more servers, but it doesn't replace the failed one.
- **C:** Scheduled actions change capacity at set times, and don't look at health.
- **D:** The template decides how servers launch, and the group sees no reason to launch one.

Review: [Health checks](#health-checks-dont-miss-this-option) in this part, and [Health checks for instances in an Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-health-checks.html) in the AWS docs.
:::

::: quiz
A store runs a sale that starts every Friday at exactly 8 PM. Traffic jumps within minutes, and new servers need six minutes to be ready. How can the servers be ready **before** the rush?

- [ ] Rely on a target tracking policy on average CPU
- [ ] Raise the group's maximum capacity
- [x] Add a scheduled action that raises capacity shortly before 8 PM
- [ ] Add a step scaling policy on average CPU

The time is known in advance, so raise the capacity ahead of it, and leave a tracking policy to handle anything beyond that.

- **A:** This reacts after the load has arrived, so servers would be ready six minutes late.
- **B:** The maximum is only a ceiling, and it doesn't launch any servers by itself.
- **D:** This also reacts after the load has arrived, even with finer steps.

Review: [When to grow and when to shrink](#when-to-grow-and-when-to-shrink) in this part, and [Scheduled scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html) in the AWS docs.
:::

::: quiz
A web application spends most of each request waiting on an external API, so CPU stays near 20% even when requests start to pile up. A target tracking policy on CPU doesn't add servers in time. What should the policy track instead?

- [ ] A lower CPU target of 5%
- [ ] Average disk use on the servers
- [ ] The total number of servers in the group
- [x] `ALBRequestCountPerTarget`, the requests per server from the load balancer

CPU doesn't reflect the load for this application. Requests per server measures the visitors directly, and it's available as a ready-made metric.

- **A:** CPU still wouldn't track requests, and the group would run more servers than it needs when quiet.
- **B:** The disk isn't what's limiting this application.
- **C:** This is the result of scaling, not a measure of load.

Review: [When to grow and when to shrink](#when-to-grow-and-when-to-shrink) in this part, and [Target tracking policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html) in the AWS docs.
:::

::: quiz
An application saves users' uploads on each server's local disk. When the Auto Scaling group removes a server, those files disappear for good. What should the team do?

- [ ] Raise the group's minimum so that it never scales in
- [x] Store uploads in Amazon S3 instead of on the servers
- [ ] Take a snapshot of each server's disk every hour
- [ ] Turn on scale-in protection for all the servers

Any server in a group can disappear at any moment, so nothing important should live on it. In S3, the file is available to every server, whatever happens to any of them.

- **A:** The group loses the savings from scaling in, and a failed server still takes its files with it.
- **C:** You'd have to manage snapshots, and could still lose up to an hour of uploads.
- **D:** This also blocks scaling in, and doesn't protect the files from a failed server.

Review: [The key rule: a server is replaceable](#the-key-rule-a-server-is-replaceable) in this part, and [Make services stateless](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_stateless.html) in the Well-Architected Framework.
:::

::: quiz
A small team has a conventional Python web application. It wants to upload its code and have the load balancer, Auto Scaling group and monitoring set up for it, while still being able to see and change those resources. Which service fits best?

- [ ] Amazon EKS
- [ ] AWS Auto Scaling alone
- [x] AWS Elastic Beanstalk
- [ ] A single EC2 server with User Data

Elastic Beanstalk creates these resources from your code, and they stay visible in your account. The service itself is free, and you pay for what it creates.

- **A:** Kubernetes takes far more to learn and run than this team needs.
- **B:** This scales servers, but you'd still build everything else yourself.
- **D:** A single server has no load balancer, no scaling, and no protection from failures.

Review: [Elastic Beanstalk](#elastic-beanstalk-the-shortcut) in this part, and [What is AWS Elastic Beanstalk?](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html) in the AWS docs.
:::

::: quiz
A team patches its Auto Scaling group's servers by logging in to each one. Over time the servers have drifted apart, and rolling back a bad patch is painful. What solves both?

- [ ] Running the patch commands on all servers at once
- [ ] Taking a snapshot of each server before patching
- [ ] Moving to larger types that need fewer patches
- [x] Building a new image, then using instance refresh with a new launch template

This is immutable infrastructure: nothing changes on a running server. Every server comes from the same tested image, and going back means returning to the previous one.

- **A:** This is faster, but servers still change while running and can still drift apart.
- **B:** This helps bring back one server, and doesn't keep them alike.
- **C:** A server's size has nothing to do with patches.

Review: [The key rule: a server is replaceable](#the-key-rule-a-server-is-replaceable) in this part, and [Use an instance refresh to update instances in an Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html) in the AWS docs.
:::

::: quiz
An application uses an Auto Scaling group, ECS services, DynamoDB tables and Aurora replicas. The team wants to set up scaling for all of them from one place. What fits?

- [x] AWS Auto Scaling, with a scaling plan
- [ ] An Auto Scaling group with a larger maximum
- [ ] Elastic Beanstalk
- [ ] A scheduled policy on the group

A scaling plan can manage the capacity of all these resources in one place.

- **B:** This only scales the group's servers.
- **C:** This sets up and manages an application's environment, and doesn't gather existing services, tables and replicas into one plan.
- **D:** This only changes the group's size, at times you set.

Review: [When to grow and when to shrink](#when-to-grow-and-when-to-shrink) in this part, and [What is a scaling plan?](https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-a-scaling-plan.html) in the AWS docs.
:::

That completes the high availability section. The question left is where the data lives once it's off the server. That's the next section's subject, starting in [**part eight**](/en/posts/aws-08-rds-aurora/) with the managed databases RDS and Aurora.
