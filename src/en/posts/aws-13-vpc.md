---
title: "VPC: Your Private Network"
description: Open up the network your servers have been running in, and understand address ranges, subnets, internet and NAT gateways, route tables, safe access, two firewalls and flow logs, then build a VPC from scratch.
date: 2026-11-02
series: aws
part: 13
numbered: true
tags: [aws, networking]
---

Every server we've launched in this series has been inside a network you didn't build: the default VPC that AWS creates in each Region. It's fine for experiments, but a real application needs a design where the database stays hidden and each layer has its own place.

## What is a VPC?

A **VPC** (Virtual Private Cloud) is your private network within one Region. It spans all of that Region's Availability Zones, and nothing gets in or out unless you allow it. This is the common design:

<figure class="diagram">
<svg viewBox="0 0 640 356" role="img" aria-labelledby="vpc-caption">
<defs>
<marker id="vpc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0 0L10 5L0 10z" fill="var(--color-accent)"/>
</marker>
</defs>
<rect x="14" y="28" width="612" height="320" rx="14" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6"/>
<text x="110" y="54" text-anchor="middle" class="d-code">VPC 10.0.0.0/16</text>
<rect x="30" y="66" width="280" height="268" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="170" y="86" text-anchor="middle" class="d-small">Availability Zone A</text>
<rect x="44" y="96" width="252" height="88" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="117" y="130" text-anchor="middle" class="d-label">Public subnet</text>
<text x="117" y="152" text-anchor="middle" class="d-code">10.0.1.0/24</text>
<rect x="190" y="116" width="96" height="48" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="238" y="145" text-anchor="middle" class="d-label">NAT</text>
<rect x="44" y="214" width="252" height="104" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="117" y="258" text-anchor="middle" class="d-label">Private subnet</text>
<text x="117" y="280" text-anchor="middle" class="d-code">10.0.11.0/24</text>
<rect x="190" y="240" width="96" height="52" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="238" y="271" text-anchor="middle" class="d-label">Servers</text>
<rect x="330" y="66" width="280" height="268" rx="12" fill="none" stroke="var(--color-line-strong)"/>
<text x="470" y="86" text-anchor="middle" class="d-small">Availability Zone B</text>
<rect x="344" y="96" width="252" height="88" rx="10" fill="var(--color-accent-soft)" stroke="var(--color-accent)"/>
<text x="523" y="130" text-anchor="middle" class="d-label">Public subnet</text>
<text x="523" y="152" text-anchor="middle" class="d-code">10.0.2.0/24</text>
<rect x="354" y="116" width="96" height="48" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="402" y="145" text-anchor="middle" class="d-label">NAT</text>
<rect x="344" y="214" width="252" height="104" rx="10" fill="var(--color-sunken)" stroke="var(--color-line-strong)"/>
<text x="523" y="258" text-anchor="middle" class="d-label">Private subnet</text>
<text x="523" y="280" text-anchor="middle" class="d-code">10.0.12.0/24</text>
<rect x="354" y="240" width="96" height="52" rx="8" fill="var(--color-surface)" stroke="var(--color-line-strong)"/>
<text x="402" y="271" text-anchor="middle" class="d-label">Servers</text>
<line x1="238" y1="240" x2="238" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<line x1="402" y1="240" x2="402" y2="166" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<line x1="238" y1="116" x2="238" y2="46" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<line x1="402" y1="116" x2="402" y2="46" stroke="var(--color-accent)" stroke-width="2" marker-end="url(#vpc-arrow)"/>
<rect x="210" y="6" width="220" height="38" rx="8" fill="var(--color-surface)" stroke="var(--color-accent)"/>
<text x="320" y="30" text-anchor="middle" class="d-label">Internet gateway</text>
</svg>
<figcaption id="vpc-caption">Servers sit in private subnets and go out to the internet through NAT in the public subnet, then the internet gateway, and nobody outside can start a connection to them.</figcaption>
</figure>

## Address ranges: how to read CIDR

You write an address range in **CIDR** form, such as `10.0.0.0/16`. The number after the slash says how many of the 32 bits are fixed, so the smaller the number, the bigger the range:

| CIDR | Addresses | Common use |
| --- | --- | --- |
| `/32` | 1 | A single address |
| `/28` | 16 | The smallest VPC or subnet |
| `/24` | 256 | A subnet |
| `/16` | 65,536 | The largest VPC |
| `/0` | All addresses | `0.0.0.0/0` means anywhere |

