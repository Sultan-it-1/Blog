---
title: "Advanced Identity: Organizations and Identity Center"
description: Managing many accounts with Organizations and SCPs, conditions in IAM policies, roles versus resource policies, permissions boundaries and how AWS makes a decision, single sign-on with Identity Center, and a hands-on simulating policies.
date: 2026-11-02
series: aws
part: 26
numbered: true
tags: [aws, iam, security]
---

In [part two](/en/posts/aws-02-iam/) we had one account and a few users. Now imagine a company with fifty accounts and five hundred employees: creating a user in each account for each person would be a nightmare, and one mistake could reach everything.

This part covers the tools for that scale, and it completes [IAM](/en/posts/aws-02-iam/) with what we left out at the start.

## AWS Organizations

**Organizations** gathers many accounts under one **management account**, arranged in **organizational units (OUs)**.

<figure class="diagram">
<svg viewBox="0 0 640 246" role="img" aria-labelledby="org-caption">
<defs>
<marker id="org-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="250" y="14" width="140" height="44" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="320" y="41" text-anchor="middle" class="d-label">Root</text>
<rect x="20" y="92" width="180" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="110" y="119" text-anchor="middle" class="d-label">Security OU</text>
<rect x="230" y="92" width="180" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="320" y="119" text-anchor="middle" class="d-label">Production OU</text>
<rect x="440" y="92" width="180" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="530" y="119" text-anchor="middle" class="d-label">Development OU</text>
<rect x="20" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="62.5" y="207" text-anchor="middle" class="d-label">Logs</text>
<rect x="115" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="157.5" y="207" text-anchor="middle" class="d-label">Audit</text>
<rect x="230" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="272.5" y="207" text-anchor="middle" class="d-label">Store</text>
<rect x="325" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="367.5" y="207" text-anchor="middle" class="d-label">API</text>
<rect x="440" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="482.5" y="207" text-anchor="middle" class="d-label">Team A</text>
<rect x="535" y="172" width="85" height="60" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="577.5" y="207" text-anchor="middle" class="d-label">Team B</text>
<line x1="320" y1="58" x2="110" y2="90" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="58" x2="320" y2="90" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="58" x2="530" y2="90" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="110" y1="136" x2="62" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="110" y1="136" x2="157" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="136" x2="272" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="320" y1="136" x2="367" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="530" y1="136" x2="482" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
<line x1="530" y1="136" x2="577" y2="170" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#org-arrow)"/>
</svg>
<figcaption id="org-caption">Accounts sit in organizational units under one root, and a policy attached to a unit applies to every account beneath it.</figcaption>
</figure>

Why many accounts, not one big account?

- **Isolation:** a mistake or breach in the development account doesn't reach production.
- **Clear costs:** each account shows its team's bill.
- **Limits:** each account has its own service quotas.

And what do you get from Organizations?

- **Consolidated billing:** one invoice, and combined usage reaches volume discounts faster. Savings Plans and Reserved Instances can also be shared across accounts.
- **Centralized management:** creating accounts by API, and one [CloudTrail trail](/en/posts/aws-25-monitoring-auditing/) for everyone.
- **Policies:** rules applying to whole groups of accounts.

### Organization policies

| Policy | What it does |
| --- | --- |
| **SCP** | Sets the maximum for what users and roles in an account can do |
| **RCP** | Sets the maximum for what can be done to resources in an account |
| **Declarative policies** | Fix a service's baseline settings across accounts |
| **Tag policies** | Standardize tags, such as requiring a particular spelling for `CostCenter` |

### Service Control Policies (SCPs)

The key point: **an SCP doesn't grant anything**. It only sets a limit, and each user still needs an IAM permission. It's a ceiling on what's allowed:

- Attached to an OU, it applies to everything beneath it, and each level must allow the action.
- It doesn't affect the **management account**, so don't run workloads there.
- It applies to everyone in a member account, including that account's root user.

