---
title: "Load Balancing: Keeping Your Site Up"
description: The difference between scaling and high availability, how a load balancer spreads visitors across servers and avoids failed ones, the ALB, NLB and GWLB types, and a hands-on where you watch the balancing happen.
date: 2026-11-02
series: aws
part: 6
numbered: true
tags: [aws, ec2, scaling]
---

So far, every experiment has used a single server. That has two problems: if it fails your whole site goes down, and if visitors increase it can't serve them. This section solves both, starting with the key piece: the **load balancer**.

## Scaling and high availability

Two terms that come up constantly and often get mixed up:

| Concept | Meaning | Example |
| --- | --- | --- |
| **Vertical scaling** | A bigger server | From `t3.micro` to `m7i.xlarge` |
| **Horizontal scaling** | More servers | From one server to five |
| **High availability** | The application lives in more than one place, so it survives losing one | Servers in two Availability Zones |

Vertical scaling is simple, but it has a ceiling, usually means stopping the server, and doesn't protect you from failures. That's why modern web applications rely on **horizontal scaling across Availability Zones**: it gives you capacity and protection together. But something has to spread visitors across those servers.

## What a load balancer does

A **load balancer** receives every request and passes it to the servers behind it. On AWS the service is **ELB** (Elastic Load Balancing), and it's fully managed: AWS runs it, scales it and keeps it available.

What you get:

- **One entry point:** a single domain name, however the servers behind it change.
- **Health checks:** it detects a failed server and stops sending it traffic.
- **Spread across Availability Zones:** so losing a zone doesn't stop the application.
- **TLS termination:** it handles the HTTPS certificate instead of each server.
- **Server isolation:** your servers are no longer directly exposed to the internet.

## Types of load balancer

| Type | Works on | Choose it when |
| --- | --- | --- |
| **ALB** (Application) | HTTP and HTTPS | Websites and APIs, with routing by path or domain. The default choice |
| **NLB** (Network) | TCP, UDP and TLS | You need very high performance and low latency, or a fixed IP address |
| **GWLB** (Gateway) | Network packets (IP) | Passing traffic through third-party security appliances such as firewalls |

There's also an old type called **Classic Load Balancer**. Don't use it on anything new.

### How an ALB routes requests

An ALB understands the content of a request, which is what sets it apart. It's made of:

- **Listener:** receives traffic on a port, such as 443.
- **Rules:** route by path (`/api/*`), domain (`shop.example.com`) or headers.
- **Target group:** the targets that receive the request: EC2 servers, containers, Lambda functions or IP addresses.

So `example.com/api` can go to one service and `example.com/images` to another, through one load balancer.

::: note The visitor's real address
When a request passes through an ALB, the server sees the load balancer's address, not the visitor's. The real address is in the `X-Forwarded-For` header, which is what you read in your application and logs.
:::

## Health checks

Every so often, the load balancer sends a request to each target on a path you choose, such as `/health`. If it fails several times in a row, the target is marked unhealthy and stops receiving traffic; once it recovers, traffic resumes automatically.

Keep the check path light, but make it reflect the application's real state. A static page that returns 200 even when the database is down won't reveal the problem.

## The right security groups

Learn this pattern, because it shows up in every application: servers accept traffic only from the load balancer.

<figure class="diagram">
<svg viewBox="0 0 640 260" role="img" aria-labelledby="alb-caption">
<defs>
<marker id="alb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="98" width="110" height="64" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="136" text-anchor="middle" class="d-label">Visitors</text>
<rect x="190" y="72" width="160" height="116" rx="12" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="270" y="108" text-anchor="middle" class="d-label">Load balancer</text>
<text x="270" y="132" text-anchor="middle" class="d-code">ALB</text>
<text x="270" y="162" text-anchor="middle" class="d-small">Accepts 443 from anyone</text>
<rect x="410" y="16" width="210" height="104" rx="12" fill="none" stroke="var(--color-accent)" stroke-dasharray="6 6"/>
<text x="515" y="38" text-anchor="middle" class="d-small">Availability Zone A</text>
<rect x="445" y="50" width="140" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="515" y="74" text-anchor="middle" class="d-label">Server 1</text>
<text x="515" y="94" text-anchor="middle" class="d-small">Only from the ALB</text>
<rect x="410" y="140" width="210" height="104" rx="12" fill="none" stroke="var(--color-accent)" stroke-dasharray="6 6"/>
<text x="515" y="162" text-anchor="middle" class="d-small">Availability Zone B</text>
<rect x="445" y="174" width="140" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="515" y="198" text-anchor="middle" class="d-label">Server 2</text>
<text x="515" y="218" text-anchor="middle" class="d-small">Only from the ALB</text>
<line x1="130" y1="130" x2="187" y2="130" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alb-arrow)"/>
<line x1="350" y1="110" x2="442" y2="80" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alb-arrow)"/>
<line x1="350" y1="150" x2="442" y2="200" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#alb-arrow)"/>
</svg>
<figcaption id="alb-caption">Visitors reach only the load balancer, and servers in two Availability Zones accept requests only from its security group.</figcaption>
</figure>