Use the private ranges: `10.0.0.0/8`, `172.16.0.0/12` or `192.168.0.0/16`. The default VPC uses `172.31.0.0/16`.

::: warning Choose a range that won't clash
If your range overlaps another network, you can't easily connect them later. Think about your office and any other networks you might connect to, which is the subject of [part fourteen](/en/posts/aws-14-vpc-connectivity/).
:::

## Subnets

A subnet is a slice of the VPC's range, and here's what matters most:

- **It lives in one Availability Zone.** For high availability you need subnets in at least two zones.
- **AWS reserves 5 addresses** in each one: the first four and the last. So `/24` gives you 251 addresses, not 256.
- **"Public" and "private" aren't settings.** A subnet becomes public when its route table has a route to an internet gateway.

## Route tables and the internet gateway

An **internet gateway** connects the VPC to the internet. A **route table** decides where each packet goes. A public subnet's table looks like this:

| Destination | Target | Meaning |
| --- | --- | --- |
| `10.0.0.0/16` | `local` | Inside the VPC, which is always there |
| `0.0.0.0/0` | `igw-...` | Everything else goes to the internet |

For anyone to reach the server from outside, it also needs a public address. Remember from [part four](/en/posts/aws-04-ec2-pricing-networking/) that all public IPv4 addresses cost money.

## NAT Gateway: out without in

A server in a private subnet sometimes needs to go out, for example to download updates, but you don't want anyone coming in. That's the job of a **NAT Gateway**: it sits in the public subnet, sends the private servers' requests out under its own address, and accepts no connection started from outside.

The private subnet's table has `0.0.0.0/0` pointing to `nat-...` instead of the internet gateway. There are a few forms:

| Form | How it works |
| --- | --- |
| **Zonal NAT Gateway** | You need one in each Availability Zone, otherwise private subnets elsewhere lose access if its zone fails |
| **Regional NAT Gateway** | Newer. It expands automatically to the zones holding your servers, and is billed for each active zone |
| **NAT instance** | An EC2 server you manage yourself: you pay for the server instead of per gigabyte, its bandwidth depends on its size, it has no automatic failover, and you must turn off its source/destination check. It can be cheaper for very small workloads, but AWS recommends NAT gateways |

::: warning The bill's surprise
A NAT Gateway is billed by the hour and for every gigabyte passing through it. Many people discover it late on their bill. In the next part we'll see how to reduce this cost.
:::

## How do you reach a private server?

It has no public address, so how do you get in?

| Method | How | Notes |
| --- | --- | --- |
| **Bastion host** | A public server you SSH through | Old: keys, an open port and an extra server to secure |
| **EC2 Instance Connect Endpoint** | A point inside your network that connects you with no public address | Free, and we'll use it in the hands-on |
| **Session Manager** | A terminal through the SSM service, with no port 22 | Needs an IAM role, and logs sessions |

## Two firewalls: security groups and NACLs

You know the [security group](/en/posts/aws-03-ec2-first-server/), which surrounds the server. There's a second firewall called a **NACL** that surrounds the subnet:

| | Security group | NACL |
| --- | --- | --- |
| **Level** | The server | The subnet |
| **Rules** | Allow only | Allow and deny |
| **State** | Remembers the connection, so the reply goes out automatically | Doesn't remember, so you must allow the reply too |
| **Evaluation** | All rules | In order, and the first match decides |
| **Default** | In blocked, out allowed | The default allows everything; a new one denies everything |

Since a NACL doesn't remember connections, you must allow the server's replies through **ephemeral ports** (usually `1024-65535`), and this causes a lot of mistakes.

The practical rule: leave the default NACL alone and work with security groups. Use a NACL when you want to **block** an address range quickly, since a security group can't deny.

## Flow Logs

When a request doesn't arrive and you don't know why, **Flow Logs** record the details of each connection at the VPC, subnet or interface level, and send them to CloudWatch Logs or S3. A line looks like this:

```text
2 123456789012 eni-0abc 203.0.113.7 10.0.1.5 49152 22 6 5 300 1730000000 1730000060 REJECT OK
```

That means: from `203.0.113.7` to `10.0.1.5` on port `22`, and it was rejected. How to diagnose:

- **Inbound rejected:** the problem is the security group or the NACL.
- **Inbound accepted and outbound rejected:** the problem is the NACL, because a security group allows the reply automatically.

