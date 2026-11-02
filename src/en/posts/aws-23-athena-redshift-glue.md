---
title: "Analyzing Data: Athena, Redshift and Glue"
description: Getting answers from your data. Querying S3 with SQL in Athena, a data warehouse with Redshift, preparing data with Glue, plus search, big jobs, dashboards and streams, with a hands-on where Parquet cuts what a query reads.
date: 2026-11-02
series: aws
part: 23
numbered: true
tags: [aws, data]
---

The application we finished designing in [part twenty-two](/en/posts/aws-22-serverless-design/) produces a lot of data: orders, logs and events. Then someone asks: "Which city grew the most this year?"

You could run that on your production database and slow it down for your customers. Instead, AWS has a set of services built for analysis, and this part is a guide to them.

| You want | Use |
| --- | --- |
| SQL on files in S3, with no servers | **Athena** |
| A data warehouse for heavy, frequent reports | **Redshift** |
| A catalog of your data, and cleaning and converting it | **Glue** |
| Permissions over a whole data lake | **Lake Formation** |
| Text search and log analysis | **OpenSearch** |
| Big Spark or Hadoop jobs | **EMR** |
| Dashboards for your team | **Quick Sight** |
| Analyzing a stream as it arrives | **Managed Flink** |
| Managed Apache Kafka | **MSK** |

## Two kinds of work

The questions an application asks are different from the questions a business asks:

| | Running the application (OLTP) | Analysis (OLAP) |
| --- | --- | --- |
| **Example** | Fetch order 1001 | Total sales per city over three years |
| **Rows touched** | A few | Millions |
| **Who asks** | Millions of customers | A few analysts |
| **Services** | [RDS](/en/posts/aws-08-rds-aurora/) and [DynamoDB](/en/posts/aws-21-lambda-api-dynamodb/) | Athena and Redshift |

The secret of analytics services is storing data **by column**. To add up one column, there's no need to read the rest:

<figure class="diagram">
<svg viewBox="0 0 640 196" role="img" aria-labelledby="warehouse-caption">
<defs>
<marker id="warehouse-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="165" y="22" text-anchor="middle" class="d-small">By row: reads everything</text>
<text x="75" y="48" text-anchor="middle" class="d-code">id</text>
<rect x="30" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="30" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="30" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="165" y="48" text-anchor="middle" class="d-code">city</text>
<rect x="120" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="120" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="120" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="255" y="48" text-anchor="middle" class="d-code">amount</text>
<rect x="210" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="210" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="210" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="475" y="22" text-anchor="middle" class="d-small">By column: reads one column</text>
<text x="385" y="48" text-anchor="middle" class="d-code">id</text>
<rect x="340" y="58" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="340" y="92" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="340" y="126" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="475" y="48" text-anchor="middle" class="d-code">city</text>
<rect x="430" y="58" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="430" y="92" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="430" y="126" width="90" height="30" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="565" y="48" text-anchor="middle" class="d-code">amount</text>
<rect x="520" y="58" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="520" y="92" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<rect x="520" y="126" width="90" height="30" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="182" text-anchor="middle" class="d-small">The query: SUM(amount)</text>
</svg>
<figcaption id="warehouse-caption">To add up the amount column, row storage goes through every field, while column storage reads that column alone.</figcaption>
</figure>

## Amazon Athena: SQL on S3

**Athena** lets you query files in S3 directly with SQL. There's nothing to run: you describe the files as a table, and the data stays where it is.

You pay about **$5 per TB of data scanned**, with a 10 MB minimum per query. Creating tables and failed queries cost nothing. It suits occasional questions and analyzing logs, such as those from a load balancer or [S3](/en/posts/aws-17-s3-security/), and it's also where AWS points you now that **S3 Select** is closed to new customers.

### Read less, pay less

Since the price depends on what's read, reading less means both a lower bill and a faster answer:

- **Columnar formats:** convert files to **Parquet** or ORC, so a query reads only its columns.
- **Partitions:** split the data into paths such as `year=2025/`, so a query skips the rest.
- **Compression:** the smaller the data, the less gets scanned.
- **Larger files:** thousands of tiny files slow things down, so merge them.

