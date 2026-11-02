---
title: "Serverless: Lambda, API Gateway and DynamoDB"
description: Run code without servers and pay only when it runs. How Lambda works and what limits it, cold starts, DynamoDB tables and their keys, API Gateway as the front door, and a hands-on where you build a working API.
date: 2026-11-02
series: aws
part: 21
numbered: true
tags: [aws, serverless, databases]
---

In [part twenty](/en/posts/aws-20-ecs-fargate-eks/) we stopped managing servers, but tasks still run around the clock, waiting for visitors who may never come. What if your code only ran when a request arrived, and you paid nothing otherwise?

That's **serverless**. There are still servers, of course, but provisioning, updating and scaling them are no longer your problem.

| | EC2 | Fargate | Lambda |
| --- | --- | --- | --- |
| **You manage** | The system and the application | The image and the application | The code |
| **You pay for** | Running time | Running time | Each request and its duration |
| **When idle** | You pay | You pay | Almost nothing |
| **Scaling** | You set it up | You set it up | By itself |
| **Runs for** | As long as you like | As long as you like | Up to 15 minutes per request |

## AWS Lambda

**Lambda** runs a **function** you write when an **event** triggers it. It does its work, then stops.

<figure class="diagram">
<svg viewBox="0 0 640 240" role="img" aria-labelledby="lambda-caption">
<defs>
<marker id="lambda-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="41" text-anchor="middle" class="d-label">S3 upload</text>
<rect x="20" y="70" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="97" text-anchor="middle" class="d-label">SQS message</text>
<rect x="20" y="126" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="153" text-anchor="middle" class="d-label">API request</text>
<rect x="20" y="182" width="150" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="209" text-anchor="middle" class="d-label">Schedule</text>
<rect x="245" y="74" width="150" height="92" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="115" text-anchor="middle" class="d-label">Lambda</text>
<text x="320" y="135" text-anchor="middle" class="d-small">Your code runs</text>
<rect x="470" y="28" width="150" height="44" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="55" text-anchor="middle" class="d-label">DynamoDB</text>
<rect x="470" y="98" width="150" height="44" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="125" text-anchor="middle" class="d-label">S3</text>
<rect x="470" y="168" width="150" height="44" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="195" text-anchor="middle" class="d-label">SNS</text>
<line x1="170" y1="36" x2="243" y2="96" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="170" y1="92" x2="243" y2="112" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="170" y1="148" x2="243" y2="128" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="170" y1="204" x2="243" y2="144" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="395" y1="120" x2="468" y2="50" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="395" y1="120" x2="468" y2="120" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
<line x1="395" y1="120" x2="468" y2="190" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#lambda-arrow)"/>
</svg>
<figcaption id="lambda-caption">An event starts the function, it does its work and stops. You pay only for the time it ran.</figcaption>
</figure>

It supports Python, Node.js, Java, .NET and Ruby directly, and any other language through a custom runtime or a container image. This is what a function looks like in Python:

```python
def handler(event, context):
    name = event.get("name", "world")
    return {"message": f"Hello {name}"}
```

The `event` carries the details of what happened, and its shape depends on the source: an S3 event contains the bucket and the key, for example, and an API event contains the path and the headers.

### What does it cost?

You pay for the number of requests, and for the duration multiplied by memory, in **GB-seconds**. Prices below are for x86 in US Regions, and the free tier covers 1 million requests and 400,000 GB-seconds every month.

An example: a function with 512 MB of memory that runs for 200 milliseconds, 5 million times a month:

| Item | Calculation | Cost |
| --- | --- | --- |
| **Duration** | 5,000,000 x 0.2 s x 0.5 GB = 500,000 GB-s, minus 400,000 free | $1.67 |
| **Requests** | 5 million minus 1 million free, at $0.20 per million | $0.80 |
| **Total** | | **about $2.47** |

Five million requests for less than a coffee. But the calculation can flip: with heavy, constant load, a server or container can come out cheaper, so do the math.

### Limits to know

