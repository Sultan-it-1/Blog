---
title: "Caching with ElastiCache"
description: Why reading from the database on every request is slow and expensive, how an in-memory cache solves it, the Valkey, Redis and Memcached engines, the ways to keep data fresh, and a hands-on where you build a cache and a leaderboard.
date: 2026-11-02
series: aws
part: 9
numbered: true
tags: [aws, databases]
---

In [part eight](/en/posts/aws-08-rds-aurora/) we built a strong database. But imagine your store's home page shows the same 20 products to every visitor. Thousands of visitors means the database runs the same query thousands of times and returns the same answer.

The solution is simple: keep the answer somewhere fast, and go back to it instead of asking the database every time. That's a **cache**.

## What a cache is

A cache is a temporary copy of data that takes time or effort to fetch. Memory is far faster than disk, so an answer usually arrives in under a millisecond. That gives you:

- **Higher speed** for the user.
- **Less load** on the database, so you can serve more visitors with a smaller one.

The key rule: **a cache isn't the source of truth.** If you lose all of it, your application gets a bit slower, but no important data is lost.

**ElastiCache** is a managed cache service: AWS handles the servers, patches and failover. Unlike RDS, though, you have to change your application's code, because the application decides what to store and when to read it.

## Choosing an engine

| | Valkey and Redis OSS | Memcached |
| --- | --- | --- |
| **Data types** | Strings, lists, sets, sorted sets and more | Simple values |
| **Copies and failover** | Read replicas, Multi-AZ and automatic failover | No copies in a cluster you design yourself |
| **Persistence** | Snapshots you can restore from | None; data lives only in memory |
| **Scaling** | Partitioned data with replicas | Partitioned across nodes, and multi-threaded |
| **Good for** | Most cases: caching, sessions, leaderboards | A simple cache where losing data doesn't hurt |

::: note Valkey or Redis?
**Valkey** is an open-source project that split from Redis in 2024 after Redis changed its license. The commands are the same, and it's cheaper on ElastiCache. For any new project, start with it.
:::

You have two ways to run it:

| | Serverless | A cluster you design |
| --- | --- | --- |
| **Setup** | Little more than a name | You choose node types, partitions and replicas |
| **Scaling** | Automatic | You plan it yourself |
| **Billing** | Data size and operations | Per node, per hour |
| **Good for** | Irregular load, and the easiest start | Steady load and tight cost control |

## How your application uses it

### Lazy loading

This is the most common approach, also called cache-aside: your application asks the cache first, goes to the database if the answer isn't there, then stores the answer for next time.

<figure class="diagram">
<svg viewBox="0 0 640 318" role="img" aria-labelledby="cache-caption">
<defs>
<marker id="cache-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<line x1="90" y1="48" x2="90" y2="306" stroke="var(--color-line-strong)" stroke-dasharray="2 5"/>
<line x1="320" y1="48" x2="320" y2="306" stroke="var(--color-line-strong)" stroke-dasharray="2 5"/>
<line x1="550" y1="48" x2="550" y2="306" stroke="var(--color-line-strong)" stroke-dasharray="2 5"/>
<rect x="20" y="10" width="140" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="90" y="34" text-anchor="middle" class="d-label">Application</text>
<rect x="250" y="10" width="140" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="34" text-anchor="middle" class="d-label">Cache</text>
<rect x="480" y="10" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="34" text-anchor="middle" class="d-label">Database</text>
<text x="205" y="76" text-anchor="middle" class="d-small">1. Is the answer cached?</text>
<line x1="90" y1="84" x2="318" y2="84" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="205" y="114" text-anchor="middle" class="d-small">Yes: instant answer</text>
<line x1="320" y1="122" x2="92" y2="122" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="435" y="114" text-anchor="middle" class="d-small">The database did no work</text>
<line x1="20" y1="142" x2="620" y2="142" stroke="var(--color-line-strong)"/>
<text x="205" y="164" text-anchor="middle" class="d-small">No, it isn't there</text>
<line x1="320" y1="172" x2="92" y2="172" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<text x="435" y="206" text-anchor="middle" class="d-small">2. Read from the database</text>
<line x1="90" y1="214" x2="548" y2="214" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="435" y="246" text-anchor="middle" class="d-small">The answer</text>
<line x1="550" y1="254" x2="92" y2="254" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
<text x="205" y="286" text-anchor="middle" class="d-small">3. Store it with a TTL</text>
<line x1="90" y1="294" x2="318" y2="294" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#cache-arrow)"/>
</svg>
<figcaption id="cache-caption">The application asks the cache first. If the answer is there the request is done; if not, it reads from the database and stores the answer for next time.</figcaption>
</figure>