| Security group | Inbound rule | Source |
| --- | --- | --- |
| **Load balancer** | 80 and 443 | Anywhere (`0.0.0.0/0`) |
| **Servers** | 80 | **The load balancer's security group** |

This way nobody can reach a server directly and bypass the load balancer, even if they know its address.

## HTTPS and certificates

You attach a TLS certificate to the load balancer, most easily from **AWS Certificate Manager**, which issues public certificates for free and renews them automatically. The load balancer receives encrypted requests and handles decryption instead of each server. You'd usually add a rule redirecting all HTTP to HTTPS.

You can also host **several domains with different certificates** on one load balancer, thanks to **SNI**, which tells it which domain the browser is asking for.

## Settings worth knowing

- **Sticky sessions:** keep a visitor on the same server using a cookie. Useful if the session is stored on the server, but they upset the balance. It's better to store sessions off the server, which we'll reach in the [databases section](/en/series/aws/#section-4).
- **Cross-zone load balancing:** spreads requests evenly across all servers regardless of their Availability Zone. On by default for ALB with no transfer charge, off by default for NLB and GWLB.
- **Deregistration delay:** when you remove a server, the load balancer stops sending it new requests and gives current ones time to finish, 300 seconds by default. Reduce it if your requests are short.

## Hands-on: watch the balancing happen

We'll run two servers in different Availability Zones and put an ALB in front of them.

1. **Servers:** launch two servers following [part three](/en/posts/aws-03-ec2-first-server/) with the same User Data, each in a different Availability Zone. The page shows the server's name, which is what we'll use.
2. **Target group:** in EC2, open **Target Groups**, then **Create target group**. Choose **Instances** and HTTP on port 80, leave the health check path as `/`, and register both servers.
3. **Load balancer security group:** create a group allowing HTTP from anywhere.
4. **Load balancer:** from **Load Balancers**, choose **Application Load Balancer**, **Internet-facing**, select both Availability Zones, attach the security group, and point the listener on port 80 at the target group.
5. **Servers:** edit their security group so HTTP is accepted only from the load balancer's security group.

Wait for the targets to show **healthy**, then copy the **DNS name** from the load balancer's page:

```bash
# Repeat the request and watch the server name change
for i in 1 2 3 4 5 6; do
  curl -s http://YOUR-LOAD-BALANCER-DNS-NAME
  echo
done
```

You'll see two names taking turns. Now the important test: **stop one of the servers** and run it again. Once the health check spots the failure, all requests go to the remaining server, and the site never went down. That's high availability.

Try opening a server's IP address directly in your browser too: the request hangs and times out, because the security group accepts traffic only from the load balancer.

::: security Clean up after experimenting
A load balancer is charged by the hour even if no request passes through it. Delete the load balancer, target group and servers when you finish.
:::

## Summary

- **Horizontal scaling across Availability Zones** gives you capacity and protection together.
- **ALB** is the default for the web, **NLB** for high performance and a fixed IP, **GWLB** for security appliances.
- **Health checks** remove a failed server automatically.
- Let servers accept traffic only from the **load balancer's security group**.
- Certificates from **ACM** are free and renew themselves.

But our number of servers is still fixed, and you're the one launching them by hand. In [**part seven**](/en/posts/aws-07-auto-scaling/) we'll have AWS add and remove them on its own, and bring everything we've learned together into a full application.
