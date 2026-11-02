---
title: "More Storage and Transfer Services"
description: Ready-made file systems in FSx, linking your office to cloud storage with Storage Gateway, moving data with DataSync and Transfer Family, what to do when your data outgrows the internet, and a full comparison of storage services.
date: 2026-11-02
series: aws
part: 18
numbered: true
tags: [aws, storage]
---

In the [previous parts](/en/posts/aws-17-s3-security/) we covered S3 in detail. But there are cases it doesn't solve: a Windows application needing a shared folder, servers in your office wanting to reach the cloud, a partner sending files over SFTP, or huge data that has to move.

Here's this part's map:

| You want | Use |
| --- | --- |
| A Windows file system or very high performance | **Amazon FSx** |
| Your office servers reaching cloud storage | **Storage Gateway** |
| Moving and syncing large data on a schedule | **DataSync** |
| Partners uploading files over SFTP | **Transfer Family** |
| Physically moving massive amounts | **Data Transfer Terminal** |

## Amazon FSx: ready-made file systems

We've seen [EFS](/en/posts/aws-05-ec2-storage/) for a shared Linux file system. **FSx** runs well-known file systems for you as a managed service, so you don't have to manage them yourself:

| Type | Protocol | Good for |
| --- | --- | --- |
| **FSx for Windows** | SMB | Windows applications and shared folders, tied into Active Directory |
| **FSx for Lustre** | Lustre | High-performance computing and model training, integrates with S3, Linux devices only |
| **FSx for NetApp ONTAP** | NFS, SMB and iSCSI | Moving NetApp systems, and different operating systems on the same data |
| **FSx for OpenZFS** | NFS | Linux workloads, moving ZFS systems, instant snapshots and clones |

**FSx for Lustre** has two options: **Scratch** is cheap and fast for temporary data, but the data has no copies, so a failed disk loses it. **Persistent** is for long-term data, with copies inside the Availability Zone.

## Storage Gateway: your office and the cloud

Have servers in your office and want to benefit from the cloud without changing your applications? **Storage Gateway** is software you run on-site as a virtual machine. It presents ordinary storage to your applications, while the data actually lives in AWS, with a local cache for recent files.

<figure class="diagram">
<svg viewBox="0 0 640 230" role="img" aria-labelledby="gateway-caption">
<defs>
<marker id="gw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="14" y="14" width="300" height="202" rx="14" fill="none" stroke="var(--color-line-strong)"/>
<text x="164" y="42" text-anchor="middle" class="d-label">Your office</text>
<rect x="34" y="70" width="110" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="89" y="105" text-anchor="middle" class="d-label">Your apps</text>
<rect x="180" y="70" width="118" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="239" y="96" text-anchor="middle" class="d-label">Gateway</text>
<text x="239" y="116" text-anchor="middle" class="d-small">With a local cache</text>
<text x="164" y="168" text-anchor="middle" class="d-small">NFS, SMB, iSCSI or tape</text>
<rect x="400" y="14" width="226" height="202" rx="14" fill="none" stroke="var(--color-accent)" stroke-dasharray="6 6"/>
<text x="513" y="34" text-anchor="middle" class="d-small">AWS</text>
<rect x="416" y="44" width="190" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="511" y="71" text-anchor="middle" class="d-label">S3</text>
<rect x="416" y="100" width="190" height="44" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="511" y="127" text-anchor="middle" class="d-label">EBS snapshots</text>
<rect x="416" y="156" width="190" height="44" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="511" y="183" text-anchor="middle" class="d-label">Glacier</text>
<line x1="144" y1="100" x2="178" y2="100" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
<line x1="298" y1="90" x2="414" y2="66" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
<line x1="298" y1="100" x2="414" y2="122" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
<line x1="298" y1="110" x2="414" y2="178" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#gw-arrow)"/>
</svg>
<figcaption id="gateway-caption">Applications in your office see ordinary storage through the gateway, which keeps the data in S3, EBS snapshots or Glacier.</figcaption>
</figure>

| Type | Your apps see it as | Where the data is | Example |
| --- | --- | --- | --- |
| **S3 File Gateway** | An NFS or SMB folder | Objects in S3 | Shared folders and file backups |
| **Volume Gateway** | An iSCSI disk | S3 with EBS snapshots | Disks for existing servers, cached or with a full local copy |
| **Tape Gateway** | A virtual tape library | S3, then Glacier | Backup software that relies on tape |

There's a fourth type called **FSx File Gateway** that's no longer available to new customers, and AWS advises connecting to FSx directly.

## Moving data

### DataSync

**DataSync** moves and syncs large data on a schedule:

- **From where to where:** from NFS, SMB or HDFS servers or object storage, to S3, EFS or FSx, and between AWS services themselves.
- **Agent:** you run an agent on-site to move from your office, and don't need one between AWS services.
- **It moves only what changed** on each run, preserves permissions and dates, and verifies data integrity.

### Transfer Family

Have partners or older systems sending files over **SFTP**, **FTPS**, **FTP** or **AS2**, and don't want to run a server for them? **Transfer Family** gives you a managed receiving endpoint, and the files go to S3 or EFS. Users come from within the service, Active Directory or your own identity system.

Note that FTP is unencrypted, so it's available only inside a VPC. You pay by the hour for each endpoint, even without use.

### When your data outgrows the internet

Before choosing how to move data, do the math. These are theoretical times at the line's full speed, and reality is slower:

| Size | 100 Mbps | 1 Gbps | 10 Gbps |
| --- | --- | --- | --- |
| **1 TB** | 22 hours | 2 hours | 13 minutes |
| **10 TB** | 9 days | 22 hours | 2 hours |
| **100 TB** | 93 days | 9 days | 22 hours |
| **1 PB** | 2.5 years | 93 days | 9 days |

You have these options for large amounts:

- **DataSync** if your line can take it, with ongoing sync.
- **Direct Connect** if the transfer is large and continuous, as explained in [part fourteen](/en/posts/aws-14-vpc-connectivity/).
- **Data Transfer Terminal:** physical sites you visit with your own storage devices, connecting them to AWS's network at high speed.

