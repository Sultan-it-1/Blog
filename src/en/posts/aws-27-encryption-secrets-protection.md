---
title: "Encryption, Secrets and Threat Protection"
description: How KMS protects your keys, where to keep passwords with Parameter Store and Secrets Manager, free certificates from ACM, stopping attacks with WAF and Shield, and detecting threats with GuardDuty, Inspector and Macie, with a hands-on.
date: 2026-11-02
series: aws
part: 27
numbered: true
tags: [aws, security]
---

In [part twenty-six](/en/posts/aws-26-organizations-identity-center/) we controlled who gets in. This part assumes the worst: a disk gets stolen, a password leaks, or someone attacks your site. What protects you then?

| You want | Use |
| --- | --- |
| Encryption keys you control | **KMS** |
| Settings and simple secrets | **Parameter Store** |
| Passwords that rotate by themselves | **Secrets Manager** |
| HTTPS certificates | **ACM** |
| Stopping web attacks | **WAF** |
| Withstanding DDoS attacks | **Shield** |
| Detecting threats in your account | **GuardDuty** |
| Finding vulnerabilities in what you run | **Inspector** |
| Finding sensitive data in S3 | **Macie** |

## AWS KMS: the key safe

We saw the [types of encryption in S3](/en/posts/aws-17-s3-security/). Behind most of them is **KMS** (Key Management Service): keys are created and used inside it and never leave it unencrypted, access is controlled by policies, and every use is recorded in [CloudTrail](/en/posts/aws-25-monitoring-auditing/).

### Envelope encryption

KMS doesn't encrypt your large files itself. It makes a **data key** that encrypts the file, and it encrypts that data key with your master key:

<figure class="diagram">
<svg viewBox="0 0 640 214" role="img" aria-labelledby="envelope-caption">
<defs>
<marker id="envelope-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="170" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="105" y="44" text-anchor="middle" class="d-label">KMS key</text>
<text x="105" y="64" text-anchor="middle" class="d-small">Never leaves KMS</text>
<rect x="235" y="14" width="170" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="44" text-anchor="middle" class="d-label">Data key</text>
<text x="320" y="64" text-anchor="middle" class="d-small">Encrypts the file</text>
<rect x="450" y="14" width="170" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="535" y="44" text-anchor="middle" class="d-label">Your file</text>
<text x="535" y="64" text-anchor="middle" class="d-small">Now encrypted</text>
<rect x="235" y="130" width="170" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="320" y="160" text-anchor="middle" class="d-label">Encrypted data key</text>
<text x="320" y="180" text-anchor="middle" class="d-small">Stored with the file</text>
<line x1="190" y1="49" x2="233" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
<line x1="405" y1="49" x2="448" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
<line x1="320" y1="84" x2="320" y2="128" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
<line x1="405" y1="165" x2="535" y2="86" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#envelope-arrow)"/>
</svg>
<figcaption id="envelope-caption">The data key encrypts the file, and an encrypted copy of it is stored beside the file. Only KMS can open that copy, so the file is useless without permission.</figcaption>
</figure>

So even whoever steals the disk gets encrypted data with an encrypted key next to it. To decrypt, you need permission to ask KMS to open the data key, and that's where your control sits.

### Types of keys

| Type | Who controls it | Monthly cost | Rotation |
| --- | --- | --- | --- |
| **AWS owned** | AWS, and you never see it | Free | By the service |
| **AWS managed** (such as `aws/ebs`) | AWS, and you can view and audit it | Free | Yearly, and it can't be changed |
| **Customer managed** | You entirely | $1 per key, plus API calls | Optional, yearly by default, or from 90 to 2,560 days |

Most keys are **symmetric**, one key for encrypting and decrypting that never leaves KMS. There are also **asymmetric** pairs, where the public key leaves KMS, for signing or for encryption by parties outside AWS.

Deleting a key is irreversible, because it destroys everything encrypted with it. So KMS imposes a waiting period of 7 to 30 days, during which you can cancel. To stop a key from being used in the meantime, disable it.

### Key policies

Every KMS key has a **key policy**, and unlike other resources, IAM alone isn't enough without it. The default policy lets the account's IAM policies grant access to the key.

This matters when copying encrypted data:

- **To another Region:** keys are Regional, so copying a snapshot re-encrypts it with a key in the destination Region.
- **To another account:** share the snapshot, and allow that account in the policy of a **customer managed** key. AWS managed keys, such as `aws/ebs`, can't be shared, so a snapshot encrypted with one must first be copied with your own key.

### Multi-Region keys

**Multi-Region keys** share the same key material and ID across Regions, so something encrypted in one Region can be decrypted in another without re-encrypting. They're not for everything, as AWS recommends single-Region keys by default. They suit cases such as client-side encryption of a field in [Global Tables](/en/posts/aws-21-lambda-api-dynamodb/) or Aurora Global.

### CloudHSM: your own hardware

With KMS, AWS manages the hardware holding your keys. If a regulation requires a hardware security module dedicated to you, **AWS CloudHSM** gives you a single-tenant cluster of FIPS-validated HSMs. AWS handles provisioning and backups, while you control the keys and users yourself. Choose it only when you must, because you take on more responsibility than with KMS.

## Where do you keep passwords?

Not in code, and not in Git. You have two services:

| | Parameter Store | Secrets Manager |
| --- | --- | --- |
| **Suits** | Settings and simple secrets | Secrets that must rotate |
| **Encryption** | Optional, with KMS, using `SecureString` | Always, with KMS |
| **Rotation** | Not built in | Built in, with a Lambda function, and integrated with RDS and Aurora |
| **Replicas in other Regions** | No | Yes |
| **Price** | Standard is free | $0.40 per secret per month, plus API calls |

### Parameter Store

Its names form a hierarchy, such as `/shop/prod/db-url`, so an application can fetch a whole path, and IAM can allow `/shop/prod/*` only.

| | Standard | Advanced |
| --- | --- | --- |
| **Max size** | 4 KB | 8 KB |
| **Count per Region** | 10,000 | 100,000 |
| **Policies, such as expiry** | No | Yes |
| **Price** | Free | $0.05 per parameter per month |

### Secrets Manager

The point here is rotation: the password changes on a schedule you set, and the function updates it in the database too. Your application asks for the current value each time, so it doesn't notice. We saw in [part eight](/en/posts/aws-08-rds-aurora/) that RDS can manage its password here for you.

## ACM: certificates without the hassle

**AWS Certificate Manager** issues public TLS certificates for free when used with services like load balancers, CloudFront and API Gateway, and it renews them by itself.

- **Validation:** prove you own the domain by DNS, and it's best with [Route 53](/en/posts/aws-11-dns-route53/), or by email.
- **Validity:** public certificates now last 198 days, under new industry rules, and renewal happens automatically about 45 days before expiry. The period will shorten further in the coming years, which is more reason to leave it to automation.
- **Imported certificates:** you can import your own, but ACM doesn't renew those, so set an alert on their expiry.
- **Other servers:** a normal ACM certificate can't be installed on your own server. If you need that, there are **exportable certificates**, for a fee.

::: warning The Region trap
A certificate must be in the same Region as what uses it, with one exception to remember: **CloudFront** and edge-optimized API Gateway need the certificate in **`us-east-1`**, wherever your application is.
:::

## Stopping attacks

Here's how the protection layers sit together in a typical design:

<figure class="diagram">
<svg viewBox="0 0 640 150" role="img" aria-labelledby="edge-caption">
<defs>
<marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="40" width="110" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="80" text-anchor="middle" class="d-label">Visitors</text>
<rect x="170" y="26" width="130" height="98" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="235" y="70" text-anchor="middle" class="d-label">CloudFront</text>
<text x="235" y="90" text-anchor="middle" class="d-small">WAF and Shield</text>
<rect x="340" y="40" width="130" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="405" y="70" text-anchor="middle" class="d-label">ALB</text>
<text x="405" y="90" text-anchor="middle" class="d-small">CloudFront only</text>
<rect x="510" y="40" width="110" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="70" text-anchor="middle" class="d-label">Servers</text>
<text x="565" y="90" text-anchor="middle" class="d-small">Private</text>
<line x1="130" y1="75" x2="168" y2="75" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#edge-arrow)"/>
<line x1="300" y1="75" x2="338" y2="75" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#edge-arrow)"/>
<line x1="470" y1="75" x2="508" y2="75" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#edge-arrow)"/>
</svg>
<figcaption id="edge-caption">Attacks are absorbed at the edge, and the load balancer's security group accepts traffic only from CloudFront, so nobody can go around it.</figcaption>
</figure>