<figure class="diagram">
<svg viewBox="0 0 640 188" role="img" aria-labelledby="partition-caption">
<defs>
<marker id="partition-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="52" width="230" height="84" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="135" y="89" text-anchor="middle" class="d-label">Athena</text>
<text x="135" y="109" text-anchor="middle" class="d-code">WHERE year = 2025</text>
<rect x="370" y="14" width="250" height="48" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="495" y="33" text-anchor="middle" class="d-code">year=2024/</text>
<text x="495" y="53" text-anchor="middle" class="d-small">Skipped</text>
<rect x="370" y="70" width="250" height="48" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="495" y="89" text-anchor="middle" class="d-code">year=2025/</text>
<text x="495" y="109" text-anchor="middle" class="d-small">Read</text>
<rect x="370" y="126" width="250" height="48" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="495" y="145" text-anchor="middle" class="d-code">year=2026/</text>
<text x="495" y="165" text-anchor="middle" class="d-small">Skipped</text>
<line x1="250" y1="94" x2="368" y2="94" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#partition-arrow)"/>
</svg>
<figcaption id="partition-caption">With the data split by year, a query about 2025 reads one folder and skips the others, so you pay only for what it read.</figcaption>
</figure>

### Federated queries

Your data isn't all in S3? **Federated Query** lets Athena reach other sources, such as DynamoDB or RDS, through a connector that runs as a Lambda function in your account. One query can even join them with your files.

## Amazon Redshift: the warehouse

When reports become heavy and frequent, with many joins and many users, you need a **data warehouse**. **Redshift** is based on PostgreSQL, stores data by column, and splits a query across many nodes in parallel.

| | Serverless | Provisioned |
| --- | --- | --- |
| **You choose** | Nothing; capacity adjusts itself | The type and number of nodes |
| **You pay for** | Compute time when queries run | Each node per hour |
| **Suits** | Changing or intermittent load | Steady load, or needing Multi-AZ |

### Getting data in

| Method | When |
| --- | --- |
| **`COPY` from S3** | The usual way: loads in bulk and in parallel |
| **Data Firehose** | A [stream](/en/posts/aws-19-sqs-sns-kinesis/) that lands in S3, then gets loaded with `COPY` |
| **Zero-ETL** | Automatically replicating from sources like Aurora, RDS and DynamoDB, with no pipeline to build |
| **`INSERT` row by row** | Avoid it for large amounts; it's very slow |

### Things worth knowing

- **Redshift Spectrum:** query files in S3 from Redshift without loading them, and join them with your tables.
- **Snapshots:** automatic and incremental, and you can copy them to another Region to recover from a disaster.
- **Multi-AZ:** available on provisioned RA3 clusters, with nodes in two Availability Zones behind one endpoint.

### Athena or Redshift?

| | Athena | Redshift |
| --- | --- | --- |
| **The data is in** | S3 | The warehouse, plus S3 with Spectrum |
| **Setup** | None | Little, with Serverless |
| **You pay for** | Data scanned | Compute time |
| **Suits** | Occasional questions and logs | Heavy, repeated reports and dashboards |

Start with Athena, and move to Redshift when your queries become frequent enough for it to pay off.

## AWS Glue: preparing the data

Analysis assumes the data is clean and organized, which is rarely the case. **Glue** is a serverless set of tools for that:

| Part | What it does |
| --- | --- |
| **Data Catalog** | A central list of your tables and their columns, used by Athena, Redshift Spectrum and EMR |
| **Crawlers** | Scan S3 and work out the columns, then add them to the catalog |
| **ETL jobs** | Spark code that extracts, transforms and loads data, such as CSV to Parquet |
| **Job bookmarks** | Remember what's been processed, so a job doesn't repeat old files |
| **DataBrew** | Cleans data visually, with no code |

A common pattern: a file lands in S3, an event starts a Glue job, and it converts the file to Parquet in another folder. Note that **Glue Ray jobs** closed to new customers on April 30, 2026, while Spark jobs carry on as usual.

You may also read about **AWS Data Pipeline**, an older service for moving and processing data on a schedule. It's closed to new customers and in maintenance mode, so use Glue or Step Functions for new work.

## Lake Formation: permissions for the lake

S3 with Parquet files and a catalog is what's called a **data lake**. As it grows, managing access through [bucket policies](/en/posts/aws-15-s3-basics/) gets hard, because S3 knows about files, not columns.

**Lake Formation** gives you one place to grant access by database, table, column and even row: the sales team sees orders without card numbers, for example. These permissions apply through services like Athena, Redshift and EMR.

## Search, big jobs and dashboards

### OpenSearch

A database is good at finding by key. **OpenSearch** is good at finding by any word in any field, and at analyzing logs. It comes as **managed clusters** where you control the sizes, or as **Serverless** for changing load.

It's usually a copy of your data, not the source. Two common patterns:

- **Search over a table:** DynamoDB Streams, then Lambda, then OpenSearch. You search there, then fetch the full item from the table.
- **Log analysis:** CloudWatch Logs, then Firehose, then OpenSearch.

