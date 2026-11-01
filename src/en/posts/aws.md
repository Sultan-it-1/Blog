---
title: How to create a server on AWS to run WireGuard VPN
description: A step-by-step guide to creating an AWS account, launching an Ubuntu server on EC2 and connecting to it over SSH, ready to run WireGuard VPN.
date: 2025-06-11
tags: [aws, ec2, linux]
---

## 1. What is AWS?

- AWS stands for Amazon Web Services, a large website that provides web hosting services for servers.
- A server is a powerful computer that runs 24/7, which you can use to run programs like VPN.

## 2. How to access AWS website?

1. Open your internet browser (like Google Chrome or Firefox).
2. In the search box (or address bar) type: "AWS" or "Amazon Web Services" and press Enter.
3. Choose the first result which is usually https://aws.amazon.com
4. Click on the Sign Up button (create new account).

## 3. Create AWS account

1. Fill in your details: email, password, name, etc.
2. You'll be asked for a credit card (there's a free trial for some services for one year, but you need to enter card details for verification).
3. After registration, log in with your account.

## 4. Access EC2 service

1. After logging in, on the main page, in the top search box, type EC2 and select the result.
2. EC2 service is for creating virtual servers.

## 5. Create new server (Instance)

1. On the EC2 page, click on Launch Instance (start new server).
2. You'll be asked to choose an Operating System, select Ubuntu (it's a Linux-like free OS).
3. Then specify server specs (location, memory size, processor...).
4. Choose default or small options to make the experience easy and cheap.

## 6. Create Key Pair file

1. You'll be asked to create a Key Pair file which is very important.
2. This file is what you'll use to access the server via SSH.
3. Choose a name for the file and click Download to save it to your device (usually in .pem format).
4. Keep the file in a safe place, because without it you can't access the server.

![AWS server creation interface](/assets/images/aws1.png)

## 7. Configure Inbound Rules

1. On the server creation page, in the Security Group section, you specify access rules for the server.
2. Click on edit
3. Then click add new rule and do the following:

![AWS inbound rules configuration](/assets/images/aws2.png)

## 8. Launch the server

1. Click the Launch button to start the server.
2. After a few minutes, the server will start and give you a Public IPv4 address (like 54.67.153.151).

## 9. Access server using SSH

1. Open Terminal if you use Linux or Mac, or PowerShell/CMD if you use Windows
2. In the terminal (text interface), type the following command (adjusting the path, key file name and address)

   ```bash
   # Access server using SSH
   ssh -i path_to_file ubuntu@IP_address
   ```

3. Example:

   ```bash
   # Example SSH access
   ssh -i ~/Downloads/aws-key.pem ubuntu@54.67.153.151
   ```

4. If a security message appears, type yes and enter.

::: note 🔐 Security Tips
Make sure not to share your key file (`.pem`) with anyone, it's like a password for your server.
:::
