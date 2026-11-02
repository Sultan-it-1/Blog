---
title: "Disaster Recovery and Migration"
description: What RPO and RTO mean, the four disaster recovery strategies and their cost, central backups with AWS Backup, moving databases with DMS and servers with AWS Transform MGN, and a hands-on where you delete data and bring it back.
date: 2026-11-02
series: aws
part: 28
numbered: true
tags: [aws, operations]
---

In [part seven](/en/posts/aws-07-auto-scaling/) our application survived losing an Availability Zone. But what if the disaster is bigger: a whole Region down, a mistaken `DELETE`, or ransomware? And this part's other half: what if your application isn't on AWS yet, and you want to bring it over?

## RPO and RTO

Before any technical decision, you need two numbers from the business:

<figure class="diagram">
<svg viewBox="0 0 640 150" role="img" aria-labelledby="rporto-caption">
<defs>
<marker id="rporto-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="245" y="40" text-anchor="middle" class="d-small">RPO: the data you lose</text>
<text x="410" y="40" text-anchor="middle" class="d-small">RTO: the time you're down</text>
<rect x="170" y="52" width="150" height="28" rx="6" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<rect x="320" y="52" width="180" height="28" rx="6" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<line x1="30" y1="66" x2="612" y2="66" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#rporto-arrow)"/>
<line x1="170" y1="46" x2="170" y2="88" stroke="var(--color-accent)" stroke-width="2"/>
<line x1="320" y1="46" x2="320" y2="88" stroke="var(--color-accent)" stroke-width="2"/>
<line x1="500" y1="46" x2="500" y2="88" stroke="var(--color-accent)" stroke-width="2"/>
<text x="170" y="110" text-anchor="middle" class="d-small">Last backup</text>
<text x="320" y="110" text-anchor="middle" class="d-small">Disaster</text>
<text x="500" y="110" text-anchor="middle" class="d-small">Back online</text>
</svg>
<figcaption id="rporto-caption">RPO looks backward from the disaster to the last good copy, and RTO looks forward to when service returns.</figcaption>
</figure>

| Number | The question | Example |
| --- | --- | --- |
| **RPO** (Recovery Point Objective) | How much data can we afford to lose? | Backing up every hour means losing up to an hour of data |
| **RTO** (Recovery Time Objective) | How long can we stay down? | Up to four hours of downtime |

The smaller the two numbers, the higher the cost. So the question isn't "what's best?", but "what is an hour of downtime worth to us?"

## Four strategies

These are for recovering in another Region, ordered from the cheapest to the most expensive. The difference between them is how much is running there before the disaster:

<figure class="diagram">
<svg viewBox="0 0 640 262" role="img" aria-labelledby="dr-caption">
<defs>
<marker id="dr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="90.5" y="24" text-anchor="middle" class="d-label">Backup</text>
<rect x="20" y="36" width="141" height="54" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="90.5" y="58" text-anchor="middle" class="d-small">Data</text>
<text x="90.5" y="78" text-anchor="middle" class="d-label">Backups</text>
<rect x="20" y="96" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="90.5" y="118" text-anchor="middle" class="d-small">Servers</text>
<text x="90.5" y="138" text-anchor="middle" class="d-label">None</text>
<rect x="20" y="156" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="90.5" y="178" text-anchor="middle" class="d-small">Traffic</text>
<text x="90.5" y="198" text-anchor="middle" class="d-label">None</text>
<text x="243.5" y="24" text-anchor="middle" class="d-label">Pilot light</text>
<rect x="173" y="36" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="243.5" y="58" text-anchor="middle" class="d-small">Data</text>
<text x="243.5" y="78" text-anchor="middle" class="d-label">Replicated</text>
<rect x="173" y="96" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="243.5" y="118" text-anchor="middle" class="d-small">Servers</text>
<text x="243.5" y="138" text-anchor="middle" class="d-label">Stopped</text>
<rect x="173" y="156" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="243.5" y="178" text-anchor="middle" class="d-small">Traffic</text>
<text x="243.5" y="198" text-anchor="middle" class="d-label">None</text>
<text x="396.5" y="24" text-anchor="middle" class="d-label">Warm standby</text>
<rect x="326" y="36" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="396.5" y="58" text-anchor="middle" class="d-small">Data</text>
<text x="396.5" y="78" text-anchor="middle" class="d-label">Replicated</text>
<rect x="326" y="96" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="396.5" y="118" text-anchor="middle" class="d-small">Servers</text>
<text x="396.5" y="138" text-anchor="middle" class="d-label">A few running</text>
<rect x="326" y="156" width="141" height="54" rx="10" fill="none" stroke="var(--color-line-strong)" stroke-dasharray="5 5"/>
<text x="396.5" y="178" text-anchor="middle" class="d-small">Traffic</text>
<text x="396.5" y="198" text-anchor="middle" class="d-label">On failover</text>
<text x="549.5" y="24" text-anchor="middle" class="d-label">Multi-site</text>
<rect x="479" y="36" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="549.5" y="58" text-anchor="middle" class="d-small">Data</text>
<text x="549.5" y="78" text-anchor="middle" class="d-label">Replicated</text>
<rect x="479" y="96" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="549.5" y="118" text-anchor="middle" class="d-small">Servers</text>
<text x="549.5" y="138" text-anchor="middle" class="d-label">Full size</text>
<rect x="479" y="156" width="141" height="54" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="549.5" y="178" text-anchor="middle" class="d-small">Traffic</text>
<text x="549.5" y="198" text-anchor="middle" class="d-label">Always</text>
<line x1="20" y1="226" x2="618" y2="226" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#dr-arrow)"/>
<text x="320" y="248" text-anchor="middle" class="d-small">Higher cost, less data lost, faster recovery</text>
</svg>
<figcaption id="dr-caption">What's running in the other Region before the disaster: the more that's ready, the faster you recover and the more you pay.</figcaption>
</figure>