| Limit | Value |
| --- | --- |
| **Memory** | 128 MB to 10,240 MB, and CPU rises with it |
| **Duration** | 15 minutes per request |
| **Temporary storage** | `/tmp`, from 512 MB to 10 GB |
| **Package size** | 50 MB zipped, 250 MB unzipped, or a 10 GB container image |
| **Concurrency** | 1,000 per Region by default, and it may be lower in new accounts |
| **Payload** | 6 MB for synchronous calls, 1 MB for asynchronous |

If your work takes longer than 15 minutes, split it up with [Step Functions](/en/posts/aws-22-serverless-design/), or use a container.

### Concurrency

Each execution environment serves one request at a time, so 100 simultaneous requests need 100 environments. That number is your **concurrency**, and all functions in a Region share one limit. What happens when you reach it?

- **Synchronous calls,** as from an API, get a `429` error.
- **Asynchronous calls,** as from S3, are held and retried for up to 6 hours, then sent to a dead-letter queue or a failure destination if you've set one.

The hidden trap is that one busy function can consume the whole limit and throttle your others. **Reserved concurrency** sets aside a share for a function, which is also a ceiling for it, so it neither gets starved nor starves others.

### Cold starts

When a request arrives with no environment ready, Lambda creates one and loads your code first. This is a **cold start**, and it may add from a fraction of a second to several seconds, depending on the language and the size of the code. Then the environment stays around for a while and serves later requests quickly. This setup time is billed too, since August 2025.

| Tool | How it works | Cost |
| --- | --- | --- |
| **Provisioned Concurrency** | Keeps a number of environments ready at all times, so there's no cold start for them | You pay for them while ready |
| **SnapStart** | Saves a snapshot after setup and restores from it, for Java 11+, Python 3.12+ and .NET 8+ | Free for Java; charged for Python and .NET |

The two can't be combined on one function. SnapStart lowers startup time but doesn't guarantee to remove it, so if you need very low, steady latency, use Provisioned Concurrency.

### Lambda inside a VPC

By default a function runs outside your VPC, so it can reach the internet and public AWS services, but not your private RDS. Attach it to your [VPC](/en/posts/aws-13-vpc/) and it can reach them, with two things to note:

- It loses its internet access, unless the subnet goes through a NAT gateway or you use [endpoints](/en/posts/aws-14-vpc-connectivity/).
- A thousand environments can open a thousand connections to the database. This is what [RDS Proxy](/en/posts/aws-08-rds-aurora/) solves, by reusing a few connections.

### Code at the edge

We mentioned two ways of running short code on [CloudFront](/en/posts/aws-12-cloudfront-global-accelerator/). Here's the difference:

| | CloudFront Functions | Lambda@Edge |
| --- | --- | --- |
| **Languages** | JavaScript | Node.js and Python |
| **Duration** | Under a millisecond | Up to 30 seconds on origin events |
| **Network access** | No | Yes |
| **Events** | Viewer request and response | Those, plus origin request and response |
| **Good for** | Redirects, headers and cache keys | Heavier logic and calling other services |

## Amazon DynamoDB

Lambda scales in seconds to thousands of copies, and a traditional database doesn't like that. **DynamoDB** is a serverless key-value database: no servers, no connections to manage, millisecond responses at any size, and data replicated across several Availability Zones automatically.

### Tables, items and keys

A table contains **items**, each with **attributes**, and two items don't need to have the same attributes. The maximum size of an item is 400 KB. What's fixed is the **primary key**:

| `customer` (partition key) | `order_id` (sort key) | `total` | `status` | `coupon` |
| --- | --- | --- | --- | --- |
| sara | 1001 | 120 | shipped | |
| sara | 1002 | 40 | new | SAVE10 |
| omar | 1003 | 75 | new | |

- **Partition key:** decides where the item is stored. Choose one with many varied values, so that the load spreads out.
- **Sort key:** optional, and it orders items sharing the same partition key, so you can ask for "Sara's latest orders".

