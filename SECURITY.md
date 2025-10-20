# Security Guidelines for MessageAI

## Environment Variables Security

### ✅ DO:
- Always use `.env.example` files as templates
- Add `.env*` to `.gitignore` (already configured)
- Use `VITE_` prefix for client-side environment variables
- Keep sensitive server-side variables in server environment only
- Regularly rotate API keys and secrets
- Use different environment files for different stages (`.env.local`, `.env.production`)

### ❌ DON'T:
- Never commit `.env` files to version control
- Never put server-side secrets in client-side environment variables
- Never hardcode API keys or secrets in source code
- Never share environment files via unsecured channels

## Environment File Structure

### Client-side (Quasar App)
- `.env` - Local development (gitignored)
- `.env.example` - Template for other developers
- `.env.production` - Production overrides (gitignored)

### Server-side (if applicable)
- `.env.server` - Server-only secrets (gitignored)
- `.env.server.example` - Server template

## Quick Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`

3. Never commit the `.env` file

## Security Checklist

- [ ] All `.env*` files are in `.gitignore`
- [ ] `.env.example` files exist and are committed
- [ ] No hardcoded secrets in source code
- [ ] API keys are properly scoped and rotated
- [ ] Different environments use different credentials
- [ ] Team members know not to commit sensitive files

## Emergency Response

If you accidentally commit sensitive data:

1. **Immediately** remove the file from git history:
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all
   ```

2. Force push to remove from remote:
   ```bash
   git push origin --force --all
   ```

3. Rotate all exposed credentials immediately

4. Consider the repository compromised and create a new one if necessary
