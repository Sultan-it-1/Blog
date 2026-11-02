---
title: "Connecting Services: SQS, SNS and Kinesis"
description: Why services should not call each other directly, how an SQS queue absorbs load, how SNS sends one message to many, when you need a Kinesis stream, and a hands-on where you build a fan-out with a filter.
date: 2026-11-02
series: aws
part: 19
numbered: true
tags: [aws, messaging]
---

So far the pieces of our application [call each other directly](/en/posts/aws-07-auto-scaling/). That's fine until a sale starts and the invoice service can't keep up, and suddenly the customer is staring at a spinner because of a service they've never heard of.

This section is about modern applications, and it starts with the idea behind most of them: **separate the services**, so that each one works at its own pace and a failure in one doesn't bring down the others.

Here's a map of this part:

| You want | Use |
| --- | --- |
| A job taken by one worker, with nothing lost | **SQS** |
| One event reaching many parties at once | **SNS** |
| A continuous stream that several parties read and replay | **Kinesis Data Streams** |
| A stream loaded into S3 or similar without writing code | **Data Firehose** |
| An existing application built on RabbitMQ or ActiveMQ | **Amazon MQ** |

## Why separate services?

<figure class="diagram">
<svg viewBox="0 0 640 212" role="img" aria-labelledby="decouple-caption">
<defs>
<marker id="decouple-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="320" y="22" text-anchor="middle" class="d-small">Direct call: the customer waits for the invoice service</text>
<rect x="20" y="34" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="105" y="68" text-anchor="middle" class="d-label">Store app</text>
<rect x="450" y="34" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="535" y="58" text-anchor="middle" class="d-label">Invoice service</text>
<text x="535" y="78" text-anchor="middle" class="d-small">Slow or down</text>
<line x1="190" y1="63" x2="448" y2="63" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#decouple-arrow)"/>
<text x="320" y="130" text-anchor="middle" class="d-small">With a queue: the customer gets a response right away</text>
<rect x="20" y="142" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="105" y="176" text-anchor="middle" class="d-label">Store app</text>
<rect x="235" y="142" width="170" height="58" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="166" text-anchor="middle" class="d-label">SQS queue</text>
<text x="320" y="186" text-anchor="middle" class="d-small">Holds the message</text>
<rect x="450" y="142" width="170" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="535" y="166" text-anchor="middle" class="d-label">Invoice service</text>
<text x="535" y="186" text-anchor="middle" class="d-small">At its own pace</text>
<line x1="190" y1="171" x2="233" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#decouple-arrow)"/>
<line x1="405" y1="171" x2="448" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#decouple-arrow)"/>
</svg>
<figcaption id="decouple-caption">When services call each other directly, one slow service holds up the customer. A queue lets each side work at its own pace.</figcaption>
</figure>

A direct call means both sides must be up, and fast, at the same moment. With a queue in between you get three things:

- **Failures stay contained.** If the invoice service stops, messages wait in the queue until it comes back.
- **Peaks are absorbed.** A thousand orders in a minute don't reach the database all at once.
- **Each side scales alone.** You add invoice workers without touching the store.

## SQS: the queue

**SQS** (Simple Queue Service) is a fully managed queue with no servers to run. A **producer** sends messages, they wait in the queue, and a **consumer** pulls them, works on them, then deletes them.

Note the direction: consumers ask the queue for messages. The queue doesn't push them to anyone.

| Feature | Value |
| --- | --- |
| **Throughput** | No practical limit on a standard queue |
| **Message size** | Up to 1 MiB |
| **Retention** | 4 days by default, from one minute to 14 days |
| **Delivery** | At least once, so a message can arrive twice |
| **Order** | Best effort, not guaranteed |

The last two points affect your code. Since a message can arrive twice, make processing it twice harmless. An order number you check before charging is enough.

For anything larger than a message, store the file in S3 and send its path in the message.

### Visibility timeout

What stops two consumers taking the same message? When one receives it, SQS hides it from the others for a period, called the **visibility timeout**. The consumer must delete it before that period ends.