| Strategy | Approx. RPO | Approx. RTO | Suits |
| --- | --- | --- | --- |
| **Backup and restore** | Hours | Up to 24 hours | Non-critical systems |
| **Pilot light** | Minutes | Tens of minutes | The core data must always be ready |
| **Warm standby** | Seconds | Minutes | Important systems with a limited budget |
| **Multi-site (active-active)** | Close to zero | Close to zero | Where a minute of downtime costs a fortune |

- **Backup and restore:** backups copied to another Region, with everything built from them in a disaster. A template helps, as we'll see in the [next part](/en/posts/aws-29-cost-good-architecture/).
- **Pilot light:** the data is replicating, such as an [Aurora](/en/posts/aws-08-rds-aurora/) Global Database or [S3 replication](/en/posts/aws-15-s3-basics/), and the servers are ready but stopped.
- **Warm standby:** a small full copy is running and can take traffic right away, then it grows with Auto Scaling.
- **Multi-site:** both Regions serve users all the time, such as with [Route 53](/en/posts/aws-11-dns-route53/) and [Global Tables](/en/posts/aws-21-lambda-api-dynamodb/).

### Tips that make the difference

- **Test your recovery.** A backup you've never restored is only a hope. Run drills, and take advantage of **AWS Fault Injection Service** to cause failures deliberately.
- **Automate.** Build the environment from templates, because in a disaster nobody remembers the steps.
- **Protect your backups from yourself.** Put them in another account and another Region, because an attacker who gets into your account will go for them first.
- **Think of Elastic Disaster Recovery.** **AWS DRS** continuously replicates your servers to cheap storage, and launches them only when needed, with an RPO of seconds and an RTO of minutes.
- **Check the quotas in the standby Region.** Quotas are per Region, so a small standby can hit its limit just when it has to grow. Raise them there in advance, from the **Service Quotas** console.

## AWS Backup: everything in one place

Each service has its own backups, but **AWS Backup** manages them centrally, for EC2, EBS, S3, RDS, Aurora, DynamoDB, EFS, FSx and others:

| Part | What it does |
| --- | --- |
| **Backup plan** | A schedule and a retention period, such as daily for 35 days, then moving to cold storage |
| **Vault** | Where the backups are stored, encrypted with KMS |
| **Tags** | Back up anything tagged `backup=daily`, so new resources join by themselves |
| **Copies** | To another Region or another account, for real disaster protection |
| **Vault Lock** | Stops anyone, even the root user in compliance mode, from deleting backups before they expire |

**Vault Lock** is your strongest defense against ransomware and against someone with stolen administrator credentials.

## Migrating databases: DMS

**AWS DMS** (Database Migration Service) moves a database while it stays in use: it copies the existing data, then keeps sending changes (known as **CDC**) until you're ready to switch over.

| Type | Example | Tools |
| --- | --- | --- |
| **Same engine** | MySQL on a server to RDS for MySQL | DMS alone is enough |
| **Different engine** | Oracle to Aurora PostgreSQL | **DMS Schema Conversion** or **SCT**, to convert the tables and code first, then DMS for the data |

Sources and targets are many, including on-premises databases, RDS, S3, DynamoDB, Redshift and OpenSearch. It can run in **Multi-AZ**, with a standby instance in another zone, or as **Serverless** so you don't have to size it.

