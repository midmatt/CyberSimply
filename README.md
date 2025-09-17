# CyberSimply

A mobile app for cybersecurity news targeted toward regular people who are not very tech-savvy. Built with React Native and Expo, featuring AI-powered article summarization and a clean, Apple News-inspired design.

## Features

### 🏠 **Home Feed**
- Curated cybersecurity news articles with large headlines and preview text
- Featured articles with prominent images
- Pull-to-refresh functionality
- Smooth scrolling and animations

### 🤖 **AI-Powered Content**
- Automatic article fetching from multiple cybersecurity news sources
- OpenAI GPT-4o-mini integration for plain-English summaries
- "What You Need to Know" bullet points for each article
- Automatic categorization of articles

### 📱 **User Experience**
- Clean, minimal design following Apple News principles
- Large, easy-to-read typography
- Generous padding and whitespace
- Smooth transitions and animations

### 🗂️ **Categories**
- **Scams to Avoid**: Learn about common scams and how to avoid them
- **Privacy Tips**: Tips to protect your personal information online
- **Major Breaches**: Important security breaches and their impact
- **Security Basics**: Fundamental cybersecurity practices for everyone

### ⭐ **Favorites**
- Save articles to read later
- Heart icon for easy favoriting
- Dedicated favorites tab

### 📚 **Article Archive**
- Recent articles (within the last week) appear on Home and News tabs
- Articles older than a week are automatically moved to the Archive tab
- Smart date filtering with graceful fallback for invalid dates
- Search functionality within archived articles

### 💰 **Monetization & Support**
- **Google AdMob Integration**: Banner, interstitial, and rewarded ads
- **Buy Me a Coffee**: Easy donation system for supporters
- **Ad-Free Options**: Premium subscription for ad-free experience

### ⚙️ **Settings & Accessibility**
- Large text mode for better readability
- High contrast mode for better visibility
- Notification preferences
- Daily digest scheduling

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Context + useReducer
- **AI Integration**: OpenAI GPT-4o-mini API
- **News Sources**: NewsAPI.org, Serper.dev Web Search
- **Monetization**: Google AdMob, Buy Me a Coffee
- **Icons**: Expo Vector Icons (Ionicons)
- **Styling**: React Native StyleSheet

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CyberSimply
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SERPER_API_KEY=your_serper_api_key_here
   NEWS_API_KEY=your_newsapi_key_here
   ```

4. **Start the development server**
   ```bash
   npm start                    # Start with LAN (recommended)
   npm run start:tunnel        # Start with tunnel (for remote access)
   npm run start:lan           # Start with LAN only
   npm run start:reset         # Reset and start fresh
   ```

5. **Run on device/simulator**
   - **For Development Build**: Use the Expo Dev Client app
     - Install the development build on your device
     - Run `npm start` and use "Fetch development servers" in the dev client
     - **Never use `http://localhost:8081`** - always use the LAN IP or tunnel URL
   - **For Expo Go**: Scan QR code with Expo Go app (limited functionality)

## Development Client Configuration

This project uses Expo Dev Client for enhanced development capabilities. The configuration ensures proper network connectivity and prevents localhost connection issues.

