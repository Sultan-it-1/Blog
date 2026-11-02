---
title: "VPC: Connecting Networks"
description: How to connect VPCs with peering and Transit Gateway, reach AWS services privately through endpoints, link your office with VPN or Direct Connect, and control network costs, with a hands-on for the two most useful connections.
date: 2026-11-02
series: aws
part: 14
numbered: true
tags: [aws, networking, vpn]
---

In [part thirteen](/en/posts/aws-13-vpc/) we built an isolated network. But real applications rarely stay alone: you have a second VPC for another team, servers that need S3 and an office that needs to reach the database.

Here's this part's map, to come back to whenever you're unsure:

| You want | Use |
| --- | --- |
| Two VPCs talking to each other | **VPC peering** |
| A private subnet reaching S3 or DynamoDB without NAT | **Gateway endpoint** |
| Reaching other AWS services or a partner's service privately | **Interface endpoint** |
| Your office reaching AWS quickly over the internet | **Site-to-Site VPN** |
| Employees' devices reaching the network | **Client VPN** |
| A steady, large line between your office and AWS | **Direct Connect** |
| Many networks and offices | **Transit Gateway** |

## VPC peering

**Peering** connects two VPCs directly, as if they were one network. It works even between different accounts or different Regions. Its rules:

- **Ranges can't overlap.** This is what we warned you about in the previous part.
- **It isn't transitive.** If A connects to B and B connects to C, A can't reach C.
- **You need a route on both sides.** You add one in each network's route table.

There's no hourly charge; you pay only for data transfer.

## VPC endpoints: AWS services without the internet

By default, your private server's request to S3 goes out through NAT, and you pay for every gigabyte, even though the destination is already inside AWS. **Endpoints** give you a private, direct path:

<figure class="diagram">
<svg viewBox="0 0 640 210" role="img" aria-labelledby="endpoint-caption">
<defs>
<marker id="endpoint-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="60" width="150" height="90" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="100" text-anchor="middle" class="d-label">Private server</text>
<text x="95" y="122" text-anchor="middle" class="d-small">In a private subnet</text>
<rect x="470" y="60" width="150" height="90" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="110" text-anchor="middle" class="d-label">S3</text>
<rect x="245" y="10" width="150" height="52" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="320" y="32" text-anchor="middle" class="d-label">NAT, then internet</text>
<text x="320" y="52" text-anchor="middle" class="d-small">Paid per gigabyte</text>
<rect x="245" y="148" width="150" height="52" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="170" text-anchor="middle" class="d-label">Gateway endpoint</text>
<text x="320" y="190" text-anchor="middle" class="d-small">Free</text>
<line x1="170" y1="85" x2="243" y2="40" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="395" y1="40" x2="470" y2="85" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="170" y1="125" x2="243" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#endpoint-arrow)"/>
<line x1="395" y1="170" x2="468" y2="125" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#endpoint-arrow)"/>
</svg>
<figcaption id="endpoint-caption">Instead of the paid path through NAT, the private server reaches S3 through a free gateway endpoint, without going out to the internet.</figcaption>
</figure>

| | Gateway endpoint | Interface endpoint |
| --- | --- | --- |
| **Services** | S3 and DynamoDB only | Most AWS services, and partners' services |
| **How it works** | A route in the route table | A network interface with a private address in your subnet |
| **Cost** | Free | Per hour per zone, and per gigabyte |
| **From your office** | Not reachable | Reachable through VPN or Direct Connect |

::: tip The easiest saving on your bill
Turn on a gateway endpoint for S3 in every VPC. It's free, and it takes S3 traffic out of NAT's bill.
:::

An **interface endpoint** is built on **PrivateLink**, which also lets you offer your own service to other networks through an NLB, with no peering and even if their ranges overlap.

## Connecting your office: Site-to-Site VPN

**Site-to-Site VPN** connects your office network to the VPC over the internet through an encrypted tunnel, and you can set it up quickly. It has three pieces:

1. **Customer gateway:** represents your office device and its public address.
2. **Virtual private gateway:** the VPN gateway on AWS's side, attached to the VPC.
3. **VPN connection:** the connection itself, which comes with two tunnels for availability.

Then turn on **route propagation** in the route table so the VPC learns the office's routes. Each tunnel gives you up to 1.25 Gbps, or up to 5 with Transit Gateway.

- **VPN CloudHub:** connects several offices to each other through the same gateway.
- **Client VPN:** for employees' devices rather than offices.

