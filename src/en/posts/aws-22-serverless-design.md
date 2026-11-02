---
title: "Designing Serverless Applications"
description: Putting the pieces together. Long workflows with Step Functions, users with Cognito, two complete application designs, microservices and a cheap win with CloudFront, with hands-ons on a file that triggers a function and a workflow that decides.
date: 2026-11-02
series: aws
part: 22
numbered: true
tags: [aws, serverless, messaging]
---

In [part twenty-one](/en/posts/aws-21-lambda-api-dynamodb/) we built an API from three pieces. A real application needs more: a process with several steps that can fail halfway through, users who sign in, and things that should happen after a request without keeping anyone waiting.

This part completes the picture with two more services, then applies everything to two designs.

## Step Functions: workflows

An order involves checking stock, then taking payment, then shipping. You could have each function call the next, but then where do retries live? What happens if the payment fails after the stock was reserved? And who can tell you where order 1001 is right now?

**Step Functions** moves that logic out of your code, into a **state machine**: a definition of the steps and what happens after each one, which you can see as a drawing in the console.

<figure class="diagram">
<svg viewBox="0 0 640 200" role="img" aria-labelledby="steps-caption">
<defs>
<marker id="steps-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="20" width="150" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="55" text-anchor="middle" class="d-label">Check stock</text>
<rect x="245" y="20" width="150" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="45" text-anchor="middle" class="d-label">Take payment</text>
<text x="320" y="65" text-anchor="middle" class="d-small">Retries itself</text>
<rect x="470" y="20" width="150" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="545" y="55" text-anchor="middle" class="d-label">Ship</text>
<line x1="170" y1="50" x2="243" y2="50" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<line x1="395" y1="50" x2="468" y2="50" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<rect x="245" y="128" width="150" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="320" y="162" text-anchor="middle" class="d-small">Cancel and notify</text>
<line x1="95" y1="80" x2="243" y2="150" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<text x="120" y="130" text-anchor="middle" class="d-small">Out of stock</text>
<line x1="320" y1="80" x2="320" y2="126" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#steps-arrow)"/>
<text x="365" y="108" text-anchor="middle" class="d-small">Declined</text>
</svg>
<figcaption id="steps-caption">The workflow knows the order of the steps and where each failure goes, while each step stays small and simple.</figcaption>
</figure>

Each step can call a Lambda function or many AWS services directly, and the definition handles what you'd otherwise write by hand:

| Ability | What it does |
| --- | --- |
| **Retry** | Retries a failed step, waiting longer each time |
| **Catch** | Sends a failure to a step that handles it, such as a refund |
| **Choice** | Picks a path according to the data |
| **Parallel and Map** | Runs branches together, or one step for each item in a list |
| **Wait** | Pauses for a period, or for a human approval that takes days |

This is what retrying the payment and catching its failure looks like:

```json
"TakePayment": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": { "FunctionName": "take-payment", "Payload.$": "$" },
  "Retry": [{
    "ErrorEquals": ["States.TaskFailed"],
    "IntervalSeconds": 2,
    "BackoffRate": 2,
    "MaxAttempts": 3
  }],
  "Catch": [{
    "ErrorEquals": ["States.ALL"],
    "Next": "CancelOrder"
  }],
  "Next": "Ship"
}
```

| | Standard | Express |
| --- | --- | --- |
| **Maximum duration** | One year | Five minutes |
| **Execution** | Exactly once | At least once |
| **Billed by** | State transition, with 4,000 free each month | Number of requests, duration and memory |
| **Suits** | Long processes such as orders and approvals | Short, very frequent events |

## Cognito: your users

[IAM](/en/posts/aws-02-iam/) is for your team and your services, not for a million people using your application. **Amazon Cognito** gives your application its own users, and it has two parts that are easy to confuse:

| | User Pool | Identity Pool |
| --- | --- | --- |
| **Question it answers** | Who is this user? | What can they do in AWS? |
| **Gives** | A token after signing in | Temporary AWS keys |
| **Used for** | Your application and your API | Direct access to S3 or DynamoDB |

**User Pools** handle sign-up and sign-in, password resets, multi-factor authentication, and signing in with accounts like Google or a corporate identity. API Gateway and the Application Load Balancer can check its tokens directly. New pools use the **Essentials** plan by default, and there's also a cheaper **Lite** with fewer features, and **Plus** with advanced protection.

