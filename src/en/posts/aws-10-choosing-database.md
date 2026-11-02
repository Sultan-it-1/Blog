---
title: "Which Database Should You Choose?"
description: Relational, key-value, document, graph, time series or search. What each kind is good for, how to choose among AWS's many databases with a few simple questions, and how a real application's data layer grows step by step.
date: 2026-11-02
series: aws
part: 10
numbered: true
tags: [aws, databases]
---

In [part eight](/en/posts/aws-08-rds-aurora/) and [part nine](/en/posts/aws-09-elasticache/) we covered RDS, Aurora and ElastiCache. But open the AWS menu and you'll find more than ten database services, and that's where people get lost.

The right question isn't "what's the best database?", because there's no single answer. The question is: **what suits this particular data?**

## Questions to start with

Before opening any service, answer these:

| Question | Why it matters |
| --- | --- |
| **What shape is the data?** | Linked tables, varied documents, relationships or readings over time |
| **How will you read it?** | By key, with complex queries joining tables, by searching text or by aggregating millions of rows |
| **How much reading versus writing?** | Heavy reads can be solved with a cache and replicas; heavy writes need a different design |
| **How big, and how fast is it growing?** | Ordinary gigabytes, or data that grows without a ceiling |
| **How accurate must it be?** | A money transfer needs strict transactions; a like count can tolerate delay |
| **How much can you manage?** | A small team prefers a service that scales by itself |
| **What does your team know?** | Existing knowledge spares you many mistakes |

## Types of database

| Type | Shape of the data | AWS service | Example |
| --- | --- | --- | --- |
| **Relational** | Linked tables and transactions | RDS and Aurora | Orders, accounts, invoices |
| **Key-value** | A value fetched by its key, at huge scale | DynamoDB | Carts and user profiles |
| **Document** | JSON with varied fields | DocumentDB and DynamoDB | Catalogs and content |
| **In-memory** | Fast data | ElastiCache and MemoryDB | Caching and sessions |
| **Wide-column** | Cassandra-style rows with heavy writes | Keyspaces | Existing Cassandra systems |
| **Graph** | Connections between things | Neptune | Social networks and fraud detection |
| **Time series** | Readings over time | Timestream for InfluxDB | Sensors and metrics |
| **Search** | Text you search inside | OpenSearch | Site search and logs |
| **Analytics** | Aggregation over huge data | Redshift | Management reports |
| **Files** | Files of any kind | S3 with Athena | Logs and archives |

### Relational or NoSQL?

This is the first decision, and the real difference is in how you think:

| | Relational (SQL) | NoSQL |
| --- | --- | --- |
| **Design** | Design the tables, then write any query | Define the queries first, then design around them |
| **Queries** | Flexible, with table joins | Limited, and fast along the path you designed |
| **Transactions** | Strong | Varies by service |
| **Scaling** | Reads are easy; writes usually mean a bigger server | Horizontal, with steady performance as it grows |

::: tip Start relational unless you have a reason
Most applications suit a relational database, especially if you don't know all your queries from the start. Choose NoSQL for a clear reason, not just because it "scales".
:::

### Services you'll come across

