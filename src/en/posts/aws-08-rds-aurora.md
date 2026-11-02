---
title: "Managed Databases: RDS and Aurora"
description: Stop running your database by hand. How RDS handles backups, patches and failover for you, the difference between Multi-AZ and read replicas, what Aurora adds, and a hands-on where you build a private database.
date: 2026-11-02
series: aws
part: 8
numbered: true
tags: [aws, databases]
---

In [part seven](/en/posts/aws-07-auto-scaling/) we agreed that a server can vanish at any moment, so nothing important stays on it. The most important thing you have is your data, so where does it live?

You could install PostgreSQL on an EC2 server yourself. That works, but now you own the backups, the patches, the replication, the failover and the disk that fills up at 3 a.m. **RDS** takes most of that off your hands.

## What RDS does for you

**RDS** (Relational Database Service) runs the database engine you choose on servers AWS manages. The supported engines are PostgreSQL, MySQL, MariaDB, Oracle, SQL Server and Db2, plus Aurora, which we'll reach shortly.

| Task | Database on EC2 | RDS |
| --- | --- | --- |
| Installing and patching the engine and OS | You | AWS, in a maintenance window you set |
| Backups and point-in-time restore | You build it | Built in |
| A standby with automatic failover | You build it | One option |
| Read copies | You build them | A few clicks |
| Monitoring dashboards | You build them | Built in |
| Designing tables, indexes and queries | You | **Still you** |

The trade-off is that you can't SSH into the server or touch the operating system. If you truly need that with Oracle or SQL Server, **RDS Custom** gives you access to the server while AWS keeps much of the automation.

### Storage that grows by itself

Turn on **Storage Auto Scaling** and set a ceiling, and RDS expands the disk when free space runs low, with no downtime. Note that it only grows: you can't shrink it afterwards.

## Multi-AZ and read replicas

This is the most important idea in this part, and the two often get mixed up. One protects you from failures; the other helps you serve more reads.

<figure class="diagram">
<svg viewBox="0 0 640 280" role="img" aria-labelledby="rds-caption">
<defs>
<marker id="rds-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="10" y="10" width="300" height="260" rx="14" fill="none" stroke="var(--color-line-strong)"/>
<text x="160" y="36" text-anchor="middle" class="d-label">Multi-AZ: protection</text>
<rect x="80" y="50" width="160" height="34" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="160" y="72" text-anchor="middle" class="d-small">Application</text>
<rect x="24" y="112" width="112" height="76" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="80" y="146" text-anchor="middle" class="d-label">Primary</text>
<text x="80" y="166" text-anchor="middle" class="d-small">Zone A</text>
<rect x="184" y="112" width="112" height="76" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="240" y="146" text-anchor="middle" class="d-label">Standby</text>
<text x="240" y="166" text-anchor="middle" class="d-small">Zone B</text>
<line x1="130" y1="84" x2="100" y2="110" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<line x1="190" y1="84" x2="222" y2="110" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="136" y1="150" x2="182" y2="150" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<text x="160" y="222" text-anchor="middle" class="d-small">Synchronous copy, no reads from the standby</text>
<text x="160" y="246" text-anchor="middle" class="d-small">Takes over automatically on failure</text>
<rect x="330" y="10" width="300" height="260" rx="14" fill="none" stroke="var(--color-line-strong)"/>
<text x="480" y="36" text-anchor="middle" class="d-label">Read replicas: more reads</text>
<rect x="400" y="50" width="160" height="34" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="480" y="72" text-anchor="middle" class="d-small">Application</text>
<rect x="344" y="112" width="100" height="76" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="394" y="146" text-anchor="middle" class="d-label">Primary</text>
<text x="394" y="166" text-anchor="middle" class="d-small">Writes</text>
<rect x="492" y="98" width="126" height="104" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<rect x="502" y="108" width="106" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="555" y="132" text-anchor="middle" class="d-small">Replica 1</text>
<rect x="502" y="154" width="106" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="555" y="178" text-anchor="middle" class="d-small">Replica 2</text>
<line x1="430" y1="84" x2="400" y2="110" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<line x1="530" y1="84" x2="548" y2="96" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<line x1="444" y1="150" x2="490" y2="150" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rds-arrow)"/>
<text x="480" y="222" text-anchor="middle" class="d-small">Asynchronous copies you can read from</text>
<text x="480" y="246" text-anchor="middle" class="d-small">Your application decides where reads go</text>
</svg>
<figcaption id="rds-caption">With Multi-AZ the standby waits without serving reads and takes over on failure; with read replicas the application sends its reads to separate copies.</figcaption>
</figure>

