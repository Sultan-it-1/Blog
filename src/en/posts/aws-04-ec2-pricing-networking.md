---
title: "EC2: Pricing Options and Networking"
description: How to pay far less for the same server with Savings Plans and Spot, the difference between private, public and Elastic IPs, placement groups, network interfaces and hibernation.
date: 2026-11-02
series: aws
part: 4
numbered: true
tags: [aws, ec2]
---

In [part three](/en/posts/aws-03-ec2-first-server/) we launched a server and paid the regular price. But you can pay far less for the same server, depending on how you use it. In this part we'll also solve a problem left hanging: the IP address that changes every time you stop the server.

## Pricing options

| Option | The idea | Savings | Good for |
| --- | --- | --- | --- |
| **On-Demand** | Pay by the second with no commitment | None | Experiments and unpredictable load |
| **Savings Plans** | Commit to an hourly spend for one or three years | Large | Steady workloads; usually the first choice |
| **Reserved Instances** | Reserve a specific instance type for one or three years | Large | Very stable workloads |
| **Spot** | Use AWS's spare capacity | The largest, up to 90% | Work that can tolerate interruption |
| **Dedicated Hosts** | A whole physical server just for you | No, the most expensive | Hardware-bound licences and compliance |
| **Dedicated Instances** | Your server on hardware no other account shares | No | Isolation requirements |
| **Capacity Reservations** | Guarantee capacity in a specific Availability Zone | No, but availability is assured | Key events that can't risk a shortage |

### Spot: the cheapest, with a catch

**Spot** servers are very cheap, but AWS can take them back whenever it needs the capacity, with only two minutes' notice. That makes them excellent for work that can stop and resume: data processing, video encoding, CI pipelines and containers.

They're wrong for a database or anything that can't survive a sudden stop. You can check current prices yourself:

```bash
aws ec2 describe-spot-price-history \
  --instance-types t3.micro \
  --product-descriptions "Linux/UNIX" \
  --start-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
  --query "SpotPriceHistory[].[AvailabilityZone,SpotPrice]" \
  --output table
```

### How to choose

The practical rule for any real project is a mix:

1. **The minimum that always runs:** cover it with Savings Plans.
2. **Extra capacity at peak times:** On-Demand.
3. **Work that tolerates interruption:** Spot.

Don't commit to a year before you know your real usage. Run on On-Demand for a few months first, and look at the numbers in Cost Explorer.

## Addresses: private, public and Elastic IP

Every server has a **private address** for talking inside your network, and may have a **public address** reachable from the internet.

| Type | Reachable from | If you stop the server |
| --- | --- | --- |
| **Private IP** | Inside the network only | Stays the same |
| **Public IP** | The internet | **Changes** |
| **Elastic IP** | The internet | Stays the same |

An **Elastic IP** is a fixed public address you own in your account and attach to any server. You can move it to another server if the first one fails:

```bash
# Reserve a fixed address
aws ec2 allocate-address

# Attach it to the server (replace the IDs with your own)
aws ec2 associate-address \
  --instance-id i-0123456789abcdef0 \
  --allocation-id eipalloc-0123456789abcdef0

# When you're done: detach and release it so you stop paying
aws ec2 disassociate-address --association-id eipassoc-0123456789abcdef0
aws ec2 release-address --allocation-id eipalloc-0123456789abcdef0
```

::: note Public IPv4 addresses cost money
AWS charges for every public IPv4 address, whether regular or Elastic, attached or not. Don't leave reserved addresses sitting unused.
:::

Most of the time you don't need an Elastic IP at all. The cleaner solution is to point a domain name at a load balancer, which we'll cover in the [high availability section](/en/series/aws/#section-3).

## Placement groups

Normally AWS decides where your server lives. To control that, you use a **placement group**, which has three strategies:

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="pg-caption">
<rect x="16" y="16" width="194" height="218" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="113" y="42" text-anchor="middle" class="d-label">Cluster</text>
<rect x="58" y="60" width="110" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="73" y="74" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="119" y="74" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="73" y="116" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="119" y="116" width="34" height="30" rx="5" fill="var(--color-accent)"/>
<text x="113" y="176" text-anchor="middle" class="d-small">One rack</text>
<text x="113" y="216" text-anchor="middle" class="d-small">Fastest links, highest risk</text>
<rect x="223" y="16" width="194" height="218" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="320" y="42" text-anchor="middle" class="d-label">Spread</text>
<rect x="237" y="60" width="50" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="295" y="60" width="50" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="353" y="60" width="50" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="247" y="74" width="30" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="305" y="74" width="30" height="30" rx="5" fill="var(--color-accent)"/>
<rect x="363" y="74" width="30" height="30" rx="5" fill="var(--color-accent)"/>
<text x="320" y="216" text-anchor="middle" class="d-small">Each server on its own rack</text>
<rect x="430" y="16" width="194" height="218" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="527" y="42" text-anchor="middle" class="d-label">Partition</text>
<rect x="444" y="60" width="78" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="532" y="60" width="78" height="130" rx="8" fill="var(--color-sunken)"/>
<rect x="452" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="486" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="452" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="486" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="540" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="574" y="70" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="540" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<rect x="574" y="104" width="28" height="26" rx="4" fill="var(--color-accent)"/>
<text x="527" y="216" text-anchor="middle" class="d-small">Groups isolated from each other</text>
</svg>
<figcaption id="pg-caption">The three placement group strategies. Green squares are servers; grey rectangles are physical racks.</figcaption>
</figure>

| Strategy | The idea | Good for | Downside |
| --- | --- | --- | --- |
| **Cluster** | Servers packed close together in one Availability Zone | Lowest latency: high-performance computing, financial systems | A rack failure takes them all down |
| **Spread** | Each server on different hardware | A small number of critical servers | Maximum of 7 servers per Availability Zone |
| **Partition** | Groups of servers, each group on separate hardware | Huge distributed systems such as Kafka, Cassandra and Hadoop | Needs software that understands the layout |

## Network interfaces (ENI)

An **ENI** (Elastic Network Interface) is a virtual network card that carries the private address and security groups. Its best feature: you can detach it from one server and attach it to another **in the same Availability Zone**, and the address moves with it. That makes a quick failover to a standby server easy.

## Hibernation

When you stop a regular server, everything in memory (RAM) is lost, and it boots from scratch when it starts again. **Hibernation** saves the memory's contents to the system disk, so the server resumes where it left off. That helps applications that take a long time to start or warm up a cache.

The conditions: the system disk must be **encrypted** EBS with enough room for the memory, you enable it when you create the server, and a server can't stay hibernated for more than 60 days.

## Summary

- **On-Demand** for flexibility, **Savings Plans** for steady load, **Spot** for work that tolerates interruption. The smart choice is a mix.
- A public address changes when you stop the server, an Elastic IP stays fixed, and all public IPv4 addresses cost money.
- **Cluster** for speed, **Spread** for isolation, **Partition** for huge distributed systems.
- An **ENI** is a network card that can move between servers, and **hibernation** keeps memory and speeds up startup.

In [**part five**](/en/posts/aws-05-ec2-storage/) we finish the servers section with storage: disks, system images and shared file systems.
