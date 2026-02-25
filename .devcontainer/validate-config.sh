#!/usr/bin/env bash
# Startup validation — checks config is correct when container starts.
# Non-blocking: prints warnings but never prevents Claude from starting.

warnings=()

# 1. Check rules.txt exists
if [ ! -f /workspace/.claude/rules.txt ]; then
    warnings+=("rules.txt not found at /workspace/.claude/rules.txt")
fi

# 2. Check project settings.json exists and is valid JSON
if [ ! -f /workspace/.claude/settings.json ]; then
    warnings+=("settings.json not found at /workspace/.claude/settings.json")
elif ! jq empty /workspace/.claude/settings.json 2>/dev/null; then
    warnings+=("settings.json is not valid JSON")
fi

# 3. Check per-project Claude config exists
if [ ! -f /home/node/.claude/settings.json ]; then
    warnings+=("Per-project Claude config not found at /home/node/.claude/settings.json")
fi

# 4. Check git config
cd /workspace 2>/dev/null || true
if [ -z "$(git config user.name 2>/dev/null)" ]; then
    warnings+=("git user.name not set — run: git config --global user.name 'Your Name' (on host)")
fi
if [ -z "$(git config user.email 2>/dev/null)" ]; then
    warnings+=("git user.email not set — run: git config --global user.email 'you@example.com' (on host)")
fi

# 5. Check gh auth
if ! gh auth status >/dev/null 2>&1; then
    warnings+=("gh not authenticated — run: gh auth login (on host)")
fi

# 6. Check notify.sh NTFY_TOPIC is not a placeholder
if [ -f /usr/local/bin/notify.sh ]; then
    if grep -q '{{NTFY_TOPIC}}' /usr/local/bin/notify.sh; then
        warnings+=("notify.sh still has {{NTFY_TOPIC}} placeholder — edit .devcontainer/notify.sh")
    fi
fi

# 7. Check SSH key exists
if [ ! -f /home/node/.ssh/id_ed25519 ] && [ ! -f /home/node/.ssh/id_rsa ]; then
    warnings+=("No SSH key found — run: ssh-keygen -t ed25519 (on host)")
fi

# Print results
echo ""
echo "=== Config Validation ==="
if [ ${#warnings[@]} -eq 0 ]; then
    echo "All checks passed."
else
    echo "WARNINGS (${#warnings[@]}):"
    for w in "${warnings[@]}"; do
        echo "  - $w"
    done
fi
echo "========================="
echo ""
