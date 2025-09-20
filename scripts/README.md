# Scripts

This directory contains utility scripts for the CyberSimply app.

## Available Scripts

### fetch-more-articles.js
Fetches new articles from NewsAPI and processes them with AI before storing in Supabase.

**Usage:**
```bash
node scripts/fetch-more-articles.js
```

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEWS_API_KEY`
- `OPENAI_API_KEY`

### backfill-articles.js
Processes existing articles in Supabase that have NULL summaries or sections, filling them with AI-generated content.

**Usage:**
```bash
npm run backfill:articles
# or
node scripts/backfill-articles.js
```

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

**What it does:**
1. Queries articles where `summary`, `what`, `impact`, `takeaways`, or `why_this_matters` is NULL
2. Processes each article with AI to generate missing content
3. Updates the articles in Supabase with the generated content
4. Processes articles in batches of 50 to avoid rate limiting
5. Continues until all incomplete articles are processed

**Features:**
- Batch processing (50 articles at a time)
- Rate limiting (1-second delays between AI requests)
- Fallback content if AI processing fails
- Detailed progress logging
- Error handling and recovery

### fetch-articles.js
Simple Supabase client for fetching article summaries (used by the app).

**Usage:**
```bash
node scripts/fetch-articles.js
```

## Setup

1. Create a `.env` file in the project root with the required environment variables
2. Install dependencies: `npm install`
3. Run the desired script

## Notes

- All scripts use ES6 modules (import/export syntax)
- The backfill script will process articles indefinitely until no more incomplete articles are found
- AI processing includes rate limiting to avoid hitting OpenAI API limits
- All scripts include comprehensive error handling and logging