<figure class="diagram">
<svg viewBox="0 0 640 154" role="img" aria-labelledby="visibility-caption">
<defs>
<marker id="visibility-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="49" width="150" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="95" y="72" text-anchor="middle" class="d-label">Received</text>
<text x="95" y="92" text-anchor="middle" class="d-small">Hidden from others</text>
<rect x="245" y="49" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="72" text-anchor="middle" class="d-label">Processing</text>
<text x="320" y="92" text-anchor="middle" class="d-small">30 seconds by default</text>
<rect x="470" y="14" width="150" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="545" y="37" text-anchor="middle" class="d-label">Deleted</text>
<text x="545" y="57" text-anchor="middle" class="d-small">The job is done</text>
<rect x="470" y="84" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="545" y="107" text-anchor="middle" class="d-label">Not deleted</text>
<text x="545" y="127" text-anchor="middle" class="d-small">Appears again</text>
<line x1="170" y1="77" x2="243" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#visibility-arrow)"/>
<line x1="395" y1="77" x2="468" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#visibility-arrow)"/>
<line x1="395" y1="77" x2="468" y2="112" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#visibility-arrow)"/>
</svg>
<figcaption id="visibility-caption">A received message is hidden, not removed. If the consumer doesn't delete it before the timeout ends, it appears again for another consumer.</figcaption>
</figure>

This is the mechanism that keeps you from losing work: if the server crashes halfway through, the message comes back by itself.

Choose the period to suit your processing time. It's 30 seconds by default, and it can go up to 12 hours:

- **Too short:** the message appears again while it's still being worked on, and it gets processed twice.
- **Too long:** if a consumer fails, the message waits a long time before anyone retries it.

If a job takes longer than usual, the consumer can extend the period for that message with `ChangeMessageVisibility`.

### Long polling

By default, asking an empty queue returns an empty response right away, so your consumers fill your bill with pointless requests. With **long polling**, the request waits up to 20 seconds for a message. That means fewer requests, a lower cost and faster delivery, so always turn it on.

### Dead-letter queues

What about a message that always fails, because of a bug or bad data? It will come back forever. Attach a **dead-letter queue (DLQ)**: after a number of failed attempts you choose, the message moves there, so you can inspect it without it blocking anything. Then you can **redrive** it to the original queue once you've fixed the problem.

Keep the retention in the dead-letter queue longer than the original, so messages don't expire before you see them.

### FIFO queues

When order matters, as with transactions on one account, use a **FIFO** queue. Its name must end in `.fifo`.

| | Standard | FIFO |
| --- | --- | --- |
| **Order** | Not guaranteed | Guaranteed within a message group |
| **Duplicates** | Possible | Removed within a 5-minute window |
| **Throughput** | No practical limit | 300 messages per second, or 3,000 with batching |

The order is per **message group**, so with one group for each customer, different customers' messages can be processed in parallel. If you need more throughput, **high throughput mode** raises the limit by far, and the figure varies by Region.

### Scaling with the queue

A classic pattern: an [Auto Scaling group](/en/posts/aws-07-auto-scaling/) of workers grows and shrinks according to the queue's length. The `ApproximateNumberOfMessagesVisible` metric tells you how many messages are waiting, so a growing queue adds workers.

It also protects your database. Instead of a spike of orders hitting RDS directly, they go into a queue, and workers write them at a pace the database can handle. This only suits work that doesn't need an immediate answer, so the customer is told "we received your order", not "your order is complete".

### Security

Messages are encrypted in transit over HTTPS, and at rest with SSE-SQS by default, or with your own KMS key. Who can reach the queue is decided by IAM policies, plus an **access policy** on the queue itself, which you need for other accounts or for services like SNS and S3 to send to it. We'll write one in the hands-on.

## SNS: one message to many

A queue suits a job that one party does. But when a customer places an order, the shipping, invoicing and analytics services all want to know. You don't want your application to know about each of them, and to change every time you add one.

**SNS** (Simple Notification Service) works by **publishing and subscribing**: your application publishes one message to a **topic**, and SNS delivers it to every subscriber, right away. A standard topic can have up to 12.5 million subscriptions.

| Subscriber type | Example |
| --- | --- |
| **SQS** | A service that processes at its own pace |
| **Lambda** | A small function that runs per message |
| **HTTP or HTTPS** | A webhook in another system |
| **Data Firehose** | Storing every message in S3 |
| **Email, SMS, mobile push** | Notifying people directly |

Unlike a queue, SNS doesn't store messages. If a subscriber is down it retries for a while, but it's not somewhere messages wait.

Message size is 256 KiB by default, and you can raise it on a topic up to 1 MiB, though this limits the topic to 100 subscriptions and to SQS, Lambda and Firehose subscribers only.

