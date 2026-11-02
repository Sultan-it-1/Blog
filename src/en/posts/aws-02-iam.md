---
title: "IAM: Who Can Do What in Your AWS Account"
description: How to manage identities and permissions with users, groups, policies and roles, stop using the root user, and apply least privilege.
date: 2026-11-02
series: aws
part: 2
numbered: true
tags: [aws, iam, security]
---

In [part one](/en/posts/aws-01-global-infrastructure/) we saw that AWS protects the cloud itself and you're responsible for what's inside it, starting with **who can reach your account and what they can do there**. That's exactly the job of **IAM** (Identity and Access Management).

IAM is a global, free service, so there's no Region to choose. Every other AWS service relies on it, which is why we start here before launching any server.

By the end of this part you'll have a protected everyday user and will have stopped using the root user.

## Two questions for every request

Every request that reaches AWS, whether a click in the console or a command in a terminal, has to answer two questions:

1. **Who are you?** This is authentication.
2. **Are you allowed to do this?** This is authorization.

And the ground rule: **everything is denied by default**. A new user can do nothing until you explicitly allow it.

## The root user

The root user is the identity you signed up with when you opened the account. It has every permission, IAM policies can't restrict it, and if it's stolen the thief can do anything: delete all your resources, or run servers on your bill.

A few tasks can only be done by root, such as closing the account or changing its email. That's about the only time you should need it.

::: security Rules for the root user
- Turn on multi-factor authentication (MFA) before anything else.
- Never create access keys for it.
- Don't use it for daily work. Sign in with it only for the tasks that require it.
:::

## The four building blocks of IAM

| Component | What it is | Example |
| --- | --- | --- |
| **User** | A permanent identity for a person, with a password or access keys | Noura, a developer on your team |
| **Group** | A set of users who share the same permissions | The developers group |
| **Policy** | A JSON document stating what is allowed and denied | Reading files from S3 |
| **Role** | A temporary identity with no password, taken on by whoever needs it, when they need it | A server reading from S3 |

The right approach: don't attach permissions to each user one by one. Put users in groups and attach policies to the groups. When someone joins, you add them to the group; when they leave, you remove them. Note that a user can belong to several groups, but a group can't contain another group.

<figure class="diagram">
<svg viewBox="0 0 640 240" role="img" aria-labelledby="iam-flow-caption">
<defs>
<marker id="iam-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<text x="80" y="24" text-anchor="middle" class="d-small">Users</text>
<rect x="20" y="36" width="120" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="64" text-anchor="middle" class="d-label">Noura</text>
<rect x="20" y="96" width="120" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="124" text-anchor="middle" class="d-label">Fahad</text>
<rect x="20" y="156" width="120" height="44" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="80" y="184" text-anchor="middle" class="d-label">Reem</text>
<rect x="196" y="76" width="124" height="84" rx="12" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="258" y="110" text-anchor="middle" class="d-label">Group</text>
<text x="258" y="134" text-anchor="middle" class="d-code">Developers</text>
<rect x="352" y="76" width="124" height="84" rx="12" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="414" y="110" text-anchor="middle" class="d-label">Policy</text>
<text x="414" y="134" text-anchor="middle" class="d-code">s3:GetObject</text>
<rect x="520" y="76" width="100" height="84" rx="12" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="570" y="124" text-anchor="middle" class="d-label">S3</text>
<line x1="140" y1="58" x2="194" y2="102" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#iam-arrow)"/>
<line x1="140" y1="118" x2="194" y2="118" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#iam-arrow)"/>
<line x1="140" y1="178" x2="194" y2="134" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#iam-arrow)"/>
<line x1="320" y1="118" x2="350" y2="118" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#iam-arrow)"/>
<line x1="476" y1="118" x2="518" y2="118" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#iam-arrow)"/>
</svg>
<figcaption id="iam-flow-caption">Users join a group, the policy is attached to the group, and they all get the same permission on the resource.</figcaption>
</figure>

## How to read an IAM policy

