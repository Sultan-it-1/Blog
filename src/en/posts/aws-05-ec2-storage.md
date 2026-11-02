---
title: "Server Storage: EBS, AMI and EFS"
description: Where does a server's data live? EBS disks and snapshots, AMI system images, local instance store and the shared EFS file system, and when to choose each.
date: 2026-11-02
series: aws
part: 5
numbered: true
tags: [aws, ec2, storage]
---

In the [previous parts](/en/posts/aws-04-ec2-pricing-networking/) we launched servers, but where does their data live? What happens to it if we delete the server? And how do you share data between several servers?

This part answers those questions and completes the servers section. You have three kinds of storage, each with its place:

<figure class="diagram">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="storage-caption">
<rect x="20" y="14" width="290" height="186" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="165" y="40" text-anchor="middle" class="d-small">Availability Zone A</text>
<rect x="330" y="14" width="290" height="186" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="475" y="40" text-anchor="middle" class="d-small">Availability Zone B</text>
<rect x="34" y="54" width="116" height="96" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="92" y="78" text-anchor="middle" class="d-label">Server</text>
<rect x="44" y="92" width="96" height="44" rx="6" fill="var(--color-sunken)"/>
<text x="92" y="112" text-anchor="middle" class="d-code">Instance</text>
<text x="92" y="127" text-anchor="middle" class="d-code">Store</text>
<rect x="194" y="72" width="100" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="244" y="108" text-anchor="middle" class="d-label">EBS</text>
<line x1="150" y1="102" x2="194" y2="102" stroke="var(--color-accent)" stroke-width="2"/>
<rect x="344" y="54" width="116" height="96" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="402" y="78" text-anchor="middle" class="d-label">Server</text>
<rect x="354" y="92" width="96" height="44" rx="6" fill="var(--color-sunken)"/>
<text x="402" y="112" text-anchor="middle" class="d-code">Instance</text>
<text x="402" y="127" text-anchor="middle" class="d-code">Store</text>
<rect x="504" y="72" width="100" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="554" y="108" text-anchor="middle" class="d-label">EBS</text>
<line x1="460" y1="102" x2="504" y2="102" stroke="var(--color-accent)" stroke-width="2"/>
<line x1="92" y1="150" x2="92" y2="228" stroke="var(--color-line-strong)" stroke-width="2"/>
<line x1="402" y1="150" x2="402" y2="228" stroke="var(--color-line-strong)" stroke-width="2"/>
<rect x="20" y="228" width="600" height="56" rx="12" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="320" y="262" text-anchor="middle" class="d-label">EFS: files shared by all servers</text>
</svg>
<figcaption id="storage-caption">Instance store sits inside the machine, an EBS volume attaches to a server in the same Availability Zone, and EFS is shared by servers across Availability Zones.</figcaption>
</figure>

## EBS disks

**EBS** (Elastic Block Store) is a network disk you attach to a server. It behaves like a regular disk but is independent of the server, so its data survives even if you delete the server. It's usually the disk your server boots from.

The key points:

- **Tied to one Availability Zone.** A volume in `eu-central-1a` can't attach directly to a server in `eu-central-1b`.
- **One server at a time**, normally, though one server can have several disks. The exception is Multi-Attach on `io1` and `io2` volumes, within one Availability Zone, and it needs a file system that understands it.
- **Deleted with the server?** The system disk is deleted with the server by default; extra disks stay. You can change this with the **Delete on Termination** setting.
- **You pay for the space you reserve**, not the space you use.

### Volume types

| Type | Description | Good for |
| --- | --- | --- |
| `gp3` | General SSD; performance is set independently of size, starting at 3,000 IOPS | The default choice for most cases |
| `gp2` | Older general SSD; speed is tied to size | Older systems; choose `gp3` instead |
| `io2` / `io1` | SSD with high guaranteed performance | Critical databases |
| `st1` | Hard disk with fast throughput, low cost | Big data and logs |
| `sc1` | Hard disk for cold data, the cheapest | Rarely accessed archives |

**IOPS** is read and write operations per second, which matters to databases. **Throughput** is the amount of data moved per second, which matters for large files. Hard disks (`st1` and `sc1`) can't be boot disks.

### Snapshots

A **snapshot** is a point-in-time backup of a disk. After the first one, it stores only the changes, which keeps cost down. From a snapshot you can create a new disk in **any Availability Zone**, or copy it to another Region, so this is the right way to move a disk between Availability Zones.

