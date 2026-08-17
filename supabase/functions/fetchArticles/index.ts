import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get NewsAPI key from environment
    const newsApiKey = Deno.env.get('NEWS_API_KEY')
    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY environment variable is required')
    }

    // Get OpenAI API key for article summarization
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    console.log('🚀 Starting article fetch and processing...')

    // Fetch articles from NewsAPI
    const articles = await fetchArticlesFromNewsAPI(newsApiKey)
    console.log(`📰 Fetched ${articles.length} articles from NewsAPI`)

    // Process and enrich articles with AI summaries
    const processedArticles = await processArticlesWithAI(articles, openaiApiKey)
    console.log(`🤖 Processed ${processedArticles.length} articles with AI`)

    // Store articles in Supabase
    const { data, error } = await supabaseClient
      .from('articles')
      .upsert(processedArticles, { 
        onConflict: 'source_url',
        ignoreDuplicates: false 
      })

    if (error) {
      throw new Error(`Failed to store articles: ${error.message}`)
    }

    console.log(`✅ Successfully stored ${processedArticles.length} articles`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed and stored ${processedArticles.length} articles`,
        count: processedArticles.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error in fetchArticles function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function fetchArticlesFromNewsAPI(apiKey: string): Promise<NewsApiArticle[]> {
  const searchQueries = [
    'cybersecurity OR "cyber security" OR "data breach" OR "security vulnerability"',
    'hacking OR "cyber attack" OR "malware" OR "ransomware" OR "phishing"',
    'technology security OR "privacy protection" OR "online safety"'
  ]

  const allArticles: NewsApiArticle[] = []

  for (const query of searchQueries) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&pageSize=10&sortBy=publishedAt&language=en`
      
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Failed to fetch articles for query: ${query}`)
        continue
      }

      const data: NewsApiResponse = await response.json()
      if (data.status === 'ok' && data.articles) {
        allArticles.push(...data.articles)
      }
    } catch (error) {
      console.warn(`Error fetching articles for query ${query}:`, error)
    }
  }

  // Remove duplicates based on URL
  const uniqueArticles = allArticles.filter((article, index, self) => 
    index === self.findIndex(a => a.url === article.url)
  )

  return uniqueArticles.slice(0, 20) // Limit to 20 articles
}

async function processArticlesWithAI(articles: NewsApiArticle[], openaiApiKey: string) {
  const processedArticles = []

  for (const article of articles) {
    try {
      // Generate AI summary using OpenAI
      const summary = await generateAISummary(article, openaiApiKey)
      
      // Determine category
      const category = determineCategory(article.title, article.description)
      
      // Create processed article
      const processedArticle = {
        id: `newsapi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        summary: article.description || '',
        source_url: article.url,
        source: article.source.name,
        author: article.author,
        published_at: article.publishedAt,
        image_url: article.urlToImage,
        category: category,
        what: summary.what || '',
        impact: summary.impact || '',
        takeaways: summary.takeaways || '',
        why_this_matters: summary.whyThisMatters || '',
        ai_summary_generated: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      processedArticles.push(processedArticle)
    } catch (error) {
      console.warn(`Failed to process article: ${article.title}`, error)
      
      // Add article without AI summary
      processedArticles.push({
        id: `newsapi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        summary: article.description || '',
        source_url: article.url,
        source: article.source.name,
        author: article.author,
        published_at: article.publishedAt,
        image_url: article.urlToImage,
        category: determineCategory(article.title, article.description),
        what: '',
        impact: '',
        takeaways: '',
        why_this_matters: '',
        ai_summary_generated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  }

  return processedArticles
}

async function generateAISummary(article: NewsApiArticle, openaiApiKey: string) {
  try {
    const prompt = `Please analyze this cybersecurity news article and provide a structured summary:

Title: ${article.title}
Description: ${article.description}
Source: ${article.source.name}

Please provide:
1. What: What happened? (2-3 sentences)
2. Impact: What is the impact? (2-3 sentences)
3. Takeaways: Key takeaways for readers (2-3 bullet points)
4. Why This Matters: Why should people care? (2-3 sentences)

Format as JSON with keys: what, impact, takeaways, whyThisMatters`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert who provides clear, concise summaries of security news for general audiences.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Try to parse JSON response
    try {
      return JSON.parse(content)
    } catch {
      // If not JSON, return structured text
      return {
        what: content.split('\n')[0] || '',
        impact: content.split('\n')[1] || '',
        takeaways: content.split('\n')[2] || '',
        whyThisMatters: content.split('\n')[3] || ''
      }
    }
  } catch (error) {
    console.warn('Failed to generate AI summary:', error)
    return {
      what: '',
      impact: '',
      takeaways: '',
      whyThisMatters: ''
    }
  }
}

function determineCategory(title: string, description: string): 'cybersecurity' | 'hacking' | 'general' {
  const text = `${title} ${description}`.toLowerCase()
  
  if (text.includes('hack') || text.includes('attack') || text.includes('malware') || text.includes('ransomware')) {
    return 'hacking'
  }
  
  if (text.includes('cybersecurity') || text.includes('cyber security') || text.includes('data breach') || text.includes('vulnerability')) {
    return 'cybersecurity'
  }
  
  return 'general'
}