**Identity Pools** exchange a token for temporary keys tied to an IAM role, and a policy variable limits them to the user's own data. For example, each user reaches only their folder in S3:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::recipe-photos/users/${cognito-identity.amazonaws.com:sub}/*"
}
```

## Design one: a mobile app

Let's design an app for sharing recipes: users sign in, write recipes, upload photos, and popular recipes get read many times more often than they're written. Each requirement has its piece:

| Requirement | Solution |
| --- | --- |
| Users sign in | A Cognito **User Pool** |
| An API for reading and writing recipes | **API Gateway**, **Lambda** and **DynamoDB** |
| Uploading photos directly | An **Identity Pool** with temporary keys to S3 |
| Huge numbers of reads on the same recipes | **DAX** in front of the table |
| Repeated identical requests | **API Gateway caching**, on a REST API |

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="cognito-caption">
<defs>
<marker id="cognito-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="60" width="100" height="130" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="70" y="130" text-anchor="middle" class="d-label">App</text>
<rect x="170" y="14" width="140" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="240" y="37" text-anchor="middle" class="d-label">User Pool</text>
<text x="240" y="57" text-anchor="middle" class="d-small">Sign-in and token</text>
<rect x="170" y="97" width="140" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="240" y="120" text-anchor="middle" class="d-label">API Gateway</text>
<text x="240" y="140" text-anchor="middle" class="d-small">Checks the token</text>
<rect x="350" y="97" width="110" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="405" y="130" text-anchor="middle" class="d-label">Lambda</text>
<rect x="500" y="97" width="120" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="560" y="130" text-anchor="middle" class="d-label">DynamoDB</text>
<rect x="170" y="180" width="140" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="240" y="203" text-anchor="middle" class="d-label">Identity Pool</text>
<text x="240" y="223" text-anchor="middle" class="d-small">Temporary keys</text>
<rect x="350" y="180" width="270" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="485" y="203" text-anchor="middle" class="d-label">S3</text>
<text x="485" y="223" text-anchor="middle" class="d-code">users/ID/</text>
<line x1="120" y1="80" x2="168" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="120" y1="125" x2="168" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="120" y1="170" x2="168" y2="208" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="310" y1="125" x2="348" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="460" y1="125" x2="498" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
<line x1="310" y1="208" x2="348" y2="208" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cognito-arrow)"/>
</svg>
<figcaption id="cognito-caption">The User Pool signs the user in and issues a token. API Gateway checks it, and the Identity Pool exchanges it for temporary keys limited to the user's own folder.</figcaption>
</figure>

Why does the photo go directly to S3, instead of through the API? Because API Gateway has a 10 MB limit, and because you'd pay for Lambda's time just to pass bytes along. Signed links from [part seventeen](/en/posts/aws-17-s3-security/) are another good option here, when you don't need Identity Pools.

And notice where each cache sits: API Gateway's stops the request before it reaches the function, so it suits responses that don't change per user. DAX lets the function run, then spares the table from the read.

## Design two: a global website

Now a travel guide read around the world: static pages, a small API, a welcome email when someone registers, and thumbnails for the photos users upload.

<figure class="diagram">
<svg viewBox="0 0 640 248" role="img" aria-labelledby="site-caption">
<defs>
<marker id="site-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="100" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="70" y="47" text-anchor="middle" class="d-label">Visitors</text>
<rect x="160" y="14" width="110" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="215" y="47" text-anchor="middle" class="d-label">CloudFront</text>
<rect x="310" y="14" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="385" y="37" text-anchor="middle" class="d-label">S3</text>
<text x="385" y="57" text-anchor="middle" class="d-small">Pages and images</text>
<rect x="500" y="14" width="120" height="56" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="560" y="37" text-anchor="middle" class="d-label">Lambda</text>
<text x="560" y="57" text-anchor="middle" class="d-small">Thumbnails</text>
<rect x="160" y="96" width="110" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="215" y="129" text-anchor="middle" class="d-label">API Gateway</text>
<rect x="310" y="96" width="150" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="385" y="119" text-anchor="middle" class="d-label">Lambda</text>
<text x="385" y="139" text-anchor="middle" class="d-small">Your logic</text>
<rect x="500" y="96" width="120" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="560" y="119" text-anchor="middle" class="d-label">DynamoDB</text>
<text x="560" y="139" text-anchor="middle" class="d-small">Global Tables</text>
<rect x="500" y="178" width="120" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="560" y="211" text-anchor="middle" class="d-label">Streams</text>
<rect x="310" y="178" width="150" height="56" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="385" y="201" text-anchor="middle" class="d-label">Lambda</text>
<text x="385" y="221" text-anchor="middle" class="d-small">Welcome email</text>
<rect x="160" y="178" width="110" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="215" y="211" text-anchor="middle" class="d-label">SES</text>
<line x1="120" y1="42" x2="158" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="270" y1="42" x2="308" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="460" y1="42" x2="498" y2="42" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="215" y1="70" x2="215" y2="94" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="270" y1="124" x2="308" y2="124" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="460" y1="124" x2="498" y2="124" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="560" y1="152" x2="560" y2="176" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="500" y1="206" x2="462" y2="206" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
<line x1="310" y1="206" x2="272" y2="206" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#site-arrow)"/>
</svg>
<figcaption id="site-caption">CloudFront serves the pages and passes API calls along. Everything after a write happens through events: a new user triggers the email, and a new image triggers the thumbnail.</figcaption>
</figure>

Follow it piece by piece:

- **Pages:** a private S3 bucket with [CloudFront and OAC](/en/posts/aws-12-cloudfront-global-accelerator/) in front of it, so the bucket stays closed and the site is fast everywhere.
- **API:** API Gateway, Lambda and DynamoDB, and **Global Tables** place data close to users in each Region.
- **Welcome email:** the API doesn't send it. A new user is written to the table, **DynamoDB Streams** triggers a function, and it sends through **SES**. If email fails, registration isn't affected.
- **Thumbnails:** a photo landing in S3 triggers a Lambda function that writes a smaller copy. To handle bursts, or to reach several services, put [SQS or SNS](/en/posts/aws-19-sqs-sns-kinesis/) in between.

There's not a single server here, and when no one's visiting, the bill is close to storage costs alone. The point in the last two flows is the same: **the request finishes quickly, and everything else happens through events.**

## Microservices

When an application grows, teams split it into small services, each with its own job, database and release schedule. There are two ways for them to talk:

| Style | Tools | Suits |
| --- | --- | --- |
| **Synchronous** | API Gateway or a load balancer | You need the answer now, such as a price |
| **Asynchronous** | SQS, SNS, Kinesis and Lambda triggers | The work can come later, such as an invoice |

And each service can choose what suits it: Lambda for scattered requests, Fargate for steady load, and EC2 for special requirements. All of this has a price, though: more deployments, more to monitor, and failures harder to trace across services. So don't start here for a small application, and split only when you really need to.

## A cheap win: CloudFront in front of what you have

Not every improvement needs a rewrite. Imagine an application on an Auto Scaling group that distributes large update files. On release day, all your users download at once: servers multiply, and your data transfer bill jumps.

Put **CloudFront** in front of it, and change nothing else. The files don't change, so they suit caching very well: most requests stop at the edge, the group barely has to grow, and data going out through CloudFront costs less than going out directly. A few minutes' work can pay back more than a redesign.

## Design principles

| Principle | Why |
| --- | --- |
| **Make processing safe to repeat** | SQS, SNS and asynchronous Lambda deliver at least once |
| **A dead-letter queue for anything asynchronous** | A silent failure is the worst kind |
| **One role per function, with the least privilege** | A flaw in one doesn't open everything |
| **Small functions with one job** | Easier to test, and quicker to start |
| **Calculate the cost** | With heavy, constant load, containers can come out cheaper |
| **Observe everything** | Requests pass through many services, and we cover the tools in [part twenty-five](/en/posts/aws-25-monitoring-auditing/) |

## Hands-on: a file triggers a function

In [part fifteen](/en/posts/aws-15-s3-basics/) we promised to apply S3 events. We'll make the thumbnail flow, with one simplification: instead of an image library, the function converts a text file to capitals. The flow is exactly the same. From CloudShell:

```bash
BUCKET=series-events-$RANDOM$RANDOM
aws s3 mb s3://$BUCKET

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