This is the big difference from [relational databases](/en/posts/aws-10-choosing-database/): there are no joins, and you fetch items by their key. So **start from your queries** and design the table to suit them. If you need to query by another attribute, such as `status`, add a **global secondary index**.

### Capacity modes

| Mode | How it works | When |
| --- | --- | --- |
| **On-demand** | Scales by itself, and you pay per request | Unknown or changing load; start here |
| **Provisioned** | You set reads and writes per second, optionally with auto scaling | Steady, predictable load, which comes out cheaper |

### Additions worth knowing

| Feature | What it does |
| --- | --- |
| **DAX** | A cache in front of the table, taking reads from milliseconds to microseconds |
| **Streams** | A log of every change, kept for 24 hours, which can trigger Lambda |
| **Global Tables** | Copies in several Regions, all accepting writes |
| **TTL** | Automatically deletes items after a time you set, such as old sessions |
| **Point-in-time recovery** | Restores the table to any second within the last 1 to 35 days |
| **S3 integration** | Exports a table to S3 for analysis, or imports from S3 into a new table |

Where does **DAX** stand against [ElastiCache](/en/posts/aws-09-elasticache/)? DAX is a transparent cache for DynamoDB, with almost no code change. ElastiCache is more general, for example for storing calculated results that your application manages itself.

**Global Tables** are eventually consistent by default, so a write in one Region reaches the others after a short delay. If you need a read in any Region to see the latest write, there's a **strong consistency** mode, which needs exactly three Regions and has some limitations.

## API Gateway: the front door

A function has no web address by default. **API Gateway** receives the request over HTTPS and passes it on to the function, handling on your behalf what you don't want to write yourself: authentication, throttling, versions and more.

<figure class="diagram">
<svg viewBox="0 0 640 118" role="img" aria-labelledby="api-caption">
<defs>
<marker id="api-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="28" width="126" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="83" y="64" text-anchor="middle" class="d-label">App</text>
<rect x="178" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="54" text-anchor="middle" class="d-label">API Gateway</text>
<text x="241" y="74" text-anchor="middle" class="d-small">Auth, throttling</text>
<rect x="336" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="54" text-anchor="middle" class="d-label">Lambda</text>
<text x="399" y="74" text-anchor="middle" class="d-small">Your logic</text>
<rect x="494" y="28" width="126" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="557" y="54" text-anchor="middle" class="d-label">DynamoDB</text>
<text x="557" y="74" text-anchor="middle" class="d-small">Your data</text>
<line x1="146" y1="59" x2="176" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#api-arrow)"/>
<line x1="304" y1="59" x2="334" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#api-arrow)"/>
<line x1="462" y1="59" x2="492" y2="59" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#api-arrow)"/>
</svg>
<figcaption id="api-caption">The classic serverless API: every part scales with requests, and with no traffic you pay almost nothing.</figcaption>
</figure>

| Type | Suits |
| --- | --- |
| **HTTP API** | Most APIs: simpler and cheaper, with a fixed 30-second limit |
| **REST API** | More features: caching, API keys and request validation |
| **WebSocket API** | Two-way connections, such as chat |

A REST API also comes in three kinds: **Edge-optimized** through CloudFront for users around the world, **Regional** for users close by, and **Private** for inside your VPC only.

Behind it you can put a Lambda function, any HTTP address, or an AWS service directly. For instance, it can send a request straight to SQS, with no function in between. And for a single simple endpoint, Lambda also offers **function URLs**: a direct HTTPS link to the function, without these extras.

### Who can call your API?

| Method | Suits |
| --- | --- |
| **IAM** | Your own services and applications inside AWS |
| **Cognito** | Your application's users; we'll cover it in the next part |
| **Lambda authorizer** | Your own logic, such as a token from another system |

::: warning Watch the time and size limits
A REST API waits 29 seconds for a response by default, and you can raise this on Regional and Private APIs, though that may lower your request quota. Both types have a 10 MB payload limit, so have large files go directly to S3 with [signed links](/en/posts/aws-17-s3-security/).
:::

## Hands-on: a working API

We'll build a page visit counter from the diagram's three pieces. Everything here falls within the free tier for an experiment like this. From CloudShell, create the table:

```bash
aws dynamodb create-table --table-name series-visits \
  --attribute-definitions AttributeName=page,AttributeType=S \
  --key-schema AttributeName=page,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --query TableDescription.TableStatus

aws dynamodb wait table-exists --table-name series-visits

TABLE_ARN=$(aws dynamodb describe-table --table-name series-visits \
  --query Table.TableArn --output text)
```

Give the function a role that can write logs and update this table only:

```bash
cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role --role-name series-visits-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

aws iam attach-role-policy --role-name series-visits-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy --role-name series-visits-role \
  --policy-name table-access --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": \"dynamodb:UpdateItem\",
      \"Resource\": \"$TABLE_ARN\"
    }]
  }"
```

Write the function. It adds one to the counter for the requested path, and an update like this is safe even with simultaneous requests:

```bash
cat > app.py <<'EOF'
import json
import os
import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE"])

def handler(event, context):
    page = event.get("rawPath", "/")
    result = table.update_item(
        Key={"page": page},
        UpdateExpression="ADD visits :one",
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    visits = int(result["Attributes"]["visits"])
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"page": page, "visits": visits}),
    }
EOF

zip -q function.zip app.py
```

Create the function. A new role takes a few seconds to take effect, so if you get an error about the role, wait a little and repeat the command:

```bash
FN_ARN=$(aws lambda create-function --function-name series-visits \
  --runtime python3.13 --handler app.handler --role $ROLE_ARN \
  --zip-file fileb://function.zip \
  --environment "Variables={TABLE=series-visits}" \
  --query FunctionArn --output text)

aws lambda wait function-active-v2 --function-name series-visits
```

Now the front door. This command creates an HTTP API that sends every path to the function, and then we allow it to invoke the function:

```bash
API_ID=$(aws apigatewayv2 create-api --name series-visits \
  --protocol-type HTTP --target $FN_ARN \
  --query ApiId --output text)

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

aws lambda add-permission --function-name series-visits \
  --statement-id api-gateway --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT:$API_ID/*" \
  --query Statement --output text > /dev/null

URL=$(aws apigatewayv2 get-api --api-id $API_ID \
  --query ApiEndpoint --output text)
echo $URL
```

Try it. You can also open the link in your browser:

```bash
curl -s $URL/home; echo
curl -s $URL/home; echo
curl -s $URL/about; echo
```

The counter goes up: `home` reaches 2 and `about` is at 1. Look at the data in the table:

```bash
aws dynamodb scan --table-name series-visits \
  --query "Items[].[page.S,visits.N]" --output table
```

Finally, see the cold start in the function's logs:

```bash
aws logs tail /aws/lambda/series-visits --since 10m | grep REPORT
```

Only the first request has an `Init Duration` field, which is the time taken to set up the environment, and the requests after it are much faster. If the logs are empty, wait a few seconds and try again.

::: security Delete after experimenting
A resource that isn't being used costs nothing here, which is the point of serverless. But clean up anyway, including the role and its permissions:
:::

```bash
aws apigatewayv2 delete-api --api-id $API_ID
aws lambda delete-function --function-name series-visits
aws dynamodb delete-table --table-name series-visits \
  --query TableDescription.TableStatus
aws logs delete-log-group --log-group-name /aws/lambda/series-visits

aws iam delete-role-policy --role-name series-visits-role \
  --policy-name table-access
aws iam detach-role-policy --role-name series-visits-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name series-visits-role
```

## Summary

- **Serverless** means you write code and data, and pay only for use.
- **Lambda** runs up to 15 minutes, and you pay per request and per GB-second.
- **Cold starts** are eased with Provisioned Concurrency or SnapStart, and **reserved concurrency** protects functions from each other.
- **DynamoDB** fetches items by key, so design the table around your queries.
- **API Gateway** is the front door, handling authentication and throttling; start with an HTTP API.

## Test yourself

::: quiz
A Lambda function is attached to a VPC so it can reach a private RDS database. That works, but now its calls to a payment provider on the internet time out. What fixes this?

