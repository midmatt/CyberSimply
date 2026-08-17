# CyberSimply Demo Setup

This document provides step-by-step instructions for setting up and running the CyberSimply cybersecurity news app.

## Quick Start (Demo Mode)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the app**
   ```bash
   npm start
   ```

3. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## Demo Features

The app will run with sample data including:

- **Sample Articles**: 3 pre-loaded cybersecurity articles
- **Categories**: All 4 categories with sample content
- **Favorites**: Heart icon functionality (saves locally)
- **Settings**: Toggle switches for accessibility features
- **Navigation**: Full tab navigation between screens

## Sample Content

The demo includes these sample articles:

1. **Scam Alert: Fake Delivery Texts**
   - Category: Scams to Avoid
   - Content about delivery notification scams

2. **How To Spot Phishing Emails**
   - Category: Security Basics
   - Tips for identifying phishing attempts

3. **Beware of Fake Tech Support Calls**
   - Category: Scams to Avoid
   - Information about tech support scams

## What Works in Demo Mode

✅ **Full UI/UX**: All screens and components
✅ **Navigation**: Tab navigation and article detail views
✅ **Favorites**: Save/unsave articles (stored in memory)
✅ **Categories**: Filter articles by category
✅ **Settings**: Toggle accessibility options
✅ **Animations**: Smooth transitions and interactions

## What Requires API Keys

❌ **Real News**: Live cybersecurity news articles
❌ **AI Summaries**: OpenAI-powered content summarization
❌ **Web Search**: Serper.dev integration for finding articles
❌ **Push Notifications**: Daily digest notifications

## Testing the App

### 1. Home Screen
- View sample articles
- Pull to refresh (shows loading state)
- Tap articles to view details
- Use heart icons to favorite articles

### 2. Categories
- Browse all 4 categories
- Tap categories to see descriptions
- Navigate back to home

### 3. Favorites
- View favorited articles
- Empty state when no favorites
- Remove favorites by tapping heart again

### 4. Settings
- Toggle large text mode
- Toggle high contrast mode
- Toggle notifications
- View app information

### 5. Article Detail
- Full article view with image
- "What You Need to Know" section
- Share button (shows alert in demo)
- Source link (shows alert in demo)

## Adding Real API Keys

To enable full functionality:

1. **Copy environment file**
   ```bash
   cp env.example .env
   ```

