---
title: "S3: Object Storage Basics"
description: What object storage is and how it differs from disks, buckets and objects, who can reach them, versioning and replication, hosting a static site, and a hands-on where you watch versioning rescue a deleted file.
date: 2026-11-02
series: aws
part: 15
numbered: true
tags: [aws, s3]
---

In [part five](/en/posts/aws-05-ec2-storage/) we saw storage tied to servers. But photos, videos, backups and logs don't need a server at all. They need somewhere that keeps them safe and delivers them on request, however large they get. That's **S3**.

**S3** (Simple Storage Service) is one of AWS's oldest and most used services. There's no space to reserve, and you pay for what you store. AWS designs it for 99.999999999% durability, meaning the chance of losing a file is close to nil.

You'll see it everywhere: backups, user files, static sites, logs and data lakes for analysis.

## Object storage versus disks

| | Block (EBS) | File (EFS) | Object (S3) |
| --- | --- | --- | --- |
| **Looks like** | A disk | A shared folder | A key and a file through an API |
| **Reached by** | Usually one server | Several servers | Anyone allowed, over HTTP |
| **Changing a file** | Part of it | Part of it | You replace the whole object |
| **Size** | You reserve it | Grows by itself | No practical limit |

The point that matters for design: S3 isn't a disk you mount and run a database from, but it's ideal for any file you read or write as a whole.

## Buckets and objects

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="s3-caption">
<defs>
<marker id="s3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="290" height="222" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="165" y="40" text-anchor="middle" class="d-code">series-files-12345</text>
<text x="165" y="62" text-anchor="middle" class="d-small">A bucket in one Region</text>
<rect x="40" y="78" width="250" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="165" y="102" text-anchor="middle" class="d-code">index.html</text>
<rect x="40" y="126" width="250" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="165" y="150" text-anchor="middle" class="d-code">photos/2026/trip.jpg</text>
<rect x="40" y="174" width="250" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="165" y="198" text-anchor="middle" class="d-code">logs/app.log</text>
<rect x="370" y="14" width="250" height="222" rx="14" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="495" y="40" text-anchor="middle" class="d-label">One object</text>
<text x="410" y="78" text-anchor="middle" class="d-label">Key</text>
<text x="530" y="78" text-anchor="middle" class="d-code">photos/2026/trip.jpg</text>
<text x="410" y="112" text-anchor="middle" class="d-label">Data</text>
<text x="530" y="112" text-anchor="middle" class="d-small">The file itself</text>
<text x="410" y="146" text-anchor="middle" class="d-label">Metadata</text>
<text x="530" y="146" text-anchor="middle" class="d-small">Type, size, date</text>
<text x="410" y="180" text-anchor="middle" class="d-label">Tags</text>
<text x="530" y="180" text-anchor="middle" class="d-code">team=media</text>
<text x="410" y="214" text-anchor="middle" class="d-label">Version</text>
<text x="530" y="214" text-anchor="middle" class="d-code">3sL4kq...</text>
<line x1="290" y1="145" x2="368" y2="145" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#s3-arrow)"/>
</svg>
<figcaption id="s3-caption">A bucket holds objects, and each object has a key, data, information about it, tags and a version.</figcaption>
</figure>

**A bucket:**

- Lives in one Region you choose, even though S3 appears as a global service in the console.
- Must have a name unique across all AWS accounts, using lowercase letters, numbers and hyphens.

**An object:**

- Can be up to 50 TB.
- Its **key** is its full path, such as `photos/2026/trip.jpg`.
- **There are no real folders.** `photos/2026/` is part of the name, and the console merely displays it as a folder.

## Who can reach it?

Everything in S3 is **private by default**. When someone requests an object, AWS combines all the rules: they get through if a rule allows them and no rule denies them.

| Tool | Attached to | Used for |
| --- | --- | --- |
| **IAM policy** | The user or role | Permissions for your people and services |
| **Bucket policy** | The bucket | Public access, other accounts and enforcing rules |
| **Block Public Access** | The bucket or account | A safety lock that stops public access whatever the policies say |