| | Multi-AZ | Read replica |
| --- | --- | --- |
| **Goal** | Availability: survive a failure | Scaling: serve more reads |
| **Replication** | Synchronous | Asynchronous, so it can lag slightly |
| **Can you read from it?** | No, the standby only waits | Yes, that's its purpose |
| **Endpoint** | The same one, which moves on failover | Each replica has its own |
| **Where** | Another Availability Zone in the same Region | Same zone, another zone or another Region |
| **On failure** | Automatic failover in a minute or two | Manual: you promote it to a standalone database |

### Multi-AZ

**Synchronous** means a write isn't confirmed until it reaches both copies. When the primary fails, RDS points the same DNS name at the standby, and your application reconnects with no changes. You can turn this on for a running database without downtime.

There's also a newer form called a **Multi-AZ DB cluster** for MySQL and PostgreSQL: one primary with two standbys you can read from, and faster failover.

### Read replicas

You can have up to 15 replicas on PostgreSQL, MySQL and MariaDB, and fewer on the others. A common example: your dashboard's heavy reports read from a replica, leaving the production database alone.

Watch out for two things:

- **RDS doesn't split reads for you.** Your application sends reads to the replica's endpoint.
- **Replication is asynchronous.** A user may not see what they wrote a moment ago, so keep reads that must be current on the primary.

Replicating within a Region has no data transfer charge; between Regions it does.

::: tip Each one has a cost
Every copy is a server you pay for in full, and Multi-AZ roughly doubles the cost of the database. Turn it on in production, and leave it off in development if you don't need it.
:::

## Backups and restore

RDS takes an automatic daily backup and saves transaction logs every 5 minutes, so you can **restore to any second** within the retention period, up to about 5 minutes ago. You set the period from 1 to 35 days, and 0 turns automatic backups off.

**Manual snapshots** stay until you delete them, which makes them a good step before any big change.

The key point: **a restore creates a new database** with a new endpoint; it doesn't overwrite the old one. You then point your application at the new endpoint.

::: warning Stopping doesn't stop all the costs
A stopped database still costs you for storage and backups, and RDS starts it again automatically after 7 days. If you don't need it, take a snapshot and delete it.
:::

## Security

It's the same pattern we saw in [part six](/en/posts/aws-06-load-balancers/): the database sits in a private network and accepts traffic only from the servers' security group.

- **Network:** turn off public access, and let the security group allow the port (`5432` or `3306`) only from the servers' security group.
- **Encryption at rest:** through KMS, and decide at creation. Enabling it later means encrypting a copy of a snapshot and restoring from it.
- **Encryption in transit:** TLS.
- **Passwords:** let RDS manage the admin password in **Secrets Manager**, or use IAM authentication with short-lived tokens on PostgreSQL, MySQL and MariaDB.
- **Logs:** export them to CloudWatch Logs.

### RDS Proxy