### Amazon EMR

Do you have existing **Spark** or **Hadoop** jobs? **EMR** runs them, and you can choose to run it on EC2, on EKS or as Serverless. On EC2 there are three kinds of nodes:

| Node | Role | Purchase option |
| --- | --- | --- |
| **Primary** | Coordinates the cluster | On-Demand or Reserved |
| **Core** | Runs tasks and stores data | On-Demand or Reserved |
| **Task** | Runs tasks only, and is optional | [Spot](/en/posts/aws-04-ec2-pricing-networking/) is ideal |

### Quick Sight

**Amazon Quick Sight** builds dashboards from Athena, Redshift, RDS, S3 and others. Its name was QuickSight, and since October 2025 it has been part of a broader suite called Amazon Quick, though the API still uses the old name.

- **SPICE:** an in-memory engine that makes dashboards fast, without burdening the source on every view.
- **An analysis or a dashboard:** you edit in an analysis, and publish it as a read-only dashboard.
- **Row-level security:** each manager sees only their own region's data.

## Streams: Flink and Kafka

[Kinesis and Firehose](/en/posts/aws-19-sqs-sns-kinesis/) deliver the data. What if you want to analyze it as it arrives, such as spotting a suspicious pattern within seconds?

**Managed Service for Apache Flink** (formerly Kinesis Data Analytics) runs Flink applications that read from a Kinesis stream or from MSK, without you managing the cluster.

**Amazon MSK** is a managed **Apache Kafka**, the most popular streaming platform in the open-source world. It comes as provisioned clusters with Standard or Express brokers, or as Serverless.

| | Kinesis Data Streams | Amazon MSK |
| --- | --- | --- |
| **Split into** | Shards | Topics and partitions |
| **APIs** | AWS's own | Standard Kafka |
| **Record size** | 1 MiB by default, up to 10 MiB | 1 MB by default, and configurable |
| **Choose it if** | You want the simplest option on AWS | You have Kafka applications and tools |

## How does the data arrive?

Choosing a way in starts with how often the data arrives, and how large it is:

| The data | Use |
| --- | --- |
| **Files from a server or NAS, on a schedule** | [DataSync](/en/posts/aws-18-storage-transfer/) |
| **Files from partners over SFTP** | [Transfer Family](/en/posts/aws-18-storage-transfer/) |
| **Small records, continuously, with several readers** | [Kinesis Data Streams](/en/posts/aws-19-sqs-sns-kinesis/) or MSK |
| **Small records, continuously, landing in storage** | [Data Firehose](/en/posts/aws-19-sqs-sns-kinesis/) |
| **Rows changing in a database** | Zero-ETL or [DMS](/en/posts/aws-28-disaster-recovery-migration/) |
| **Data sets from other companies** | **AWS Data Exchange**, where you subscribe to them |

Secure each way in the same manner: least-privilege IAM roles, encryption in transit and at rest, and private paths such as [VPC endpoints](/en/posts/aws-14-vpc-connectivity/) instead of the public internet where you can.

## The complete picture

Here's how the pieces meet in a typical pipeline:

<figure class="diagram">
<svg viewBox="0 0 640 208" role="img" aria-labelledby="pipeline-caption">
<defs>
<marker id="pipeline-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="83" y="44" text-anchor="middle" class="d-label">Sources</text>
<text x="83" y="64" text-anchor="middle" class="d-small">Apps and logs</text>
<rect x="178" y="14" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="241" y="44" text-anchor="middle" class="d-label">Firehose</text>
<text x="241" y="64" text-anchor="middle" class="d-small">Collects</text>
<rect x="336" y="14" width="126" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="399" y="44" text-anchor="middle" class="d-label">S3</text>
<text x="399" y="64" text-anchor="middle" class="d-small">Raw data</text>
<rect x="494" y="14" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="557" y="44" text-anchor="middle" class="d-label">Glue</text>
<text x="557" y="64" text-anchor="middle" class="d-small">Cleans, converts</text>
<rect x="494" y="124" width="126" height="70" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="557" y="154" text-anchor="middle" class="d-label">S3</text>
<text x="557" y="174" text-anchor="middle" class="d-small">Parquet</text>
<rect x="336" y="124" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="399" y="154" text-anchor="middle" class="d-label">Athena</text>
<text x="399" y="174" text-anchor="middle" class="d-small">Answers with SQL</text>
<rect x="178" y="124" width="126" height="70" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="241" y="154" text-anchor="middle" class="d-label">Quick Sight</text>
<text x="241" y="174" text-anchor="middle" class="d-small">Dashboards</text>
<rect x="20" y="124" width="126" height="70" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="83" y="154" text-anchor="middle" class="d-label">Your team</text>
<text x="83" y="174" text-anchor="middle" class="d-small">Decides</text>
<line x1="146" y1="49" x2="176" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="304" y1="49" x2="334" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="462" y1="49" x2="492" y2="49" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="557" y1="84" x2="557" y2="122" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="494" y1="159" x2="464" y2="159" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="336" y1="159" x2="306" y2="159" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
<line x1="178" y1="159" x2="148" y2="159" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#pipeline-arrow)"/>
</svg>
<figcaption id="pipeline-caption">Data lands raw in S3, Glue converts it to Parquet, Athena answers from it and Quick Sight displays the result. Redshift can take Athena's place for heavy reports.</figcaption>
</figure>