### Fan-out: SNS with SQS

The most important pattern here combines the two services: SNS spreads the message, and a queue for each service keeps it until that service is ready.

<figure class="diagram">
<svg viewBox="0 0 640 246" role="img" aria-labelledby="fanout-caption">
<defs>
<marker id="fanout-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="93" width="130" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="85" y="118" text-anchor="middle" class="d-label">Store app</text>
<text x="85" y="138" text-anchor="middle" class="d-small">Publishes once</text>
<rect x="200" y="93" width="130" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="265" y="118" text-anchor="middle" class="d-label">SNS topic</text>
<text x="265" y="138" text-anchor="middle" class="d-code">orders</text>
<rect x="380" y="14" width="120" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="440" y="39" text-anchor="middle" class="d-label">Shipping</text>
<text x="440" y="59" text-anchor="middle" class="d-small">Physical only</text>
<rect x="380" y="93" width="120" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="440" y="118" text-anchor="middle" class="d-label">Invoices</text>
<text x="440" y="138" text-anchor="middle" class="d-small">All orders</text>
<rect x="380" y="172" width="120" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="440" y="197" text-anchor="middle" class="d-label">Analytics</text>
<text x="440" y="217" text-anchor="middle" class="d-small">All orders</text>
<rect x="530" y="14" width="90" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="575" y="49" text-anchor="middle" class="d-label">EC2</text>
<rect x="530" y="93" width="90" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="575" y="128" text-anchor="middle" class="d-label">Lambda</text>
<rect x="530" y="172" width="90" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="575" y="207" text-anchor="middle" class="d-label">Fargate</text>
<line x1="150" y1="123" x2="198" y2="123" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="330" y1="123" x2="378" y2="44" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="330" y1="123" x2="378" y2="123" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="330" y1="123" x2="378" y2="202" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="500" y1="44" x2="528" y2="44" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="500" y1="123" x2="528" y2="123" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
<line x1="500" y1="202" x2="528" y2="202" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#fanout-arrow)"/>
</svg>
<figcaption id="fanout-caption">The app publishes once, SNS copies the message to every queue, and each service reads from its own queue. The filter sends only physical orders to shipping.</figcaption>
</figure>

Why this combination?

- **Nothing is lost:** if the shipping service stops, its messages wait in its queue.
- **Each service has its own pace,** retries and dead-letter queue.
- **Adding a service is easy:** a new queue subscribes to the topic, with no change to the publisher.

The same goes for [S3 events](/en/posts/aws-15-s3-basics/): S3 doesn't accept two rules with overlapping prefixes for the same event type. So to reach several destinations, send the event to one SNS topic and fan it out from there.

### Filtering messages

By default every subscriber receives everything. A **filter policy** on the subscription lets the shipping queue receive only what concerns it:

```json
{ "type": ["physical"] }
```

Messages with `type` set to `digital` won't reach it, and you don't pay to process them.

### FIFO topics

For order across a fan-out, SNS has **FIFO** topics, whose names also end in `.fifo`, with order and duplicate removal like FIFO queues. These are limited to 100 subscriptions per topic, and they suit cases like sending the same sequence of updates to several queues.

## Kinesis Data Streams: a stream that stays

Imagine a million sensors sending readings every second, and three parties who want to read them: one for instant alerts, one for dashboards, and one for archiving. A queue doesn't suit this, because a message is gone once it's processed.

**Kinesis Data Streams** is a stream: records stay in it for the retention period, whether they've been read or not, and each consumer reads from its own position, so it can go back and **replay** them.

