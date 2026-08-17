# CS Logo for Dark Mode

## Instructions for Adding the CS Logo

To use the CS logo (orange "C" and light gray "S" on black background) for dark mode in the News tab:

### 1. Save the Image
Save your CS logo image as:
```
/Users/matthewvella/code/CyberSafeNews/assets/icons/cs-logo-dark.png
```

### 2. Image Requirements
- **Format**: PNG (recommended)
- **Size**: 64x64 pixels or higher (will be scaled automatically)
- **Background**: Black (to match dark mode)
- **Content**: Orange "C" and light gray "S" intertwined

### 3. Update the Code
Once you've saved the image, update the NewsTabIcon component:

In `/Users/matthewvella/code/CyberSafeNews/src/components/NewsTabIcon.tsx`:

Change this line:
```typescript
const darkIcon: ImageSourcePropType = require('../../assets/icons/Expo App Icon & Splash v2 (Community) (Community)/ios-dark.png');
```

To this:
```typescript
const darkIcon: ImageSourcePropType = require('../../assets/icons/cs-logo-dark.png');
```

### 4. How It Works
- **Light Mode**: Uses the iOS light logo
- **Dark Mode**: Uses your CS logo
- **Fallback**: If image fails to load, shows newspaper icon

### 5. Testing
After adding the image and updating the code:
1. Switch to dark mode
2. Navigate to the News tab
3. You should see your CS logo in the tab bar

## Current Status
✅ Code is ready for CS logo integration
✅ Fallback system in place
⏳ Waiting for CS logo image file
