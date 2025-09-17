# Supabase Integration Setup Guide

This guide will help you set up Supabase for your CyberSafe News app.

## 🚀 Quick Setup

### 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://uaykrxfhzfkhjwnmvukb.supabase.co
2. Navigate to **Settings** → **API**
3. Copy your **anon public** key and **service_role** key

### 2. Update Environment Variables

Create a `.env` file in your project root with:

```bash
# Supabase Configuration
SUPABASE_URL=https://uaykrxfhzfkhjwnmvukb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjI1ODMsImV4cCI6MjA3MzA5ODU4M30.V4cd5JiLwAgjNUk-VTBicIp52PuH2FAp_UsZMRPlR40
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVheWtyeGZoemZraGp3bm12dWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUyMjU4MywiZXhwIjoyMDczMDk4NTgzfQ.b83X-KvDkcWyt1i_nXWvaIb2YNxwD3Gk_rKguWzJTyo

# Other existing variables...
```

### 3. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `backend/supabase-schema.sql`
4. Click **Run** to execute the schema

### 4. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Enable **Email** provider
3. Configure **Site URL**: `cybersafenews://` (for deep linking)
4. Set **Redirect URLs**: `cybersafenews://reset-password`

## 📊 Database Schema Overview

The schema includes the following main tables:

### Core Tables
- **user_profiles** - User account information
- **articles** - Cached news articles
- **categories** - Article categories
- **donors** - Buy Me a Coffee integration

### User Data
- **user_favorites** - User's favorite articles
- **reading_history** - Articles user has read
- **search_history** - User's search queries
- **user_preferences** - App settings and preferences
- **notification_preferences** - Notification settings

### Analytics
- **usage_analytics** - App usage tracking
- **article_metrics** - Article performance metrics
- **notification_tokens** - Push notification tokens

## 🔧 Services Available

### Authentication Service (`authService.ts`)
- User sign up/sign in
- Password reset
- Profile management
- Ad-free status checking

### Article Service (`supabaseArticleService.ts`)
- Store and retrieve articles
- Search functionality
- Article metrics tracking
- Category management

### User Service (`supabaseUserService.ts`)
- User preferences management
- Favorites and reading history
- Dashboard data
- Search history

### Analytics Service (`supabaseAnalyticsService.ts`)
- Event tracking
- Usage metrics
- User engagement analytics

## 🔐 Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Public read access for articles and categories
- Service role access for admin operations

### Authentication
- Secure user authentication
- Session management
- Password reset functionality
- Account deletion with data cleanup

## 📱 React Native Integration

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 2. Initialize Supabase Client
The client is already configured in `src/services/supabaseClient.ts`

### 3. Use Services in Components
```typescript
import { authService } from '../services/authService';
import { supabaseArticleService } from '../services/supabaseArticleService';

// Example: Sign in user
const result = await authService.signIn({ email, password });

// Example: Get articles
const articles = await supabaseArticleService.getArticles({ limit: 20 });
```

## 🚀 Backend Integration

### 1. Update Backend Environment
Update `backend/.env` with your Supabase credentials:

```bash
SUPABASE_URL=https://uaykrxfhzfkhjwnmvukb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Backend Features
- Buy Me a Coffee webhook integration
- Ad-free status checking
- Donor management
- Analytics data access

## 📊 Analytics Dashboard

### Available Metrics
- Total events and unique users
- Top performing articles
- User engagement metrics
- Search trends
- Category preferences

### Access Analytics
```typescript
import { supabaseAnalyticsService } from '../services/supabaseAnalyticsService';

// Get overall metrics
const metrics = await supabaseAnalyticsService.getAnalyticsMetrics();

// Get user-specific analytics
const userAnalytics = await supabaseAnalyticsService.getUserAnalytics(userId);
```

## 🔄 Data Synchronization

### Article Caching
- Articles are automatically cached in Supabase
- Offline access to previously loaded articles
- Real-time updates when new articles are available

### User Data Sync
- User preferences sync across devices
- Reading history and favorites are persistent
- Search history for better recommendations

## 🛠️ Development Tools

### Database Management
- Use Supabase dashboard for data inspection
- SQL editor for custom queries
- Real-time subscriptions for live data

### Testing
- Test authentication flows
- Verify data persistence
- Check analytics tracking

## 📈 Performance Optimization

### Indexes
- Optimized indexes for common queries
- Fast article lookups
- Efficient user data retrieval

### Caching
- Article content caching
- User preference caching
- Analytics data aggregation

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check API keys are correct
   - Verify email provider is enabled
   - Check redirect URLs configuration

2. **Database Errors**
   - Ensure schema is properly set up
   - Check RLS policies
   - Verify table permissions

3. **Analytics Not Tracking**
   - Check device info is set
   - Verify user authentication
   - Check network connectivity

### Debug Mode
Enable debug logging by setting:
```typescript
console.log('Supabase debug mode enabled');
```

## 🚀 Production Deployment

### Environment Variables
- Use production Supabase project
- Set secure API keys
- Configure production redirect URLs

### Database Backup
- Enable automatic backups in Supabase
- Regular data exports
- Test restore procedures

### Monitoring
- Set up Supabase monitoring
- Track API usage
- Monitor performance metrics

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Native Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Support

If you encounter any issues:
1. Check the Supabase dashboard for errors
2. Review the console logs
3. Verify your environment variables
4. Check the database schema is properly set up

---

**Note**: Remember to replace the placeholder API keys with your actual Supabase credentials before running the app!
