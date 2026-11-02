---
title: "S3: Security and Encryption"
description: How to encrypt your data in S3 and who holds the keys, enforcing HTTPS, sharing a private file with a signed link, understanding CORS, and protecting data from deletion with MFA Delete and Object Lock, with a hands-on.
date: 2026-11-02
series: aws
part: 17
numbered: true
tags: [aws, s3, security]
---

In [part fifteen](/en/posts/aws-15-s3-basics/) we learned that everything is private by default, and that Block Public Access protects you from opening things by mistake. This part covers the remaining layers: encryption, sharing files safely, and protecting data even from the account's own administrators.

## Encryption at rest

You have two questions: **where does encryption happen?** and **who holds the key?**

<figure class="diagram">
<svg viewBox="0 0 640 214" role="img" aria-labelledby="enc-caption">
<defs>
<marker id="enc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="320" y="22" text-anchor="middle" class="d-small">Server-side encryption (SSE): S3 encrypts the file when it arrives</text>
<rect x="20" y="34" width="150" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="58" text-anchor="middle" class="d-label">Your app</text>
<text x="95" y="78" text-anchor="middle" class="d-small">A plain file</text>
<rect x="470" y="34" width="150" height="58" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="545" y="58" text-anchor="middle" class="d-label">S3</text>
<text x="545" y="78" text-anchor="middle" class="d-small">Encrypts, then stores</text>
<text x="320" y="54" text-anchor="middle" class="d-small">Encrypted in transit with TLS</text>
<line x1="170" y1="64" x2="468" y2="64" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#enc-arrow)"/>
<text x="320" y="130" text-anchor="middle" class="d-small">Client-side encryption: you encrypt before sending</text>
<rect x="20" y="144" width="150" height="58" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="95" y="168" text-anchor="middle" class="d-label">Your app</text>
<text x="95" y="188" text-anchor="middle" class="d-small">Encrypts first</text>
<rect x="470" y="144" width="150" height="58" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="545" y="168" text-anchor="middle" class="d-label">S3</text>
<text x="545" y="188" text-anchor="middle" class="d-small">Stores it as received</text>
<text x="320" y="164" text-anchor="middle" class="d-small">Encrypted before it leaves, with TLS on top</text>
<line x1="170" y1="174" x2="468" y2="174" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#enc-arrow)"/>
</svg>
<figcaption id="enc-caption">With SSE, S3 encrypts the file after it arrives; with client-side encryption, S3 never sees the file unencrypted.</figcaption>
</figure>

| Type | Who holds the key | When to choose it |
| --- | --- | --- |
| **SSE-S3** | S3 entirely | The default for every new object, and enough for most cases |
| **SSE-KMS** | KMS, with you controlling its permissions | You want a record of every use of the key, and finer control |
| **DSSE-KMS** | KMS, with two layers of encryption | Regulations requiring two layers |
| **SSE-C** | You, sending it with every request | Blocked by default on new buckets since April 2026 |
| **Client-side** | You entirely | You never want AWS to see the data |

### Watch out with SSE-KMS

Every read or write calls KMS, and KMS has a limit on requests per second depending on the Region. If you have heavy load, turn on **S3 Bucket Keys**: an intermediate key at the bucket level that greatly reduces KMS requests, and with them the cost.

Anyone reading the object also needs permission on S3 **and on the KMS key** together. This is a well-known cause of `AccessDenied` errors even when the S3 policy is right.

## Encryption in transit

S3 accepts both HTTP and HTTPS. To enforce HTTPS, deny any unencrypted request using the `aws:SecureTransport` condition:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": [
      "arn:aws:s3:::my-bucket",
      "arn:aws:s3:::my-bucket/*"
    ],
    "Condition": { "Bool": { "aws:SecureTransport": "false" } }
  }]
}
```

In the same way you can enforce a particular type of encryption on every upload. The policy is evaluated before default encryption, so a denied request never reaches it.

## Sharing a private file: signed links

Want a customer to download their invoice without opening the bucket or giving them an account? A **pre-signed URL** is a link carrying a signature and an expiry:

- It carries the **signer's permissions**, so if they can't read the file, the link won't work.
- It works for **downloads and uploads**, such as sending a photo from the browser directly to S3 without going through your server.
- Its lifetime is limited, and if signed with a temporary role it ends when the session does.

## CORS: when the browser stops you

**CORS** is a protection in the browser, not in S3. An **origin** is the protocol, domain and port. So if a page at `https://app.example.com` requests a file from `https://my-bucket.s3.amazonaws.com`, the browser treats them as two different origins, and asks the bucket: do you allow this?

