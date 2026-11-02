---
title: "EC2: Your First Server"
description: What EC2 is, how to choose an instance type, how to protect it with security groups, and how to launch a real web server that sets itself up on boot, using an IAM role instead of keys.
date: 2026-11-02
series: aws
part: 3
numbered: true
tags: [aws, ec2, linux]
---

With the account secured in [part two](/en/posts/aws-02-iam/), it's time for AWS's best-known service. **EC2** (Elastic Compute Cloud) gives you virtual servers you can launch in minutes, pay for while they run, and delete when you're done.

In this part we'll go through the decisions you make when launching a server, start a web server that configures itself, and connect it to AWS services with an IAM role instead of keys.

## What you choose when you launch a server

Every server (called an **instance**) comes down to a set of decisions:

| Decision | What it means | Example |
| --- | --- | --- |
| **AMI** | The system image the server boots from | Amazon Linux, Ubuntu or Windows |
| **Instance type** | CPU, memory and network speed | `t3.micro` |
| **Key pair** | How you sign in securely over SSH | A `.pem` file on your machine |
| **Network** | Where it lives, and whether it has a public address | A virtual network and Availability Zone |
| **Security group** | A firewall deciding who can reach it | Allow port 80 |
| **Storage** | The disk attached to it | An 8 GB EBS volume |
| **User Data** | A script that runs on first boot | Install a web server |

## Instance types

The type's name describes the whole server. Take `m7g.2xlarge`:

- **`m`:** the family, which sets the server's purpose.
- **`7`:** the generation. Newer generations are usually faster and cheaper for the same work.
- **`g`:** an extra attribute, here meaning an AWS Graviton (ARM) processor.
- **`2xlarge`:** the size within the family.

The main families:

| Family | Good for | Examples |
| --- | --- | --- |
| **General purpose** (`t`, `m`) | Websites and most applications, balanced across the board | `t3`, `m7i` |
| **Compute optimized** (`c`) | Heavy calculation, video encoding, game servers | `c7i` |
| **Memory optimized** (`r`, `x`) | In-memory databases and caches | `r7i` |
| **Storage optimized** (`i`, `d`) | Very fast reads and writes on a local disk | `i4i` |
| **Accelerated** (`p`, `g`) | AI and graphics with GPUs | `g5` |

Always start small, and grow when the numbers say you need to. The `t` family uses a CPU "credit" system: it runs at a baseline and can burst above it for short periods, which is great for small projects and wrong for heavy, sustained load.

Most current types run on the **AWS Nitro System**, a lightweight hypervisor backed by dedicated hardware, which gives a virtual server performance close to the physical machine. If you need the machine itself, such as for software that can't run virtualized, look for `.metal` sizes.

## Security groups: the server's firewall

A **security group** is a virtual firewall around the server. The key points:

- Rules can **only allow**. You never write "deny"; anything not allowed is blocked.
- By default, all inbound traffic is blocked and all outbound traffic is allowed.
- It's **stateful**: if a request is allowed in, the response goes back out without an outbound rule.
- You can allow an IP address or **another security group**. For example, a database can accept traffic only from the application servers' security group, even as their addresses change.

<figure class="diagram">
<svg viewBox="0 0 640 230" role="img" aria-labelledby="sg-caption">
<defs>
<marker id="sg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
<marker id="sg-arrow-no" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-danger)"/>
</marker>
</defs>
<rect x="20" y="30" width="150" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="52" text-anchor="middle" class="d-small">Site visitors</text>
<text x="95" y="69" text-anchor="middle" class="d-code">:80</text>
<rect x="20" y="92" width="150" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="114" text-anchor="middle" class="d-small">You, from your IP</text>
<text x="95" y="131" text-anchor="middle" class="d-code">:22</text>
<rect x="20" y="154" width="150" height="48" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="95" y="176" text-anchor="middle" class="d-small">Anyone else</text>
<text x="95" y="193" text-anchor="middle" class="d-code">:22</text>
<rect x="290" y="20" width="290" height="190" rx="14" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-dasharray="6 6"/>
<text x="435" y="46" text-anchor="middle" class="d-small">Security group</text>
<rect x="335" y="72" width="200" height="110" rx="12" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="435" y="120" text-anchor="middle" class="d-label">EC2 server</text>
<text x="435" y="144" text-anchor="middle" class="d-code">t3.micro</text>
<line x1="170" y1="54" x2="332" y2="110" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#sg-arrow)"/>
<line x1="170" y1="116" x2="332" y2="126" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#sg-arrow)"/>
<line x1="170" y1="178" x2="282" y2="178" stroke="var(--color-danger)" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#sg-arrow-no)"/>
</svg>
<figcaption id="sg-caption">The security group allows only what you specified: visitors on port 80 and you on port 22. Any other request stops at the group.</figcaption>
</figure>