## Hands-on: build a VPC from scratch

We'll build a network with public and private subnets, and see for ourselves that the whole difference is in the route table. All commands are from CloudShell. First, the network and subnets:

```bash
VPC=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=series-vpc}]' \
  --query Vpc.VpcId --output text)

AZ=$(aws ec2 describe-availability-zones \
  --query "AvailabilityZones[0].ZoneName" --output text)

PUBLIC=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.1.0/24 \
  --availability-zone $AZ --query Subnet.SubnetId --output text)

PRIVATE=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.0.11.0/24 \
  --availability-zone $AZ --query Subnet.SubnetId --output text)
```

Now the internet gateway, and a route table for the public subnet only:

```bash
IGW=$(aws ec2 create-internet-gateway \
  --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC --internet-gateway-id $IGW

RT_PUBLIC=$(aws ec2 create-route-table --vpc-id $VPC \
  --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $RT_PUBLIC \
  --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW
aws ec2 associate-route-table --route-table-id $RT_PUBLIC --subnet-id $PUBLIC
```

A security group allowing traffic only from inside the network, and an entry point so we can reach the servers without opening a port to the world:

```bash
SG=$(aws ec2 create-security-group --group-name series-sg \
  --description "SSH and ping from inside the VPC" --vpc-id $VPC \
  --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG \
  --protocol tcp --port 22 --cidr 10.0.0.0/16
aws ec2 authorize-security-group-ingress --group-id $SG \
  --protocol icmp --port -1 --cidr 10.0.0.0/16

aws ec2 create-instance-connect-endpoint --subnet-id $PRIVATE \
  --security-group-ids $SG --no-preserve-client-ip
```

And a server in each subnet:

```bash
AMI=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)

aws ec2 run-instances --image-id $AMI --instance-type t3.micro \
  --subnet-id $PUBLIC --security-group-ids $SG --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=public-server}]'

aws ec2 run-instances --image-id $AMI --instance-type t3.micro \
  --subnet-id $PRIVATE --security-group-ids $SG \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=private-server}]'
```

Wait a few minutes for the entry point to be ready. Then in EC2 select a server, choose **Connect**, and under **EC2 Instance Connect** pick the option that connects through the endpoint. On each server, try:

```bash
curl -m 5 https://checkip.amazonaws.com
```

- **`public-server`:** prints its public address.
- **`private-server`:** times out with no answer, because it has no route to the internet.

From the private server, try `ping` on the public server's private address, and it replies, because the `local` route connects them.

### Add a NAT Gateway

Now let the private server go out. This step is billed by the hour, so delete it after experimenting:

```bash
ALLOC=$(aws ec2 allocate-address --domain vpc \
  --query AllocationId --output text)

NAT=$(aws ec2 create-nat-gateway --subnet-id $PUBLIC --allocation-id $ALLOC \
  --query NatGateway.NatGatewayId --output text)
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT

RT_PRIVATE=$(aws ec2 create-route-table --vpc-id $VPC \
  --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $RT_PRIVATE \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT
aws ec2 associate-route-table --route-table-id $RT_PRIVATE --subnet-id $PRIVATE
```

Repeat the same `curl` command on `private-server`. This time it prints an address, which is the NAT Gateway's, not the server's. The server went out to the internet, and still nobody can start a connection to it.

::: security Delete after experimenting
Delete the NAT Gateway from its page in VPC, and once it's gone release the Elastic IP from its page in EC2. If you're carrying on straight to [part fourteen](/en/posts/aws-14-vpc-connectivity/), keep the VPC and servers. Otherwise delete the servers and the entry point, then select the VPC and choose **Actions** and **Delete VPC**, which removes the rest with it.
:::

## Summary

- A **VPC** is your private network in a Region, split into subnets across Availability Zones.
- A subnet is **public** if its table has a route to an internet gateway, otherwise it's **private**.
- A **NAT Gateway** lets private subnets go out with nobody coming in, but watch its cost.
- **Security groups** remember connections and only allow; **NACLs** don't remember and can deny.
- **Flow Logs** tell you where a connection was rejected.

## Test yourself

::: quiz
A new server has a public address, and its security group allows HTTPS from anywhere, yet nobody can reach it from the internet. The VPC has an internet gateway attached, and the subnet's route table has only the `local` route. What's missing?