| Service | Layer | What it does | Cost |
| --- | --- | --- | --- |
| **WAF** | Application (7) | Rules on requests: SQL injection, XSS, country, IP lists, and rate limits | Per rule and request |
| **Shield Standard** | Network (3 and 4) | Protection from common DDoS attacks | Free and automatic |
| **Shield Advanced** | Up to 7 | A specialist response team, cost protection during attacks | A monthly subscription, and it's expensive |
| **Firewall Manager** | Management | Applies WAF, Shield, security group and other rules across all your organization's accounts | Per policy |

WAF attaches to **CloudFront, Application Load Balancer, API Gateway and AppSync**, but not to a Network Load Balancer. If you need a fixed IP with WAF, put [Global Accelerator](/en/posts/aws-12-cloudfront-global-accelerator/) in front of the load balancer. **Rate-based rules** are simple and effective: block any address sending more than a set number of requests.

### Withstanding DDoS

The [earlier parts](/en/posts/aws-12-cloudfront-global-accelerator/) gave you most of what's needed already:

- **CloudFront and Route 53** absorb attacks at the edge, far from your servers.
- **Auto Scaling** grows if something gets through, though watch the cost.
- **A security group** allows the load balancer only from CloudFront, so nobody can skip it.
- **WAF** with rate limits and Bot Control for attacks that look like normal requests.

### Blocking one address: where?

| Your design | Where to block | Why |
| --- | --- | --- |
| **EC2 with a public IP** | A network ACL | Security groups only allow; they can't deny |
| **A load balancer** | A network ACL on its subnet, or WAF | The server sees only the load balancer |
| **CloudFront in front** | WAF on CloudFront, or geo restriction | A network ACL won't help, because requests arrive from CloudFront's addresses |

For protection at the VPC boundary, there's also [Network Firewall](/en/posts/aws-14-vpc-connectivity/), which we covered in part fourteen.

## Detecting threats

Prevention isn't everything. You also need something to tell you when something's wrong:

| Service | The question it answers | Works from |
| --- | --- | --- |
| **GuardDuty** | Is something suspicious happening in my account? | CloudTrail, VPC Flow Logs and DNS logs, with no agents |
| **Inspector** | Does what I run have known vulnerabilities? | EC2 servers, ECR images and Lambda functions |
| **Macie** | Is there sensitive data somewhere it shouldn't be? | S3 |
| **Security Hub** | How's my security overall? | Gathers and prioritizes the findings of the others |
| **Detective** | Why did this finding happen? | Collects logs by itself and links them together, to find the root cause |

GuardDuty catches things like crypto mining, or credentials used from a strange place. Send its findings through EventBridge to SNS or Lambda so you act on them. It's one click to enable, so turn it on from the start in any serious account, as it has a free trial period.

### Compliance documents: AWS Artifact

An auditor asks for proof that AWS itself meets ISO or PCI standards? **AWS Artifact** gives you those reports on demand and free of charge, and it's also where you review and accept agreements with AWS. It covers AWS's side of the [shared responsibility model](/en/posts/aws-01-global-infrastructure/), and proving your side is still up to you.

## Hands-on: a key, a parameter and a secret

From CloudShell, create a key with an easy name, and encrypt some text:

```bash
KEY_ID=$(aws kms create-key --description "Series demo key" \
  --query KeyMetadata.KeyId --output text)
aws kms create-alias --alias-name alias/series-demo --target-key-id $KEY_ID

CIPHER=$(aws kms encrypt --key-id alias/series-demo \
  --plaintext "my secret note" --cli-binary-format raw-in-base64-out \
  --query CiphertextBlob --output text)

echo $CIPHER
```

You'll see unreadable text. Decrypt it. For a symmetric key, there's no need to say which key:

```bash
aws kms decrypt --ciphertext-blob "$CIPHER" \
  --query Plaintext --output text | base64 -d; echo
```

Now see where the real control lies. Disable the key, and try again:

