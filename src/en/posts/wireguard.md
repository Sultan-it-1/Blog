---
title: Setting up WireGuard VPN on Ubuntu Server from Scratch
description: A complete guide to setting up your own VPN server with WireGuard on Ubuntu. Learn how to protect your connection and build a secure private network, step by step.
date: 2025-09-08
image: /assets/images/vpn-banner.png
tags: [vpn, wireguard, linux]
---

In this guide, we'll cover step-by-step how to set up a VPN network using WireGuard on an Ubuntu server. Perfect for anyone who wants to secure their connection or connect multiple devices to a private and secure network.

## 1️⃣ Server Setup (Cloud Server)

First, we need a cloud server. If you don't have one, you can follow this guide to create a server on AWS:

<p><a href="/en/posts/aws/" class="btn">AWS Server Setup Guide</a></p>

It's very important to enable step 7. Setting up Inbound Rules in the previous guide

After logging into the server via SSH, we start with the preparations.

## 2️⃣ System Update and WireGuard Installation

```bash
# Update system and install WireGuard
sudo apt update && sudo apt upgrade -y
sudo apt install wireguard -y
```

- Updates the system.
- Installs WireGuard software.

## 3️⃣ Creating WireGuard Keys (Private & Public)

```bash
# Creating WireGuard Keys (Private & Public)
sudo bash -c "wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey"
```

🔑 This command creates a private key (`privatekey`) and a public key (`publickey`).

::: note 💡 Why did we use `bash -c`?
So we can execute a command with pipes `|` with `sudo` privileges.
:::

## 4️⃣ Setting Key Permissions

```bash
# Setting Key Permissions
sudo chmod 600 /etc/wireguard/privatekey
sudo ls -l /etc/wireguard
```

🔒 We protect the private key from unauthorized access.

## 5️⃣ Finding Server Network Interface

```bash
# Finding Server Network Interface
ip a
```

Look for the real interface (not `lo`) that has an IP address like:

```text
2: eth0: ...
    inet 192.168.1.5/24 ...
```

📌 In this example, the interface name is `eth0`.

## 6️⃣ Creating and Editing Configuration File

```bash
# Creating and Editing Configuration File
sudo nano /etc/wireguard/wg0.conf
```

## 7️⃣ Content of `wg0.conf` (with explanation)

```ini
# Content of wg0.conf
[Interface]
Address = 10.0.0.1/24
SaveConfig = true
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
ListenPort = 51820
PrivateKey = [Paste the private key here without spaces]
```

- Replace `eth0` with your interface name from step 5.
- To get the private key: exit the editor with `Ctrl + X` then run the following command and copy the key:

```bash
# Getting the private key
sudo cat /etc/wireguard/privatekey
```

## 8️⃣ Saving File and Exiting Nano

- To save: `Ctrl + O` then Enter
- To exit: `Ctrl + X`

## 📱 Client Setup

## 9️⃣ Installing WireGuard App

- **Android:** [🔗 WireGuard from Google Play](https://play.google.com/store/apps/details?id=com.wireguard.android)
- **iOS:** [🔗 WireGuard from App Store](https://apps.apple.com/us/app/wireguard/id1451685025)

## 🔟 Client Configuration Setup

Inside the app:

1. Press `+` and choose **Create from scratch**.
2. Choose a suitable name.
3. Press **Generate keypair**.
4. It will give you a private and public key for the client.
5. In Address field, enter: `10.0.0.2/24`
6. In DNS field, enter: `1.1.1.1`
7. Add a new peer:

### Peer:

- **Public key:** Paste the public key you got from the server. You can get it using the following command:

```bash
# Getting the public key
sudo cat /etc/wireguard/publickey
```

- **Endpoint:** Server address with port, like:

```text
54.67.153.151:51820
```

## 1️⃣1️⃣ Adding Client to Server

```bash
# Adding Client to Server
sudo wg set wg0 peer [public_key_client] allowed-ips 10.0.0.2/32
sudo wg-quick save wg0
```

Replace `[public_key_client]` with the client's public key (the key you created in the mobile app).

## 1️⃣2️⃣ Running WireGuard Automatically on Boot

```bash
# Running WireGuard Automatically on Boot
sudo systemctl start wg-quick@wg0
sudo systemctl enable wg-quick@wg0
```

## 1️⃣3️⃣ Verifying Connection

```bash
# Verifying Connection
sudo wg show
```

If you see the keys and data, it means the connection is working perfectly.
