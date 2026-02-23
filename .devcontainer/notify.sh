#!/usr/bin/env bash

NTFY_TOPIC="gkgkgkgkgk"
TITLE="${1:-Claude Code}"
MESSAGE="${2:-Needs your attention}"
PRIORITY="${3:-default}"
TAGS="${4:-robot}"

curl -sf \
  -H "Title: $TITLE" \
  -H "Priority: $PRIORITY" \
  -H "Tags: $TAGS" \
  -d "$MESSAGE" \
  "https://ntfy.sh/$NTFY_TOPIC" 2>/dev/null || true