2. **Add your API keys**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SERPER_API_KEY=your_serper_api_key_here
   NEWS_API_KEY=your_newsapi_key_here
   ```

3. **Restart the app**
   ```bash
   npm start
   ```

## Troubleshooting Demo Mode

### App won't start
```bash
npm start --clear
```

### No sample articles showing
- Check the console for errors
- Ensure all components are properly imported
- Verify the AppContext is working

### Navigation issues
- Check that React Navigation is properly installed
- Verify tab navigator configuration
- Ensure all screen components exist

### Styling issues
- Verify constants are properly imported
- Check that all style properties are valid
- Ensure Expo Vector Icons are working

## Next Steps

Once you're comfortable with the demo:

1. **Get API keys** from the required services
2. **Configure environment variables**
3. **Test real news fetching**
4. **Customize the design** to your preferences
5. **Add new features** or modify existing ones

## Support

If you encounter issues:
- Check the console for error messages
- Verify all dependencies are installed
- Ensure you're using the correct Node.js version
- Check the main README.md for detailed setup instructions

## 🚨 **Issue 1: No Articles Found**
The app is showing "No articles found" which means the ChatGPT API integration isn't working. This suggests:
- The API key changes weren't applied correctly
- The `generateCybersecurityNews` method wasn't added
- The AppContext isn't calling the new method

## 🚨 **Issue 2: Header Still Blocked by Camera Bump**
The black bar is still covering the app title at the top, so the header positioning fix wasn't applied either.

## 🔧 **Let's Fix This Step by Step**

### **Step 1: Navigate to the Project Directory**
First, you need to get into the right folder. From your terminal:

```bash
cd CyberSimply
```

If that doesn't work, try the full path:
```bash
cd /Users/matthewvella/code/CyberSimply
```

### **Step 2: Verify You're in the Right Place**
```bash
pwd
ls
```

You should see files like `package.json`, `App.tsx`, and the `src/` folder.

### **Step 3: Make the Required Changes**

Since the manual changes didn't work, let me give you the exact files to edit:

#### **File 1: Update API Key**
Open `src/services/api.ts` and find line 10. Replace:
```typescript
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
```

With:
```typescript
const OPENAI_API_KEY = 'process.env.OPENAI_API_KEY-nGGqL5GbrmpUmnoKN0FYkEM_IOCvdycK3gbJUx24LveIrPxbiXkovyG1wvT3epSbrdMESxzdMDT3BlbkFJKxD52EwCUYxeWNTrpRePTHDrywyY3qEDvkpqxPS_fHNmXmzvXH6m_yfgzw70jwJcol9w6zG9AA';
```

#### **File 2: Add ChatGPT News Generation Method**
In the same file (`src/services/api.ts`), add this method at the end of the `NewsService` class (before the closing `}`):

```typescript
static async generateCybersecurityNews(): Promise<any[]> {
  try {
    const promptText = `Generate 5 recent cybersecurity news headlines with brief summaries. Focus on topics like:
- Scams and phishing attempts
- Data breaches and privacy issues
- Security tips for everyday users
- New threats and vulnerabilities
- Protective measures and best practices

Make the content relevant and recent (within the last few months). Use clear, non-technical language.

Please respond in this exact JSON format:
{
  "articles": [
    {
      "title": "Headline here",
      "summary": "Brief summary in plain English",
      "category": "Scams to Avoid",
      "whyItMatters": [
        "First bullet point about why this matters",
        "Second bullet point",
        "Third bullet point"
      ]
    }
  ]
}`;

    const response = await fetch(API_ENDPOINTS.openai, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${OPENAI_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: promptText,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(\`OpenAI API error: \${response.status}\`);
    }

    const data: any = await response.json();
    const responseContent = data.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No content received from OpenAI');
    }

    const parsed = JSON.parse(responseContent);
    return parsed.articles || [];
  } catch (error) {
    console.error('Error generating cybersecurity news:', error);
    return [];
  }
}
```

#### **File 3: Fix Header Positioning**
Open `src/screens/HomeScreen.tsx` and find the `styles` section. Update the `header` style:

```typescript
header: {
  paddingTop: SPACING.xxl, // Change from SPACING.md to SPACING.xxl
},
```

And add margin to the title:
```typescript
title: {
  ...TYPOGRAPHY.h1,
  color: COLORS.text,
  textAlign: 'center',
  marginBottom: SPACING.lg,
  marginTop: SPACING.lg, // Add this line
  paddingHorizontal: SPACING.md,
},
```

#### **File 4: Update AppContext**
Open `src/context/AppContext.tsx` and find the `fetchNews` function. Replace the entire function with this:

```typescript
const fetchNews = async () => {
  dispatch({ type: 'SET_LOADING', payload: true });
  dispatch({ type: 'SET_ERROR', payload: null });

  try {
    // Try to fetch from News API first
    let articles = await NewsService.fetchNewsFromAPI();
    
    // If no articles, try web search
    if (articles.length === 0) {
      const webResults = await NewsService.searchWebForNews();
      articles = webResults.map((result, index) => ({
        source: { id: null, name: 'Web Search' },
        author: null,
        title: result.title,
        description: result.snippet,
        url: result.link,
        urlToImage: null,
        publishedAt: new Date().toISOString(),
        content: result.snippet,
      }));
    }

    // If still no articles, generate them using ChatGPT
    if (articles.length === 0) {
      try {
        const generatedArticles = await NewsService.generateCybersecurityNews();
        if (generatedArticles.length > 0) {
          const processedArticles: Article[] = generatedArticles.map((article, index) => ({
            id: \`generated-\${Date.now()}-\${index}\`,
            title: article.title,
            summary: article.summary,
            content: article.summary + '\\n\\n' + article.whyItMatters.join('\\n• '),
            imageUrl: \`https://via.placeholder.com/400x200?text=\${encodeURIComponent(article.title)}\`,
            sourceUrl: '#',
            source: 'AI Generated',
            publishedAt: new Date().toISOString(),
            category: article.category,
            whyItMatters: article.whyItMatters,
            isFavorite: false,
          }));
          
          dispatch({ type: 'SET_ARTICLES', payload: processedArticles });
          return;
        }
      } catch (error) {
        console.error('Error generating articles with ChatGPT:', error);
      }
    }

    // Process and summarize articles
    const processedArticles: Article[] = [];
    
    for (const article of articles.slice(0, 10)) {
      try {
        const content = await NewsService.fetchArticleContent(article.url);
        const summary = await NewsService.summarizeArticle(article, content);
        
        const processedArticle: Article = {
          id: \`article-\${Date.now()}-\${Math.random()}\`,
          title: article.title,
          summary: summary.summary,
          content: content,
          imageUrl: article.urlToImage || 'https://via.placeholder.com/400x200?text=Cybersecurity+News',
          sourceUrl: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          category: summary.category,
          whyItMatters: summary.whyItMatters,
          isFavorite: false,
        };
        
        processedArticles.push(processedArticle);
      } catch (error) {
        console.error('Error processing article:', error);
      }
    }

    dispatch({ type: 'SET_ARTICLES', payload: processedArticles });
  } catch (error) {
    dispatch({ 
      type: 'SET_ERROR', 
      payload: 'Failed to fetch news. Please try again later.' 
    });
    
    // Fallback to sample articles
    const sampleArticles: Article[] = [
      // ... existing sample articles
    ];
    
    dispatch({ type: 'SET_ARTICLES', payload: sampleArticles });
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};
```

### **Step 4: Restart the App**
After making all these changes:

```bash
npm start
```

##  **What Should Happen After the Fix**

1. **Articles will appear** instead of "No articles found"
2. **Header won't be blocked** by the camera bump
3. **Real AI-generated content** will load from ChatGPT
4. **Pull to refresh** will generate new articles

##  **If You Still Can't Access the Folder**

Try opening Finder and navigating to `/Users/matthewvella/code/CyberSimply`, then right-click and select "New Terminal at Folder" to open Terminal directly in the right location.

Make these changes and your app should work perfectly! 🚀
