# JobLenz — Railway Deployment Guide

## Why Railway Over Vercel
- **No function timeouts.** TinyFish calls take 5-90 seconds. Vercel free tier kills at 10s. Railway runs a real Node.js container — no timeout limit.
- **$5 free credit/month** — more than enough for a hackathon weekend.
- **Same git-push workflow** as Vercel once configured.
- **Next.js works out of the box** — Railway auto-detects it via Nixpacks.

---

## Initial Setup (~10 minutes)

### 1. Create Railway Account
- Go to https://railway.app
- Sign in with GitHub (links your repos automatically)

### 2. Create Project + Deploy
```bash
# Option A: From Railway dashboard
# Click "New Project" → "Deploy from GitHub Repo" → select your repo
# Railway auto-detects Next.js and configures build

# Option B: From CLI
npm install -g @railway/cli
railway login
railway init          # Creates project
railway link          # Links to existing project
railway up            # Deploys current code
```

### 3. Set Environment Variables
In Railway dashboard → your service → Variables tab:
```
TINYFISH_API_KEY=tf_xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
NODE_ENV=production
```
Or via CLI:
```bash
railway variables set TINYFISH_API_KEY=tf_xxxx
railway variables set ANTHROPIC_API_KEY=sk-ant-xxxx
```

### 4. Get Your Public URL
Railway auto-assigns a URL like `joblenz-production.up.railway.app`.
To customize: Settings → Networking → Generate Domain.

---

## Railway-Specific Next.js Config

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Optimizes for container deployment
}

module.exports = nextConfig
```

The `standalone` output mode is important for Railway — it bundles everything into a self-contained folder that doesn't need `node_modules` at runtime, making the container smaller and faster to start.

### package.json scripts (should already be standard)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p ${PORT:-3000}"
  }
}
```

Railway sets the `PORT` environment variable automatically. The `${PORT:-3000}` fallback ensures local dev still works on port 3000.

---

## How Railway Deploys Next.js

1. You `git push` to main (or click deploy in dashboard)
2. Railway detects Next.js via `package.json` → `next` dependency
3. Nixpacks runs `npm install` → `npm run build`
4. Railway runs `npm run start`
5. App is live at your Railway URL

Build typically takes 60-90 seconds. Subsequent deploys with cache: ~30 seconds.

---

## Railway vs Vercel — What Changes in Your Code

**Almost nothing.** The entire JobLenz architecture spec stays the same:
- Next.js App Router API routes work identically
- `process.env.TINYFISH_API_KEY` works the same way
- Tailwind, React components, everything is the same
- The only change is `output: 'standalone'` in next.config.js

**What you gain:**
- TinyFish calls can take 90+ seconds without crashing
- No need for polling/streaming workarounds for long API calls
- Simpler mental model: it's just a Node.js server, not serverless functions

---

## Cost for Hackathon Weekend

Railway gives $5 free credit per month on the Starter plan. A Next.js app with occasional API calls will use roughly:
- ~$0.50-$1.00 for the entire weekend
- Well within the free $5 credit
- No credit card required for Starter plan

---

## Deploy Checklist (Sunday Morning)

- [ ] `output: 'standalone'` in next.config.js
- [ ] Push to GitHub
- [ ] Railway dashboard → New Project → Deploy from GitHub
- [ ] Set TINYFISH_API_KEY and ANTHROPIC_API_KEY in Variables
- [ ] Generate public domain in Settings → Networking
- [ ] Test the deployed URL end-to-end
- [ ] Submit the Railway URL as your "Deployed Link"