If you have many short-lived connections, such as the Lambda functions in the [modern applications section](/en/series/aws/#section-7), they can exhaust the database's connection limit. **RDS Proxy** sits in between and reuses connections, and your application connects to it as if it were the database.

It also shortens failover, because it keeps your application's connections open and routes them to the new database. It's reachable only from inside your private network.

## Aurora

**Aurora** is a database engine AWS built for the cloud, compatible with MySQL or PostgreSQL, so your application and tools work with little or no change. The fundamental difference is that storage is separate from the servers.

<figure class="diagram">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="aurora-caption">
<defs>
<marker id="aurora-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="40" y="10" width="170" height="40" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="125" y="35" text-anchor="middle" class="d-label">Writer endpoint</text>
<rect x="235" y="10" width="365" height="40" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="417" y="35" text-anchor="middle" class="d-label">Reader endpoint: spreads across readers</text>
<line x1="125" y1="50" x2="125" y2="76" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<line x1="320" y1="50" x2="320" y2="76" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<line x1="515" y1="50" x2="515" y2="76" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<rect x="40" y="78" width="170" height="56" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="125" y="103" text-anchor="middle" class="d-label">Writer</text>
<text x="125" y="122" text-anchor="middle" class="d-small">Reads and writes</text>
<rect x="235" y="78" width="170" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="103" text-anchor="middle" class="d-label">Reader 1</text>
<text x="320" y="122" text-anchor="middle" class="d-small">Reads only</text>
<rect x="430" y="78" width="170" height="56" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="515" y="103" text-anchor="middle" class="d-label">Reader 2</text>
<text x="515" y="122" text-anchor="middle" class="d-small">Reads only</text>
<line x1="125" y1="134" x2="125" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#aurora-arrow)"/>
<line x1="320" y1="134" x2="320" y2="168" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<line x1="515" y1="134" x2="515" y2="168" stroke="var(--color-line-strong)" stroke-width="2" stroke-dasharray="4 4"/>
<rect x="20" y="168" width="600" height="122" rx="14" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="320" y="192" text-anchor="middle" class="d-label">Shared storage: six copies across three Availability Zones</text>
<rect x="40" y="204" width="170" height="74" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<text x="125" y="224" text-anchor="middle" class="d-small">Zone A</text>
<rect x="63" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="91" y="256" text-anchor="middle" class="d-small">Copy</text>
<rect x="131" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="159" y="256" text-anchor="middle" class="d-small">Copy</text>
<rect x="235" y="204" width="170" height="74" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<text x="320" y="224" text-anchor="middle" class="d-small">Zone B</text>
<rect x="258" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="286" y="256" text-anchor="middle" class="d-small">Copy</text>
<rect x="326" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="354" y="256" text-anchor="middle" class="d-small">Copy</text>
<rect x="430" y="204" width="170" height="74" rx="10" fill="none" stroke="var(--color-accent)" stroke-dasharray="5 5"/>
<text x="515" y="224" text-anchor="middle" class="d-small">Zone C</text>
<rect x="453" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="481" y="256" text-anchor="middle" class="d-small">Copy</text>
<rect x="521" y="236" width="56" height="30" rx="6" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="549" y="256" text-anchor="middle" class="d-small">Copy</text>
</svg>
<figcaption id="aurora-caption">One server writes and several read, and they all share one storage layer kept as six copies across three Availability Zones.</figcaption>
</figure>

- **Storage:** you don't reserve space in advance. It grows by itself up to 256 TiB on recent versions, and keeps six copies across three Availability Zones.
- **Servers:** one writer and up to 15 readers. Because they share storage, replica lag is usually very small.
- **Failover:** on failure a reader is promoted, usually in under 30 seconds.
- **Endpoints:** the **writer endpoint** always points at the writer, and the **reader endpoint** spreads across the readers. You can create custom endpoints too, for example to reserve your strongest readers for reports.
- **Replica scaling:** Aurora can add and remove readers according to load.

### Features worth knowing

| Feature | What it gives you |
| --- | --- |
| **Aurora Serverless v2** | Capacity grows and shrinks with load without choosing a server size. It suits irregular load and can pause when idle |
| **Global Database** | One Region for writes and up to 10 Regions for reads, usually under a second behind. You promote one if the primary fails |
| **Cloning** | A fast copy of production for testing, which shares the data and stores only the changes |
| **Babelfish** | Lets Aurora PostgreSQL understand SQL Server's T-SQL, easing a migration |
| **Aurora ML** | Call AI models from SageMaker or Bedrock inside an SQL query |

### RDS or Aurora?

| You want | Choose |
| --- | --- |
| Oracle, SQL Server, Db2 or MariaDB | **RDS**, since Aurora is compatible only with MySQL and PostgreSQL |
| A small database with moderate load and low cost | **RDS** |
| Many reads, fast failover and multi-Region operation | **Aurora** |
| Irregular load, or running only some hours | **Aurora Serverless v2** |

On cost, Aurora's servers are pricier per hour and storage is billed differently. The standard option charges for read and write operations, while **I/O-Optimized** removes those charges in exchange for higher server and storage rates. Compare them in the pricing calculator using your real load.

## Hands-on: a private database only your server can reach

We'll use the server you launched in [part three](/en/posts/aws-03-ec2-first-server/). Open **Aurora and RDS** and choose **Create database**:

1. **Engine:** choose **PostgreSQL**, and the setup option that shows all the details rather than the quick one.
2. **Template:** the cheapest on offer, such as **Free tier** if your account shows it.
3. **Name:** call the database `series-db`, keep the username `postgres`, choose **Self managed** and set a strong password.
4. **Size:** `db.t4g.micro` with 20 GiB.
5. **Network:** choose **Connect to an EC2 compute resource** and select your server. RDS sets up the security groups for you, and public access stays off.

Wait until the status shows **Available**, and copy the **Endpoint** from the **Connectivity & security** tab. Then sign in to the server through EC2 Instance Connect:

```bash
sudo dnf install -y postgresql16
psql -h YOUR-DB-ENDPOINT -U postgres -d postgres
```

Inside `psql`, create a table and try it:

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  item TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO orders (item) VALUES ('keyboard'), ('screen');

SELECT * FROM orders;
```

Leave with `\q`. Now confirm the database really is private by trying to reach it from CloudShell, which sits outside your network:

```bash
timeout 5 bash -c '</dev/tcp/YOUR-DB-ENDPOINT/5432' && echo open || echo closed
```

You should see `closed`. Then take a manual snapshot from CloudShell, which is what you'd do before any risky change:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier series-db \
  --db-snapshot-identifier series-db-demo

aws rds describe-db-snapshots \
  --db-snapshot-identifier series-db-demo \
  --query "DBSnapshots[0].[Status,PercentProgress]" --output table
```

### Extra: try a read replica

A read replica needs automatic backups turned on for the primary, and it's a separately billed server. Some free account plans don't allow this. If yours does:

```bash
aws rds modify-db-instance --db-instance-identifier series-db \
  --backup-retention-period 1 --apply-immediately

aws rds create-db-instance-read-replica \
  --db-instance-identifier series-db-replica \
  --source-db-instance-identifier series-db
```

Once it's ready, connect to its endpoint from your server. You'll find all the rows in `orders`, and if you try to add one you'll get the error `cannot execute INSERT in a read-only transaction`.

::: security Delete after experimenting
A database is billed by the hour even if nobody uses it, and manual snapshots remain and are billed after the database is gone. Delete the replica first if you made one, wait for it to disappear, then delete the rest:
:::

```bash
aws rds delete-db-instance --db-instance-identifier series-db-replica \
  --skip-final-snapshot

aws rds delete-db-instance --db-instance-identifier series-db \
  --skip-final-snapshot --delete-automated-backups

aws rds delete-db-snapshot --db-snapshot-identifier series-db-demo
```

## Summary

- **RDS** handles operations, backups and patches, while designing tables and queries stays with you.
- **Multi-AZ** is for availability and can't be read from; **read replicas** are for scaling and can lag.
- A **restore** creates a new database with a new endpoint.
- Keep the database in a private network, accepting traffic only from the **servers' security group**.
- **Aurora** has shared storage with six copies, up to 15 readers and fast failover, but is compatible only with MySQL and PostgreSQL.

Even with a strong database, repeating the same query thousands of times is wasteful. In [**part nine**](/en/posts/aws-09-elasticache/) we add a fast layer in front of it with ElastiCache.
