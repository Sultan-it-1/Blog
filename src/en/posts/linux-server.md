---
title: Setting Up a Secure Linux Server from Scratch
description: A comprehensive step-by-step guide to setting up a secure Linux server, from basic installation to securing the server against breaches.
date: 2024-06-02
tags: [linux, security]
---

In this comprehensive guide, we'll learn how to set up a secure Linux server step by step, from basic installation to securing the server against breaches.

::: note 📌 Important Note
This guide is for Ubuntu Server 20.04 LTS, but most commands work on any Linux distribution.
:::

## Prerequisites

1. Dedicated server or VPS with root access
2. Stable internet connection
3. Basic knowledge of Linux commands

## 1. Installation and Initial Setup

### System Update

```bash
# Update package list
sudo apt update

# Upgrade all installed packages
sudo apt upgrade -y

# Install essential packages
sudo apt install -y ufw fail2ban git curl wget
```

### Create New User

1. Create new user (replace `yourusername` with desired username)

   ```bash
   # Create new user
   sudo adduser yourusername

   # Add user to sudo group
   sudo usermod -aG sudo yourusername
   ```

2. Copy SSH keys for new user

   ```bash
   # Create .ssh directory
   sudo mkdir -p /home/yourusername/.ssh

   # Copy SSH keys
   sudo cp ~/.ssh/authorized_keys /home/yourusername/.ssh/

   # Change directory owner
   sudo chown -R yourusername:yourusername /home/yourusername/.ssh

   # Set permissions
   sudo chmod 700 /home/yourusername/.ssh
   sudo chmod 600 /home/yourusername/.ssh/authorized_keys
   ```

## 2. Server Security

::: note 🔒 Security Tips
These steps are essential to protect your server from common attacks.
:::

1. Configure Firewall (UFW)

   ```bash
   # Allow SSH service
   sudo ufw allow OpenSSH

   # Enable firewall
   sudo ufw enable

   # Show applied rules
   sudo ufw status verbose
   ```

2. Secure SSH Service

   ```bash
   # Change default SSH port (optional)
   sudo sed -i 's/#Port 22/Port 2222/g' /etc/ssh/sshd_config

   # Prevent root login
   sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config

   # Reduce login grace time
   sudo sed -i 's/#LoginGraceTime 2m/LoginGraceTime 1m/g' /etc/ssh/sshd_config

   # Restart SSH service
   sudo systemctl restart sshd
   ```

## 3. Monitoring and Maintenance

```bash
# Install monitoring tools
sudo apt install -y htop nmon

# View active processes
htop

# Monitor system performance
nmon
```

::: note 💡 Final Tip
Update your system regularly and make sure to perform periodic backups.
:::