Two useful features: **Recycle Bin** protects you from deleting a snapshot by mistake, and **Archive** lowers the cost of snapshots you rarely go back to.

### Encryption

Turn on EBS encryption: the data on the disk, the traffic between it and the server, and its snapshots are all encrypted with KMS keys, with no change to your application and little effect on performance. You can enable it by default for all new volumes in a Region from the EC2 settings.

Encrypting an existing unencrypted disk takes a few steps: snapshot it, copy the snapshot with encryption turned on, create a new encrypted disk from the copy, and attach it in place of the old one.

## System images (AMI)

An **AMI** is a ready-made image a server boots from: the operating system, software and settings. There are three sources: AWS's images, ready-made images from other companies on AWS Marketplace, and **your own**.

The idea that changes things: rather than having each new server install everything through User Data, prepare a server once and take an image of it:

```bash
aws ec2 create-image \
  --instance-id i-0123456789abcdef0 \
  --name "web-nginx-v1"
```

Now any server booting from this image is ready in seconds rather than minutes, which matters a great deal for auto scaling. Note that an image belongs to one Region, and you can copy it to others.

A common pattern: an image holding the heavy, stable parts, and a light User Data script for settings that differ per server.

## Local storage (instance store)

Some instance types have a physical disk **inside the machine itself**. This **instance store** is much faster than EBS, but it's temporary: its data is gone if you stop or terminate the server or the hardware fails. It survives only an ordinary reboot.

It suits caches, temporary files, and data with copies elsewhere. Don't put anything on it you can't afford to lose.

## Shared file system (EFS)

**EFS** (Elastic File System) is a network file system that mounts on **dozens or hundreds of servers at once**, across different Availability Zones. It grows and shrinks automatically, and you pay for what you actually use.

It suits content every server must see, such as user uploads on a site running on several servers. Two conditions: it **works with Linux only**, and it costs more per gigabyte than EBS. To save money, turn on a lifecycle policy so unused files move to a cheaper class automatically.

Mounting it on a server:

```bash
sudo dnf install -y amazon-efs-utils
sudo mkdir -p /mnt/shared
sudo mount -t efs fs-0123456789abcdef0:/ /mnt/shared
```

::: tip If the mount command hangs
EFS uses port 2049. The EFS security group must allow NFS on that port from the servers' security group. That's the security group referencing we covered in [part three](/en/posts/aws-03-ec2-first-server/).
:::

## Which one to choose?

| | EBS | Instance store | EFS |
| --- | --- | --- | --- |
| **Type** | Network disk | Local disk | Network file system |
| **Sharing** | Usually one server | One server | Hundreds of servers |
| **Scope** | One Availability Zone | The machine itself | Across Availability Zones |
| **Data after stopping** | Kept | Lost | Kept |
| **Systems** | Linux and Windows | Linux and Windows | Linux only |
| **Example** | System disk, database | Fast cache | Shared files |

## Hands-on: add a disk and snapshot it

Launch a server in a known Availability Zone, then run this from CloudShell:

```bash
# A 10 GB encrypted disk in the server's Availability Zone
aws ec2 create-volume \
  --availability-zone eu-central-1a \
  --size 10 --volume-type gp3 --encrypted

# Attach it to the server (replace the IDs with your own)
aws ec2 attach-volume \
  --volume-id vol-0123456789abcdef0 \
  --instance-id i-0123456789abcdef0 \
  --device /dev/sdf
```

On the server, prepare it and use it:

```bash
# Find the new disk's name, usually nvme1n1
lsblk

# Formatting wipes the disk, so only do this on a new one
sudo mkfs -t xfs /dev/nvme1n1

sudo mkdir /data
sudo mount /dev/nvme1n1 /data
echo "hello from ebs" | sudo tee /data/test.txt
```

Finally, take a snapshot from CloudShell:

```bash
aws ec2 create-snapshot \
  --volume-id vol-0123456789abcdef0 \
  --description "data volume before upgrade"
```

::: security Clean up after experimenting
Disks and snapshots keep costing money even after the server is gone. Delete the extra disk, snapshot and image when you finish, because the extra disk isn't deleted with the server.
:::

## Summary

- **EBS** is a durable disk tied to one Availability Zone, and `gp3` is the default choice.
- **Snapshots** are backups, and the way to move a disk between Availability Zones and Regions.
- An **AMI** brings a server up ready in seconds, the basis of fast scaling.
- **Instance store** is the fastest, but its data is lost when you stop the server.
- **EFS** is for files shared between many servers, on Linux.

