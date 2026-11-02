---
title: "CloudFront and Global Accelerator: Closer to Your Visitors"
description: Why distance slows your site, how CloudFront keeps copies near your visitors, how to protect your origin and clear the cache, what Global Accelerator does for traffic that can't be cached, and when to choose each.
date: 2026-11-02
series: aws
part: 12
numbered: true
tags: [aws, networking]
---

In [part eleven](/en/posts/aws-11-dns-route53/) your site got a name, but its server is still in one place. A distant visitor's request crosses continents and many networks on the public internet, and every request takes time.

You have two services for this problem: **CloudFront** keeps a copy near the visitor, and **Global Accelerator** shortens the road itself.

## CloudFront: a copy near every visitor

**CloudFront** is a content delivery network (CDN). It uses the [edge locations](/en/posts/aws-01-global-infrastructure/) spread around the world: the first visitor to request a file makes CloudFront fetch it from your origin and keep it, and later visitors in the same area get it directly from the edge location.

<figure class="diagram">
<svg viewBox="0 0 640 220" role="img" aria-labelledby="cf-caption">
<defs>
<marker id="cf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="24" width="130" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="85" y="50" text-anchor="middle" class="d-label">Visitor</text>
<text x="85" y="70" text-anchor="middle" class="d-small">in Asia</text>
<rect x="20" y="136" width="130" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="85" y="162" text-anchor="middle" class="d-label">Visitor</text>
<text x="85" y="182" text-anchor="middle" class="d-small">in Europe</text>
<rect x="235" y="24" width="150" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="310" y="50" text-anchor="middle" class="d-label">Edge location</text>
<text x="310" y="70" text-anchor="middle" class="d-small">Keeps a copy</text>
<rect x="235" y="136" width="150" height="60" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="310" y="162" text-anchor="middle" class="d-label">Edge location</text>
<text x="310" y="182" text-anchor="middle" class="d-small">Keeps a copy</text>
<rect x="470" y="64" width="150" height="92" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="545" y="96" text-anchor="middle" class="d-label">Origin</text>
<text x="545" y="118" text-anchor="middle" class="d-small">ALB, S3 or a server</text>
<text x="545" y="138" text-anchor="middle" class="d-small">In one Region</text>
<line x1="150" y1="54" x2="233" y2="54" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cf-arrow)"/>
<line x1="150" y1="166" x2="233" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cf-arrow)"/>
<line x1="385" y1="54" x2="468" y2="94" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="385" y1="166" x2="468" y2="126" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<text x="412" y="115" text-anchor="middle" class="d-small">If missing</text>
</svg>
<figcaption id="cf-caption">Each visitor reaches the nearest edge location, which goes back to the origin only if it has no valid copy.</figcaption>
</figure>

What do you gain?

- **Higher speed:** the answer comes from somewhere close.
- **Less load on the origin:** most requests end at the edge.
- **Protection:** it comes with Shield Standard against DDoS attacks, and you can add WAF.
- **Free HTTPS:** with an ACM certificate, and TLS handled at the edge.

### Origins

The origin is where the content originally lives. The key point is that visitors shouldn't be able to skip CloudFront and reach it directly:

| Origin | Good for | How to keep it private |
| --- | --- | --- |
| **S3 bucket** | Static sites and files | **OAC** lets only CloudFront read from it |
| **ALB** | Dynamic applications | **VPC origins** keep the load balancer in a private network |
| **EC2 server** | An application on a server | VPC origins, or a security group allowing only CloudFront's ranges |
| **Any HTTP server** | Even outside AWS | A secret header the server checks |