In code, it looks roughly like this:

```python
def get_product(product_id):
    key = f"product:{product_id}"

    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    product = db.fetch_product(product_id)
    cache.set(key, json.dumps(product), ex=300)  # Valid for 5 minutes
    return product
```

- **Pros:** it stores only what's actually requested, and if the cache fails the application carries on from the database.
- **Cons:** the first request is slow, and data can be stale until it expires.

### Write-through

Whenever you write to the database, you write to the cache as well.

- **Pros:** the cache is always current.
- **Cons:** an extra write every time, and the cache can fill with data nobody reads.

Many applications combine the two: lazy loading, plus updating the cache on writes for important data.

### TTL and eviction

Each key has a lifetime (**TTL**) after which it disappears, so stale data doesn't stay forever. The right value depends on the data:

| Data | A sensible TTL | Why |
| --- | --- | --- |
| **Home page and lists** | 30 to 60 seconds | Even a short TTL removes most of the load |
| **Product details** | Minutes | It's fine if it lags slightly |
| **User session** | The session length, such as 30 minutes | Renewed with activity |
| **Final balance or stock** | Don't cache it | It has to be accurate |

When memory fills up, the cache evicts some keys, usually the least used. If this happens a lot, your cache is too small.

::: warning Don't cache everything
A cache suits data that's read often and changes rarely. Its price is that data can be slightly old, so always ask: "What happens if a user sees a value that's a minute old?"
:::

::: tip Watch out for mass expiry
If a heavily requested key expires, thousands of requests hit the database at once. Add a little random variation to your TTLs so many keys don't expire at the same moment.
:::

## More than a cache

**Sessions:** remember the table in [part seven](/en/posts/aws-07-auto-scaling/)? When you keep sessions in ElastiCache, any server can read them, so users don't get signed out when their server disappears.

**Leaderboards:** a sorted set keeps items ordered by score and gives you the top entries instantly, instead of sorting millions of rows in the database.

**Rate limiting:** an `INCR` counter with a TTL counts each user's requests per minute and blocks anyone over the limit.

## Security and monitoring

- **Network:** by default the cache is reachable only from inside your network, so let its security group accept traffic only from the servers' security group.
- **Encryption:** turn it on in transit and at rest; it's always on with Serverless.
- **Access:** use users and permissions or IAM authentication on Valkey and Redis, and SASL on Memcached.

In CloudWatch, watch these metrics:

| Metric | What it tells you |
| --- | --- |
| `CacheHitRate` | How many requests found their answer in the cache. If it's low, review what you store and your TTLs |
| `Evictions` | How many keys were pushed out by lack of memory |
| Memory usage | Whether you need a bigger cache |

## Hands-on: a cache and a leaderboard

We'll use your server from [part three](/en/posts/aws-03-ec2-first-server/). From CloudShell, create a security group that accepts traffic from the server's security group. Serverless uses ports `6379` and `6380`:

```bash
aws ec2 create-security-group --group-name cache-sg \
  --description "Cache access" --query GroupId --output text

aws ec2 authorize-security-group-ingress --group-id sg-CACHE-GROUP \
  --protocol tcp --port 6379-6380 --source-group sg-SERVER-GROUP
```

Then create the cache using the ID you got back:

```bash
aws elasticache create-serverless-cache \
  --serverless-cache-name series-cache \
  --engine valkey \
  --security-group-ids sg-CACHE-GROUP

aws elasticache describe-serverless-caches \
  --serverless-cache-name series-cache \
  --query "ServerlessCaches[0].[Status,Endpoint.Address]" --output table
```

When the status shows `available`, sign in to the server through EC2 Instance Connect and connect:

```bash
sudo dnf install -y valkey
valkey-cli -h YOUR-CACHE-ENDPOINT --tls -c -p 6379
```

Try a TTL:

```text
SET product:1 "Keyboard"
GET product:1

SET offer:today "20% off" EX 30
TTL offer:today
```

Repeat `TTL` a few times and watch the countdown. After 30 seconds, `GET offer:today` returns `(nil)`.

Now a leaderboard:

```text
ZADD leaderboard 120 sara 300 omar 90 lina
ZINCRBY leaderboard 250 lina
ZREVRANGE leaderboard 0 2 WITHSCORES
```

You'll see `lina` in first place with 340 points, with no sorting on your side. Leave with `exit`.

::: security Delete after experimenting
The cache is billed even if nobody uses it, because there's a minimum data charge. Delete it, and once it's gone delete the security group:
:::

```bash
aws elasticache delete-serverless-cache --serverless-cache-name series-cache

aws ec2 delete-security-group --group-id sg-CACHE-GROUP
```

## Summary