A policy is a JSON document. This one allows reading files from a single S3 bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadBlogAssets",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-blog-assets",
        "arn:aws:s3:::my-blog-assets/*"
      ]
    }
  ]
}
```

- **`Version`:** the policy language version. Always write `2012-10-17`; it isn't your policy's date.
- **`Statement`:** the list of rules. Each answers: allow or deny, which action, on which resource.
- **`Sid`:** an optional name that explains the rule's purpose.
- **`Effect`:** either `Allow` or `Deny`.
- **`Action`:** the actions, written `service:action`. You can use `*` as in `s3:Get*`, but carefully.
- **`Resource`:** the resources concerned, written as an **ARN**, the unique identifier of anything in AWS.
- **`Condition`:** an optional condition, such as allowing only when the user signed in with MFA.

Notice there are two resources: one for the bucket itself (for `ListBucket`) and one for every file in it (for `GetObject`). Many "Access Denied" errors come from forgetting one of them.

### Types of policies

- **AWS managed:** ready-made policies such as `ReadOnlyAccess` and `AdministratorAccess`. Easy to start with, but usually broader than you need.
- **Customer managed:** policies you write and reuse, the best way to apply least privilege.
- **Inline:** attached to a single identity and deleted with it. Use them only for special cases.

### How a permission is decided

AWS gathers every policy that applies to the request and works in this order:

1. Is there an **explicit deny** in any policy? The request is refused, even if something else allows it.
2. Is there an **explicit allow**? The request goes through.
3. Neither? Refused, because everything is denied by default.

Deny always wins. That's worth remembering when you're trying to work out why a request was refused.

## The principle of least privilege

Give each identity **the fewest permissions it needs to do its job**, and no more. If it's stolen or makes a mistake, the damage stays limited.

In practice: start narrow and widen when needed, not the other way round. Don't hand out `AdministratorAccess` unless someone really needs it. Further down we'll look at tools that show which permissions go unused.

## Hands-on: create your everyday user

Now let's apply this. We'll protect root and create an admin user to use in its place.

::: note A note on larger accounts
For learning and a personal account, an IAM user is enough. In companies, AWS recommends people sign in through **IAM Identity Center** with temporary permissions, rather than permanent IAM users.
:::

1. **Turn on MFA for root.** Sign in as root, open your account menu at the top of the console, then **Security credentials**, then **Assign MFA device**. An authenticator app on your phone is enough; passkeys and security keys are stronger.
2. **Create a group.** Open IAM, then **User groups**, then **Create group**. Name it `Admins` and attach the `AdministratorAccess` policy.
3. **Create a user.** From **Users**, click **Create user**, turn on **Provide user access to the AWS Management Console**, choose a strong password, and add the user to the `Admins` group.
4. **Sign out of root.** Sign in as the new user from your account's sign-in link, found on the IAM dashboard. It looks like `https://your-account-id.signin.aws.amazon.com/console`.
5. **Turn on MFA for the new user.** Same as step one, from that user's account.

You can do steps 2 and 3 from the command line too, which shows that everything in the console is just requests to the same service:

```bash
# Create the group and attach the ready-made policy
aws iam create-group --group-name Admins
aws iam attach-group-policy --group-name Admins \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create the user and add them to the group
aws iam create-user --user-name noura
aws iam add-user-to-group --group-name Admins --user-name noura

# Check the result
aws iam list-groups-for-user --user-name noura
```

To strengthen passwords across your account, set a **password policy** under IAM, then **Account settings**: minimum length, character types, expiry, and preventing reuse of old passwords.

## Access keys: for commands and code

You sign in to the console with a password. The command line and code use **access keys**, which come in two parts: the access key ID (like a username) and the secret access key (like a password).

You create them on the user's page in IAM, under the **Security credentials** tab. The secret key is shown only once. Then connect them to the CLI:

```text
$ aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: eu-central-1
Default output format [None]: json
```

(These are example values from the AWS documentation, not real keys.) Confirm they work with the command we tried in part one:

```bash
aws sts get-caller-identity
```

::: warning Treat keys like passwords
Don't put them in code, push them to GitHub, or send them to anyone. Programs constantly scan public repositories looking for them, and you could soon find a huge bill. If a key leaks, disable it in IAM immediately and create a new one.
:::

## Roles: permissions without keys

Imagine an application on an EC2 server that needs to read from S3. The wrong fix: putting access keys on the server. If the server is exposed, so are the keys.

The right fix is a **role**: you give the server a role, and AWS automatically supplies it with **temporary** credentials that renew themselves, with nothing for you to store.

A role has two parts: a **permissions policy** saying what it can do, and a **trust policy** saying who can take it on. This trust policy lets EC2 servers take the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Note the new field, **`Principal`**: it states who the rule applies to. You don't see it in policies attached to a user or group, because the identity is already known there. We'll put roles to real use with EC2 in the next part. The rule is simple: **for any service or application inside AWS, use a role, not keys.**

## Review your permissions

Permissions pile up over time, so review them regularly. IAM gives you tools for this:

- **Credential report:** an account-wide file listing every user and the state of their passwords, keys and MFA. It reveals, for example, a user without MFA or an old key.
- **Last accessed:** a tab on each user or role showing the services it has permission for and when it last used them. If it hasn't touched a service in months, remove that permission.
- **IAM Access Analyzer:** flags resources shared outside your account, and unused permissions.

## Summary