<figure class="diagram">
<svg viewBox="0 0 640 232" role="img" aria-labelledby="kinesis-caption">
<defs>
<marker id="kinesis-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="24" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="54" text-anchor="middle" class="d-label">App</text>
<rect x="20" y="91" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="121" text-anchor="middle" class="d-label">Sensors</text>
<rect x="20" y="158" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="188" text-anchor="middle" class="d-label">Logs</text>
<rect x="180" y="14" width="280" height="204" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="320" y="38" text-anchor="middle" class="d-label">Kinesis Data Stream</text>
<rect x="200" y="50" width="240" height="40" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="75" text-anchor="middle" class="d-label">Shard 1</text>
<rect x="200" y="98" width="240" height="40" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="123" text-anchor="middle" class="d-label">Shard 2</text>
<rect x="200" y="146" width="240" height="40" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="171" text-anchor="middle" class="d-label">Shard 3</text>
<text x="320" y="206" text-anchor="middle" class="d-small">Kept from 24 hours to 365 days</text>
<rect x="510" y="24" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="54" text-anchor="middle" class="d-label">Lambda</text>
<rect x="510" y="91" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="121" text-anchor="middle" class="d-label">Your app</text>
<rect x="510" y="158" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="188" text-anchor="middle" class="d-label">Firehose</text>
<line x1="130" y1="49" x2="178" y2="70" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="130" y1="116" x2="178" y2="116" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="130" y1="183" x2="178" y2="162" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="460" y1="70" x2="508" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="460" y1="116" x2="508" y2="116" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
<line x1="460" y1="162" x2="508" y2="183" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#kinesis-arrow)"/>
</svg>
<figcaption id="kinesis-caption">Producers write to shards, records with the same key stay in order inside one shard, and several consumers read the same data, each at its own position.</figcaption>
</figure>

- **Shards:** the stream is split into shards. With provisioned capacity, each one takes 1 MB per second of writes and 2 MB per second of reads.
- **Partition key:** decides which shard a record goes to. Records with the same key stay in order, so a sensor's number works well as a key.
- **Retention:** 24 hours by default, up to 365 days.
- **Record size:** 1 MiB by default, and you can raise it up to 10 MiB per stream.

### Capacity modes

| Mode | How it works | When |
| --- | --- | --- |
| **On-demand** | Starts at 4 MB per second of writes and scales by itself, and you pay for the data | Unknown or changing load; start here |
| **Provisioned** | You set the number of shards and pay for each per hour | Steady, known load, which can be cheaper |

The ceiling for on-demand depends on the Region: up to 10 GB per second of writes in the largest Regions, and 200 MB per second in others.

Video has its own service: **Kinesis Video Streams** takes live video from devices such as cameras, stores it, and lets you watch it or process it, live or later.

## Data Firehose: to storage with no code

Very often all you want is for the stream to land somewhere. **Amazon Data Firehose** (formerly Kinesis Data Firehose) takes data, collects it, and delivers it with no code or servers:

- **Sources:** your application directly, a Kinesis stream, or others like SNS and CloudWatch Logs.
- **Processing:** optionally transforms records with a Lambda function, and can convert them to Parquet.
- **Destinations:** S3, Redshift, OpenSearch, Snowflake, Apache Iceberg tables, or an HTTP endpoint.
- **Buffering:** it collects data until it reaches a size or a period, such as 5 MiB or 5 minutes for S3, and whichever comes first triggers delivery. So it suits near-real-time loading, not an instant reaction.

| | Kinesis Data Streams | Data Firehose |
| --- | --- | --- |
| **Purpose** | A stream your consumers read | A pipe that delivers to storage |
| **Consumers** | You write them | The destination is managed for you |
| **Replay** | Yes, within the retention period | No |
| **Timing** | Immediate | Depends on the buffering you set |

## Which one do I choose?

| | SQS | SNS | Kinesis Data Streams |
| --- | --- | --- | --- |
| **Model** | Consumers pull | Pushes to subscribers | Consumers pull |
| **Readers of a message** | One, then it's deleted | Every subscriber | Everyone, within the retention period |
| **Stored?** | Up to 14 days | No | Up to 365 days |
| **Order** | With FIFO | With FIFO | Within a shard |
| **Typical use** | Background jobs | Notifications and fan-out | Analytics, logs and streaming data |

A quick rule: a **job**? SQS. An **event** many want to know about? SNS. A **stream of data** many read and replay? Kinesis.

There's also **EventBridge**, which routes events by rules from AWS services and other applications, and we'll cover it in [part twenty-five](/en/posts/aws-25-monitoring-auditing/).

## Amazon MQ: for what already exists

SQS and SNS are AWS's own services with their own APIs. If you're moving an application built on open protocols such as **AMQP**, **MQTT** or **STOMP**, you won't want to rewrite it. **Amazon MQ** runs a familiar broker as a managed service, in two engines:

| Engine | High availability |
| --- | --- |
| **ActiveMQ** | Two brokers in two Availability Zones, active and standby, with shared storage on EFS |
| **RabbitMQ** | A cluster of three nodes across Availability Zones, behind one endpoint |

Note that it runs on brokers you choose the size of, so it doesn't scale without limit like SQS and SNS. For a new application, start with those two.

