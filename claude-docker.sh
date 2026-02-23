#!/bin/bash
set -e

echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker Desktop."
  exit 1
fi

echo "Building devcontainer..."
cd .devcontainer
docker build -t claude-backbone .
cd ..

echo ""
echo "Starting Claude Code..."
echo "  - Mode: --dangerously-skip-permissions"
echo "  - Model: Opus 4.6"
echo "  - Notifications: enabled"
echo ""

docker run -it --rm \
  --name claude-backbone \
  --cap-add=NET_ADMIN \
  --security-opt seccomp=unconfined \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e ANTHROPIC_MODEL=claude-opus-4-6 \
  claude-backbone \
  bash -c '
    sudo /usr/local/bin/init-firewall.sh 2>/dev/null || true
    mkdir -p ~/.claude
    cp /workspace/.devcontainer/claude-settings.json ~/.claude/settings.json 2>/dev/null || true
    /usr/local/bin/notify.sh "Claude Code" "Container ready" "default" "rocket"
    echo ""
    echo "Container ready. Starting Claude..."
    echo ""
    claude --dangerously-skip-permissions
  '
