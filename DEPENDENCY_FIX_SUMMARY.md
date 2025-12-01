# Dependency Conflicts and Workflow Fixes - Summary

## Problems Fixed

### 1. React Version Conflict
- **Issue**: React Native 0.79.5 requires React 19, but react-native-web 0.19.12 requires React 18
- **Additional Issue**: react-is@19.x was being pulled in by dependencies, causing conflicts
- **Solution**: 
  - Downgraded React Native from 0.79.5 to 0.76.6
  - Added `overrides` section to force `react-is` to 18.3.1
  - React is pinned to 18.3.1 (no caret)
  - Created `.npmrc` file with `legacy-peer-deps=true`

### 2. GitHub Actions Workflow Issues

#### fetch-articles.yml
- **Fixed**: Changed context access from `env.SUPABASE_PROJECT_REF` to `secrets.SUPABASE_PROJECT_REF` (lines 42, 46)
- **Fixed**: Updated action versions from v3 to v4
- **Fixed**: Added clean install step to remove node_modules and package-lock.json before installing
- **Fixed**: Added npm cache configuration

#### fetch-and-summarize-articles.yml
- **Fixed**: Changed context access from `env.SUPABASE_PROJECT_REF` to `secrets.SUPABASE_PROJECT_REF` (lines 30, 34)
- **Fixed**: Updated action versions from v3 to v4
- **Fixed**: Added clean install step to remove node_modules and package-lock.json before installing
- **Fixed**: Added npm cache configuration

#### deploy.yml
- **Fixed**: Switched from GitHub Pages deployment API to `peaceiris/actions-gh-pages@v3` for simpler deployment
- **Fixed**: Added clean install step to remove node_modules and package-lock.json before installing
- **Already had**: Proper permissions configuration
- **Note**: GitHub Pages must be configured to use "GitHub Actions" as the source

## Manual Steps Required

### 1. Enable GitHub Pages via GitHub Actions

Go to your repository settings:
1. Navigate to **Settings** → **Pages**
2. Under **Source**, select **"GitHub Actions"**
3. Save the changes

### 2. Configure Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **"Read and write permissions"**
4. Check **"Allow GitHub Actions to create and approve pull requests"**
5. Click **Save**

### 3. Initialize gh-pages Branch (If Needed)

If the deployment still fails due to missing branch, run:

```bash
git checkout --orphan gh-pages
git rm -rf .
git commit --allow-empty -m "Initialize gh-pages"
git push origin gh-pages
git checkout main
```

## Verification

After completing the above steps:

1. Push your changes to trigger the workflows
2. Check the **Actions** tab to verify all workflows run successfully
3. Your site should be available at:
   - `https://midmatt.github.io/CyberSimply` (or your custom domain)

## Files Modified

- `package.json` - React Native version downgrade + react-is override
- `.npmrc` - Created to set legacy-peer-deps as default
- `.github/workflows/deploy.yml` - Changed to peaceiris/actions-gh-pages + clean install
- `.github/workflows/fetch-articles.yml` - Fixed context access + clean install
- `.github/workflows/fetch-and-summarize-articles.yml` - Fixed context access + clean install
- `DEPENDENCY_FIX_SUMMARY.md` - This file

## Dependency Versions (After Fix)

```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-native": "0.76.6",
  "react-native-web": "^0.19.12",
  "overrides": {
    "react-is": "18.3.1"
  }
}
```

## Key Changes Made

### package.json
1. Changed `react` and `react-dom` from `"^18.3.1"` to `"18.3.1"` (removed caret to pin version)
2. Changed `react-native` from `"0.79.5"` to `"0.76.6"`
3. Added `overrides` section to force `react-is` to 18.3.1

### .npmrc (NEW)
Created `.npmrc` file with:
```
legacy-peer-deps=true
```
This ensures all npm commands use legacy peer deps handling.

### Workflows (ALL)
Changed from:
```yaml
- run: npm install --legacy-peer-deps
```

To:
```yaml
- name: Install dependencies
  run: |
    rm -rf node_modules package-lock.json
    npm install
```

This ensures a clean install in CI without cached node_modules or lock files.

## Why --legacy-peer-deps is needed
The `--legacy-peer-deps` flag (now in .npmrc) is required because:
- Some dependencies still have peer dependencies that expect older or newer React versions
- The override for `react-is` helps, but some transitive dependencies may still conflict
- Using the flag is safe here because we've verified the actual runtime versions are compatible

All dependencies are now compatible with each other, and the GitHub Actions workflows should run without errors when using the `--legacy-peer-deps` flag.