::: note What about Snowball?
You may read about **AWS Snowball Edge**, devices AWS ships to you to fill and send back. But the service has been closed to new customers since November 2025, and [AWS has announced](https://aws.amazon.com/snowball/) the end of support in its commercial Regions on December 31, 2026. For computing at remote sites, AWS points to **Outposts**. If you're studying for the Solutions Architect exam, its guide still lists the Snow Family, so remember the idea: move the data on a device when the line would take too long.
:::

## Comparing storage services

| Service | Type | Good for |
| --- | --- | --- |
| **S3** | Object | Files, photos, backups and static sites |
| **S3 Glacier** | Object archive | Data that's rarely requested |
| **EBS** | Network disk | A disk for one server, and databases |
| **Instance Store** | Temporary local disk | Top speed for temporary data |
| **EFS** | Linux files | A folder shared between several servers |
| **FSx for Windows** | SMB files | Shared folders for Windows applications |
| **FSx for Lustre** | High-performance files | High-performance computing and model training |
| **FSx for ONTAP** | Multi-protocol files | Moving NetApp systems |
| **FSx for OpenZFS** | NFS files | Linux workloads and moving ZFS systems |
| **Storage Gateway** | Bridge | Your office reaching cloud storage |
| **DataSync** | Transfer | Scheduled sync |
| **Transfer Family** | Transfer | Receiving files over SFTP and friends |

## Hands-on: syncing with DataSync

We'll move files between two buckets, which needs no agent. From CloudShell, prepare two buckets and some files:

```bash
SRC=series-src-$RANDOM$RANDOM
DST=series-dst-$RANDOM$RANDOM

aws s3 mb s3://$SRC
aws s3 mb s3://$DST

for i in 1 2 3; do
  echo "file $i" > file$i.txt
  aws s3 cp file$i.txt s3://$SRC/
done

echo "source: $SRC  destination: $DST"
```

Open **DataSync** in the console and choose **Create task**:

1. **Source:** create a new location of type S3, select the `series-src-...` bucket, and choose to create an IAM role automatically.
2. **Destination:** the same with the `series-dst-...` bucket.
3. **Settings:** name the task `series-sync`, choose **Enhanced** if a mode option appears, and leave the rest as it is.
4. **Run:** create the task, then choose **Start**.

When it finishes, check the destination:

```bash
aws s3 ls s3://$DST/
```

Now add one file and run the task again:

```bash
echo "file 4" > file4.txt
aws s3 cp file4.txt s3://$SRC/
```

On the new run's page you'll find one file transferred, because DataSync moves only what changed. That's what sets it apart from a full copy every time.

::: security Delete after experimenting
The cost here is a few cents. Delete the task and both locations from DataSync, then the roles it created in IAM. Finally delete the two buckets:
:::

```bash
aws s3 rb s3://$SRC --force
aws s3 rb s3://$DST --force
```

## Summary

- **FSx** offers ready-made file systems: Windows, Lustre, ONTAP and OpenZFS.
- **Storage Gateway** lets your office see the cloud as ordinary storage.
- **DataSync** is for scheduled sync, and **Transfer Family** for receiving over SFTP.
- Work out the transfer time before deciding, and note that Snowball is closed to new customers.

## Test yourself

::: quiz
A company is moving a Windows application that keeps its files on a shared SMB folder, with users signing in through Active Directory. It wants a managed service with no file servers to run. What fits?

- [x] FSx for Windows File Server
- [ ] Amazon EFS
- [ ] FSx for Lustre
- [ ] Amazon S3

This gives Windows applications a real SMB file share tied into Active Directory, and AWS runs it for you.

- **B:** EFS is a shared file system for Linux, over NFS.
- **C:** This is for high-performance computing, and works with Linux devices only.
- **D:** S3 is reached through an API, and isn't a folder an application can open over SMB.

Review: [Amazon FSx: ready-made file systems](#amazon-fsx-ready-made-file-systems) in this part, and [What is FSx for Windows File Server?](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html) in the AWS docs.
:::

::: quiz
A research team runs a three-day simulation on a Linux cluster. It reads its input from S3, needs very high throughput, and saves its results back to S3, so a failed file system would only mean a re-run. Which option costs the least?

- [ ] FSx for Windows File Server
- [ ] FSx for Lustre, with a Persistent file system
- [x] FSx for Lustre, with a Scratch file system
- [ ] Amazon EFS

Lustre is built for this speed and integrates with S3, and Scratch is the cheap option for temporary data, since nothing here depends on the data surviving a failure.

- **A:** This is for SMB file shares, not high-performance Linux clusters.
- **B:** This suits long-term data, and you'd pay for copies the team doesn't need.
- **D:** This is a general shared folder, and isn't built for this level of performance.

Review: [Amazon FSx: ready-made file systems](#amazon-fsx-ready-made-file-systems) in this part, and [Deployment and storage class options for FSx for Lustre file systems](https://docs.aws.amazon.com/fsx/latest/LustreGuide/using-fsx-lustre.html) in the AWS docs.
:::

::: quiz
A hospital's backup software writes to physical tapes, and staff are tired of storing and shipping them. It wants the backups in AWS, without changing the backup software. What fits?

- [ ] S3 File Gateway
- [x] Tape Gateway
- [ ] Volume Gateway
- [ ] Transfer Family

This presents a virtual tape library to the backup software, and the data goes to S3 and then Glacier.

- **A:** This shows applications an NFS or SMB folder, while this software writes to tape.
- **C:** This shows servers an iSCSI disk, not a tape library.
- **D:** This receives files over protocols such as SFTP, which tape-based software doesn't use.

Review: [Storage Gateway: your office and the cloud](#storage-gateway-your-office-and-the-cloud) in this part, and [What is Tape Gateway?](https://docs.aws.amazon.com/storagegateway/latest/tgw/WhatIsStorageGateway.html) in the AWS docs.
:::

::: quiz
A new AWS customer has 100 TB on its own storage devices, which must be in S3 within two weeks. Its only line runs at 100 Mbps. What fits?

- [ ] DataSync over the current line
- [ ] Snowball Edge devices shipped by AWS
- [ ] A new Direct Connect line
- [x] Data Transfer Terminal

The team takes its own storage devices to a physical AWS site with a high-speed connection and uploads from there, so the slow line no longer matters.

- **A:** At full speed, 100 TB over this line takes about 93 days.
- **B:** This is closed to new customers.
- **C:** Setting it up takes weeks and sometimes months, so it could miss the deadline.

Review: [When your data outgrows the internet](#when-your-data-outgrows-the-internet) in this part, and [What is Data Transfer Terminal?](https://docs.aws.amazon.com/datatransferterminal/latest/userguide/what-is-dtt.html) in the AWS docs.
:::

::: quiz
A company is leaving its data center. Its 30 TB NFS server must be copied to AWS and kept in sync until the cutover, and its partners send daily files over SFTP and can't change how they do it. Which **two** services fit? (Choose two.)

- [ ] Tape Gateway
- [x] DataSync
- [ ] FSx for Lustre
- [ ] Volume Gateway
- [x] Transfer Family

DataSync copies the NFS data, and on each later run moves only what changed. Transfer Family gives partners a managed SFTP endpoint, with their files going to S3 or EFS.

- **A:** This is for backup software that writes to tape.
- **C:** This is a high-performance file system, and doesn't move data out of a data center.
- **D:** This shows on-site servers an iSCSI disk, and the company is leaving its site.

Review: [DataSync](#datasync) and [Transfer Family](#transfer-family) in this part, and [How AWS DataSync works](https://docs.aws.amazon.com/datasync/latest/userguide/how-datasync-transfer-works.html) and [What is AWS Transfer Family?](https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html) in the AWS docs.
:::

That completes the storage section. You now have a strong application with a database, a network and storage, but its pieces are all wired directly together. In [**part nineteen**](/en/posts/aws-19-sqs-sns-kinesis/) we start the modern applications section, separating them with SQS, SNS and Kinesis.
