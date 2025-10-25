#!/bin/bash
# UFW Firewall configuration

# Reset UFW
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow Redis only from localhost
sudo ufw allow from 127.0.0.1 to any port 6379 comment 'Redis localhost only'

# Rate limiting on HTTP/HTTPS
sudo ufw limit 80/tcp
sudo ufw limit 443/tcp

# Enable firewall
sudo ufw --force enable

# Show status
sudo ufw status verbose

echo "Firewall is up.."
echo "did i leave the oven on?"
