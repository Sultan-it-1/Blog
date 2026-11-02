---
title: "Monitoring and Auditing: CloudWatch, CloudTrail and Config"
description: How do you know your application is healthy, who changed what, and whether your settings are still as they should be? Metrics, logs and alarms in CloudWatch, EventBridge, CloudTrail and Config, with a hands-on alarm that emails you.
date: 2026-11-02
series: aws
part: 25
numbered: true
tags: [aws, operations]
---

Over the previous parts we built an application with many pieces. Building it is the easy half. The hard half comes at three in the morning: is it down? Since when? And who changed that setting yesterday?

This last section is about running what you've built, and it starts with three questions, each with its own service:

| The question | The service |
| --- | --- |
| Is it healthy right now? | **CloudWatch** |
| Who did this, and when? | **CloudTrail** |
| Are the settings as they should be, and how have they changed? | **Config** |

And a fourth service reacts to all of them: **EventBridge**.

## CloudWatch metrics

A **metric** is a number measured over time, such as CPU usage or the count of errors. Most AWS services send their metrics by themselves, grouped in **namespaces** and distinguished by **dimensions**, such as the server ID.

| Point | Details |
| --- | --- |
| **EC2 default** | Every 5 minutes, or every minute if you turn on detailed monitoring |
| **Custom metrics** | You send what you like, such as the number of failed orders, down to one-second resolution |
| **History** | One-minute data stays for 15 days, 5-minute data for 63 days, and hourly data for 455 days |
| **Metric Streams** | Sends metrics continuously through Firehose to S3 or another monitoring tool |

::: warning EC2 doesn't report memory
The default metrics come from outside the server, so they don't include **memory** or **disk space**. To get them, install the **CloudWatch agent** on the server. Many people find this out while trying to work out why their server slowed down.
:::

**Dashboards** put the charts you care about on one page, and they can gather metrics across Regions and accounts.

## CloudWatch Logs

Everything your application prints can land here, organized into **log groups** that usually represent one application, and within them **log streams**. Lambda, ECS, API Gateway, [VPC Flow Logs](/en/posts/aws-13-vpc/) and others send logs directly, and on EC2 or on-premises servers you use the same agent.

Logs are kept **forever by default**, and you pay for that. Set a retention period on each group, from one day to ten years.

**Logs Insights** searches through them with a simple query language. This one gets the latest errors:

```text
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

To send logs elsewhere you have two routes:

| Route | Timing | Suits |
| --- | --- | --- |
| **Export to S3** | A batch job, and not immediate | Cheap long-term archiving |
| **Subscription filter** | Near real time | Sending to Lambda, Kinesis or Firehose, such as for [OpenSearch](/en/posts/aws-23-athena-redshift-glue/) |

## CloudWatch alarms

A chart nobody's looking at is no use. An **alarm** watches a metric and does something when it crosses a limit.

<figure class="diagram">
<svg viewBox="0 0 640 170" role="img" aria-labelledby="alarm-caption">
<defs>
<marker id="alarm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="54" width="140" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="80" text-anchor="middle" class="d-label">Metric</text>
<text x="90" y="100" text-anchor="middle" class="d-small">CPU, errors</text>
<rect x="230" y="54" width="140" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="300" y="80" text-anchor="middle" class="d-label">Alarm</text>
<text x="300" y="100" text-anchor="middle" class="d-small">Above 80%?</text>
<rect x="470" y="12" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="39" text-anchor="middle" class="d-label">SNS</text>
<rect x="470" y="63" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="90" text-anchor="middle" class="d-label">Auto Scaling</text>
<rect x="470" y="114" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="141" text-anchor="middle" class="d-label">EC2 action</text>
<line x1="160" y1="85" x2="228" y2="85" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
<line x1="370" y1="85" x2="468" y2="34" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
<line x1="370" y1="85" x2="468" y2="85" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
<line x1="370" y1="85" x2="468" y2="136" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alarm-arrow)"/>
</svg>
<figcaption id="alarm-caption">An alarm watches a metric, and when it crosses the limit, it notifies someone, adds capacity or acts on the server.</figcaption>
</figure>

An alarm is in one of three states: `OK`, `ALARM` or `INSUFFICIENT_DATA`. Some useful additions:

- **EC2 actions:** stop, reboot, terminate or **recover**. Recovery moves the server to new hardware if the underlying host fails, keeping its IP addresses and settings.
- **Composite alarms:** one alarm for "high CPU **and** many errors", which reduces false alerts.
- **Testing:** `set-alarm-state` puts an alarm in any state, so you can check the alert path without breaking anything. We'll try it in the hands-on.

### Ready-made insights

| Tool | What it shows |
| --- | --- |
| **Container Insights** | Metrics and logs from ECS and EKS |
| **Lambda Insights** | Function performance, including memory and cold starts |
| **Contributor Insights** | Top contributors, such as the IP addresses sending the most requests |
| **Application Insights** | Sets up monitoring for a whole application and points out likely problems |

## EventBridge: reacting to events

Almost everything that happens in AWS is an **event**: a server changed state, a bucket was created, or an alarm went off. **EventBridge** receives these events on a **bus**, and **rules** send matching ones to a target.

<figure class="diagram">
<svg viewBox="0 0 640 214" role="img" aria-labelledby="eventbridge-caption">
<defs>
<marker id="eventbridge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="140" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="44" text-anchor="middle" class="d-label">AWS services</text>
<rect x="20" y="80" width="140" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="110" text-anchor="middle" class="d-label">Your apps</text>
<rect x="20" y="146" width="140" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="176" text-anchor="middle" class="d-label">A schedule</text>
<rect x="230" y="46" width="170" height="118" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="315" y="100" text-anchor="middle" class="d-label">Event bus</text>
<text x="315" y="120" text-anchor="middle" class="d-small">Rules filter events</text>
<rect x="470" y="14" width="150" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="44" text-anchor="middle" class="d-label">Lambda</text>
<rect x="470" y="80" width="150" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="110" text-anchor="middle" class="d-label">SQS</text>
<rect x="470" y="146" width="150" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="176" text-anchor="middle" class="d-label">Step Functions</text>
<line x1="160" y1="39" x2="228" y2="80" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="160" y1="105" x2="228" y2="105" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="160" y1="171" x2="228" y2="130" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="400" y1="80" x2="468" y2="39" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="400" y1="105" x2="468" y2="105" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
<line x1="400" y1="130" x2="468" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#eventbridge-arrow)"/>
</svg>
<figcaption id="eventbridge-caption">Events arrive on a bus from anywhere, and rules send each one that matches to the service that handles it.</figcaption>
</figure>

| Use | Example |
| --- | --- |
| **Reacting to a change** | A server stopped, so notify the team |
| **A schedule** | Run a function every night; **EventBridge Scheduler** is the service for this now |
| **Connecting your services** | The orders service publishes an event, and whoever's interested takes it |
| **Partner events** | Events arriving from SaaS applications on a partner bus |

Features worth knowing: **archive and replay** to send old events again, the **schema registry** that describes the shape of events, and **resource policies** so that another account can send to your bus.

For most targets, such as Lambda, SQS and SNS, access is granted by a resource policy on the target. For others, such as starting an ECS task, EventBridge uses an IAM role.

## CloudTrail: who did what

Every call to AWS, from the console, the CLI or a service, gets recorded by **CloudTrail**: who, what, when, and from where. It's on by default, and it's the first place to look when something changes mysteriously or disappears.

| Event type | What it covers | Default |
| --- | --- | --- |
| **Management events** | Changes to resources, such as creating a server or changing a policy | On, with 90 days free in Event history |
| **Data events** | Operations inside resources, such as reading from S3 or invoking Lambda | Off, because of their volume |
| **Insights events** | Unusual activity, such as a sudden burst of delete calls | Off, at additional cost |

To keep them longer than 90 days, create a **trail** that writes to S3, across all Regions and even the whole organization, and analyze it with [Athena](/en/posts/aws-23-athena-redshift-glue/). Note that **CloudTrail Lake** closed to new customers in 2026, so a trail is the way to go.

A powerful pattern combines it with EventBridge: anyone deleting a table, or a sign-in with the root user, immediately triggers an alert. CloudTrail records it, EventBridge matches it, and SNS tells you.

## AWS Config: your settings over time

CloudTrail tells you who called what. **Config** tells you what a resource looks like: it records the configuration of your resources and every change to it, so you can ask what a security group looked like last Tuesday.

**Config rules** then judge these settings:

- **Rules:** managed ones ready to use, such as "no public S3 buckets", or custom ones.
- **Prevention:** it doesn't stop anything. It marks a resource as non-compliant, and that's it.
- **Remediation:** a rule can run a Systems Manager Automation document to fix the problem automatically.
- **Notifications:** through EventBridge or SNS.
- **Scope and cost:** it works per Region, and you pay per recorded item and per rule evaluation.

## X-Ray: following one request

A request in a modern application can pass through an API, three functions and a database. Metrics tell you something is slow, and **AWS X-Ray** tells you where. It collects **traces** of each request as it passes through your services, including its calls to databases and other APIs, and shows you which step is slow or failing.

## Other views

| Tool | What it shows |
| --- | --- |
| **AWS Health Dashboard** | Whether AWS itself has a problem affecting your services and resources, with no setup and at no cost |
| **Managed Grafana** | Dashboards for metrics, logs and traces from several sources, using the popular Grafana tool |
| **Managed Service for Prometheus** | Container metrics through the open-source Prometheus tools, with no servers to run |

## Which one, when?

Let's take one load balancer:

| | Example |
| --- | --- |
| **CloudWatch** | Number of requests, 5xx errors, and a dashboard or an alarm on them |
| **CloudTrail** | Who changed its listener rules, and when |
| **Config** | Its current security group, its certificate, and how they've changed; and is it following your rules? |

## Hands-on: an alarm that emails you

We'll watch a made-up metric for failed orders. From CloudShell, replace the email address with yours:

```bash
EMAIL=you@example.com