- **DynamoDB:** serverless key-value with steady performance at any size. We cover it in the [modern applications section](/en/series/aws/#section-7).
- **DocumentDB:** documents compatible with MongoDB, which suits you if you're moving an existing MongoDB application.
- **MemoryDB:** fast memory like Valkey but with durable data, so you can use it as a primary database and not just a cache.
- **Keyspaces:** compatible with Apache Cassandra, with no servers to manage.
- **Neptune:** for data whose value lies in relationships, such as "friends of my friends who bought this".
- **Timestream for InfluxDB:** for sensor readings and metrics. The older LiveAnalytics edition is closed to new customers.
- **OpenSearch:** text search and log analysis, usually a copy of your data rather than the main source.
- **Redshift:** a data warehouse for huge reports. We cover it in the [data and AI section](/en/series/aws/#section-8).

## How to decide

Go through the questions from top to bottom, and the first "yes" is your starting point:

<figure class="diagram">
<svg viewBox="0 0 640 406" role="img" aria-labelledby="choose-caption">
<defs>
<marker id="choose-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="10" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="34" text-anchor="middle" class="d-label">A temporary copy to speed up reads?</text>
<rect x="480" y="10" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="34" text-anchor="middle" class="d-label">ElastiCache</text>
<line x1="420" y1="29" x2="478" y2="29" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="449" y="23" text-anchor="middle" class="d-small">Yes</text>
<line x1="220" y1="48" x2="220" y2="66" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="238" y="62" text-anchor="middle" class="d-small">No</text>
<rect x="20" y="68" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="92" text-anchor="middle" class="d-label">Searching inside text or logs?</text>
<rect x="480" y="68" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="92" text-anchor="middle" class="d-label">OpenSearch</text>
<line x1="420" y1="87" x2="478" y2="87" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="449" y="81" text-anchor="middle" class="d-small">Yes</text>
<line x1="220" y1="106" x2="220" y2="124" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="238" y="120" text-anchor="middle" class="d-small">No</text>
<rect x="20" y="126" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="150" text-anchor="middle" class="d-label">Reports across huge volumes of data?</text>
<rect x="480" y="126" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="150" text-anchor="middle" class="d-label">Redshift, Athena</text>
<line x1="420" y1="145" x2="478" y2="145" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="449" y="139" text-anchor="middle" class="d-small">Yes</text>
<line x1="220" y1="164" x2="220" y2="182" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="238" y="178" text-anchor="middle" class="d-small">No</text>
<rect x="20" y="184" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="208" text-anchor="middle" class="d-label">Is the value in links between things?</text>
<rect x="480" y="184" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="208" text-anchor="middle" class="d-label">Neptune</text>
<line x1="420" y1="203" x2="478" y2="203" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="449" y="197" text-anchor="middle" class="d-small">Yes</text>
<line x1="220" y1="222" x2="220" y2="240" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="238" y="236" text-anchor="middle" class="d-small">No</text>
<rect x="20" y="242" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="266" text-anchor="middle" class="d-label">Readings over time, from sensors say?</text>
<rect x="480" y="242" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="266" text-anchor="middle" class="d-label">Timestream</text>
<line x1="420" y1="261" x2="478" y2="261" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="449" y="255" text-anchor="middle" class="d-small">Yes</text>
<line x1="220" y1="280" x2="220" y2="298" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="238" y="294" text-anchor="middle" class="d-small">No</text>
<rect x="20" y="300" width="400" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="324" text-anchor="middle" class="d-label">Simple key lookups at huge scale?</text>
<rect x="480" y="300" width="140" height="38" rx="8" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="550" y="324" text-anchor="middle" class="d-label">DynamoDB</text>
<line x1="420" y1="319" x2="478" y2="319" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
<text x="449" y="313" text-anchor="middle" class="d-small">Yes</text>
<line x1="220" y1="338" x2="220" y2="356" stroke="var(--color-line-strong)" stroke-width="2"/>
<text x="238" y="352" text-anchor="middle" class="d-small">No</text>
<rect x="20" y="358" width="400" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="220" y="382" text-anchor="middle" class="d-label">Ordinary application data</text>
<rect x="480" y="358" width="140" height="38" rx="8" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="550" y="382" text-anchor="middle" class="d-label">RDS, Aurora</text>
<line x1="420" y1="377" x2="478" y2="377" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#choose-arrow)"/>
</svg>
<figcaption id="choose-caption">Start at the top: each "yes" gives you a service to begin with, and if nothing applies, a relational database is the default.</figcaption>
</figure>

This is a starting guide, not a law. One application usually uses more than one type, with each kind of data going where it fits.

## A data layer that grows with your application

You don't need all this from day one. Imagine an online store growing over time:

1. **Launch:** a single RDS database is enough. Once you take real orders, turn on **Multi-AZ**.
2. **More visitors, heavier reads:** add **ElastiCache** for main pages and sessions.
3. **Reports start slowing the site:** send them to a **read replica**.
4. **Product search is weak:** add **OpenSearch** and fill it from the database.
5. **Management wants years of analysis:** move the data to **S3 with Athena** or **Redshift**.
6. **Visitors from around the world:** move to **Aurora Global Database**.

Each step came after a real problem you measured, not before it. Every extra service means more cost, more complexity and one more thing that can fail.

### Common mistakes

- **Choosing NoSQL because it "scales":** then discovering you need queries you didn't design for.
- **Running reports on the production database:** one heavy query slows the whole site.
- **Storing files inside the database:** put them in S3 and keep the link in the database.
- **Treating the cache as a source of truth:** if it's lost, nothing important should go with it.
- **Multi-AZ in development:** double the cost, usually for no benefit.

## Test yourself

What would you choose for each case? Think before reading the answers:

1. A clinic booking system with appointments, patients and payments.
2. A mobile game showing the top 100 players live.
3. An app suggesting "people you may know".
4. Ten thousand sensors sending the temperature every minute.
5. A sales team wanting reports across five years of orders.

::: note The answers
1. **RDS or Aurora:** linked data and transactions.
2. **ElastiCache:** a sorted set gives you the top entries instantly.
3. **Neptune:** the value is in the relationships.
4. **Timestream for InfluxDB:** readings over time.
5. **Redshift or Athena:** huge reports, away from the production database.
:::

## Summary

- Ask about the **shape of the data and how you'll read it** before any service name.
- Start **relational** unless you have a clear reason not to.
- One application uses more than one type, with each kind of data going where it fits.
- Add each service when you **measure a real problem**, not before.

That completes the databases section. Your application now runs, scales and keeps its data safe, but how do visitors reach it by your site's name? That's the next section's subject, starting in **part eleven** with DNS and Route 53.