## Hands-on: Parquet cuts what a query reads

We'll generate a file of 200,000 orders and put the same question to it twice. From CloudShell:

```bash
BUCKET=series-data-$RANDOM$RANDOM
aws s3 mb s3://$BUCKET

awk 'BEGIN {
  srand(7)
  split("Riyadh Jeddah Dammam Abha Tabuk", city, " ")
  for (i = 1; i <= 200000; i++)
    printf "%d,%s,%d,%.2f\n", i, city[int(rand()*5)+1], 2024+int(rand()*3), rand()*500
}' > sales.csv

head -3 sales.csv
aws s3 cp sales.csv s3://$BUCKET/raw/sales.csv
```

This function runs a query, waits for it, then prints its state, the bytes it scanned and its result:

```bash
run_sql() {
  ID=$(aws athena start-query-execution --query-string "$1" \
    --result-configuration OutputLocation=s3://$BUCKET/results/ \
    --query QueryExecutionId --output text)
  while true; do
    STATE=$(aws athena get-query-execution --query-execution-id $ID \
      --query QueryExecution.Status.State --output text)
    [ "$STATE" = QUEUED ] || [ "$STATE" = RUNNING ] || break
    sleep 1
  done
  aws athena get-query-execution --query-execution-id $ID \
    --query "QueryExecution.[Status.State,Statistics.DataScannedInBytes]" \
    --output text
  aws athena get-query-results --query-execution-id $ID \
    --query "ResultSet.Rows[*].Data[*].VarCharValue" --output text
}
```

Describe the file as a table. Nothing moves, and the data stays in S3:

```bash
run_sql "CREATE DATABASE series_data"

run_sql "CREATE EXTERNAL TABLE series_data.sales_csv (
  order_id INT, city STRING, year INT, amount DOUBLE
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
LOCATION 's3://$BUCKET/raw/'"
```

Ask the question:

```bash
run_sql "SELECT city, ROUND(SUM(amount)) AS total
FROM series_data.sales_csv WHERE year = 2025
GROUP BY city ORDER BY total DESC"
```

You get the total for each city, and the first line shows the whole file was scanned, a little over 5 MB, even though the question concerns one year and two columns. Now create a partitioned Parquet copy with one query:

```bash
run_sql "CREATE TABLE series_data.sales_parquet WITH (
  format = 'PARQUET',
  external_location = 's3://$BUCKET/parquet/',
  partitioned_by = ARRAY['year']
) AS SELECT order_id, city, amount, year FROM series_data.sales_csv"

aws s3 ls s3://$BUCKET/parquet/
```

You'll see a folder for each year. Ask the same question of the new table:

```bash
run_sql "SELECT city, ROUND(SUM(amount)) AS total
FROM series_data.sales_parquet WHERE year = 2025
GROUP BY city ORDER BY total DESC"
```

The numbers match, but the scanned bytes are a small fraction of the first figure. On terabytes, that difference is your bill.

::: security Delete after experimenting
This experiment costs a tiny fraction of a cent. Delete the tables and the bucket:
:::

```bash
run_sql "DROP TABLE series_data.sales_parquet"
run_sql "DROP TABLE series_data.sales_csv"
run_sql "DROP DATABASE series_data"
aws s3 rb s3://$BUCKET --force
```

## Summary

- Separate **analysis** from your production database, and store data **by column**.
- **Athena** queries S3 with no servers, and Parquet and partitions lower its cost.
- **Redshift** is for heavy, repeated reports, and **Serverless** is an easy start.
- **Glue** catalogs and converts your data, and **Lake Formation** controls who sees which column.
- **OpenSearch** is for search, **EMR** for Spark jobs, **Quick Sight** for dashboards, and **Flink** and **MSK** for streams.