## Hands-on: a fan-out with a filter

We'll build the design from the diagram with two queues. From CloudShell, create the topic and the queues:

```bash
TOPIC_ARN=$(aws sns create-topic --name orders \
  --query TopicArn --output text)

SHIP_URL=$(aws sqs create-queue --queue-name shipping \
  --query QueueUrl --output text)
BILL_URL=$(aws sqs create-queue --queue-name billing \
  --query QueueUrl --output text)

SHIP_ARN=$(aws sqs get-queue-attributes --queue-url $SHIP_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)
BILL_ARN=$(aws sqs get-queue-attributes --queue-url $BILL_URL \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)
```

Queues are private, so allow only this topic to send to them:

```bash
allow_topic() {
  POLICY=$(jq -nc --arg q "$2" --arg t "$TOPIC_ARN" '{
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: {Service: "sns.amazonaws.com"},
      Action: "sqs:SendMessage",
      Resource: $q,
      Condition: {ArnEquals: {"aws:SourceArn": $t}}
    }]
  }')
  aws sqs set-queue-attributes --queue-url "$1" \
    --attributes "$(jq -nc --arg p "$POLICY" '{Policy: $p}')"
}

allow_topic $SHIP_URL $SHIP_ARN
allow_topic $BILL_URL $BILL_ARN
```

Subscribe the queues to the topic: billing gets everything, and shipping gets physical orders only:

```bash
aws sns subscribe --topic-arn $TOPIC_ARN \
  --protocol sqs --notification-endpoint $BILL_ARN \
  --attributes RawMessageDelivery=true

aws sns subscribe --topic-arn $TOPIC_ARN \
  --protocol sqs --notification-endpoint $SHIP_ARN \
  --attributes '{"RawMessageDelivery":"true","FilterPolicy":"{\"type\":[\"physical\"]}"}'
```

Publish two orders, one physical and one digital:

```bash
aws sns publish --topic-arn $TOPIC_ARN --message "order 1: a book" \
  --message-attributes '{"type":{"DataType":"String","StringValue":"physical"}}'

aws sns publish --topic-arn $TOPIC_ARN --message "order 2: an e-book" \
  --message-attributes '{"type":{"DataType":"String","StringValue":"digital"}}'
```

Give it a few seconds, then count the messages in each queue:

```bash
for url in $BILL_URL $SHIP_URL; do
  aws sqs get-queue-attributes --queue-url $url \
    --attribute-names ApproximateNumberOfMessages \
    --query Attributes.ApproximateNumberOfMessages --output text
done
```

You'll see `2` for billing and `1` for shipping, so the filter worked. Now try the visibility timeout. Receive the shipping message, then try again straight away:

```bash
aws sqs receive-message --queue-url $SHIP_URL --wait-time-seconds 5 \
  --query "Messages[0].Body" --output text

aws sqs receive-message --queue-url $SHIP_URL --wait-time-seconds 5 \
  --query "Messages[0].Body" --output text
```

The first prints `order 1: a book`, and the second waits five seconds and prints `None`, because the message is hidden. We didn't delete it, so wait 30 seconds and receive it again, this time deleting it to finish the job:

```bash
HANDLE=$(aws sqs receive-message --queue-url $SHIP_URL --wait-time-seconds 20 \
  --query "Messages[0].ReceiptHandle" --output text)

aws sqs delete-message --queue-url $SHIP_URL --receipt-handle "$HANDLE"
```

Now the message is gone for good.

::: security Delete after experimenting
This experiment costs practically nothing, but clean up anyway. Deleting a topic also deletes its subscriptions:
:::

```bash
aws sns delete-topic --topic-arn $TOPIC_ARN
aws sqs delete-queue --queue-url $SHIP_URL
aws sqs delete-queue --queue-url $BILL_URL
```

## Summary

- **Separating services** contains failures, absorbs peaks and lets each side scale alone.
- **SQS** is a queue: a message goes to one consumer, who must delete it before the visibility timeout ends.
- Always add **long polling** and a **dead-letter queue**, and make processing safe to repeat.
- **SNS** delivers one message to many, and **fan-out** with SQS guarantees none of them miss it.
- **Kinesis Data Streams** keeps data for several readers to replay, and **Firehose** delivers it to storage without code.

## Test yourself

