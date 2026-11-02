---
title: "DNS and Route 53: Your Site's Address"
description: How a name like example.com turns into an address, what the record types mean, the difference between CNAME and Alias, Route 53's routing policies and health checks, and a hands-on that doesn't require buying a domain.
date: 2026-11-02
series: aws
part: 11
numbered: true
tags: [aws, networking]
---

The load balancer in our application from [part seven](/en/posts/aws-07-auto-scaling/) has a name like `web-alb-1234567890.eu-central-1.elb.amazonaws.com`. Nobody is going to type that. Visitors want `shop.example.com`, and what connects the two is **DNS**.

This section is about the visitor's path to your application: the name in this part, speed in the next, then the private network everything lives in.

## How DNS works

DNS is the internet's phone book: you ask with a name and it answers with an address. No single server knows everything, so the answer comes through a chain:

<figure class="diagram">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="dns-caption">
<defs>
<marker id="dns-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="110" width="120" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="150" text-anchor="middle" class="d-label">Browser</text>
<rect x="220" y="110" width="130" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="285" y="140" text-anchor="middle" class="d-label">Resolver</text>
<text x="285" y="162" text-anchor="middle" class="d-small">Asks for you</text>
<rect x="450" y="14" width="170" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="535" y="40" text-anchor="middle" class="d-label">Root servers</text>
<text x="535" y="62" text-anchor="middle" class="d-small">Go ask .com</text>
<rect x="450" y="116" width="170" height="62" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="535" y="142" text-anchor="middle" class="d-label">.com servers</text>
<text x="535" y="164" text-anchor="middle" class="d-small">Go ask Route 53</text>
<rect x="450" y="218" width="170" height="62" rx="10" fill="var(--color-sunken)" stroke="var(--color-accent)"/>
<text x="535" y="244" text-anchor="middle" class="d-label">Route 53</text>
<text x="535" y="266" text-anchor="middle" class="d-small">The address is 192.0.2.10</text>
<line x1="140" y1="145" x2="218" y2="145" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="179" y="135" text-anchor="middle" class="d-label">1</text>
<text x="179" y="168" text-anchor="middle" class="d-label">5</text>
<line x1="350" y1="130" x2="448" y2="45" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="386" y="76" text-anchor="middle" class="d-label">2</text>
<line x1="350" y1="145" x2="448" y2="147" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="399" y="136" text-anchor="middle" class="d-label">3</text>
<line x1="350" y1="160" x2="448" y2="249" stroke="var(--color-accent)" stroke-width="2" marker-start="url(#dns-arrow)" marker-end="url(#dns-arrow)"/>
<text x="386" y="222" text-anchor="middle" class="d-label">4</text>
</svg>
<figcaption id="dns-caption">The resolver goes through the root servers, then the .com servers, then the domain's name servers, and brings the address back to the browser.</figcaption>
</figure>

1. Your browser asks the **resolver**, usually from your internet provider or a public service such as `1.1.1.1`.
2. The resolver asks the **root servers**, which point it to the `.com` servers.
3. The `.com` servers point it to the domain's name servers.
4. The **domain's name servers** give the final answer.
5. The resolver returns the address to the browser and keeps it for the **TTL**, so the next person asking gets an instant answer.

These are the terms you'll come across:

| Term | Meaning |
| --- | --- |
| **Domain** | `example.com`: the name you own |
| **Subdomain** | `blog.example.com`: a name under it |
| **Registrar** | The company you buy the name from |
| **Hosted zone** | The container holding a domain's records |
| **Record** | One entry: a name pointing to a value |
| **TTL** | How long a resolver may remember the answer |

## Route 53

**Route 53** is AWS's DNS service, named after DNS's port 53. It has three jobs: holding your domain's records and answering for them, registering domains, and watching your application's health and directing visitors accordingly. AWS commits to 100% availability for it.

### Hosted zones

| Type | Answers whom | Example |
| --- | --- | --- |
| **Public** | Anyone on the internet | `example.com` |
| **Private** | Only inside the VPCs you choose | `db.series.internal` |

Each costs about half a dollar a month, plus a small charge for queries.

### Record types

| Type | Points to | Example |
| --- | --- | --- |
| **A** | An IPv4 address | `blog.example.com` to `192.0.2.10` |
| **AAAA** | An IPv6 address | `blog.example.com` to `2001:db8::10` |
| **CNAME** | Another name | `www.example.com` to `example.com` |
| **NS** | The domain's name servers | `ns-1.awsdns-01.org` |
| **MX** | Mail servers | `mail.example.com` |
| **TXT** | Free text, such as proof of domain ownership | `v=spf1 ...` |

### CNAME or Alias?

Here's a common problem: a CNAME can't be used on the root domain `example.com`, yet you want it to point at your load balancer. The solution is an **Alias**, a special type in Route 53:

| | CNAME | Alias |
| --- | --- | --- |
| **Points to** | Any name | AWS resources such as ALB, CloudFront and API Gateway |
| **Root domain** | Not allowed | Allowed |
| **Queries** | Charged | Free for AWS resources |
| **TTL** | You set it | Route 53 sets it |
| **Target health** | Not followed | Can be followed |