## Test yourself

::: quiz
A retail chain's analysts run heavy reports all day, with many joins across years of sales, and dozens of dashboards refresh from them. Which service was built for this?

- [ ] Amazon Athena, querying CSV files in S3
- [ ] An RDS read replica
- [x] Amazon Redshift
- [ ] Amazon OpenSearch Service

This is a data warehouse's job. Redshift stores data by column and splits each query across many nodes, so heavy, repeated reports run fast.

- **A:** This suits occasional questions, and with this many queries you'd pay for every scan.
- **B:** This takes load off production, but it still stores data by row and isn't built for this scale of analysis.
- **D:** This is for text search and log analysis.

Review: [Athena or Redshift?](#athena-or-redshift) in this part, and [What is Amazon Redshift?](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html) in the AWS docs.
:::

::: quiz
Partners drop CSV files into an S3 bucket every day. A team wants them converted to Parquet on a schedule, with no servers to run and without reprocessing files already converted. What fits?

- [x] A Glue ETL job, with job bookmarks turned on
- [ ] A Glue crawler that runs every day
- [ ] An EMR cluster running on EC2
- [ ] A lifecycle rule moving the files to a cheaper class

A Glue ETL job runs Spark with no servers to manage, and job bookmarks remember what's been processed, so each run handles only the new files.

- **B:** A crawler works out the columns and updates the catalog, and doesn't convert anything.
- **C:** This could do the conversion, but it's a cluster you'd have to run.
- **D:** This moves files between classes, and doesn't change their format.

Review: [AWS Glue: preparing the data](#aws-glue-preparing-the-data) in this part, and [Tracking processed data using job bookmarks](https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html) in the AWS docs.
:::

::: quiz
A company's data lake holds an orders table in S3, queried through Athena. The sales team must see the table, but not its card number column. What fits?

- [ ] A bucket policy that hides that column from the team
- [ ] A Glue crawler that skips that column
- [ ] An S3 Access Point for the sales team
- [x] Lake Formation, with a column-level permission

Lake Formation grants access down to the column and row, and those permissions apply through services like Athena.

- **A:** S3 knows about files, not the columns inside them.
- **B:** A crawler only describes the data, and controls nobody's access.
- **C:** This gives a team its own door to a bucket, and still works at the level of files.

Review: [Lake Formation: permissions for the lake](#lake-formation-permissions-for-the-lake) in this part, and [Data filtering and cell-level security in Lake Formation](https://docs.aws.amazon.com/lake-formation/latest/dg/data-filtering.html) in the AWS docs.
:::

::: quiz
A store keeps its products in DynamoDB. Customers want to search for any word in a product's name or description, and the table must stay the source of truth. What fits?

- [ ] A global secondary index on the description
- [x] DynamoDB Streams and Lambda, feeding a copy into OpenSearch
- [ ] Scanning the table with a filter on each search
- [ ] DAX in front of the table

OpenSearch finds any word in any field. Streams and Lambda keep it up to date, so you search there, then fetch the full item from the table.

- **A:** An index finds items by key, not by any word inside a long text.
- **C:** This reads the whole table for every search, so it's slow and costly.
- **D:** This speeds up reads by key, and adds no text search.

Review: [OpenSearch](#opensearch) in this part, and [Loading streaming data into Amazon OpenSearch Service](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/integrations.html) in the AWS docs.
:::

::: quiz
A team's Athena bill is high. Its queries usually read two columns from one month of data, but everything sits in S3 as one big folder of CSV files. Which **two** changes lower the cost? (Choose two.)

- [ ] Moving the files to Glacier Deep Archive
- [x] Converting the files to Parquet
- [ ] Running the queries at night
- [ ] Turning on S3 Versioning
- [x] Partitioning the data by month

Athena charges for the data it scans. Parquet lets a query read only its columns, and partitions let it skip the other months.

- **A:** Files in this class have to be restored before they can be read.
- **C:** The price depends on what's read, not on when.
- **D:** This keeps old versions, and changes nothing about what a query reads.

Review: [Read less, pay less](#read-less-pay-less) in this part, and [Use columnar storage formats](https://docs.aws.amazon.com/athena/latest/ug/columnar-storage.html) and [Partition your data](https://docs.aws.amazon.com/athena/latest/ug/partitions.html) in the AWS docs.
:::

You now understand the data you hold. Can you get more out of it, such as reading documents, understanding speech or generating text? In [**part twenty-four**](/en/posts/aws-24-ai-services/) we go through AWS's ready-made AI services.