Ports you'll run into a lot:

| Port | Service |
| --- | --- |
| 22 | SSH: signing in to a Linux server |
| 80 | HTTP: unencrypted websites |
| 443 | HTTPS: encrypted websites |
| 3389 | RDP: signing in to a Windows server |

::: warning Don't open SSH to the world
Don't leave port 22 open to `0.0.0.0/0`. Limit it to your own address. Better still, use **Session Manager** or **EC2 Instance Connect** rather than managing keys yourself.
:::

::: tip A quick connection diagnosis
A **timeout** means the request never arrived: usually the security group. **Connection refused** means it reached the server, but nothing is listening on that port. Knowing the difference saves a lot of time.
:::

## User Data: a server that sets itself up

**User Data** is a script you hand the server at launch. It runs **once**, on first boot, as root. Instead of signing in and installing everything by hand, the server comes up ready. This is the foundation of the auto scaling we'll reach later.

## Hands-on: launch a web server

Now let's launch an Amazon Linux server that comes up with a web server already running.

1. Open **EC2**, click **Launch instance**, and name it `web-1`.
2. Choose the **Amazon Linux 2023** image and type `t3.micro` (or whichever type your free usage covers).
3. Create a **key pair** and download it, unless you'll sign in from the browser with EC2 Instance Connect.
4. Under **Network settings**, allow HTTP from anywhere and SSH only from your address (**My IP**).
5. Under **Advanced details**, paste this into the **User data** box:

   ```bash
   #!/bin/bash
   dnf install -y nginx
   echo "<h1>Hello from $(hostname)</h1>" > /usr/share/nginx/html/index.html
   systemctl enable --now nginx
   ```

6. Click **Launch instance** and wait for the state to become **Running**.

After a minute or two, copy the **Public IPv4 address** and open it in your browser with `http://` (not `https`). You should see the page and the server's name. To sign in to it:

```bash
# The key file must be locked down, or SSH refuses it
chmod 400 ~/keys/my-key.pem

# The default user on Amazon Linux is ec2-user
ssh -i ~/keys/my-key.pem ec2-user@SERVER_ADDRESS
```

For a detailed walkthrough of the console with screenshots, see [How to create a server on AWS](/en/posts/aws/).

## Hands-on: give the server an IAM role

In part two we said: for services inside AWS, use a role, not keys. Let's do that now.

1. In **IAM**, open **Roles**, then **Create role**. Choose **AWS service**, then **EC2**.
2. Attach the ready-made `AmazonS3ReadOnlyAccess` policy and name the role `web-s3-read`.
3. Back in EC2, select the server, then **Actions**, **Security**, **Modify IAM role**, and choose the role.

Now, on the server, with no `aws configure` and no keys at all:

```bash
# Shows a temporary assumed-role identity, not a user
aws sts get-caller-identity

# Works, because the role allows reading S3
aws s3 ls

# Refused, because the role doesn't allow it: least privilege in action
aws ec2 describe-instances --region eu-central-1
```

The last command returns an `UnauthorizedOperation` error, which is exactly what we want: the server can do only what you gave it.

## Stop or terminate?

| State | Server | Disk | You pay for |
| --- | --- | --- | --- |
| **Running** | On | Kept | Compute and storage |
| **Stopped** | Off | Kept, with your data | Storage only |
| **Terminated** | Gone for good | System disk deleted by default | Nothing |

Note that the public IP address **changes** every time you stop and start the server. We'll see the fix in the next part.

::: security Clean up after experimenting
When you're done, select the server, then **Instance state**, **Terminate instance**. A forgotten server is the most common cause of an unexpected bill.
:::

## Summary

- A server is made of an image (AMI), a type, keys, a network, a security group, storage and User Data.
- The type's name says it all: family, generation and size. Start small and grow by the numbers.
- Security groups only allow, remember connections, and can reference other groups.
- A **timeout** usually means the security group; **connection refused** means the application.
- User Data sets the server up automatically, and a role gives it permissions without keys.