### Moving to RDS or Aurora

If you're moving MySQL or PostgreSQL, you have simpler routes:

| Method | Downtime | When |
| --- | --- | --- |
| **Snapshot from RDS to Aurora** | Yes, during the move | Downtime is acceptable |
| **Aurora read replica, then promote it** | Very short | From RDS, with no real downtime |
| **Backup from S3** | Yes | Coming from outside RDS: Percona XtraBackup for MySQL |
| **DMS** | Very short | Continuous replication from anywhere |

## Migrating servers and whole data centers

| You want | Use |
| --- | --- |
| Moving servers as they are (lift and shift) | **AWS Transform MGN** |
| Importing one virtual machine image | **VM Import/Export** |
| Moving VMware as it is | **Amazon Elastic VMware Service**, or VMware Cloud on AWS from Broadcom |
| Help planning a large migration | **AWS Transform** |
| Moving files | [DataSync](/en/posts/aws-18-storage-transfer/) |
| Putting Java or .NET applications in containers | **App2Container** |

**AWS Transform MGN** was known as Application Migration Service until 2026. An agent on your server replicates its disks continuously to low-cost AWS resources, you test as often as you like, then you switch over in minutes. It's usually the fastest way out of a data center.

::: note Older tools
You may read about **Application Discovery Service** and **Migration Hub**, which were for planning migrations. They're no longer open to new customers, and AWS Transform is now the path for this kind of work.
:::

And if you have huge amounts of data, we did the math in [part eighteen](/en/posts/aws-18-storage-transfer/).

## Hands-on: delete the data and bring it back

We'll play out a small disaster: a table, a backup, a mistaken delete, then a restore. From CloudShell, create the table with one order:

```bash
aws dynamodb create-table --table-name series-orders \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --query TableDescription.TableStatus

aws dynamodb wait table-exists --table-name series-orders

aws dynamodb put-item --table-name series-orders \
  --item '{"id":{"S":"1001"},"total":{"N":"120"}}'

TABLE_ARN=$(aws dynamodb describe-table --table-name series-orders \
  --query Table.TableArn --output text)
```

AWS Backup needs a role and a vault:

```bash
cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "backup.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role --role-name series-backup-role \
  --assume-role-policy-document file://trust.json \
  --query Role.Arn --output text)

aws iam attach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
aws iam attach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores

aws backup create-backup-vault --backup-vault-name series-vault \
  --query BackupVaultName --output text
```

Start a backup, then wait for it. If you get a role error, wait a few seconds and repeat the first command. This usually takes a few minutes:

```bash
JOB=$(aws backup start-backup-job --backup-vault-name series-vault \
  --resource-arn $TABLE_ARN --iam-role-arn $ROLE_ARN \
  --query BackupJobId --output text)

while true; do
  STATE=$(aws backup describe-backup-job --backup-job-id $JOB \
    --query State --output text)
  echo $STATE
  case $STATE in COMPLETED|FAILED|ABORTED|EXPIRED) break ;; esac
  sleep 15
done

POINT=$(aws backup describe-backup-job --backup-job-id $JOB \
  --query RecoveryPointArn --output text)
```

Now the disaster. The order is gone:

```bash
aws dynamodb delete-item --table-name series-orders \
  --key '{"id":{"S":"1001"}}'

aws dynamodb get-item --table-name series-orders \
  --key '{"id":{"S":"1001"}}'
```

The second command prints nothing. Restore the backup to a new table, and note the time it takes, because this is your real RTO:

```bash
RESTORE=$(aws backup start-restore-job --recovery-point-arn $POINT \
  --iam-role-arn $ROLE_ARN \
  --metadata targetTableName=series-orders-restored,encryptionType=Default \
  --query RestoreJobId --output text)

while true; do
  STATE=$(aws backup describe-restore-job --restore-job-id $RESTORE \
    --query Status --output text)
  echo $STATE
  case $STATE in COMPLETED|FAILED|ABORTED) break ;; esac
  sleep 15
done

aws dynamodb get-item --table-name series-orders-restored \
  --key '{"id":{"S":"1001"}}' --query Item
```

The order's back. Anything written after the backup is lost, and that's your RPO.

::: security Delete after experimenting
This costs a fraction of a cent, but delete the vault's contents before the vault:
:::

```bash
aws backup delete-recovery-point --backup-vault-name series-vault \
  --recovery-point-arn $POINT
aws backup delete-backup-vault --backup-vault-name series-vault

aws dynamodb delete-table --table-name series-orders \
  --query TableDescription.TableStatus
aws dynamodb delete-table --table-name series-orders-restored \
  --query TableDescription.TableStatus

aws iam detach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
aws iam detach-role-policy --role-name series-backup-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores
aws iam delete-role --role-name series-backup-role
```

