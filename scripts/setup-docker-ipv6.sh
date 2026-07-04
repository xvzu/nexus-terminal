#!/bin/bash
# Setup Docker IPv6 support for nexus-terminal
# Run once per host before 'docker compose up -d'
# Usage: sudo ./scripts/setup-docker-ipv6.sh

set -euo pipefail

DAEMON_JSON="/etc/docker/daemon.json"
NETWORK_NAME="nexus-terminal-network"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo $0"
  exit 1
fi

mkdir -p /etc/docker

if [ -f "$DAEMON_JSON" ]; then
  cp "$DAEMON_JSON" "${DAEMON_JSON}.bak.$(date +%s)"
  echo "Backed up existing $DAEMON_JSON"
fi

cat > "$DAEMON_JSON" << 'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/64",
  "ip6tables": true,
  "experimental": true
}
EOF

echo "Created $DAEMON_JSON with IPv6 enabled"

echo "Restarting Docker..."
systemctl restart docker

sleep 2

if docker info 2>/dev/null | grep -qi "ipv6"; then
  echo "Docker IPv6: Enabled ✓"
else
  echo "Warning: Docker IPv6 not detected. Check 'docker info'"
fi

if docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
  echo "Removing old ${NETWORK_NAME} network to pick up IPv6..."
  docker network rm "${NETWORK_NAME}" 2>/dev/null || true
fi

echo ""
echo "Done. Now run:"
echo "  docker compose up -d"