TOPIC_ARN=$(aws sns create-topic --name series-alerts \
  --query TopicArn --output text)

aws sns subscribe --topic-arn $TOPIC_ARN \
  --protocol email --notification-endpoint $EMAIL
```

Open your email and press **Confirm subscription**. Then create an alarm that goes off if more than five orders fail in a minute:

```bash
aws cloudwatch put-metric-alarm --alarm-name series-failed-orders \
  --namespace Series/Shop --metric-name FailedOrders \
  --statistic Sum --period 60 --evaluation-periods 1 \
  --threshold 5 --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions $TOPIC_ARN
```

Now send the application's reading, as if 12 orders had just failed:

```bash
aws cloudwatch put-metric-data --namespace Series/Shop \
  --metric-name FailedOrders --value 12
```

Wait two or three minutes and check the alarm's state. An email should arrive at the same time:

```bash
aws cloudwatch describe-alarms --alarm-names series-failed-orders \
  --query "MetricAlarms[0].[StateValue,StateReason]" --output text
```

You don't have to break anything to test an alert path. Try it when the alarm has gone back to `OK`, and another email arrives:

```bash
aws cloudwatch set-alarm-state --alarm-name series-failed-orders \
  --state-value ALARM --state-reason "Testing the alert"
```

Finally, play detective. Who created this alarm? CloudTrail knows, though events can take a few minutes to appear:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutMetricAlarm \
  --max-results 1 \
  --query "Events[0].[EventName,Username,EventTime]" --output text
```

::: security Delete after experimenting
This stays within the free tier or costs next to nothing. The custom metric expires by itself:
:::

```bash
aws cloudwatch delete-alarms --alarm-names series-failed-orders
aws sns delete-topic --topic-arn $TOPIC_ARN
```

## Summary

- **CloudWatch** for metrics, logs and alarms, and memory needs the agent.
- Set a **retention period** on your logs, because they're kept forever by default.
- **EventBridge** routes events to whoever handles them, and runs things on a schedule.
- **CloudTrail** records who did what, and **Config** records the settings and judges them.
- Test your **alert path** before you need it.

## Test yourself

::: quiz
A team wants an alarm when memory on its EC2 servers passes 90%, but it can't find a memory metric in CloudWatch. What should it do?