## Summary

- **RPO** is the data you lose, **RTO** is the time you're down, and the business decides both.
- The four strategies: **backup**, **pilot light**, **warm standby** and **multi-site**, with cost rising as they improve.
- **AWS Backup** manages backups centrally, and **Vault Lock** protects them.
- **DMS** moves databases while they run, and **AWS Transform MGN** moves servers.
- **Test your recovery**, or you don't have any.

## Test yourself

::: quiz
A company backs up its database every six hours, and a full restore takes two hours. In the worst case, what are its RPO and RTO?

- [ ] RPO of 2 hours, RTO of 6 hours
- [ ] RPO of 8 hours, RTO of 8 hours
- [ ] RPO of zero, RTO of 2 hours
- [x] RPO of 6 hours, RTO of 2 hours

RPO is the data you can lose, which is up to the six hours since the last backup. RTO is the time you're down, which is the two hours of restoring.

- **A:** This swaps the two numbers.
- **B:** The numbers measure different things, so they don't add together.
- **C:** Anything written since the last backup is lost, so the RPO isn't zero.

Review: [RPO and RTO](#rpo-and-rto) in this part, and [Business Continuity Plan (BCP)](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/business-continuity-plan-bcp.html) in the AWS docs.
:::

::: quiz
An application must recover in another Region within an hour and lose only minutes of data, at the **lowest cost** that meets this. Which strategy fits?

- [ ] Backup and restore
- [x] Pilot light
- [ ] Warm standby
- [ ] Multi-site active-active

Pilot light keeps the data replicating with the servers ready but stopped, which gets you back in tens of minutes for little running cost.

- **A:** Recovery can take up to 24 hours, and you'd lose hours of data.
- **C:** This also meets the need, but you'd pay for a full copy running all the time.
- **D:** This meets it too, at by far the highest cost.

Review: [Four strategies](#four-strategies) in this part, and [Disaster recovery options in the cloud](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html) in the AWS docs.
:::

::: quiz
A company fears ransomware: an attacker with stolen administrator credentials could delete its backups. Which step protects them best?

- [x] AWS Backup Vault Lock in compliance mode
- [ ] An IAM policy denying deletion of backups
- [ ] Encrypting the backups with KMS
- [ ] A CloudWatch alarm on backup deletions

In compliance mode nobody can delete a backup before it expires, not even the root user.

- **B:** An administrator can simply change the policy.
- **C:** Encrypted backups can still be deleted.
- **D:** You'd hear about the deletion, but the backups would already be gone.

Review: [AWS Backup: everything in one place](#aws-backup-everything-in-one-place) in this part, and [AWS Backup Vault Lock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html) in the AWS docs.
:::

::: quiz
A company wants to move 200 servers from its data center to AWS as they are, test them there as often as it likes, and cut over in minutes. What fits?

- [ ] AWS DMS
- [ ] AWS DataSync
- [x] AWS Transform MGN
- [ ] VM Import/Export

An agent on each server replicates its disks continuously to AWS, so you can test at will, then switch over in minutes.

- **A:** This moves databases, not whole servers.
- **B:** This moves files.
- **D:** This imports virtual machine images, with no continuous replication.

Review: [Migrating servers and whole data centers](#migrating-servers-and-whole-data-centers) in this part, and [What Is AWS Transform MGN?](https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html) in the AWS docs.
:::

::: quiz
A company is moving a busy Oracle database to Aurora PostgreSQL, with very little downtime. Which **two** tools does it need? (Choose two.)

- [ ] AWS Transform MGN
- [ ] AWS DataSync
- [x] DMS Schema Conversion or SCT
- [ ] An Aurora read replica of the Oracle database
- [x] AWS DMS, with ongoing replication

The engines differ, so the tables and code are converted first. DMS then copies the data and keeps sending changes until you're ready to switch.

- **A:** This moves servers as they are, so the database would stay on Oracle.
- **B:** This moves files, and can't keep a live database in sync.
- **D:** Aurora read replicas come from RDS for MySQL or PostgreSQL, not from Oracle.

Review: [Migrating databases: DMS](#migrating-databases-dms) in this part, and [What is AWS Database Migration Service?](https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html) and [Converting database schemas using DMS Schema Conversion](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html) in the AWS docs.
:::

Your application is now built, protected and recoverable. One last question remains: how much does it cost, and is it designed well? In [**part twenty-nine**](/en/posts/aws-29-cost-good-architecture/) we close the series with cost and good architecture.