ROLE_ARN=$(aws iam create-role --role-name series-events-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

aws iam attach-role-policy --role-name series-events-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam put-role-policy --role-name series-events-role \
  --policy-name bucket-access --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"s3:GetObject\", \"s3:PutObject\"],
      \"Resource\": \"arn:aws:s3:::$BUCKET/*\"
    }]
  }"
```

Write the function, and create it. If you get an error about the role, wait a few seconds and repeat the command:

```bash
cat > app.py <<'EOF'
from urllib.parse import unquote_plus
import boto3

s3 = boto3.client("s3")

def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = unquote_plus(record["s3"]["object"]["key"])
        body = s3.get_object(Bucket=bucket, Key=key)["Body"].read().decode()
        name = key.split("/")[-1]
        s3.put_object(Bucket=bucket, Key=f"processed/{name}", Body=body.upper())
EOF

zip -q function.zip app.py

FN_ARN=$(aws lambda create-function --function-name series-events \
  --runtime python3.13 --handler app.handler --role $ROLE_ARN \
  --zip-file fileb://function.zip \
  --query FunctionArn --output text)

aws lambda wait function-active-v2 --function-name series-events
```

Allow S3 to invoke the function, then tell the bucket to send it events from the `uploads/` folder only:

```bash
aws lambda add-permission --function-name series-events \
  --statement-id s3-trigger --action lambda:InvokeFunction \
  --principal s3.amazonaws.com --source-arn arn:aws:s3:::$BUCKET \
  --query Statement --output text > /dev/null