For example, this SCP blocks work outside two Regions, except for global services:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "OnlyTwoRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "support:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": { "aws:RequestedRegion": ["me-central-1", "eu-west-1"] }
    }
  }]
}
```

## Conditions in IAM policies

A policy's **Condition** element narrows when a permission applies. Some common ones:

| Condition | Use |
| --- | --- |
| `aws:SourceIp` | Only from the office network |
| `aws:RequestedRegion` | Only in specific Regions |
| `aws:MultiFactorAuthPresent` | Only if signed in with MFA |
| `aws:ResourceTag` and `aws:PrincipalTag` | A user's tag must match a resource's tag |
| `aws:PrincipalOrgID` | Only from accounts in your organization |

The last one is a gift for shared buckets. Instead of listing fifty accounts in a bucket policy, one line allows your whole organization:

```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::shared-files/*",
  "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
}
```

### A classic S3 mistake

S3 actions work at two levels, and each needs its own ARN:

| Action | Applies to | ARN |
| --- | --- | --- |
| `s3:ListBucket` | The bucket | `arn:aws:s3:::my-bucket` |
| `s3:GetObject` | The object | `arn:aws:s3:::my-bucket/*` |

Put the wrong one in and you get `AccessDenied`, however right the policy looks. We'll test this in the hands-on.

## A role or a resource policy?

To let a user in account A reach something in account B, you have two ways:

| | Assuming a role | A resource policy |
| --- | --- | --- |
| **How** | The user becomes the role in B | The resource in B allows the user directly |
| **Their original permissions** | They give them up while in the role | They keep them |
| **Suits** | Working entirely inside the other account | Reading from a table in A and writing to a bucket in B at once |
| **Available on** | All services | Only those supporting it, such as S3, SNS, SQS and Lambda |

## Permissions boundaries

You want team leads to create roles for their services, without being able to give anyone more than they should have. A **permissions boundary** sets the maximum for a particular user or role, and like an SCP, it grants nothing.

The effective permissions are what's allowed by the identity policy **and** the boundary **and** the SCP together. It's a good way to delegate safely.

### How does AWS decide?

Every request goes through this reasoning. This is a simplified version:

<figure class="diagram">
<svg viewBox="0 0 640 344" role="img" aria-labelledby="evalflow-caption">
<defs>
<marker id="evalflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="20" y="14" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="43" text-anchor="middle" class="d-label">Is there an explicit Deny anywhere?</text>
<rect x="20" y="82" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="111" text-anchor="middle" class="d-label">Do the SCPs and RCPs allow it?</text>
<rect x="20" y="150" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="179" text-anchor="middle" class="d-label">Does an identity or resource policy allow it?</text>
<rect x="20" y="218" width="400" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="220" y="247" text-anchor="middle" class="d-label">Does the permissions boundary allow it?</text>
<rect x="20" y="286" width="400" height="44" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="220" y="313" text-anchor="middle" class="d-label">Allowed</text>
<rect x="480" y="14" width="140" height="252" rx="10" fill="var(--color-surface)" stroke="var(--color-danger)"/>
<text x="550" y="145" text-anchor="middle" class="d-label">Denied</text>
<line x1="420" y1="38" x2="478" y2="38" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="420" y1="106" x2="478" y2="106" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="420" y1="174" x2="478" y2="174" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="420" y1="242" x2="478" y2="242" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<text x="449" y="30" text-anchor="middle" class="d-small">Yes</text>
<text x="449" y="98" text-anchor="middle" class="d-small">No</text>
<text x="449" y="166" text-anchor="middle" class="d-small">No</text>
<text x="449" y="234" text-anchor="middle" class="d-small">No</text>
<line x1="220" y1="62" x2="220" y2="80" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="220" y1="130" x2="220" y2="148" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="220" y1="198" x2="220" y2="216" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
<line x1="220" y1="266" x2="220" y2="284" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#evalflow-arrow)"/>
</svg>
<figcaption id="evalflow-caption">A simplified picture of how AWS decides: any explicit Deny ends it, and every layer that applies has to allow the action.</figcaption>
</figure>

Remember three rules: an **explicit Deny always wins**, **anything not allowed is denied**, and within one account, a resource policy can grant access by itself in many cases.

## IAM Identity Center: one sign-in

Instead of a user in every account, **IAM Identity Center** gives each employee one sign-in and a portal listing the accounts and roles available to them, and they get temporary credentials with no permanent keys.

| Part | What it does |
| --- | --- |
| **Identity source** | Its own directory, Active Directory, or an external provider such as Okta or Microsoft Entra ID |
| **Permission sets** | A set of policies that becomes a role in each account you assign it to |
| **Assignment** | "The developers group gets the Admin set on the dev account, and ReadOnly on production" |
| **Applications** | Single sign-on to SAML applications too |

For the CLI, `aws configure sso` signs you in through your browser and gives you temporary credentials. This is the recommended way for people to work with AWS these days, in place of IAM users with long-term keys.

### Active Directory on AWS

Many companies keep their users in **Microsoft Active Directory**. **AWS Directory Service** connects it to AWS:

| Option | How it works | Suits |
| --- | --- | --- |
| **Managed Microsoft AD** | A real AD managed in AWS, and it can trust yours | AD-dependent applications running on AWS |
| **AD Connector** | A proxy that passes requests to your AD and stores nothing | Keeping the users in your own AD |
| **Simple AD** | A small Samba-based directory | Closed to new customers since July 2026 |

## AWS Control Tower

Setting all of this up by hand takes weeks. **Control Tower** builds a best-practice **landing zone** over Organizations, including log and audit accounts, and it adds:

- **Account Factory:** creating new accounts with ready settings.
- **Controls:** preventive through SCPs, detective through [Config](/en/posts/aws-25-monitoring-auditing/), and proactive that check resources before they're created.
- **A dashboard:** showing who's compliant at a glance.

If you're starting a multi-account environment from scratch, start here.

## Hands-on: testing policies without touching anything

The **policy simulator** evaluates a policy without creating anything or running the action, which is great for learning. From CloudShell, write a policy allowing S3 and EC2, and a boundary allowing S3 only:

```bash
cat > identity.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:*", "ec2:*"],
    "Resource": "*"
  }]
}
EOF

cat > boundary.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": "*"
  }]
}
EOF
```

Test three actions with the policy alone:

```bash
aws iam simulate-custom-policy --policy-input-list file://identity.json \
  --action-names s3:GetObject ec2:RunInstances iam:CreateUser \
  --query "EvaluationResults[].[EvalActionName,EvalDecision]" --output table
```

S3 and EC2 show `allowed`, and IAM shows `implicitDeny`, because nothing allows it. Now add the boundary:

```bash
aws iam simulate-custom-policy --policy-input-list file://identity.json \
  --permissions-boundary-policy-input-list file://boundary.json \
  --action-names s3:GetObject ec2:RunInstances \
  --query "EvaluationResults[].[EvalActionName,EvalDecision]" --output table
```

EC2 has now become `implicitDeny`, even though the policy allows it. Now see that **Deny always wins**, by adding an explicit deny on deleting buckets:

```bash
cat > deny.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "s3:DeleteBucket",
    "Resource": "*"
  }]
}
EOF

aws iam simulate-custom-policy \
  --policy-input-list file://identity.json file://deny.json \
  --action-names s3:GetObject s3:DeleteBucket \
  --query "EvaluationResults[].[EvalActionName,EvalDecision]" --output table
```

`s3:GetObject` stays `allowed`, and `s3:DeleteBucket` shows `explicitDeny`, even though the first policy allows `s3:*`. Try a condition next: access from the office network only, testing from two addresses:

```bash
cat > office.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "*",
    "Condition": { "IpAddress": { "aws:SourceIp": "203.0.113.0/24" } }
  }]
}
EOF

for ip in 203.0.113.10 198.51.100.7; do
  aws iam simulate-custom-policy --policy-input-list file://office.json \
    --action-names s3:GetObject \
    --context-entries "ContextKeyName=aws:SourceIp,ContextKeyValues=$ip,ContextKeyType=ip" \
    --query "EvaluationResults[0].EvalDecision" --output text
done
```

The first address is `allowed`, and the second is `implicitDeny`. Finally, the classic S3 mistake, a list permission with the object's ARN:

```bash
cat > list.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:ListBucket",
    "Resource": "arn:aws:s3:::shop/*"
  }]
}
EOF

aws iam simulate-custom-policy --policy-input-list file://list.json \
  --action-names s3:ListBucket --resource-arns arn:aws:s3:::shop \
  --query "EvaluationResults[0].EvalDecision" --output text
```

It gives `implicitDeny`. The policy looks right, but the permission applies to the bucket, not to what's in it. Change the resource to `arn:aws:s3:::shop` and try again, and you'll get `allowed`.

::: security Nothing to delete
The simulator creates nothing and costs nothing. You can test any policy this way before applying it, and the console has a visual version too, called **IAM Policy Simulator**.
:::

## Summary

- **Organizations** gathers accounts under one bill, and **SCPs** set a ceiling that grants nothing.
- **Conditions** narrow permissions by network, Region, MFA and tags, and `aws:PrincipalOrgID` opens access to your organization only.
- A **role** gives up your original permissions, and a **resource policy** keeps them.
- A **permissions boundary** delegates safely, and an **explicit Deny always wins**.
- **Identity Center** gives one sign-in with temporary credentials, and **Control Tower** builds it all from best practices.

You've controlled who reaches your data. What if someone reaches it anyway, or attacks your site from outside? In [**part twenty-seven**](/en/posts/aws-27-encryption-secrets-protection/) we cover encryption, secrets and threat protection.