## Test yourself

Five questions in the style of the exam's scenarios, written for this series. They aren't from the real exam. Pick an answer to see the explanation.

::: quiz
A server in `eu-central-1a` keeps its data on an EBS volume. The team is launching a replacement server in `eu-central-1b`, and it needs the same data there. What should it do?

- [ ] Attach the existing volume directly to the new server
- [ ] Turn on Multi-Attach, so both Availability Zones share the volume
- [ ] Change the volume's Availability Zone in its settings
- [x] Take a snapshot, then create a new volume from it in `eu-central-1b`

A volume is tied to one Availability Zone, while a snapshot can create a new volume in any Availability Zone of the Region.

- **A:** The volume and the server must be in the same Availability Zone.
- **B:** Multi-Attach works only within one Availability Zone, and only on `io1` and `io2`.
- **C:** There's no such setting.

Review: [Snapshots](#snapshots) in this part, and [Amazon EBS snapshots](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html) in the AWS docs.
:::

::: quiz
A log-processing job reads huge files from start to finish all day. It needs high throughput at low cost, and this data isn't on the boot disk. Which EBS volume type fits best?

- [ ] `io2`
- [x] `st1`
- [ ] `sc1`
- [ ] `gp3`

`st1` is a low-cost hard disk built for high throughput on frequently accessed data, which is what long sequential reads need.

- **A:** You'd pay for very high IOPS, which sequential reads don't rely on.
- **C:** This is for data accessed rarely, and its throughput is lower.
- **D:** This works, but it's an SSD, and costs more per gigabyte for this job.

Review: [Volume types](#volume-types) in this part, and [Amazon EBS volume types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html) in the AWS docs.
:::

::: quiz
Twenty Linux build servers across three Availability Zones need a shared folder for their build caches. The amount of data changes from day to day, and the team doesn't want to plan capacity. Which storage fits?

- [x] Amazon EFS
- [ ] An EBS volume with Multi-Attach
- [ ] Instance store on each server
- [ ] A large `gp3` volume on one server, shared with the others over NFS

EFS mounts on many Linux servers across Availability Zones at once, and it grows and shrinks by itself.

- **B:** Multi-Attach works within one Availability Zone only, and needs a file system built for it.
- **C:** Each server would have its own disk, so nothing is shared.
- **D:** This works, but you'd run the file server, size it yourself, and depend on one server in one zone.

Review: [Shared file system](#shared-file-system-efs) in this part, and [How Amazon EFS works](https://docs.aws.amazon.com/efs/latest/ug/how-it-works.html) in the AWS docs.
:::

::: quiz
A simulation writes temporary files at very high speed, and it can regenerate them if they're lost. The team wants the fastest disk, without paying for durability it doesn't need. Which storage fits?

- [ ] A `gp3` EBS volume
- [ ] An `io2` EBS volume
- [x] Instance store
- [ ] Amazon EFS

Instance store sits inside the machine itself, which makes it very fast. Its data is lost when the server stops, and that's acceptable here because the files can be regenerated.

- **A:** This is a network disk, and it's slower than a local one.
- **B:** This is fast, but you'd pay for durability the job doesn't need.
- **D:** This is a network file system meant for sharing, not for the highest local speed.

Review: [Local storage](#local-storage-instance-store) in this part, and [Data persistence for instance store](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html) in the AWS docs.
:::

::: quiz
New servers take 12 minutes to become ready, because User Data installs everything on first boot. During a traffic spike, that's too slow. How can the team get them ready **faster**?

- [ ] Launch a larger instance type
- [x] Prepare a server once, create an AMI from it, and launch new servers from that AMI
- [ ] Store the install script in an S3 bucket
- [ ] Run the same script from a scheduled cron job instead of User Data

With an AMI, the software is already installed when the server boots. User Data can stay for the light settings that differ between servers.

- **A:** A larger server may install a little faster, but it still installs everything.
- **C:** Moving the script doesn't change the work it does.
- **D:** The same installation still has to run, only at another time.

Review: [System images](#system-images-ami) in this part, and [Amazon Machine Images](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html) in the AWS docs.
:::

That completes the servers section. In [**part six**](/en/posts/aws-06-load-balancers/) we start the high availability section: how to spread visitors across several servers with a load balancer, so your site stays up if one of them fails.