cat > notify.json <<EOF
{
  "LambdaFunctionConfigurations": [{
    "LambdaFunctionArn": "$FN_ARN",
    "Events": ["s3:ObjectCreated:*"],
    "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": "uploads/"}]}}
  }]
}
EOF

aws s3api put-bucket-notification-configuration --bucket $BUCKET \
  --notification-configuration file://notify.json
```

Upload a file, wait a few seconds, then read the result:

```bash
echo "hello from s3" > note.txt
aws s3 cp note.txt s3://$BUCKET/uploads/note.txt
```

```bash
aws s3 cp s3://$BUCKET/processed/note.txt -
```

It prints `HELLO FROM S3`. You uploaded a file, and code ran by itself.

::: warning Beware of an endless loop
Here the function writes to `processed/` and listens to `uploads/`. If it wrote to the same folder it listens to, each output would trigger it again, and your bill would climb with it. Always separate the two with a prefix, or with two buckets.
:::

Clean up before moving on:

```bash
aws s3 rb s3://$BUCKET --force
aws lambda delete-function --function-name series-events
aws logs delete-log-group --log-group-name /aws/lambda/series-events
aws iam delete-role-policy --role-name series-events-role \
  --policy-name bucket-access
aws iam detach-role-policy --role-name series-events-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name series-events-role
```

## Hands-on: a workflow that decides

We'll write a state machine that looks at an order's amount: a negative amount fails, a large amount goes to review, and the rest is approved. It only uses internal steps, so it needs a role with no permissions:

```bash
cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "states.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

