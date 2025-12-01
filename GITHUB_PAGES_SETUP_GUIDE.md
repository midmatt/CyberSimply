# GitHub Pages Setup Guide

## Fixed Issues in deploy.yml

✅ **Updated deployment workflow** to use the modern GitHub Pages deployment approach
✅ **Added proper permissions** for GitHub Actions to write to pages
✅ **Removed dependency on gh-pages branch** - now uses GitHub's built-in Pages deployment
✅ **Updated to latest action versions** for better security and performance

## Manual Setup Steps Required

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository: `https://github.com/midmatt/CyberSimply`
2. Click **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

### 2. Configure Workflow Permissions

1. In your repository, go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### 3. Verify Custom Domain (Optional)

If you want to use `cybersimply.com`:
1. In **Settings** → **Pages**
2. Under **Custom domain**, enter `cybersimply.com`
3. Check **Enforce HTTPS**
4. Click **Save**

### 4. DNS Configuration (if using custom domain)

Add these DNS records to your domain provider:
```
Type: CNAME
Name: www
Value: midmatt.github.io

Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

## What Changed in the Workflow

### Before (Problematic):
- Used `peaceiris/actions-gh-pages@v3` which required manual gh-pages branch creation
- No explicit permissions configuration
- Relied on GITHUB_TOKEN with limited permissions

### After (Fixed):
- Uses official GitHub Pages deployment actions
- Explicit permissions: `contents: read`, `pages: write`, `id-token: write`
- No manual branch creation needed
- Better concurrency control
- Updated to latest action versions

## Testing the Deployment

1. Push your changes to the `main` branch
2. Go to **Actions** tab in your repository
3. Watch the "Deploy to GitHub Pages" workflow run
4. Once complete, your site will be available at:
   - `https://midmatt.github.io/CyberSimply` (if no custom domain)
   - `https://cybersimply.com` (if custom domain is configured)

## Troubleshooting

### If deployment still fails:
1. Check the **Actions** tab for error details
2. Verify all secrets are properly set in **Settings** → **Secrets and variables** → **Actions**
3. Ensure the build output is in the `./dist` directory (check if `npx expo export --platform web` creates the right output)

### If custom domain doesn't work:
1. Wait 24-48 hours for DNS propagation
2. Check DNS records are correct
3. Ensure domain is properly configured in GitHub Pages settings

## Next Steps

After completing the manual setup:
1. Push any pending changes to trigger the deployment
2. Monitor the Actions tab for successful deployment
3. Test your live website
4. Set up monitoring for future deployments

The workflow is now properly configured and should work without the previous permission and branch creation issues.