If you get a CORS error in the browser, add the settings to the bucket:

```json
[{
  "AllowedOrigins": ["https://app.example.com"],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}]
```

## Protection from deletion

Even correct permissions don't protect you from a mistake, a compromised account or ransomware. You have three layers:

| Tool | What it does | Notes |
| --- | --- | --- |
| **MFA Delete** | Requires an MFA code to permanently delete a version or suspend versioning | Only the root user can enable it, through commands |
| **Object Lock** | Blocks deleting or changing a version for a period | Versioning must be on |
| **Glacier Vault Lock** | Locks the policy of an older Glacier vault for good | For older vaults; Object Lock is better for anything new |

### Object Lock modes

| Mode | Who can delete before the period ends |
| --- | --- |
| **Governance** | Only users with a special permission |
| **Compliance** | Nobody, not even the root user |

There's also **Legal Hold**: a lock with no set period that stays until you remove it, useful for legal cases.

::: warning Compliance has no way back
Lock a file in Compliance mode for ten years and you'll pay for it for ten years, and nobody can delete it, not even AWS support. Try Governance mode with a short period first.
:::

## Logs and monitoring

- **Access logs:** record every request in a **different** bucket. Don't use the same bucket, because every log entry generates another, growing endlessly and growing your bill.
- **CloudTrail:** records management operations, plus data operations if you turn them on. We cover it in the [security and operations section](/en/series/aws/#section-9).

## Access Points: a door for each team

If many teams use one big bucket, the bucket policy becomes long and risky. **Access Points** give each team a door with its own name and policy:

- A `finance` access point allows the finance team on `finance/*` only.
- A `sales` access point allows the sales team on `sales/*` only.
- You can also make an access point accept traffic only from inside one VPC.

## Hands-on: encryption, a signed link and enforcing HTTPS

We'll carry on with the same bucket in `BUCKET`. Upload a file and check its default encryption, then upload one with KMS:

```bash
echo "secret invoice" > invoice.txt
aws s3 cp invoice.txt s3://$BUCKET/invoice.txt

aws s3api head-object --bucket $BUCKET --key invoice.txt \
  --query ServerSideEncryption

aws s3 cp invoice.txt s3://$BUCKET/invoice-kms.txt --sse aws:kms

aws s3api head-object --bucket $BUCKET --key invoice-kms.txt \
  --query "[ServerSideEncryption,SSEKMSKeyId]"
```

The first shows `AES256`, meaning SSE-S3, and the second `aws:kms` with the key's ID.

Now create a signed link valid for 60 seconds, and try it:

```bash
URL=$(aws s3 presign s3://$BUCKET/invoice.txt --expires-in 60)

curl -s "$URL"
```

It prints the file's contents, even though the bucket is private. Wait a minute and repeat the same `curl` command, and it returns `AccessDenied` with a message that the request has expired.

Now enforce HTTPS on the bucket:

```bash
aws s3api put-bucket-policy --bucket $BUCKET --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyHttp",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": ["arn:aws:s3:::'$BUCKET'", "arn:aws:s3:::'$BUCKET'/*"],
    "Condition": {"Bool": {"aws:SecureTransport": "false"}}
  }]
}'

URL=$(aws s3 presign s3://$BUCKET/invoice.txt --expires-in 300)

curl -s -o /dev/null -w "https: %{http_code}\n" "$URL"
curl -s -o /dev/null -w "http: %{http_code}\n" "${URL/https:/http:}"
```

The same link returns `200` over HTTPS and `403` over HTTP.

::: security Delete after experimenting
We no longer need this bucket. From the S3 page select it and choose **Empty**, then **Delete**.
:::

## Summary

- Every new object is encrypted with **SSE-S3** automatically; choose **SSE-KMS** for control and a record, along with **Bucket Keys**.
- Enforce **HTTPS** with the `aws:SecureTransport` condition.
- **Signed links** share a private file temporarily without opening the bucket.
- **CORS** comes from the browser, and you solve it in the bucket's settings.
- **Object Lock** protects you from deletion, even from root in Compliance mode.

S3 isn't the only option. What if you have a Windows system, an office wanting to reach cloud storage, or millions of files to move? In [**part eighteen**](/en/posts/aws-18-storage-transfer/) we cover the remaining storage and transfer services.