The rule is simple: if the target is on AWS, use an Alias. Note that it can't point to an EC2 server's DNS name.

### Choosing a TTL

- **A long TTL:** fewer queries and lower cost, but any change takes time to spread.
- **A short TTL:** changes spread quickly, but queries increase.

::: tip Before any move
If you're moving your site to another server, lower the TTL to 60 seconds a day beforehand. Make the move, confirm all is well, then raise it again.
:::

## Routing policies

"Routing" here doesn't mean traffic passes through Route 53. It only chooses which answer to give, and the visitor then connects directly to that address.

| Policy | How it answers | Common use |
| --- | --- | --- |
| **Simple** | One record, which can hold several values | A single server |
| **Weighted** | By percentages you set | Trying a new version on 10% of visitors |
| **Latency** | The Region with the lowest delay for the visitor | An application in several Regions |
| **Failover** | The primary while it's healthy, otherwise the secondary | Disaster recovery |
| **Geolocation** | By the visitor's country or continent | Language or content by country |
| **Geoproximity** | By distance, with each site's reach grown or shrunk | Gradually shifting traffic between areas |
| **IP-based** | By the visitor's IP range | Networks you know about |
| **Multivalue** | Up to 8 healthy records | Simple spreading, not a replacement for a load balancer |

::: note Nearest isn't always fastest
**Geolocation** chooses by where the visitor is, even if another site would be faster for them, so it suits legal and language needs. If your goal is speed, choose **Latency**.
:::

## Health checks

For Failover and the others to work, Route 53 has to know who's healthy:

| Type | How it checks |
| --- | --- |
| **Endpoint** | Checkers around the world request your address over HTTP, HTTPS or TCP |
| **Calculated** | Combines the results of several checks into one |
| **CloudWatch alarm** | Relies on an alarm, which is the solution for private resources |

The checkers come from the internet, so they can't reach a server in a private network, and your security group has to allow their ranges if you're checking a public target.

## A domain bought elsewhere

Buying a domain and managing its records are two separate things. If you bought yours from another company and want Route 53 to answer for it:

1. Create a public **hosted zone** with the domain's name.
2. Copy the four name servers from its **NS** record.
3. Paste them into the domain's settings at the company you bought it from.

Once the change spreads, Route 53 is the one answering.

If you have a network in your office, you can connect its DNS with AWS through **Resolver endpoints**: inbound lets your network ask about AWS's private names, and outbound lets AWS ask about your network's names. This needs a connection between the two networks, which is the subject of [part fourteen](/en/posts/aws-14-vpc-connectivity/).

## Hands-on: weighted routing without buying a domain

A private hosted zone lets you try all this without a real domain. We'll use your `web-1` server from [part three](/en/posts/aws-03-ec2-first-server/), inside the default network. From CloudShell, create the private domain:

```bash
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)

ZONE_ID=$(aws route53 create-hosted-zone --name series.internal \
  --caller-reference "demo-$(date +%s)" \
  --vpc VPCRegion=$AWS_REGION,VPCId=$VPC_ID \
  --query HostedZone.Id --output text)
```

Now add two records for the same name, 80% for the old version and 20% for the new. The addresses are made up, because DNS only answers and doesn't connect to them:

```bash
CHANGES='{"Changes":[
  {"Action":"CREATE","ResourceRecordSet":{"Name":"app.series.internal","Type":"A","TTL":5,
    "SetIdentifier":"old","Weight":80,"ResourceRecords":[{"Value":"10.0.0.80"}]}},
  {"Action":"CREATE","ResourceRecordSet":{"Name":"app.series.internal","Type":"A","TTL":5,
    "SetIdentifier":"new","Weight":20,"ResourceRecords":[{"Value":"10.0.0.20"}]}}
]}'

aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" --change-batch "$CHANGES"
```

Sign in to the server through EC2 Instance Connect and ask 20 times. It takes two minutes, because we wait for the TTL to expire each time:

```bash
sudo dnf install -y bind-utils

for i in $(seq 1 20); do
  dig +short app.series.internal
  sleep 6
done | sort | uniq -c
```

You'll see a split close to 16 and 4. Try `dig +trace aws.amazon.com` as well, and you'll see the chain from the diagram step by step.

If you have a domain, add an **A** record of the **Alias** kind pointing at your load balancer, and your site now has your name.

::: security Delete after experimenting
A hosted zone deleted within 12 hours of creation isn't charged. You have to delete the records first, then the zone:
:::

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" --change-batch "${CHANGES//CREATE/DELETE}"

aws route53 delete-hosted-zone --id "$ZONE_ID"
```

## Summary

- **DNS** turns a name into an address through a chain, and the answer is kept for the **TTL**.
- **Route 53** holds your records, and a hosted zone can be public or private.
- If the target is on AWS, use an **Alias**, which works on the root domain.
- **Routing policies** only choose the answer; traffic doesn't pass through them.
- **Health checks** are what make Failover work.

Your site now has a name, but its server is still in one place and the distant visitor is still waiting. In [**part twelve**](/en/posts/aws-12-cloudfront-global-accelerator/) we bring it closer with CloudFront and Global Accelerator.