## Test yourself

::: quiz
A startup encodes videos on a `t3.large` server. The job keeps the CPU near 100% for hours while using little memory, and the monthly bill shows extra charges for CPU credits. Which change best fits this workload?

- [ ] Move to a larger `t3` size, which earns more CPU credits
- [ ] Move to a memory optimized `r7i` server
- [x] Move to a compute optimized `c7i` server
- [ ] Move to a storage optimized `i4i` server

The `t` family runs at a baseline and spends credits to go above it, which suits occasional peaks, not hours at full load. Encoding needs sustained CPU, and that's what the `c` family is for.

- **A:** A larger `t3` still relies on credits, so the fit stays wrong.
- **B:** The job uses little memory, so you'd pay for what it doesn't need.
- **D:** This family is for fast local disks, and the bottleneck here is the CPU.

Review: [Instance types](#instance-types) in this part, and [Key concepts for burstable instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html) in the AWS docs.
:::

::: quiz
Application servers start and stop throughout the day, so their IP addresses keep changing. A database server must accept port 3306 from these servers only. Which setup needs the **least ongoing work**?

- [ ] Allow port 3306 from `0.0.0.0/0`, and rely on the database password
- [ ] Allow each server's IP address, and update the list with a script
- [ ] Allow port 3306 from everywhere, and add a rule denying everyone else
- [x] Allow port 3306 from the application servers' security group

A rule can name a security group as its source, and it then covers every server in that group, whatever its address.

- **A:** This opens the database to the whole internet.
- **B:** This works, but it adds a script to maintain, and one that can fail.
- **C:** Security group rules can only allow, so there's no deny rule to add.

Review: [Security groups](#security-groups-the-servers-firewall) in this part, and [Security group rules](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html) in the AWS docs.
:::

::: quiz
You launch a web server, and `http://SERVER_ADDRESS` times out in your browser. Signed in over SSH, you confirm that Nginx is running and that `curl localhost` returns the page. What's the most likely cause?

- [x] The security group doesn't allow inbound traffic on port 80
- [ ] The server's IAM role has no permission to serve web traffic
- [ ] The key pair doesn't match the server
- [ ] The User Data script failed on first boot

A timeout means the request never arrived, and the server itself serves the page fine. So the block is on the way in, and the security group is the first place to check.

- **B:** IAM roles control calls to AWS services, not traffic coming in to the server.
- **C:** The key pair only concerns SSH, and SSH is working.
- **D:** Nginx is running and returning the page, so the setup worked.

Review: [Security groups](#security-groups-the-servers-firewall) in this part, and [Troubleshoot connecting to your instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesConnecting.html) in the AWS docs.
:::

::: quiz
A developer stops a server, edits its User Data to install a new package, then starts it again. The package isn't installed, and there are no errors. Why?

- [ ] Only the server's IAM role can change its User Data
- [x] By default, User Data runs only on the server's first boot
- [ ] Stopping a server deletes its User Data
- [ ] User Data needs an Elastic IP address to run

The script runs once, on first boot. After that, the developer can install the package directly, or launch a new server with the updated script.

- **A:** The role controls what the server can call, and has nothing to do with this.
- **C:** Stopping doesn't delete User Data, which is why the edit could be saved.
- **D:** User Data doesn't depend on the type of address.

Review: [User Data](#user-data-a-server-that-sets-itself-up) in this part, and [Run commands at launch with user data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) in the AWS docs.
:::

::: quiz
A development server is used only during working hours. The team wants to cut its cost at night, and to find its files and settings as they left them in the morning. What should it do each night?

- [ ] Terminate the server, and launch a new one in the morning
- [ ] Reboot the server
- [x] Stop the server, and start it in the morning
- [ ] Change it to a smaller instance type, and leave it running

A stopped server isn't charged for compute, only for its disks, and its data stays. Its regular public IP address will change, though.

- **A:** Terminating deletes the system disk by default, so the work is lost.
- **B:** A reboot leaves the server running, and billed.
- **D:** This lowers the cost, but you still pay all night for a server nobody's using.

Review: [Stop or terminate?](#stop-or-terminate) in this part, and [Instance state changes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html) in the AWS docs.
:::

In [**part four**](/en/posts/aws-04-ec2-pricing-networking/) we see how to pay far less for the same server, and how to handle IP addresses and networking.