### Dev Client Scripts
- `npm start` - Start with LAN connection (recommended for local development)
- `npm run start:tunnel` - Start with tunnel (for remote access or when LAN doesn't work)
- `npm run start:lan` - Start with LAN only (no tunnel fallback)
- `npm run start:reset` - Clear Expo cache and start fresh

### Important Notes
- **On device, never use `http://localhost:8081`** - this will not work
- Always use "Fetch development servers" in the dev client after running `npm start`
- Remove any "Recently opened" entries that use localhost URLs
- The app is configured to use LAN IP addresses by default (see `.expo/settings.json`)

### Troubleshooting Dev Client
- If you see "No development servers found", run `npm start` and wait for the server to start
- If LAN doesn't work, try `npm run start:tunnel`
- If you're still having issues, run `npm run start:reset` to clear the cache

## API Keys Required

### OpenAI API
- Get your API key from [OpenAI Platform](https://platform.openai.com/)
- Used for article summarization and plain-English conversion

### Serper.dev API
- Get your API key from [Serper.dev](https://serper.dev/)
- Used for web search to find cybersecurity news

### NewsAPI.org
- Get your API key from [NewsAPI.org](https://newsapi.org/)
- Used as primary news source

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── NewsCard.tsx    # Article preview card
│   ├── CategoryList.tsx # Category filter component
│   └── ArticleDetail.tsx # Full article view
├── screens/            # Main app screens
│   ├── HomeScreen.tsx  # Main news feed
│   ├── CategoriesScreen.tsx # Category overview
│   ├── FavoritesScreen.tsx # Saved articles
│   └── SettingsScreen.tsx # App settings
├── context/            # React Context for state management
│   └── AppContext.tsx  # Main app context
├── services/           # API and external services
│   └── api.ts         # News fetching and AI services
├── types/              # TypeScript type definitions
│   └── index.ts       # App interfaces and types
├── constants/          # App constants and configuration
│   └── index.ts       # Colors, typography, spacing
└── navigation/         # Navigation configuration
    └── AppNavigator.tsx # Main navigation structure
```

## Key Components

### NewsCard
- Displays article previews with images, titles, and summaries
- Supports both regular and large (featured) layouts
- Heart icon for favoriting articles

### CategoryList
- Horizontal scrollable list of categories
- Visual category icons with color coding
- Active state highlighting

### ArticleDetail
- Full article view with featured image
- AI-generated summary and bullet points
- Share functionality and source links

### AppContext
- Centralized state management
- Article fetching and processing
- Favorites management
- Settings persistence

## Customization

### Colors
Edit `src/constants/index.ts` to customize the app's color scheme:
```typescript
export const COLORS = {
  primary: '#ff7613',      // Main accent color
  background: '#ffffff',    // App background
  text: '#000000',         // Primary text
  // ... more colors
};
```

### Typography
Modify typography scales in the constants file:
```typescript
export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  // ... more styles
};
```

### Categories
Add or modify categories in the constants file:
```typescript
export const CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'New Category',
    icon: 'shield',
    color: '#FF6B6B',
    description: 'Category description'
  },
  // ... existing categories
];
```

## Development

### Adding New Features
1. Create new components in `src/components/`
2. Add new screens in `src/screens/`
3. Update types in `src/types/index.ts`
4. Add new services in `src/services/`
5. Update navigation in `src/navigation/AppNavigator.tsx`

### Styling Guidelines
- Use the predefined constants for colors, typography, and spacing
- Follow the established component patterns
- Maintain consistent shadows and border radius
- Use the accent color (#ff7613) sparingly for highlights

### State Management
- Use the AppContext for global state
- Keep component state local when possible
- Follow the established reducer pattern for complex state updates

## Building for Production

1. **Build the app**
   ```bash
   expo build:android  # For Android
   expo build:ios      # For iOS
   ```

2. **Eject from Expo (if needed)**
   ```bash
   expo eject
   ```

## Troubleshooting

### Common Issues

**Metro bundler issues**
```bash
npm start -- --clear
```

**iOS Simulator not working**
- Make sure Xcode is properly installed
- Check that iOS Simulator is available
- Try resetting the simulator

**Android Emulator issues**
- Ensure Android Studio is properly configured
- Check that an AVD (Android Virtual Device) is created
- Verify ANDROID_HOME environment variable is set

**API key errors**
- Verify all API keys are correctly set in `.env`
- Check API key permissions and quotas
- Ensure the `.env` file is in the project root

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the Expo documentation

## Future Enhancements

- Push notifications for breaking news
- Offline article caching
- Dark mode support
- Article sharing via social media
- User accounts and preferences sync
- Advanced filtering and search
- Podcast integration
- Video content support