- [ ] Attaching the function to a public subnet
- [ ] Raising the function's timeout
- [x] Routing the function's private subnet through a NAT gateway
- [ ] Putting RDS Proxy between the function and the database

Once attached to a VPC, a function loses its internet access unless its subnet goes through a NAT gateway.

- **A:** A public subnet gives the function neither internet access nor a public address.
- **B:** There's no path to the internet, so more time won't help.
- **D:** This handles database connections, and the problem is the path out.

Review: [Lambda inside a VPC](#lambda-inside-a-vpc) in this part, and [Enable internet access for VPC-connected Lambda Event Functions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html) in the AWS docs.
:::

::: quiz
An orders table has `customer` as its partition key and `order_id` as its sort key. The team now needs all orders whose `status` is `new`, quickly and often. What should it do?

- [ ] Scan the whole table for each request
- [ ] Join the table with a `status` table
- [ ] Put DAX in front of the table
- [x] Add a global secondary index on `status`

A global secondary index organizes the data by a different key, so you can query by `status` directly.

- **A:** This reads every item each time, so it gets slower and costlier as the table grows.
- **B:** DynamoDB has no joins.
- **C:** This speeds up reads you can already do, and doesn't add a new way to query.

Review: [Tables, items and keys](#tables-items-and-keys) in this part, and [Using Global Secondary Indexes in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html) in the AWS docs.
:::

::: quiz
A product page reads the same DynamoDB items millions of times a day. The team wants reads to take microseconds, with the **fewest code changes**. What fits?

- [x] DynamoDB Accelerator (DAX)
- [ ] ElastiCache, with the application managing the cache
- [ ] DynamoDB Global Tables
- [ ] DynamoDB Streams

DAX is a cache in front of the table that works with DynamoDB's API, so it takes only minimal changes.

- **B:** This can be fast too, but your application has to manage what goes in and out of the cache.
- **C:** This places copies in several Regions, and doesn't bring reads down to microseconds.
- **D:** This is a log of changes, and doesn't speed up reads.

Review: [Additions worth knowing](#additions-worth-knowing) in this part, and [In-memory acceleration with DynamoDB Accelerator (DAX)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html) in the AWS docs.
:::

::: quiz
A company is selling access to its API. It needs API keys for each customer, throttling per client, and cached responses. Which option fits?

- [ ] HTTP API
- [x] REST API
- [ ] WebSocket API
- [ ] A Lambda function URL

REST APIs have all of these. HTTP APIs are simpler and cheaper because they leave such features out.

- **A:** This has neither API keys nor caching.
- **C:** This is for two-way connections, such as chat.
- **D:** This is a direct link to a function, without any of these extras.

Review: [API Gateway: the front door](#api-gateway-the-front-door) in this part, and [Choose between REST APIs and HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html) in the AWS docs.
:::

::: quiz
A report function sometimes uses up the Region's whole concurrency limit, and the checkout function starts returning `429`. Checkout also has to answer with steady, very low latency. Which **two** settings fit the checkout function? (Choose two.)

- [x] Reserved concurrency
- [ ] SnapStart
- [x] Provisioned Concurrency
- [ ] More `/tmp` storage
- [ ] Less memory

Reserved concurrency sets aside a share for checkout that no other function can take, and Provisioned Concurrency keeps environments ready so they have no cold start.

- **B:** This lowers startup time without guaranteeing to remove it, and can't be combined with Provisioned Concurrency.
- **D:** This adds temporary disk space, and has nothing to do with either problem.
- **E:** CPU rises with memory, so this would make responses slower.

Review: [Concurrency](#concurrency) and [Cold starts](#cold-starts) in this part, and [Configuring reserved concurrency for an Event Function](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html) and [Configuring provisioned concurrency for an Event Function](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) in the AWS docs.
:::

You now have the building blocks. How do you build a complete application from them, with users, long workflows and events flowing between the services? That's what we'll cover in [**part twenty-two**](/en/posts/aws-22-serverless-design/).