```bash
aws kms disable-key --key-id $KEY_ID

aws kms decrypt --ciphertext-blob "$CIPHER" \
  --query Plaintext --output text

aws kms enable-key --key-id $KEY_ID
```

You'll get a `DisabledException`. The data hasn't changed, but it's useless without the key. Now keep a password in Parameter Store, encrypted with the same key, and read it with and without decryption:

```bash
aws ssm put-parameter --name /series/prod/db-password \
  --type SecureString --key-id alias/series-demo --value "S3cret-pass"

aws ssm get-parameter --name /series/prod/db-password \
  --query Parameter.Value --output text

aws ssm get-parameter --name /series/prod/db-password --with-decryption \
  --query Parameter.Value --output text

aws ssm get-parameters-by-path --path /series/prod \
  --query "Parameters[].Name"
```

And a secret in Secrets Manager, in the way your application would read it:

```bash
aws secretsmanager create-secret --name series/api-key \
  --secret-string '{"key":"abc123"}' --query Name --output text

aws secretsmanager get-secret-value --secret-id series/api-key \
  --query SecretString --output text
```

Finally, what did all of this leave behind? [CloudTrail](/en/posts/aws-25-monitoring-auditing/) has recorded who used the key, though it can take a few minutes:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt \
  --max-results 3 --query "Events[].[EventName,Username,EventTime]" --output table
```

::: security Delete after experimenting
A key costs $1 per month, prorated by the hour, and stops being charged once it's scheduled for deletion, so this costs under a cent or two:
:::

```bash
aws secretsmanager delete-secret --secret-id series/api-key \
  --force-delete-without-recovery