If you want a VPN fully under your control on your own server, see the [WireGuard](/en/posts/wireguard/) article.

## Direct Connect: a private line

**Direct Connect** is a real private line between your site and AWS through a Direct Connect location, so it doesn't cross the public internet. Its speed is steady, and outgoing data transfer is cheaper.

- **Dedicated:** a port just for you, from 1 to 400 Gbps.
- **Hosted:** through a partner, with speeds starting far lower.
- **Direct Connect Gateway:** connects you to VPCs in several Regions.

Watch out for three things: **setup takes weeks** and sometimes months, **the line isn't encrypted automatically**, so use MACsec or a VPN on top, and **one line is a single point of failure**, so for your most important systems have two lines in two locations, or a backup VPN.

| | Site-to-Site VPN | Direct Connect |
| --- | --- | --- |
| **Path** | The internet, encrypted | A private line |
| **Setup** | Minutes or hours | Weeks or months |
| **Speed** | 1.25 Gbps per tunnel, or 5 with Transit Gateway | 1 to 400 Gbps |
| **Performance** | Varies with the internet | Steady |
| **Cost** | Low | Higher at first, cheaper for large transfers |

## Transit Gateway: one hub

As networks multiply, peering becomes tiring: since it isn't transitive, you need a link for every pair:

<figure class="diagram">
<svg viewBox="0 0 640 250" role="img" aria-labelledby="tgw-caption">
<text x="160" y="28" text-anchor="middle" class="d-label">Peering: ten links</text>
<g stroke="var(--color-line-strong)" stroke-width="2">
<line x1="160" y1="65" x2="241" y2="124"/>
<line x1="160" y1="65" x2="210" y2="219"/>
<line x1="160" y1="65" x2="110" y2="219"/>
<line x1="160" y1="65" x2="79" y2="124"/>
<line x1="241" y1="124" x2="210" y2="219"/>
<line x1="241" y1="124" x2="110" y2="219"/>
<line x1="241" y1="124" x2="79" y2="124"/>
<line x1="210" y1="219" x2="110" y2="219"/>
<line x1="210" y1="219" x2="79" y2="124"/>
<line x1="110" y1="219" x2="79" y2="124"/>
</g>
<rect x="134" y="50" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="160" y="70" text-anchor="middle" class="d-small">VPC</text>
<rect x="215" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="241" y="129" text-anchor="middle" class="d-small">VPC</text>
<rect x="184" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="210" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="84" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="110" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="53" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="79" y="129" text-anchor="middle" class="d-small">VPC</text>
<text x="480" y="28" text-anchor="middle" class="d-label">Transit Gateway: five links</text>
<g stroke="var(--color-accent)" stroke-width="2">
<line x1="480" y1="150" x2="480" y2="65"/>
<line x1="480" y1="150" x2="561" y2="124"/>
<line x1="480" y1="150" x2="530" y2="219"/>
<line x1="480" y1="150" x2="430" y2="219"/>
<line x1="480" y1="150" x2="399" y2="124"/>
</g>
<rect x="454" y="50" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="480" y="70" text-anchor="middle" class="d-small">VPC</text>
<rect x="535" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="561" y="129" text-anchor="middle" class="d-small">VPC</text>
<rect x="504" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="530" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="404" y="204" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="430" y="224" text-anchor="middle" class="d-small">VPC</text>
<rect x="373" y="109" width="52" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="399" y="129" text-anchor="middle" class="d-small">VPC</text>
<rect x="432" y="130" width="96" height="40" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="480" y="155" text-anchor="middle" class="d-label">Transit GW</text>
</svg>
<figcaption id="tgw-caption">Five networks need ten peering links, or only five links to a single Transit Gateway hub.</figcaption>
</figure>

**Transit Gateway** is a central hub you connect networks to, and each one reaches the others through it:

- **It connects everything:** VPCs, VPN connections, Direct Connect and Transit Gateways in other Regions.
- **Its own route tables:** you decide who talks to whom, for example separating production from development.
- **Across accounts:** you share it with other accounts through the RAM service.
- **Higher VPN speed:** it spreads traffic across several tunnels.

You pay by the hour for each attachment, and for data. For two or three networks, peering is simpler and cheaper.

## Network costs

Data transfer is the item that most often surprises people. These are approximate rates for US Regions, so check yours:

| Traffic | Cost per gigabyte |
| --- | --- |
| **Into AWS** | Free |
| **Within one Availability Zone, by private address** | Free |
| **Between Availability Zones** | About $0.01 in each direction |
| **Between Regions** | About $0.02 |
| **Out to the internet** | About $0.09, falling with volume |
| **Through a NAT Gateway** | About $0.045 extra |
| **S3 through a gateway endpoint** | Free |

