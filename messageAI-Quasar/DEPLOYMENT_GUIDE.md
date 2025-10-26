# Deployment Guide - Ossome PWA

This guide walks you through deploying your PWA to Vercel (free tier, no credit card required).

---

## Prerequisites

- ✅ PWA build completed (`pnpm build -m pwa`)
- ✅ `dist/pwa` directory exists
- ✅ GitHub/GitLab account (optional, for continuous deployment)
- ✅ Vercel account (free tier)

---

## Option 1: Deploy via Vercel CLI (Recommended)

### Step 1: Install Vercel CLI

```bash
pnpm add -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open a browser window for authentication.

### Step 3: Navigate to Project

```bash
cd /Users/elvisibarra/Documents/GauntletAI/messageAI/messageAI-Quasar
```

### Step 4: Deploy

```bash
vercel
```

**Follow the prompts:**

1. **Set up and deploy?** → `Y`
2. **Which scope?** → Select your personal account
3. **Link to existing project?** → `N` (first time)
4. **Project name?** → `ossome` (or your preferred name)
5. **Directory?** → `./` (current directory)
6. **Override settings?** → `N`

Vercel will:
- Build your project using `vercel.json` config
- Deploy to a preview URL
- Provide a production URL

### Step 5: Configure Environment Variables

After first deployment:

```bash
# Add Supabase URL
vercel env add VITE_SUPABASE_URL

# Add Supabase Anon Key
vercel env add VITE_SUPABASE_ANON_KEY
```

When prompted:
- Environment: `Production`, `Preview`, `Development` (select all)
- Value: Paste your actual values

### Step 6: Redeploy with Environment Variables

```bash
vercel --prod
```

Your app is now live! 🎉

**Production URL:** `https://ossome-[random].vercel.app`

---

## Option 2: Deploy via Vercel Dashboard (Easier)

### Step 1: Push to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "chore: prepare for deployment"

# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/ossome.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Other
   - **Build Command:** `pnpm build -m pwa`
   - **Output Directory:** `dist/pwa`
   - **Install Command:** `pnpm install`

### Step 3: Add Environment Variables

In Vercel project settings:
- Go to **Settings** → **Environment Variables**
- Add:
  - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
- Environment: All (Production, Preview, Development)

### Step 4: Deploy

Click **"Deploy"** and wait ~2-3 minutes.

**Your app is live!**

---

## Post-Deployment Checklist

### Verify Deployment

Visit your production URL and test:
- [ ] Login works
- [ ] Chat list loads
- [ ] Real-time messaging works
- [ ] AI Assistant loads
- [ ] AI can query schedules
- [ ] No console errors (open DevTools)

### Install as PWA

On mobile or desktop:
1. Visit your production URL
2. Look for "Install" or "Add to Home Screen" prompt
3. Click to install
4. App should open like a native app

### Share Your URL

Update these files with your production URL:
- `README.md` (line 3)
- `DEMO_SCRIPT.md` (use production URL instead of localhost)

---

## Troubleshooting

### Build Fails on Vercel

**Error:** "Command failed with exit code 1"

**Fix:**
```bash
# Locally test the build
pnpm build -m pwa

# If it works locally, check Vercel logs for specific error
# Common issues:
# 1. Missing environment variables
# 2. Node.js version mismatch (set to 18+ in Vercel settings)
# 3. pnpm not installed (Vercel auto-detects from lock file)
```

### App Loads But Real-Time Doesn't Work

**Issue:** Supabase connection fails

**Fix:**
- Verify environment variables in Vercel dashboard
- Check Supabase project is active and not paused
- Verify RLS policies allow access

### AI Assistant Returns 500 Error

**Issue:** Edge Function not accessible or OpenAI key missing

**Fix:**
- Verify Edge Functions are deployed: `supabase functions list`
- Check OpenAI API key in Supabase: `supabase secrets list`
- Check Edge Function logs: `supabase functions logs gym-ai-assistant`

### PWA Install Doesn't Appear

**Issue:** HTTPS required for PWA

**Fix:**
- Vercel automatically provides HTTPS
- Clear browser cache and revisit
- Check `manifest.json` is accessible at `/manifest.json`

---

## Continuous Deployment

If you deployed via GitHub:

**Automatic deployments on push:**
```bash
# Any push to main branch auto-deploys
git add .
git commit -m "feat: add new feature"
git push origin main
```

**Preview deployments:**
```bash
# Create a branch for testing
git checkout -b feature/new-thing
git push origin feature/new-thing
```

Vercel will create a preview URL for the branch.

---

## Custom Domain (Optional)

### Add Custom Domain

1. In Vercel dashboard → **Settings** → **Domains**
2. Add your domain (e.g., `ossome.app`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic, ~30 seconds)

**Cost:** Free on Vercel, but domain costs $10-15/year

---

## Monitoring & Analytics

### Vercel Analytics (Free)

1. In Vercel dashboard → **Analytics**
2. See: Page views, load times, Core Web Vitals

### Supabase Logs

```bash
# View Edge Function logs
supabase functions logs gym-ai-assistant --tail

# View database queries (in Supabase dashboard)
# Go to Database → Logs
```

---

## Rollback

If deployment breaks something:

```bash
# Via CLI
vercel rollback [deployment-url]

# Via Dashboard
# Go to Deployments → Find working deployment → Promote to Production
```

---

## Performance Optimization

Your PWA build is already optimized:
- ✅ Code splitting (72 JS files)
- ✅ Gzip compression (124 KB main bundle gzipped)
- ✅ Service Worker (offline support)
- ✅ Lazy loading (route-based)

**Additional optimizations:**
- Enable Vercel compression (automatic)
- Use Vercel Image Optimization for media (paid feature)
- Consider CDN for Supabase Storage (if media-heavy)

---

## Security

**Before going fully public:**

1. **Review RLS Policies**
   - Check `supabase/migrations/*` for RLS rules
   - Test with different user roles

2. **API Key Rotation**
   - Never commit API keys to Git
   - Use Vercel environment variables
   - Rotate keys if exposed

3. **Rate Limiting**
   - Supabase has built-in rate limits
   - Consider adding custom rate limiting for Edge Functions

---

## Cost Breakdown

**Free Tier Limits:**
- **Vercel:** 100 GB bandwidth/month, unlimited deployments
- **Supabase:** 500 MB database, 2 GB bandwidth, 2 GB storage
- **OpenAI:** $5 free credit (GPT-4o-mini is cheap: ~$0.15/1M input tokens)

**Expected Monthly Cost (Light Use):**
- Vercel: $0
- Supabase: $0 (stays within free tier)
- OpenAI: ~$1-2 (unless you get TONS of AI queries)

**Total: ~$2/month for a production app** 🎉

---

## Next Steps

After deployment:

1. ✅ Update `README.md` with production URL
2. ✅ Test all features on production
3. ✅ Practice demo using production URL
4. ✅ Share URL with instructor/classmates
5. ✅ Add to portfolio/resume

---

**Congratulations! Your app is live!** 🚀

For demo instructions, see `DEMO_SCRIPT.md`