- IAM is global and free, and answers: who are you, and are you allowed? Everything is denied by default.
- Protect the root user with MFA and don't use it day to day.
- Put users in **groups** and attach **policies** to the groups.
- An explicit deny always beats an allow.
- Apply **least privilege**: start narrow and widen when needed.
- Access keys are secret; for services, use **roles** instead.

## Test yourself

::: quiz
An application on an EC2 server reads reports from an S3 bucket, and a developer has stored access keys in a configuration file on the server. The security team wants the long-term keys gone, without creating ongoing work for the developers. Which solution meets this?

- [ ] Move the keys from the file into environment variables on the server
- [x] Attach an IAM role that can read the bucket to the server, and delete the keys
- [ ] Keep the keys, and rotate them every 30 days with a scheduled script
- [ ] Make the bucket public, so the application doesn't need credentials

A role gives the application temporary credentials that update automatically, so there's nothing to store or rotate.

- **A:** The same long-term keys are still on the server.
- **C:** The keys stay, and there's now a script to maintain.
- **D:** The reports would be open to anyone on the internet.

Review: [Roles: permissions without keys](#roles-permissions-without-keys) in this part, and [IAM roles for applications on EC2](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html) in the AWS docs.
:::

::: quiz
The `Developers` group has a policy allowing `s3:*` on all buckets. The `Compliance` group has a policy denying `s3:DeleteObject` on the `finance-records` bucket. Reem belongs to both groups. What happens when Reem tries to delete an object from `finance-records`?

- [ ] It succeeds, because `s3:*` is broader than the denied action
- [ ] It succeeds, because policies attached to groups can't contain `Deny`
- [ ] It depends on which of the two policies was attached last
- [x] It fails, because an explicit deny overrides any allow

AWS gathers all the policies that apply. If any one contains an explicit deny for the request, the request is refused.

- **A:** How broad an allow is makes no difference against a deny.
- **B:** Group policies can contain `Deny` like any other identity policy.
- **C:** The order of policies has no effect on the result.

Review: [How a permission is decided](#how-a-permission-is-decided) in this part, and [Policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html) in the AWS docs.
:::

::: quiz
A user with this policy can download `s3://reports/q1.pdf` by name, but `aws s3 ls s3://reports` returns `AccessDenied`:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:ListBucket"],
  "Resource": "arn:aws:s3:::reports/*"
}
```

What should change?

- [x] Add `arn:aws:s3:::reports` to the policy's resources
- [ ] Add `s3:PutObject` to the policy's actions
- [ ] Turn off Block Public Access on the bucket
- [ ] Attach the same policy to a group instead of the user

`s3:ListBucket` applies to the bucket itself, while `s3:GetObject` applies to the objects in it. The policy names only the objects, so listing has nothing to apply to.

- **B:** This allows writing, and has nothing to do with listing.
- **C:** This setting concerns public access, not a signed-in user's permissions.
- **D:** The group would have the same wrong resource.

Review: [How to read an IAM policy](#how-to-read-an-iam-policy) in this part, and [Identity-based policy examples for S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html) in the AWS docs.
:::

::: quiz
An audit finds that a company's root user has access keys and no multi-factor authentication. Which **two** actions reduce the risk to the root user? (Choose two.)

- [x] Delete the root user's access keys
- [ ] Attach an IAM policy that restricts what the root user can do
- [x] Turn on MFA for the root user
- [ ] Share the root password only with team leads
- [ ] Rename the root user to something hard to guess

AWS recommends no access keys for the root user, and MFA on its sign-in.

- **B:** IAM policies in the account can't restrict the root user.
- **D:** The root password shouldn't be shared without a strict need, and people should use their own identities day to day.
- **E:** The root user signs in with the account's email address, so there's no username to rename.

Review: [The root user](#the-root-user) in this part, and [Root user best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html) in the AWS docs.
:::

::: quiz
A role used by a reporting application has permissions for ten AWS services. The security team suspects it uses only three, and wants to remove the rest based on evidence, with the **least effort**. What should the team use?

- [ ] The account's credential report
- [ ] A line-by-line review of the application's source code
- [x] The role's Last Accessed information in IAM
- [ ] Removing permissions one at a time, and waiting for errors

Last Accessed shows each service the role is allowed to use and when it last tried, which is exactly the evidence needed.

- **A:** This lists users and the state of their passwords, keys and MFA, not the services a role uses.
- **B:** This takes a lot of effort, and it can miss calls made by libraries.
- **D:** This uses failures in production as the test.

Review: [Review your permissions](#review-your-permissions) in this part, and [Last accessed information](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_last-accessed.html) in the AWS docs.
:::

In [**part three**](/en/posts/aws-03-ec2-first-server/) we launch our first real server on **EC2** and give it an IAM role instead of keys. If you want to jump ahead, there's a hands-on guide: [How to create a server on AWS](/en/posts/aws/).