FLOW_ROLE=$(aws iam create-role --role-name series-flow-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

cat > flow.json <<'EOF'
{
  "StartAt": "CheckAmount",
  "States": {
    "CheckAmount": {
      "Type": "Choice",
      "Choices": [
        {"Variable": "$.amount", "NumericLessThanEquals": 0, "Next": "Rejected"},
        {"Variable": "$.amount", "NumericGreaterThan": 1000, "Next": "NeedsReview"}
      ],
      "Default": "Approved"
    },
    "NeedsReview": {"Type": "Pass", "Result": {"status": "review"}, "End": true},
    "Approved": {"Type": "Pass", "Result": {"status": "approved"}, "End": true},
    "Rejected": {"Type": "Fail", "Error": "InvalidAmount", "Cause": "The amount must be positive"}
  }
}
EOF
```

Create it. Here too, if you get an error about the role, wait a few seconds and repeat:

```bash
FLOW_ARN=$(aws stepfunctions create-state-machine --name series-order \
  --definition file://flow.json --role-arn $FLOW_ROLE \
  --query stateMachineArn --output text)
```

Run it with three orders:

```bash
try_order() {
  RUN=$(aws stepfunctions start-execution --state-machine-arn $FLOW_ARN \
    --input "$1" --query executionArn --output text)
  sleep 2
  aws stepfunctions describe-execution --execution-arn $RUN \
    --query "[status,output]" --output text
}

try_order '{"amount": 250}'
try_order '{"amount": 5000}'
try_order '{"amount": -5}'
```

You'll get `approved`, then `review`, then `FAILED`. Now open **Step Functions** in the console, choose `series-order`, then any of the executions. You'll see the drawing with the path taken in color, which is what you'd look at when an order gets stuck in production.

::: security Delete after experimenting
A few transitions fall within the 4,000 free each month. Delete the machine and its role:
:::

```bash
aws stepfunctions delete-state-machine --state-machine-arn $FLOW_ARN
aws iam delete-role --role-name series-flow-role
```

## Summary

- **Step Functions** takes steps, retries and failures out of your code into a visible workflow.
- A **User Pool** answers who the user is, and an **Identity Pool** gives them temporary keys to AWS.
- A good design **finishes the request quickly**, and leaves everything else to events.
- Have large files go **directly to S3**, and put **caching** where it stops the most work.
- **Microservices** have a price, so split only when you really need to.

## Test yourself

::: quiz
An order goes through stock, payment and shipping. Failed steps must retry, a failed payment must trigger a refund, and large orders wait days for a manager's approval. The team also wants to see where each order is. What fits?

- [ ] Step Functions, with an Express workflow
- [ ] Lambda functions that call each other
- [ ] An SNS topic with a subscriber for each step
- [x] Step Functions, with a Standard workflow

A Standard workflow can last up to a year, its definition holds the retries, failures and waiting, and the console shows you each execution's path as a drawing.

- **A:** These run for at most five minutes, so they can't wait for days.
- **B:** The retries and failure handling end up in your code, and nothing shows you where an order is.
- **C:** This delivers to every subscriber at once, with no order between the steps.

Review: [Step Functions: workflows](#step-functions-workflows) in this part, and [Choosing workflow type in Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html) in the AWS docs.
:::

::: quiz
Users sign in to a mobile app through a Cognito User Pool. They should upload photos directly to S3, and each must only reach their own folder. What gives the app access to S3?

- [x] An Identity Pool, with temporary keys and a policy variable
- [ ] The User Pool token, sent directly to S3
- [ ] An IAM user for each person using the app
- [ ] Access keys built into the app

The Identity Pool swaps the token for temporary keys tied to an IAM role, and a policy variable limits them to that user's folder.

- **B:** A User Pool token says who the user is, and it isn't a set of AWS keys.
- **C:** IAM is for your team and services, not for huge numbers of app users.
- **D:** Anyone could pull these keys out of the app, and they'd work for everyone's folders.

Review: [Cognito: your users](#cognito-your-users) in this part, and [Amazon Cognito identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html) and [IAM roles](https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html) in the AWS docs.
:::

::: quiz
A sign-up API sends a welcome email before it responds. When the email service is slow, sign-ups are slow too, and when it fails, sign-ups fail. New users are written to DynamoDB. What's the best design?

- [ ] Raising the function's timeout
- [x] DynamoDB Streams triggering a separate function that sends the email
- [ ] Provisioned Concurrency on the API's function
- [ ] Retrying the email inside the API's function

The request finishes once the user is written, and the email happens through an event, so a failed email doesn't affect the sign-up.

- **A:** Users would wait even longer, and failures would still reach them.
- **C:** This removes cold starts, and the slowness comes from the email.
- **D:** Retrying inside the request makes users wait even longer.

Review: [Design two: a global website](#design-two-a-global-website) in this part, and [DynamoDB Streams and AWS Lambda triggers](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html) in the AWS docs.
:::

::: quiz
An application on an Auto Scaling group distributes large update files. On release day the group grows sharply and the data transfer bill jumps. What gives the biggest improvement with the **least change**?

- [ ] Moving the servers to larger instance types
- [ ] Rewriting the downloads with Lambda and API Gateway
- [x] Putting CloudFront in front of the application
- [ ] Putting Global Accelerator in front of the application

The files don't change, so they suit caching very well. Most requests stop at the edge, the group barely has to grow, and data going out through CloudFront costs less than going out directly.

- **A:** The servers would still handle every download, and the same data would still go out.
- **B:** This is a rewrite, and API Gateway's 10 MB limit is too small for large files.
- **D:** This shortens the road but doesn't cache, so every download still reaches the servers.

Review: [A cheap win: CloudFront in front of what you have](#a-cheap-win-cloudfront-in-front-of-what-you-have) in this part, and [What is Amazon CloudFront?](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) in the AWS docs.
:::

::: quiz
An SNS topic invokes a Lambda function asynchronously. Some customers were charged twice, and events that failed repeatedly vanished with no trace. Which **two** changes address these? (Choose two.)

- [x] Make the charge safe to repeat, for example by checking the order number first
- [ ] Give the function more memory
- [ ] Turn on SnapStart
- [ ] Use Provisioned Concurrency
- [x] Send failed events to a dead-letter queue or a failure destination

An event can be delivered more than once, so a duplicate has to be harmless. And a dead-letter queue keeps what failed so you can inspect it, rather than losing it silently.

- **B:** This makes the function faster, and duplicates still arrive.
- **C:** This eases cold starts, and has nothing to do with either problem.
- **D:** This keeps environments ready, and has nothing to do with either problem.

Review: [Design principles](#design-principles) in this part, and [How Lambda handles errors and retries with asynchronous invocation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html) and [Capturing records of Lambda asynchronous invocations](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html) in the AWS docs.
:::

This completes the modern applications section. Your application now generates a lot of data, but what does it tell you? In [**part twenty-three**](/en/posts/aws-23-athena-redshift-glue/) we start the data and AI section, analyzing data with Athena, Redshift and Glue.
