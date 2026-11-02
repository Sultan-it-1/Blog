---
title: "S3: Storage Classes and Lifecycle"
description: Not every file deserves the same price. Get to know S3's storage classes from Standard to Deep Archive, when to choose each, how lifecycle rules move your files automatically, and how much you can save on your bill.
date: 2026-11-02
series: aws
part: 16
numbered: true
tags: [aws, s3]
---

In [part fifteen](/en/posts/aws-15-s3-basics/) we stored everything the default way. But think about your application: a product photo is requested every second, while a five-year-old invoice is opened only during an audit. Why pay the same for both?

Storage classes give you that choice: the less a file is accessed, the less it costs to store, and the more it costs or the longer it takes to retrieve.

## Durability and availability

Two terms you need to tell apart:

- **Durability:** will the file be lost? 99.999999999% for all classes, noting that classes in a single Availability Zone lose their data if that zone is destroyed.
- **Availability:** can you reach it right now? This varies by class, such as 99.99% for Standard.

## The classes

| Class | Suits | Retrieval | Minimum period | Approx. price |
| --- | --- | --- | --- | --- |
| **Standard** | Frequently requested data | Instant | None | 0.023 |
| **Intelligent-Tiering** | Unknown access patterns | Instant in the automatic tiers | None | By tier |
| **Standard-IA** | About once a month | Instant, with a retrieval fee | 30 days | 0.0125 |
| **One Zone-IA** | Data you can recreate | Instant, with a fee | 30 days | 0.01 |
| **Glacier Instant Retrieval** | Once every three months | Instant, with a higher fee | 90 days | 0.004 |
| **Glacier Flexible Retrieval** | Once or twice a year | Minutes to hours | 90 days | 0.0036 |
| **Glacier Deep Archive** | Less than once a year | 12 to 48 hours | 180 days | 0.00099 |

Prices are in dollars per gigabyte per month, approximate for US Regions, so check the pricing page for yours.

All these classes keep data in three or more Availability Zones, except **One Zone-IA**. There's also **S3 Express One Zone**: very high performance with single-digit millisecond latency, in one Availability Zone, using a special type of bucket, at a higher price. It suits analytics and model training that need great speed.

### Intelligent-Tiering: when you don't know

If you can't tell how often a file will be requested, this class moves it by itself according to use:

| Tier | When | Retrieval |
| --- | --- | --- |
| **Frequent Access** | At the start | Instant |
| **Infrequent Access** | After 30 days without access | Instant |
| **Archive Instant Access** | After 90 days without access | Instant |
| **Archive Access** | Optional, from 90 days | Hours |
| **Deep Archive Access** | Optional, from 180 days | Up to 12 hours |

You pay a small monitoring fee per object with no retrieval fees, and if a file is requested it returns to the first tier.

### Glacier Flexible and Deep Archive: request before reading

In these classes you can't read a file directly. You must first request its **restore**, choosing a speed:

| Class | Expedited | Standard | Bulk |
| --- | --- | --- | --- |
| **Flexible Retrieval** | 1 to 5 minutes | 3 to 5 hours | 5 to 12 hours |
| **Deep Archive** | Not available | 12 hours | 48 hours |

::: warning Three traps in the cheap classes
- **Minimum storage period:** delete a file from Glacier Deep Archive after a month, and you pay for the full 180 days.
- **Minimum billable size:** the IA classes and Glacier Instant bill any object as at least 128 KB, so thousands of small files can cost more than Standard.
- **Retrieval fees:** if you read data a lot, Standard-IA can end up pricier than Standard.
:::

## Lifecycle

You don't need to move files by hand. **Lifecycle** rules do it automatically according to a file's age. Take an application's logs, for example:

<figure class="diagram">
<svg viewBox="0 0 640 170" role="img" aria-labelledby="lifecycle-caption">
<defs>
<marker id="life-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="70" y="34" text-anchor="middle" class="d-small">Day 0</text>
<rect x="20" y="46" width="100" height="62" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="70" y="82" text-anchor="middle" class="d-label">Standard</text>
<text x="195" y="34" text-anchor="middle" class="d-small">Day 30</text>
<rect x="145" y="46" width="100" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="195" y="82" text-anchor="middle" class="d-label">Standard-IA</text>
<text x="320" y="34" text-anchor="middle" class="d-small">Day 90</text>
<rect x="270" y="46" width="100" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="72" text-anchor="middle" class="d-label">Glacier</text>
<text x="320" y="92" text-anchor="middle" class="d-label">Flexible</text>
<text x="445" y="34" text-anchor="middle" class="d-small">Day 365</text>
<rect x="395" y="46" width="100" height="62" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="445" y="72" text-anchor="middle" class="d-label">Deep</text>
<text x="445" y="92" text-anchor="middle" class="d-label">Archive</text>
<text x="570" y="34" text-anchor="middle" class="d-small">Day 2555</text>
<rect x="520" y="46" width="100" height="62" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="570" y="82" text-anchor="middle" class="d-label">Delete</text>
<line x1="120" y1="77" x2="143" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<line x1="245" y1="77" x2="268" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<line x1="370" y1="77" x2="393" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<line x1="495" y1="77" x2="518" y2="77" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#life-arrow)"/>
<text x="320" y="136" text-anchor="middle" class="d-small">Cheaper storage; slower, pricier retrieval</text>
<line x1="20" y1="150" x2="618" y2="150" stroke="var(--color-line-strong)" stroke-width="2" marker-end="url(#life-arrow)"/>
</svg>
<figcaption id="lifecycle-caption">A single rule moves the file through the classes as it ages, then deletes it after seven years.</figcaption>
</figure>

A rule has two kinds of action, and you apply it to a specific prefix or tag:

| Action | Examples |
| --- | --- |
| **Transition** | Move the file to a cheaper class after a number of days |
| **Expiration** | Delete the file after a period, or old versions, or uploads that never finished |

A few things to watch for:

- **Moves only go down** the stairs, and the minimum before Standard-IA is 30 days.
- **Files smaller than 128 KB** don't move by default, because moving them costs more than it saves.
- **The move itself has a fee** per thousand objects, so watch out for millions of small files.

::: tip Two rules to add to any bucket
Delete **incomplete multipart uploads** after a week, since they're billed and don't appear in listings. And if versioning is on, delete **old versions** after a period that suits you.
:::

## How do you know what to choose?

You don't need to guess. You have tools that read your actual use:

- **Storage Class Analysis:** watches access to a prefix or bucket, and suggests when to move from Standard to Standard-IA.
- **Storage Lens:** a dashboard across all your accounts: sizes, growth, and buckets with incomplete uploads or no encryption. It has free metrics and paid advanced ones.

If you have millions of files and want to do something to all of them at once, such as changing class or copying, **S3 Batch Operations** runs it on a list from **S3 Inventory**, with a report of the results.

On the other side, if you share huge data with another party, **Requester Pays** has them pay the request and download costs instead of you.

And if you upload millions of small files you won't read one by one, such as logs, bundle them into one archive first. Every `PUT` is a paid request, so one large upload can cost far less than a million small ones.

## Hands-on: classes and a lifecycle rule

We'll carry on with the bucket from the previous part. If your CloudShell session ended, set its name in `BUCKET` again. Upload a file to a specific class, and check the class:

```bash
echo "monthly report" > report.txt

aws s3 cp report.txt s3://$BUCKET/reports/report.txt --storage-class STANDARD_IA

aws s3api head-object --bucket $BUCKET --key reports/report.txt \
  --query StorageClass
```

Now add the lifecycle rule from the diagram to the `logs/` prefix:

```bash
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET \
  --lifecycle-configuration '{
  "Rules": [{
    "ID": "logs-rule",
    "Status": "Enabled",
    "Filter": {"Prefix": "logs/"},
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER"},
      {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
    ],
    "Expiration": {"Days": 2555},
    "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
  }]
}'

aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET \
  --query "Rules[0].Transitions" --output table
```

Here's the fun part: upload a file to Glacier and try to read it:

```bash
echo "old invoice" > old.txt
aws s3 cp old.txt s3://$BUCKET/archive/old.txt --storage-class GLACIER

aws s3 cp s3://$BUCKET/archive/old.txt -
```

It returns an `InvalidObjectState` error, because the file is stored but can't be read directly. Request a restore:

```bash
aws s3api restore-object --bucket $BUCKET --key archive/old.txt \
  --restore-request '{"Days": 1, "GlacierJobParameters": {"Tier": "Standard"}}'

aws s3api head-object --bucket $BUCKET --key archive/old.txt \
  --query "[StorageClass,Restore]"
```

You'll see `ongoing-request="true"`. After 3 to 5 hours it becomes `false`, and a temporary copy is available to read for one day.

::: security The cost of this experiment
The files are tiny, so they cost less than a cent, even with Glacier's minimum period. Keep the bucket if you're carrying on to the next part.
:::

## Summary

- **The less the access, the lower the storage price**, and the higher the cost or time of retrieval.
- If you don't know the access pattern, **Intelligent-Tiering** moves files by itself.
- Watch out for the **minimum storage period**, the **minimum billable size** and **retrieval fees**.
- **Lifecycle** rules move and delete files automatically, and always add a rule for incomplete uploads.
- **Storage Lens and Storage Class Analysis** let you decide with numbers, not guesses.