aws ssm delete-parameter --name /series/prod/db-password
aws kms delete-alias --alias-name alias/series-demo
aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 7
```

## Summary

- **KMS** keeps your keys safe, uses envelope encryption, and records every use.
- Keys are **Regional**, and AWS managed keys can't be shared across accounts.
- **Parameter Store** for settings, and **Secrets Manager** for what must rotate.
- **ACM** certificates are free and renew themselves, and CloudFront needs them in `us-east-1`.
- **WAF** and **Shield** stop attacks, and **GuardDuty**, **Inspector** and **Macie** detect what gets through.

## Test yourself

::: quiz
An application's database password must change every 30 days, both in the database and where the application reads it, with no code release each time. What fits?

- [x] Secrets Manager, with rotation turned on
- [ ] Parameter Store, with a `SecureString`
- [ ] KMS automatic key rotation
- [ ] An environment variable on the server

Secrets Manager changes the password on a schedule and updates the database too. The application asks for the current value each time, so it doesn't notice.

- **B:** This stores the value encrypted, but has no built-in rotation.
- **C:** This rotates an encryption key, not a database password.
- **D:** Someone would have to change it by hand on every server.

Review: [Secrets Manager](#secrets-manager) in this part, and [Rotate AWS Secrets Manager secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html) in the AWS docs.
:::

::: quiz
A team wants to share an encrypted EBS snapshot with another account, but the snapshot is encrypted with the `aws/ebs` key. What should it do?

- [ ] Add the other account to the `aws/ebs` key's policy
- [ ] Share the snapshot publicly
- [x] Copy it with a customer managed key, then share it and allow the account in that key's policy
- [ ] Turn off encryption on the snapshot

AWS managed keys can't be shared, so the snapshot has to be re-encrypted with your own key first. The other account then needs access to both the snapshot and the key.

- **A:** AWS managed keys can't be shared with other accounts.
- **B:** Only unencrypted snapshots can be shared publicly, and this would expose the data to anyone.
- **D:** An encrypted snapshot can't simply be switched to unencrypted.

Review: [Key policies](#key-policies) in this part, and [Share an Amazon EBS snapshot with other AWS accounts](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html) in the AWS docs.
:::

::: quiz
A site runs on an ALB in Frankfurt with CloudFront in front of it. The team requested an ACM certificate in Frankfurt, but can't select it in CloudFront. What should it do?

- [ ] Export the certificate, and upload it to CloudFront
- [ ] Move the ALB to `us-east-1`
- [ ] Wait for the certificate's next renewal
- [x] Request a certificate in `us-east-1` for CloudFront

CloudFront needs its certificate in `us-east-1`, wherever your application is. The ALB keeps using the one in its own Region.

- **A:** A normal ACM certificate can't be exported.
- **B:** The application can stay where it is, and only CloudFront's certificate has to be there.
- **C:** A renewal doesn't change a certificate's Region.

Review: [ACM: certificates without the hassle](#acm-certificates-without-the-hassle) in this part, and [Requirements for using SSL/TLS certificates with CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html) in the AWS docs.
:::

::: quiz
A site sits behind CloudFront, and one address is flooding it with requests. Where should the team block that address?

- [ ] A network ACL on the load balancer's subnet
- [x] A WAF rule on the CloudFront distribution
- [ ] A deny rule in the security group
- [ ] Shield Standard's settings

CloudFront is the first to see the visitor's address, so the block belongs there. An IP set or a rate-based rule in WAF does the job.

- **A:** Requests reach the subnet from CloudFront's addresses, so the attacker's address never appears there.
- **C:** A security group only allows, and can't deny.
- **D:** This is automatic protection from common network attacks, with no address lists of your own.

Review: [Blocking one address: where?](#blocking-one-address-where) in this part, and [Using AWS WAF with Amazon CloudFront](https://docs.aws.amazon.com/waf/latest/developerguide/cloudfront-features.html) in the AWS docs.
:::

::: quiz
A company wants to find known software vulnerabilities in its EC2 servers and ECR images, and to find personal data sitting in its S3 buckets. Which **two** services fit? (Choose two.)

- [x] Amazon Inspector
- [ ] Amazon GuardDuty
- [ ] AWS Shield
- [ ] AWS WAF
- [x] Amazon Macie

Inspector scans what you run for known vulnerabilities, and Macie finds sensitive data in S3.

- **B:** This detects suspicious activity in an account, such as stolen credentials being used.
- **C:** This protects against DDoS attacks.
- **D:** This filters web requests.

Review: [Detecting threats](#detecting-threats) in this part, and [What is Amazon Inspector?](https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html) and [What is Amazon Macie?](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html) in the AWS docs.
:::

::: quiz
A regulator requires a bank's encryption keys to live in a hardware security module dedicated to it, validated to FIPS, that only the bank controls. What fits?

- [ ] KMS with an AWS managed key
- [ ] KMS with a customer managed key
- [x] AWS CloudHSM
- [ ] Secrets Manager

CloudHSM gives you a cluster of HSMs dedicated to you, and you control the keys and users yourself.

- **A:** AWS manages this key and the hardware, and you can't change its permissions.
- **B:** You control this key's policy, but AWS manages the hardware behind it.
- **D:** This stores secrets such as passwords, and isn't a hardware module.

Review: [CloudHSM: your own hardware](#cloudhsm-your-own-hardware) in this part, and [What is AWS CloudHSM?](https://docs.aws.amazon.com/cloudhsm/latest/userguide/introduction.html) in the AWS docs.
:::

::: quiz
An auditor asks a company for AWS's own PCI compliance report. Separately, the security team needs to investigate the root cause of a GuardDuty finding. Which **two** services fit? (Choose two.)

- [x] AWS Artifact
- [ ] Amazon Macie
- [ ] AWS Config
- [x] Amazon Detective
- [ ] Amazon Inspector

Artifact gives you AWS's compliance reports on demand, and Detective links the logs together to find the root cause of a finding.

- **B:** This finds sensitive data in S3.
- **C:** This records and judges your own resources' settings, not AWS's compliance.
- **E:** This looks for known vulnerabilities in what you run.

Review: [Compliance documents: AWS Artifact](#compliance-documents-aws-artifact) and [Detecting threats](#detecting-threats) in this part, and [What is AWS Artifact?](https://docs.aws.amazon.com/artifact/latest/ug/what-is-aws-artifact.html) and [What is Amazon Detective?](https://docs.aws.amazon.com/detective/latest/userguide/what-is-detective.html) in the AWS docs.
:::

You've protected yourself from people. What about a whole Region going down, or having to bring a data center over to AWS? In [**part twenty-eight**](/en/posts/aws-28-disaster-recovery-migration/) we cover disaster recovery and migration.