For example: an EC2 server reading from S3? Give it an [IAM role](/en/posts/aws-02-iam/). Another account reading? A bucket policy allows it. This policy makes a whole bucket publicly readable, which is what a static site needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-site-bucket/*"
  }]
}
```

::: warning Keep Block Public Access on
It's on by default, and many S3 data leaks came from buckets opened by mistake. Turn it off only for a bucket that's meant to be public. We cover security in detail in [part seventeen](/en/posts/aws-17-s3-security/).
:::

## Versioning

Once it's on, replacing an object creates a new version rather than wiping the old one:

- **Writing over a file:** the old version stays, and you can go back to it.
- **Deleting:** adds a delete marker, and the data stays. Remove the marker and the file returns.
- **Suspending:** doesn't wipe existing versions.

You pay for every version, so pair it with [lifecycle rules](/en/posts/aws-16-s3-classes-lifecycle/) to clean up old ones.

## Replication

S3 automatically copies new objects to another bucket, even in another account. Versioning must be on at both ends.

| Type | Good for |
| --- | --- |
| **Between Regions (CRR)** | Compliance, being close to users, and disaster recovery |
| **Within a Region (SRR)** | Gathering logs in one place, or copying production to a test environment |

Note that existing objects move only with **Batch Replication**, replication doesn't pass along a chain of buckets, and permanently deleting a version isn't replicated, which protects you from malicious deletes.

## Hosting a static site

S3 can serve a complete HTML site: turn on **Static website hosting**, set `index.html`, and make the objects public with a policy like the one above.

That website link only works over HTTP, though. The better choice in production is a private bucket with [CloudFront](/en/posts/aws-12-cloudfront-global-accelerator/) and OAC in front of it, giving you HTTPS and higher speed without opening the bucket.

## Reacting to events

S3 can send a notification when something happens, such as a photo being uploaded. It sends it to SQS, SNS or Lambda directly, or to **EventBridge** if you want advanced filtering and more destinations. The classic example: for every photo uploaded, a Lambda function makes a thumbnail. We'll apply this in [part twenty-two](/en/posts/aws-22-serverless-design/).

## Performance

S3 handles at least **3,500 writes and 5,500 reads per second per prefix**, so spreading keys across several prefixes increases capacity. You also have tools for large files and long distances:

| Tool | What it does |
| --- | --- |
| **Multipart upload** | Uploads a file in parts in parallel, and if a part fails you repeat only that part. Preferred above 100 MB, required above 5 GB |
| **Transfer Acceleration** | Uploads pass through the nearest edge location, then AWS's network, for long distances |
| **Byte-range fetches** | Download a specific part of a file, to speed up parallel downloads or fetch only what you need |

## Hands-on: versioning rescues a deleted file

From CloudShell, create a bucket with a unique name and upload a page:

```bash
BUCKET=series-files-$RANDOM$RANDOM
aws s3 mb s3://$BUCKET

echo "<h1>Version 1</h1>" > index.html
aws s3 cp index.html s3://$BUCKET/
aws s3 ls s3://$BUCKET/
```

Try reaching the file from the internet. It returns `403`, because everything is private:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://$BUCKET.s3.$AWS_REGION.amazonaws.com/index.html
```

Now turn on versioning, write over the file, then delete it:

```bash
aws s3api put-bucket-versioning --bucket $BUCKET \
  --versioning-configuration Status=Enabled

echo "<h1>Version 2</h1>" > index.html
aws s3 cp index.html s3://$BUCKET/

aws s3 rm s3://$BUCKET/index.html
aws s3 ls s3://$BUCKET/
```

The file has gone from the list. But look at what really happened:

```bash
aws s3api list-object-versions --bucket $BUCKET --prefix index.html \
  --query "{Versions:Versions[].[VersionId,IsLatest],Markers:DeleteMarkers[].[VersionId,IsLatest]}"
```

Both versions are there, with a delete marker on top. Delete the marker and the file returns:

```bash
MARKER=$(aws s3api list-object-versions --bucket $BUCKET --prefix index.html \
  --query "DeleteMarkers[0].VersionId" --output text)

aws s3api delete-object --bucket $BUCKET --key index.html --version-id $MARKER

aws s3 cp s3://$BUCKET/index.html -
```

It prints `Version 2`. The file is back as if it had never been deleted.

::: security Delete after experimenting
A bucket with versions can't be deleted with a simple command. If you're carrying on with the next parts, keep it. Otherwise, from the S3 page select it and choose **Empty**, then **Delete**.
:::

## Summary

- **S3** is object storage with no practical limit, and you pay for what you store.
- A **bucket** sits in one Region with a unique name, and a **key** is an object's full path.
- Everything is **private by default**, so keep Block Public Access on.
- **Versioning** protects you from accidental deletes and overwrites, and **replication** copies objects to another bucket.
- For a static site in production: a private bucket with CloudFront.

## Test yourself

::: quiz
A design agency keeps client files in S3. Last week a staff member deleted some files by mistake, and a script overwrote others. The agency wants to be able to get both kinds back from now on, with the **least effort**. What should it turn on?

- [ ] Block Public Access
- [ ] Same-Region Replication
- [x] Versioning
- [ ] Transfer Acceleration

With versioning on, a delete only adds a marker and an overwrite creates a new version, so the old data stays and you can go back to it.

- **A:** This stops public access, and does nothing about deletes or overwrites.
- **B:** This needs versioning on anyway, and adds a second bucket to pay for.
- **D:** This speeds up uploads over long distances, and keeps no old copies.

Review: [Versioning](#versioning) in this part, and [Retaining multiple versions of objects with S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) in the AWS docs.
:::

::: quiz
A company keeps its marketing site in S3. It wants the site served over HTTPS on its own domain, with the bucket staying private. What fits?

- [x] A private bucket, with CloudFront and OAC in front of it
- [ ] Static website hosting, with a public bucket
- [ ] Static website hosting, with Block Public Access kept on
- [ ] An EC2 server that copies the files from S3 and serves them

CloudFront gives you HTTPS on your own domain, and OAC lets only CloudFront read from the bucket, so the bucket stays closed.

- **B:** The website endpoint only works over HTTP, and the bucket has to be public.
- **C:** The website endpoint needs public objects, so with the lock on visitors get `403`.
- **D:** This adds a server to run and patch for a site that doesn't need one.

Review: [Hosting a static site](#hosting-a-static-site) in this part, and [Website endpoints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html) in the AWS docs.
:::

::: quiz
A film studio uploads 40 GB video files to S3 over an unstable connection. Uploads often fail near the end and have to start over. What solves this?

- [ ] Byte-range fetches
- [ ] Transfer Acceleration alone
- [ ] Versioning on the bucket
- [x] Multipart upload

Multipart upload sends a file in parts, in parallel, and if one part fails you repeat only that part. It's also required for anything above 5 GB.

- **A:** These are for downloading part of a file, not for uploading.
- **B:** This shortens the path over long distances, but a failed upload would still start over.
- **C:** This keeps old versions, and doesn't help an upload finish.

Review: [Performance](#performance) in this part, and [Uploading and copying objects using multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) in the AWS docs.
:::

::: quiz
A regulator requires a company to keep a copy of its records bucket in a second Region, including the files already in the bucket. Versioning is on at both ends. What should it set up?

- [ ] Cross-Region Replication alone
- [x] Cross-Region Replication, plus Batch Replication for the existing files
- [ ] Same-Region Replication, plus Batch Replication
- [ ] A lifecycle rule that moves the files to the second Region

A replication rule copies only new objects, so existing ones need Batch Replication. Together they give you a full copy in the second Region that stays current.

- **A:** This copies only the objects written after the rule is set.
- **C:** This keeps the copy in the same Region, which doesn't meet the requirement.
- **D:** Lifecycle rules change a file's class or delete it, and don't move it between Regions.

Review: [Replication](#replication) in this part, and [Replicating objects within and across Regions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html) in the AWS docs.
:::

::: quiz
A server on EC2 must read from a private bucket, and an analytics team in another AWS account must read from it too. Block Public Access has to stay on. Which **two** steps fit? (Choose two.)

- [x] Give the server an IAM role with read permission
- [ ] Store a user's access keys in a file on the server
- [ ] Make the bucket publicly readable
- [x] Add a bucket policy that allows the other account
- [ ] Copy the objects to an EBS volume for the team to share

A role gives the server temporary credentials with no keys to store, and a bucket policy is how you let another account in. Neither of them makes anything public.

- **B:** Keys in a file can leak, and a role avoids them altogether.
- **C:** This exposes the data to everyone, and the lock would stop it anyway.
- **E:** This adds copies to manage, and a volume isn't how another account reads your data.

Review: [Who can reach it?](#who-can-reach-it) in this part, and [Example 2: Bucket owner granting cross-account bucket permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-walkthroughs-managing-access-example2.html) and [Use an IAM role to grant permissions to applications running on Amazon EC2 instances](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html) in the AWS docs.
:::

But does every file deserve the same price? A file untouched for two years shouldn't cost you the same as a photo requested every second. In [**part sixteen**](/en/posts/aws-16-s3-classes-lifecycle/) we save a lot with storage classes and lifecycle rules.