## Test yourself

::: quiz
A startup is launching a new data platform. Some files may sit untouched for months and then be read heavily, and nobody can predict which. It wants lower storage costs, with no retrieval fees and no rules to maintain. Which class fits?

- [ ] Standard-IA
- [ ] One Zone-IA
- [ ] Glacier Flexible Retrieval
- [x] Intelligent-Tiering

It watches each file's use and moves it between tiers by itself, for a small monitoring fee and with no retrieval fees.

- **A:** This charges for every retrieval, so a heavily read file can end up costing more.
- **B:** This also charges for retrieval, and keeps data in a single Availability Zone.
- **C:** Files here need a restore before reading, which can take hours.

Review: [Intelligent-Tiering: when you don't know](#intelligent-tiering-when-you-dont-know) in this part, and [Managing storage costs with Amazon S3 Intelligent-Tiering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html) in the AWS docs.
:::

::: quiz
A video service keeps low-resolution copies of its films, which it can regenerate from the originals at any time. Each is read about once a month and must open instantly. Which class costs the least while meeting this?

- [ ] Standard
- [x] One Zone-IA
- [ ] Glacier Deep Archive
- [ ] Glacier Flexible Retrieval

The copies can be regenerated, so losing them with a zone isn't a disaster, and there's no need to pay for three zones. Retrieval stays instant.

- **A:** This works, but at a higher price for protection this data doesn't need.
- **C:** A restore here takes 12 to 48 hours.
- **D:** Files here need a restore before reading, which takes minutes to hours.

Review: [The classes](#the-classes) in this part, and [Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html) in the AWS docs.
:::

::: quiz
A company's application logs must stay instantly readable for 30 days, then be archived cheaply for a year, then be removed. The team doesn't want any scripts to run. What fits?

- [x] A lifecycle rule on the `logs/` prefix, with a transition and an expiration
- [ ] A scheduled Lambda function that moves and deletes the files
- [ ] Storage Lens, with its advanced metrics
- [ ] Cross-Region Replication to a cheaper Region

A lifecycle rule moves files to a cheaper class at the age you set and deletes them later, with nothing for you to run.

- **B:** This works, but it's code you have to write and maintain.
- **C:** This shows you numbers, and doesn't move or delete anything.
- **D:** This makes more copies, and neither archives nor removes the originals.

Review: [Lifecycle](#lifecycle) in this part, and [Managing the lifecycle of objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) in the AWS docs.
:::

::: quiz
An auditor's script tries to read a 20 MB file stored in Glacier Flexible Retrieval, and gets an `InvalidObjectState` error. The auditor needs the file within 10 minutes. What should the team do?

- [ ] Give the script's role the `s3:GetObject` permission
- [ ] Request a restore with the Bulk option
- [x] Request a restore with the Expedited option
- [ ] Add a lifecycle rule moving the file back to Standard

In this class a file has to be restored before it can be read, and Expedited typically makes a file this size available in 1 to 5 minutes.

- **A:** A missing permission returns `AccessDenied`, not this error.
- **B:** This is the cheapest option, but it takes 5 to 12 hours.
- **D:** Lifecycle moves only go down the stairs, never back up to Standard.

Review: [Glacier Flexible and Deep Archive: request before reading](#glacier-flexible-and-deep-archive-request-before-reading) in this part, and [Understanding archive retrieval options](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html) in the AWS docs.
:::

::: quiz
To save money, a team uploaded millions of 10 KB images to Standard-IA. The application reads them all day, and the bill went up. Which **two** reasons explain this? (Choose two.)

- [ ] Standard-IA charges a monitoring fee per object
- [x] Each object is billed as at least 128 KB
- [x] Every read carries a retrieval fee
- [ ] Standard-IA costs more per gigabyte than Standard
- [ ] Standard-IA stores an extra copy in a fourth Availability Zone

A 10 KB image is billed as 128 KB in this class, and its low storage price only pays off for data that's rarely read. Data this small and this busy belongs in Standard.

- **A:** The monitoring fee belongs to Intelligent-Tiering.
- **D:** It costs less per gigabyte, which is why it looks attractive.
- **E:** It uses three or more zones just like Standard, so the extra cost doesn't come from there.

Review: [The classes](#the-classes) in this part, and [Understanding and managing Amazon S3 storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html) in the AWS docs.
:::

Your data is now in the right place at the right price, but who can reach it? In [**part seventeen**](/en/posts/aws-17-s3-security/) we cover encryption, signed links and locks against deletion.