How to save:

- Use **private addresses** between servers, not public ones.
- Keep services that talk a lot in the **same Availability Zone**, if your availability design allows it.
- Turn on a **gateway endpoint** for S3.
- Serve content through **CloudFront**, since transfer from your origin to it is free.

## Layers of protection

| Layer | Service | Protects against |
| --- | --- | --- |
| **Subnet** | NACL | Addresses you want to block |
| **Server** | Security group | Any port and source you didn't allow |
| **Web application** | WAF | Web attacks such as SQL injection |
| **Large attacks** | Shield | DDoS |
| **The whole VPC** | Network Firewall | Inspecting traffic and domains at the boundary |

As for **IPv6**: you can add it to a VPC, but all its addresses are public. If you want servers to go out with nobody coming in, use an **egress-only internet gateway**, which is like NAT for IPv6.

## Hands-on: an endpoint and peering

We'll continue with the network from [part thirteen](/en/posts/aws-13-vpc/), after deleting the NAT Gateway, so `private-server` has no route to the internet. The commands use the variables `VPC` and `RT_PRIVATE`; if your CloudShell session ended, set them by hand from the VPC page.

### Gateway endpoint

Give `private-server` an IAM role with `AmazonS3ReadOnlyAccess`, as we explained in [part two](/en/posts/aws-02-iam/). On the server, try:

```bash
aws s3 ls --cli-connect-timeout 5
```

It times out after several attempts, because there's no route to S3. Now add an endpoint from CloudShell:

```bash
aws ec2 create-vpc-endpoint --vpc-id $VPC \
  --service-name com.amazonaws.$AWS_REGION.s3 \
  --route-table-ids $RT_PRIVATE

aws ec2 describe-route-tables --route-table-ids $RT_PRIVATE \
  --query "RouteTables[0].Routes[].[DestinationCidrBlock,DestinationPrefixListId,GatewayId]" \
  --output table
```

You'll see a new route starting with `pl-` and pointing to `vpce-`. Repeat `aws s3 ls` on the server, and it returns at once with your buckets, or empty if you have none, with no internet at all.

### VPC peering

Now we'll connect this network to the default one, which holds `web-1` from [part three](/en/posts/aws-03-ec2-first-server/). Get its private address:

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=web-1" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PrivateIpAddress" --output text
```

From `private-server`, try `curl -m 5 http://WEB-PRIVATE-IP`, and it times out. Now create the connection and accept it:

```bash
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)

PEER=$(aws ec2 create-vpc-peering-connection \
  --vpc-id $VPC --peer-vpc-id $DEFAULT_VPC \
  --query VpcPeeringConnection.VpcPeeringConnectionId --output text)

aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id $PEER
```

The connection alone isn't enough, so add a route on both sides:

```bash
aws ec2 create-route --route-table-id $RT_PRIVATE \
  --destination-cidr-block 172.31.0.0/16 --vpc-peering-connection-id $PEER

DEFAULT_RT=$(aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=$DEFAULT_VPC Name=association.main,Values=true \
  --query "RouteTables[0].RouteTableId" --output text)

aws ec2 create-route --route-table-id $DEFAULT_RT \
  --destination-cidr-block 10.0.0.0/16 --vpc-peering-connection-id $PEER
```

Repeat `curl` from `private-server`, and `web-1`'s page comes back over the private address.

::: security Delete after experimenting
Delete the default network's route and the connection with the commands below. Then from their pages delete the two servers, the entry point and the role, and finally select `series-vpc` and choose **Actions** and **Delete VPC**.
:::

```bash
aws ec2 delete-route --route-table-id $DEFAULT_RT \
  --destination-cidr-block 10.0.0.0/16

aws ec2 delete-vpc-peering-connection --vpc-peering-connection-id $PEER
```

## Summary

- **Peering** is for two networks and isn't transitive; **Transit Gateway** is for when networks multiply.
- A **gateway endpoint** is free for S3 and DynamoDB; an **interface endpoint** covers the other services.
- **VPN** is quick to set up over the internet; **Direct Connect** is a private line that takes time.
- **Data transfer** is among the biggest surprises on a bill, so plan for it from the start.

That completes the networking section. You now know the visitor's path from your site's name to its data, and what's left is a place to store anything at any size. That's the next section's subject, starting in **part fifteen** with the basics of S3.