- A **cache** is a fast, temporary copy, not the source of truth.
- Start with **Valkey**, and with **Serverless** if your load is irregular or you want an easy start.
- **Lazy loading** is the most common approach, and **write-through** keeps the cache current.
- The **TTL** sets how much staleness you accept, and some data shouldn't be cached at all.
- It also works for sessions, leaderboards and rate limiting.

## Test yourself

::: quiz
A store's home page runs the same query on RDS thousands of times a minute, and the database's CPU is high. The data changes only a few times an hour. What gives the fastest responses and takes the most load off the database?

- [ ] Turn on Multi-AZ
- [ ] Move to a larger database server
- [x] Cache the result in ElastiCache with a short TTL
- [ ] Move the data to Redshift

The answer rarely changes, so the database doesn't need to work it out again each time. Memory answers in under a millisecond, and even a short TTL removes most of the load.

- **A:** The standby doesn't serve reads, so the load stays the same.
- **B:** This buys capacity, but the same query still runs every time.
- **D:** Redshift is for large reports, not for answering a page quickly.

Review: [What a cache is](#what-a-cache-is) in this part, and [Caching strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html) in the AWS docs.
:::

::: quiz
A mobile game shows the top 100 players live. The leaderboard must keep working if a cache node fails, with automatic failover. Which option fits?

- [x] ElastiCache for Valkey, using a sorted set, with replicas and Multi-AZ
- [ ] ElastiCache for Memcached, in a cluster you design yourself
- [ ] An `ORDER BY` query on RDS for every request
- [ ] A file in S3 that's rewritten after every score

A sorted set keeps players ordered by score and returns the top entries instantly, and Valkey supports replicas with automatic failover.

- **B:** Memcached stores simple values, and it has no copies in a cluster you design.
- **C:** Sorting millions of rows on every request puts heavy load on the database.
- **D:** S3 isn't built for a file that changes constantly and must be read live.

Review: [Choosing an engine](#choosing-an-engine) in this part, and [Comparing engines](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html) in the AWS docs.
:::

::: quiz
A store uses lazy loading with a one-hour TTL, so customers can see an old price for up to an hour after it changes. Prices must now update within a minute, while keeping the benefit of the cache. What should the team do?

- [ ] Remove the cache, and read every price from the database
- [ ] Make the TTL longer
- [ ] Add read replicas to the database
- [x] Update or invalidate the cached price on each write, and shorten the TTL

Lazy loading alone leaves data stale until it expires. Handling the cache on each write keeps it current, and a shorter TTL limits the damage if a write is ever missed.

- **A:** This solves staleness, but brings all the load back to the database.
- **B:** This makes the problem worse.
- **C:** The stale value comes from the cache, not from the database.

Review: [Write-through](#write-through) in this part, and [Caching strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html) in the AWS docs.
:::

::: quiz
An application fills its cache at startup, giving every key the same TTL. At the end of that period, the database gets a sharp spike in load, and the pattern repeats. What's the simplest fix?

- [ ] Move the cache to a larger node type
- [x] Add a small random value to each key's TTL
- [ ] Remove the TTL from all keys
- [ ] Turn on Multi-AZ for the cache

When keys expire together, requests for all of them go to the database at the same moment. Randomizing the TTL spreads those expiries over time.

- **A:** The problem is in the database at the moment of expiry, not in the cache's size.
- **C:** Keys would never refresh, so stale data would stay.
- **D:** This protects the cache from failures, and the keys still expire together.

Review: [TTL and eviction](#ttl-and-eviction) in this part, and [Best practices for TTLs and jitter](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/semantic-caching-best-practices.html) in the AWS docs.
:::

::: quiz
A team sees the `Evictions` metric rising and `CacheHitRate` falling on its cache. Which **two** actions address this? (Choose two.)

- [x] Give the cache more memory
- [ ] Add a read replica to the database
- [x] Review what's stored, and stop caching data that's rarely read
- [ ] Turn off encryption in transit
- [ ] Move all the data from the cache to S3

Evictions mean the cache is full and is pushing keys out, which turns into misses. Either make room with more memory, or stop filling it with what nobody reads.

- **B:** This helps the database, but it doesn't change the cache's memory.
- **D:** Encryption has nothing to do with evictions, and you'd lose its protection.
- **E:** S3 is far slower, and this removes the point of having a cache.

Review: [Security and monitoring](#security-and-monitoring) in this part, and [ElastiCache for e-commerce](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ecommerce-caching-valkey.html) in the AWS docs.
:::

You now know RDS, Aurora and ElastiCache, and AWS has many more. In [**part ten**](/en/posts/aws-10-choosing-database/) we answer the question that confuses everyone: which database should you choose?
