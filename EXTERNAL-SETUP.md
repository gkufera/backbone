# External Infrastructure Setup

Manual setup tasks that require cloud console access. These cannot be automated via the codebase.

---

## AWS SES (Email)

Email sending for password resets, verification, and notifications.

### Steps

1. **Verify domain in SES**
   - AWS Console > SES > Verified identities > Create identity
   - Identity type: Domain
   - Domain: `slugmax.com`

2. **Add DNS records to Cloudflare**
   - Add the 3 DKIM CNAME records provided by SES
   - Add SPF TXT record: `v=spf1 include:amazonses.com ~all`
   - Add DMARC TXT record: `v=DMARC1; p=quarantine; rua=mailto:admin@slugmax.com`

3. **Request production access**
   - SES starts in sandbox mode (can only send to verified emails)
   - AWS Console > SES > Account dashboard > Request production access

4. **Set Railway env vars on backend service**
   - `EMAIL_ENABLED=true`
   - `SMTP_HOST=email-smtp.<region>.amazonaws.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=<SES SMTP credential access key>`
   - `SMTP_PASS=<SES SMTP credential secret key>`
   - `EMAIL_FROM=noreply@slugmax.com`

---

## AWS S3 + CloudFront (Media CDN)

File storage for option assets (images, videos, documents).

### Steps

1. **Create S3 bucket** (if not already created)
   - Bucket name: value of `S3_BUCKET_NAME` env var
   - Region: match your backend region
   - Block all public access: ON (CloudFront will access via OAC)

2. **Create CloudFront distribution**
   - Origin: S3 bucket
   - Origin access: Origin Access Control (OAC)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Cache policy: CachingOptimized

3. **Update S3 bucket policy for OAC**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": { "Service": "cloudfront.amazonaws.com" },
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::<bucket-name>/*",
       "Condition": {
         "StringEquals": {
           "AWS:SourceArn": "arn:aws:cloudfront::<account-id>:distribution/<distribution-id>"
         }
       }
     }]
   }
   ```

4. **Set Railway env vars on backend service**
   - `AWS_ACCESS_KEY_ID=<IAM user access key>`
   - `AWS_SECRET_ACCESS_KEY=<IAM user secret key>`
   - `S3_BUCKET_NAME=<bucket name>`
   - `CLOUDFRONT_DOMAIN=<distribution-id>.cloudfront.net` (once CDN URL rewriting is implemented)

---

## Cloudflare DNS

Domain routing to Railway services.

### Current Configuration

| Record | Type | Name | Target |
|--------|------|------|--------|
| Frontend | CNAME | `slugmax.com` | Railway frontend domain |
| API | CNAME | `api.slugmax.com` | Railway backend domain |

### Notes

- DNS-only mode (orange cloud OFF) — no Cloudflare proxy/CDN
- Railway handles TLS certificates via Let's Encrypt
- CNAME targets are provided by Railway when you add custom domains

---

## Railway Environment Variables

Complete reference of env vars needed per service.

### Backend Service

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Auto-set by Railway PostgreSQL plugin |
| `JWT_SECRET` | Random 32+ char string | Generate with `openssl rand -hex 32` |
| `PORT` | `8000` | |
| `CORS_ORIGINS` | `https://slugmax.com` | |
| `EMAIL_ENABLED` | `true` or `false` | Set `true` after SES setup |
| `EMAIL_FROM` | `noreply@slugmax.com` | |
| `SMTP_HOST` | SES SMTP endpoint | Only needed when EMAIL_ENABLED=true |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | SES SMTP credentials | |
| `SMTP_PASS` | SES SMTP credentials | |
| `AWS_ACCESS_KEY_ID` | IAM user key | For S3 uploads |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret | For S3 uploads |
| `S3_BUCKET_NAME` | Bucket name | |

### Frontend Service

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.slugmax.com` | |

---

## GitHub CLI Authentication (for CI Log Access)

Programmatic access to GitHub for reading CI logs, PR status, and workflow runs.

### Steps

1. **Generate a personal access token**
   - Go to https://github.com/settings/tokens
   - Generate new token (classic) with `repo` and `workflow` scopes
   - Copy the token (starts with `ghp_`)

2. **Set in your development environment**
   ```bash
   export GH_TOKEN=ghp_your_token_here
   ```

3. **Verify**
   ```bash
   gh auth status
   ```

### For Claude Code

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export GH_TOKEN=ghp_your_token_here
```

Or create a `.env` file in the workspace root (already in `.gitignore`).

### Usage

```bash
gh run list                          # List recent workflow runs
gh run view <run-id> --log-failed    # View failed job logs
gh pr checks <pr-number>             # Check CI status on a PR
```

---

## GitHub Actions Secrets

Secrets needed for CI workflows (Settings > Secrets and variables > Actions).

Currently **no secrets are required** — both Tier 1 and E2E workflows use only public actions and local test databases. If private package registries or deployment steps are added later, secrets would go here.

---

## Server Container Setup (Hetzner — `claude-server`)

One-time credential setup for the backbone container. Everything else
(CLI installation, container management, config validation) is automated
by the `cm` script and `validate-config.sh`.

### Authenticate CLIs

SSH into the server and run the auth setup container. This gives you
an interactive shell with gh, aws, and railway CLIs pre-installed.
Auth credentials are saved to the host and mounted into future containers.

```bash
ssh claude-server
~/cm auth backbone
# Inside the container:
gh auth login          # Follow device code flow (opens URL on your phone/laptop)
aws configure          # Enter: Access Key ID, Secret Access Key, us-east-1, json
railway login          # Follow browser auth flow
exit
```

### SSH Key + Git Config (on host)

```bash
ssh claude-server
ssh-keygen -t ed25519                                    # If ~/.ssh/id_ed25519 doesn't exist
# Add pubkey to GitHub: Settings > SSH keys
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### API Tokens (env vars forwarded to containers)

Add any API tokens that containers need to `~/.config/cm/env` on the host.
This file uses Docker `--env-file` format (one `KEY=VALUE` per line, no quotes).

```bash
ssh claude-server
mkdir -p ~/.config/cm
cat > ~/.config/cm/env << 'EOF'
CLOUDFLARE_API_TOKEN=your-token-here
EOF
```

All vars in this file are passed to every container started by `cm`.

### Subscribe to Notifications

1. Install the [ntfy app](https://ntfy.sh/) on your phone
2. Subscribe to the topic in `.devcontainer/notify.sh` (`NTFY_TOPIC` variable)
3. Verify: `~/cm a backbone` → phone receives "Slug Max" notification

### Troubleshooting

| Warning from validate-config.sh | Fix |
|--------------------------------|-----|
| gh not authenticated | `~/cm auth backbone` → `gh auth login` |
| AWS credentials invalid | `~/cm auth backbone` → `aws configure` |
| Railway not authenticated | `~/cm auth backbone` → `railway login` |
| No SSH key found | On host: `ssh-keygen -t ed25519`, add pubkey to GitHub |
| git user.name not set | On host: `git config --global user.name "Name"` |