::: quiz
A ticket site's order page writes straight to RDS. When a big concert goes on sale, the database overloads and orders fail. Customers can accept seeing "we received your order", with the confirmation following a minute later. What absorbs the peak?

- [ ] A read replica for the database
- [x] An SQS queue, with workers writing at a pace the database can handle
- [ ] An SNS topic that pushes each order to the database
- [ ] Multi-AZ on the database

The queue holds the orders, and workers write them at a pace the database can handle. It suits this case because the customer doesn't need the final answer immediately.

- **A:** Replicas serve reads, and the overload here comes from writes.
- **C:** SNS delivers right away and doesn't store messages, so the peak would still arrive all at once.
- **D:** The standby takes no load, so the overload stays.

Review: [Scaling with the queue](#scaling-with-the-queue) in this part, and [What is Amazon Simple Queue Service?](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) in the AWS docs.
:::

::: quiz
A worker takes about two minutes to produce each invoice, and the queue's visibility timeout is still at its default. Customers are receiving the same invoice several times. What should the team change?

- [x] Raise the visibility timeout above the processing time
- [ ] Turn on long polling
- [ ] Attach a dead-letter queue
- [ ] Add more workers

After 30 seconds the message reappears while the first worker is still on it, so another worker takes it too. The timeout has to be longer than the work.

- **B:** This cuts empty responses, and doesn't change when a message reappears.
- **C:** This catches messages that keep failing, and these ones are succeeding, repeatedly.
- **D:** More workers would only pick up the reappearing messages faster.

Review: [Visibility timeout](#visibility-timeout) in this part, and [Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) in the AWS docs.
:::

::: quiz
When an order is placed, the shipping, billing and analytics services all need to know. Any of them may be down for hours, and adding a new service shouldn't mean changing the publisher. What fits?

- [ ] One SQS queue that all three services read from
- [ ] The publisher sending directly to a queue for each service
- [ ] An SNS topic with an HTTP subscriber for each service
- [x] An SNS topic, with an SQS queue for each service subscribed to it

SNS delivers one message to every subscriber, and each service's queue holds it until that service is ready. A new service simply subscribes a new queue.

- **A:** Each message goes to only one consumer, so the other services would miss it.
- **B:** The publisher would need changing with every new service.
- **C:** SNS only retries for a while and doesn't store messages, so a long outage could lose them.

Review: [Fan-out: SNS with SQS](#fan-out-sns-with-sqs) in this part, and [What is Amazon SNS?](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) in the AWS docs.
:::

::: quiz
A wind farm's sensors send readings every second. Three separate applications read the same data in real time, and after fixing a bug, one of them must re-read the last three days. Which option fits?

- [ ] An SQS standard queue
- [ ] An SNS standard topic
- [x] Kinesis Data Streams, with its retention raised to at least three days
- [ ] Data Firehose, delivering to S3

Records stay in the stream for the retention period whether they've been read or not, and each consumer reads from its own position, so one can go back without disturbing the others. The default retention is only 24 hours.

- **A:** A message goes to one consumer, and it's gone once deleted.
- **B:** SNS doesn't store messages, so there's nothing to re-read.
- **D:** This buffers data and delivers it to storage, so it offers neither instant reads nor replay.

Review: [Kinesis Data Streams: a stream that stays](#kinesis-data-streams-a-stream-that-stays) in this part, and [Change the data retention period](https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html) in the AWS docs.
:::

::: quiz
A bank processes transactions through a queue. Within each account they must run in order with duplicates removed, while different accounts should be processed in parallel. Which **two** choices fit? (Choose two.)

- [ ] A standard queue
- [x] A FIFO queue
- [ ] One message group for all accounts
- [x] A message group for each account
- [ ] A longer visibility timeout

A FIFO queue keeps order within a message group and removes duplicates within a 5-minute window, and a group for each account lets different accounts run in parallel.

- **A:** This doesn't guarantee order, and a message can arrive twice.
- **C:** This forces every transaction into one line, so nothing runs in parallel.
- **E:** This gives workers more time, and has no effect on order.

Review: [FIFO queues](#fifo-queues) in this part, and [FIFO queue delivery logic in Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html) in the AWS docs.
:::

The services are now separated, but where does the code itself run? So far our answer has been an EC2 server, with all the setup that entails. In [**part twenty**](/en/posts/aws-20-ecs-fargate-eks/) we package applications in containers and run them with ECS, Fargate and EKS.