- [ ] Turn on detailed monitoring
- [x] Install the CloudWatch agent on the servers
- [ ] Create a CloudTrail trail
- [ ] Turn on AWS Config

The default metrics come from outside the server, so they don't include memory. The agent sends it from inside, and then you can put an alarm on it.

- **A:** This sends the same metrics more often, and memory still isn't among them.
- **C:** This records who called what, not how a server is performing.
- **D:** This records resource settings, not what's happening inside a server.

Review: [CloudWatch metrics](#cloudwatch-metrics) in this part, and [Metrics collected by the CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html) in the AWS docs.
:::

::: quiz
An outage began right after someone changed a security group last night. The team wants to know who made the change, and from where. Where should it look first?

- [ ] CloudWatch metrics
- [ ] VPC Flow Logs
- [ ] CloudWatch Logs Insights
- [x] CloudTrail Event history

CloudTrail records who called what, when and from where. Management events like this one stay there for 90 days, with nothing to set up.

- **A:** These show numbers over time, not who did anything.
- **B:** These show the traffic that was accepted or rejected, not who changed a rule.
- **C:** This searches logs your applications send, not the calls made to AWS.

Review: [CloudTrail: who did what](#cloudtrail-who-did-what) in this part, and [Working with CloudTrail event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html) in the AWS docs.
:::

::: quiz
A company wants to notice when any S3 bucket becomes public, and to fix it automatically. What fits?

- [x] A Config rule, with automatic remediation
- [ ] A CloudWatch alarm on the bucket's size
- [ ] CloudTrail Insights events
- [ ] A Logs Insights query

A Config rule judges each bucket's settings and marks it as non-compliant, and a remediation can run a Systems Manager Automation document to fix it. On its own, a rule prevents nothing.

- **B:** Size says nothing about who can reach the bucket.
- **C:** This spots unusual activity, and doesn't judge or fix settings.
- **D:** This searches logs when you ask, and fixes nothing.

Review: [AWS Config: your settings over time](#aws-config-your-settings-over-time) in this part, and [Remediating Noncompliant Resources with AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/remediation.html) in the AWS docs.
:::

::: quiz
The security team wants an immediate alert whenever someone deletes a DynamoDB table or signs in with the root user. What fits?

- [ ] A weekly Athena query over the CloudTrail logs
- [ ] A CloudWatch dashboard
- [x] An EventBridge rule matching those CloudTrail events, with an SNS target
- [ ] A Config rule on each table

CloudTrail records the call, EventBridge matches it, and SNS tells you right away.

- **A:** This finds them eventually, which could be days too late.
- **B:** A dashboard nobody's looking at alerts nobody.
- **D:** This judges settings, and doesn't react to a deleted table or a sign-in.

Review: [CloudTrail: who did what](#cloudtrail-who-did-what) in this part, and [AWS service events delivered via AWS CloudTrail](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html) in the AWS docs.
:::

::: quiz
A team's CloudWatch Logs bill keeps growing because old logs are never removed, and another system must receive error lines within seconds. Which **two** changes fit? (Choose two.)

- [x] Set a retention period on the log groups
- [ ] Export the logs to S3 every night
- [ ] Turn on detailed monitoring
- [x] Add a subscription filter that sends error lines to Lambda
- [ ] Turn on CloudTrail data events

Logs are kept forever by default, so a retention period removes the old ones. A subscription filter delivers matching lines in near real time.

- **B:** This is a batch job that isn't immediate, and the originals stay and keep costing money.
- **C:** This sends EC2 metrics more often, and has nothing to do with logs.
- **E:** This records operations inside resources, and has nothing to do with your log bill or error lines.

Review: [CloudWatch Logs](#cloudwatch-logs) in this part, and [Working with log groups and log streams](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html) and [Real-time processing of log data with subscriptions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Subscriptions.html) in the AWS docs.
:::

You now know what's happening in one account. But companies have dozens of accounts and hundreds of employees. In [**part twenty-six**](/en/posts/aws-26-organizations-identity-center/) we manage them with Organizations and Identity Center.