- [x] A `0.0.0.0/0` route to the internet gateway in the subnet's route table
- [ ] A NAT Gateway in the same subnet
- [ ] An outbound rule in the security group for the replies
- [ ] A peering connection to the default VPC

A subnet becomes public when its route table points to an internet gateway. Without that route, packets have no way out, even with a public address.

- **B:** NAT lets private servers go out, and accepts no connection started from outside.
- **C:** A security group remembers the connection, so the reply goes out automatically.
- **D:** Peering connects two VPCs, and gives no path to the internet.

Review: [Route tables and the internet gateway](#route-tables-and-the-internet-gateway) in this part, and [Enable internet access for a VPC using an internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html) in the AWS docs.
:::

::: quiz
A team is planning a subnet that must hold 30 servers. Address space is tight, so it wants the smallest block that fits. Which one should it pick?

- [ ] `/29`
- [ ] `/28`
- [ ] `/27`
- [x] `/26`

AWS reserves 5 addresses in every subnet. A `/27` has 32, which leaves 27, so it falls short. A `/26` has 64, which leaves 59.

- **A:** The smallest subnet AWS allows is `/28`, so this can't even be created.
- **B:** This leaves only 11 usable addresses.
- **C:** This leaves 27 usable addresses, three short of what's needed.

Review: [Subnets](#subnets) in this part, and [Subnet CIDR blocks](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) in the AWS docs.
:::

::: quiz
An application runs in private subnets across two Availability Zones, sharing one zonal NAT Gateway in the first zone. In an outage of that zone, the servers in the second zone stayed healthy but lost internet access. What fixes this?

- [ ] An extra internet gateway for the second zone
- [x] A NAT Gateway in the second zone, with each private subnet routing to the one in its own zone
- [ ] A second Elastic IP on the existing NAT Gateway
- [ ] Moving the NAT Gateway to a private subnet

A zonal NAT Gateway lives in one zone, so that zone's failure cuts off everyone relying on it. With one in each zone, a failure stays in its own zone. A Regional NAT Gateway gets you the same result automatically.

- **A:** A VPC has one internet gateway, and private subnets don't route to it.
- **C:** More addresses don't move it out of the failed zone.
- **D:** A NAT Gateway sits in a public subnet, and this would cut it off from the internet.

Review: [NAT Gateway: out without in](#nat-gateway-out-without-in) in this part, and [NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html) in the AWS docs.
:::

::: quiz
To block an abusive address range, a team creates a new NACL with a deny rule for that range and an inbound allow rule for port 443. Now no visitor can load the site. Flow Logs show the requests as `ACCEPT` and the replies as `REJECT`. What should the team do?

- [ ] Add a deny rule for the range to the security group
- [ ] Add an outbound rule for the replies to the security group
- [x] Add an outbound NACL rule allowing the ephemeral ports
- [ ] Delete the inbound allow rule from the NACL

A NACL doesn't remember connections, and a new one denies everything you haven't allowed, so the replies need their own rule. Inbound accepted with outbound rejected points straight at the NACL.

- **A:** A security group can only allow, so it can't hold a deny rule.
- **B:** A security group remembers the connection, so it was already letting the reply out.
- **D:** This would block the requests as well.

Review: [Two firewalls: security groups and NACLs](#two-firewalls-security-groups-and-nacls) and [Flow Logs](#flow-logs) in this part, and [Custom network ACLs for your VPC](https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html) in the AWS docs.
:::

::: quiz
Engineers need a terminal on servers in a private subnet. The servers must keep having no public addresses, and the team doesn't want another server to patch and secure. Which **two** options fit? (Choose two.)

- [ ] A bastion host in a public subnet
- [ ] A NAT Gateway, with an SSH rule
- [x] Session Manager, with an IAM role on the servers
- [ ] An Elastic IP on each server
- [x] An EC2 Instance Connect Endpoint in the VPC

Both reach the server with no public address and no extra server to run. Session Manager also needs no port 22, and it logs sessions.

- **A:** This is the extra server the team wants to avoid.
- **B:** A NAT Gateway only lets traffic out, and accepts no connection started from outside.
- **D:** This gives the servers public addresses, which is what must be avoided.

Review: [How do you reach a private server?](#how-do-you-reach-a-private-server) in this part, and [Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) and [EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-ec2-instance-connect-endpoint.html) in the AWS docs.
:::

Your network is now ready, but isolated. In [**part fourteen**](/en/posts/aws-14-vpc-connectivity/) we connect it to other networks, to AWS services and to your office.