We cover S3 in detail in the [object storage section](/en/series/aws/#section-6).

### What gets cached, and for how long?

- **Cache key:** the URL by default. The more headers or cookies you add to it, the lower the chance of finding a ready copy, so keep it minimal.
- **Lifetime:** from the origin's `Cache-Control` header, or from CloudFront's settings.
- **Behaviors:** rules by path, such as `/images/*` with a long lifetime and `/api/*` with no caching. One domain can serve both static and dynamic content.

### Clearing the cache

If you change a file, the old copy stays until it expires. You have two solutions:

- **Invalidation:** you ask CloudFront to clear paths, such as `/*`. The first 1,000 paths each month are free.
- **A version in the file name:** such as `main.css?v=12`, so a new version is a new URL. This is the better solution for static files.

::: note A real example
The CSS and JavaScript links on this blog carry a version that changes with every deploy, so visitors get the new copy without any clearing.
:::

### Extra features

- **Geo restriction:** allow or block certain countries, for example for content licensed to one country.
- **Signed URLs:** for paid or private content, with a link that expires.
- **CloudFront Functions and Lambda@Edge:** short code running at the edge, such as redirects and header changes.

### Pricing

You have two options, and prices can change, so check them before deciding:

- **Pay as you go:** you pay for outgoing data and requests, at rates that vary by area. Each month you get 1 TB and 10 million requests free. **Price classes** let you leave out the most expensive areas in exchange for less coverage.
- **Flat-rate plans:** Free, Pro, Business and Premium, with a monthly price per distribution and no surprises, including other services such as WAF.

Data moving from S3 or an ALB to CloudFront is free.

### CloudFront or S3 replication between Regions?

| | CloudFront | S3 Cross-Region Replication |
| --- | --- | --- |
| **Coverage** | All edge locations | The Regions you choose |
| **Data** | Temporary copies until they expire | Full copies kept continuously up to date |
| **Good for** | Static content for the whole world | Changing data you want close in specific Regions |

## Global Accelerator: a faster road

Some traffic can't be cached: a game over UDP, a voice call or a payment request. It has to reach your application itself, and on the public internet it passes through many networks with unsteady delays.

**Global Accelerator** brings the visitor onto AWS's private network at the nearest edge location, and carries on along it to your application.

<figure class="diagram">
<svg viewBox="0 0 640 220" role="img" aria-labelledby="ga-caption">
<defs>
<marker id="ga-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="320" y="22" text-anchor="middle" class="d-small">Without it: many networks and unsteady delays</text>
<rect x="20" y="36" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="66" text-anchor="middle" class="d-label">Visitor</text>
<rect x="510" y="36" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="66" text-anchor="middle" class="d-label">Your app</text>
<polyline points="130,61 190,44 250,76 320,46 390,78 450,48 508,61" fill="none" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<circle cx="190" cy="44" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="250" cy="76" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="320" cy="46" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="390" cy="78" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<circle cx="450" cy="48" r="5" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="128" text-anchor="middle" class="d-small">With it: AWS's private network from the nearest edge location</text>
<rect x="20" y="146" width="110" height="50" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="75" y="176" text-anchor="middle" class="d-label">Visitor</text>
<rect x="170" y="146" width="110" height="50" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="225" y="176" text-anchor="middle" class="d-label">Edge</text>
<rect x="510" y="146" width="110" height="50" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="176" text-anchor="middle" class="d-label">Your app</text>
<line x1="130" y1="171" x2="168" y2="171" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#ga-arrow)"/>
<line x1="280" y1="171" x2="508" y2="171" stroke="var(--color-accent)" stroke-width="3" marker-end="url(#ga-arrow)"/>
</svg>
<figcaption id="ga-caption">Instead of crossing the whole public internet, the request enters AWS's network at the nearest edge location and carries on along it.</figcaption>
</figure>

### Two static addresses through Anycast

On the ordinary internet (**Unicast**), each address has one machine. With **Anycast**, several places share the same address, and the network takes you to the nearest.

Global Accelerator gives you **two static addresses** of this kind, pointing at ALBs, NLBs, EC2 servers or Elastic IPs, even across Regions. That gives you:

- **Addresses that don't change:** your customers can allow them in their firewalls.
- **Fast failover:** it follows the application's health and moves traffic, with no waiting for DNS caches on people's devices.
- **Traffic control:** you set each Region's share, so you can try a new version in one of them.
- **Protection:** Shield Standard, and your application isn't exposed directly.

It costs a fixed hourly fee plus an extra data charge, so it has no free allowance like CloudFront's.

### Which should you choose?

| | CloudFront | Global Accelerator |
| --- | --- | --- |
| **Protocols** | HTTP and HTTPS | Any TCP or UDP |
| **Caches?** | Yes | No, it only carries the request |
| **Addresses** | Change, so you use a domain name | Two static addresses |
| **Good for** | Sites, images, video and APIs | Games, calls and IoT, or a need for static addresses |

If your application is HTTP, start with CloudFront.

## The full picture so far

The visitor's path now looks like this: **Route 53** gives them the address, then **CloudFront** answers from the nearest location if it has a copy, otherwise it passes the request to the **ALB**, which spreads it across **Auto Scaling** servers that read from **ElastiCache** and **RDS**.

## Hands-on: see the cache for yourself

We'll put CloudFront in front of your `web-1` server from [part three](/en/posts/aws-03-ec2-first-server/), since it allows HTTP from anywhere. From CloudShell:

```bash
ORIGIN=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=web-1" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PublicDnsName" --output text)

aws cloudfront create-distribution \
  --origin-domain-name "$ORIGIN" \
  --query "Distribution.[Id,DomainName]" --output table
```

Note the ID and domain from the table, and wait until it's ready, which takes a few minutes:

```bash
aws cloudfront wait distribution-deployed --id YOUR-DISTRIBUTION-ID
```

Now request the page three times and look at the headers:

```bash
for i in 1 2 3; do
  curl -s -o /dev/null -D - https://YOUR-DOMAIN.cloudfront.net \
    | grep -iE "^(x-cache|age|x-amz-cf-pop)"
  echo
  sleep 2
done
```

The first request returns `Miss from cloudfront`, and later ones `Hit from cloudfront` with a growing `age`. `x-amz-cf-pop` shows the edge location that answered you.

Now change the page on the server through EC2 Instance Connect:

```bash
echo "<h1>New version</h1>" | sudo tee /usr/share/nginx/html/index.html
```

Open the CloudFront link and you'll find the old page, because it's still cached. Clear it from CloudShell:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID --paths "/*"
```

Moments later the new page appears.

::: security Delete after experimenting
A distribution can't be deleted straight away. On its page in the console choose **Disable**, wait for that to finish, then **Delete**.
:::

## Summary

- **CloudFront** keeps copies near visitors, so the site gets faster and the origin gets less load.
- Keep your origin **private** through OAC or VPC origins, so nobody can skip CloudFront.
- A **version in the file name** beats clearing the cache every time.
- **Global Accelerator** doesn't cache, but carries any TCP or UDP over AWS's network with two static addresses.
- If your application is HTTP, start with CloudFront.

## Test yourself

::: quiz
A multiplayer game sends its traffic over UDP to servers in two Regions. Players complain of unsteady delays, and some partners can only allow fixed addresses through their firewalls. Which service fits?

- [ ] Amazon CloudFront, using all edge locations
- [x] AWS Global Accelerator
- [ ] Route 53, with Latency records
- [ ] S3 Cross-Region Replication

Global Accelerator carries any TCP or UDP over AWS's network from the nearest edge location, and gives you two static addresses that can go in a firewall.

- **A:** CloudFront serves HTTP and HTTPS, not a game's UDP traffic.
- **C:** This only picks a Region, so the traffic still crosses the public internet, and the addresses aren't static.
- **D:** This copies S3 objects, and has nothing to do with live game traffic.

Review: [Global Accelerator: a faster road](#global-accelerator-a-faster-road) in this part, and [AWS Global Accelerator FAQs](https://aws.amazon.com/global-accelerator/faqs/) on the AWS site.
:::

::: quiz
An online academy keeps its course files in S3 and serves them through CloudFront. Visitors can still open the files directly from the bucket's URL, skipping CloudFront altogether. What closes this gap?

- [ ] Geo restriction on the distribution
- [ ] Signed URLs on the distribution
- [x] OAC, with a bucket policy that only allows CloudFront
- [ ] An invalidation of `/*` on the distribution

With OAC, CloudFront signs its requests to S3 and the bucket policy accepts only those, so the bucket stays closed to everyone else.

- **A:** This limits countries inside CloudFront, and the bucket's URL stays open.
- **B:** This controls who gets through CloudFront, and the bucket's URL stays open.
- **D:** This clears copies from the cache, and changes nothing about who can reach the bucket.

Review: [Origins](#origins) in this part, and [Restrict access to an Amazon S3 origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) in the AWS docs.
:::

::: quiz
One domain serves product images under `/images/*` and a live API under `/api/*`. The images should stay cached for a month, while API responses must never be cached. What's the simplest way to do this with CloudFront?

- [ ] Two distributions, each with its own domain
- [ ] An invalidation of `/api/*` after every request
- [ ] Global Accelerator in front of the API
- [x] One distribution, with a behavior for each path

A behavior applies its own rules to a path pattern, so one distribution on one domain can keep images for a long time and pass the API straight through.

- **A:** This splits the site across two domains for no need.
- **B:** Invalidations take time and aren't made for every request, and the paths stop being free after the monthly allowance.
- **C:** This doesn't cache anything, so it does nothing for the images.

Review: [What gets cached, and for how long?](#what-gets-cached-and-for-how-long) in this part, and [Cache behavior settings](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html) in the AWS docs.
:::

::: quiz
A team changes `main.css` several times a day. Visitors sometimes see old styles, and the team is tired of invalidating the cache after each release. What's the better long-term solution?

- [x] Put a version in the file's URL, and change it with each release
- [ ] Give the file a one-year lifetime, with no version
- [ ] Remove CloudFront, and serve the file from the origin
- [ ] Replicate the file to a bucket in each Region

A new version means a new URL, so visitors get the new copy at once, with no waiting for the old one to expire and no invalidations to run.

- **B:** Visitors would keep the old copy for even longer.
- **C:** This gives up the speed, and puts the load back on the origin.
- **D:** This adds more copies to keep in sync, and the old one stays in the cache.

Review: [Clearing the cache](#clearing-the-cache) in this part, and [Use file versioning to update or remove content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/UpdatingExistingObjects.html) in the AWS docs.
:::

::: quiz
A news site finds that most CloudFront requests still reach its origin, even for articles that rarely change. The cache key includes all cookies and headers, and the origin sends `Cache-Control: max-age=60`. Which **two** changes raise the share of requests answered from the edge? (Choose two.)

- [ ] Invalidate `/*` every hour
- [x] Remove the cookies and headers the pages don't depend on from the cache key
- [ ] Put Global Accelerator in front of the origin
- [x] Have the origin send a longer `max-age` for articles
- [ ] Add a second distribution for the same content

Every extra value in the key splits one page into many copies, and a short lifetime sends requests back to the origin soon after. With both fixed, more visitors find a ready copy.

- **A:** This empties the cache, so the problem gets worse.
- **C:** This doesn't cache, so requests would still reach the origin.
- **E:** It would have the same key and lifetime, so the same problem would repeat.

Review: [What gets cached, and for how long?](#what-gets-cached-and-for-how-long) in this part, and [Increase the proportion of requests that are served directly from the CloudFront caches](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html) in the AWS docs.
:::

All this brings the visitor to your network's door, but how is the network itself built? In [**part thirteen**](/en/posts/aws-13-vpc/) we open up the VPC and build one from scratch.
