// Enhanced script to fetch articles from multiple categories with AI processing
// Run this with: node fetch-more-articles.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const OpenAI = require('openai');

// Use environment variables for credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const newsApiKey = process.env.NEWS_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseKey || !supabaseServiceKey || !newsApiKey || !openaiApiKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL');
  if (!supabaseKey) console.error('  - SUPABASE_ANON_KEY');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  if (!newsApiKey) console.error('  - NEWS_API_KEY');
  if (!openaiApiKey) console.error('  - OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey
});

console.log('🤖 OpenAI client initialized for AI processing');

// Different search queries for different categories
const searchQueries = {
  cybersecurity: 'cybersecurity OR "cyber security" OR "data breach" OR "security vulnerability"',
  hacking: 'hacking OR "cyber attack" OR "malware" OR "ransomware" OR "phishing"',
  general: 'technology security OR "privacy protection" OR "online safety"'
};

// AI Processing Methods (adapted from unifiedNewsService.ts)

/**
 * Clean HTML/text content
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\]\]>/g, '') // Remove XML CDATA end markers
    .replace(/<!\[CDATA\[/g, '') // Remove XML CDATA start markers
    .replace(/\]\]&gt;/g, '') // Remove escaped CDATA end markers
    .replace(/&lt;!\[CDATA\[/g, '') // Remove escaped CDATA start markers
    .trim();
}

// Old AI helper functions removed - now using generateAiDetails with strict JSON schema

/**
 * Generate AI details with the specified prompt format
 */
async function generateAiDetails(articleContent) {
  if (!openai) return null;

  console.log("📝 Using response_format: json_object");
  
  let aiResponse;
  try {
    aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an assistant that summarizes news articles into structured JSON. You MUST return a valid JSON object with exactly these 5 fields: summary, what, impact, takeaways, why_this_matters. Each field must be a unique, non-empty string based ONLY on the provided article content. NEVER use generic placeholder text."
        },
        {
          role: "user",
          content: `Analyze this cybersecurity article and return a JSON object with exactly these 5 fields:

{
  "summary": "Concise overall summary (2-3 sentences)",
  "what": "What happened: [1-2 sentences describing the specific event]",
  "impact": "Impact: [1-2 sentences about effects on people/companies]",
  "takeaways": "Key takeaways: [1 sentence with main lessons]",
  "why_this_matters": "Why this matters: [1-2 sentences explaining importance]"
}

CRITICAL REQUIREMENTS:
- All fields must be unique and specific to this article
- NO generic text like "Details not available", "Unable to determine", "Stay informed", etc.
- Base content ONLY on the provided article
- If you cannot determine specific information, return null for that field instead of generic text

Article content:
"""${articleContent}"""

Return ONLY the JSON object, no other text.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });
  } catch (err) {
    console.error(`❌ AI generation failed: ${err.message}`);
    return null; // Skip this article but continue processing others
  }

  const content = aiResponse.choices?.[0]?.message?.content ?? "";
    if (!content) {
      console.warn("AI returned empty content");
      return null;
    }
    
    // Clean the content to ensure it's valid JSON
    let cleanContent = content.trim();
    
    // Remove any markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON:", parseError.message);
      console.warn("Raw completion.choices[0].message:", aiResponse.choices?.[0]?.message);
      console.warn("Raw content:", content);
      return null;
    }
    
    // Validate all required fields exist and are non-empty strings
    const requiredFields = ['summary', 'what', 'impact', 'takeaways', 'why_this_matters'];
    const missingFields = [];
    const emptyFields = [];
    const genericFields = [];
    
    // List of generic placeholder patterns to reject
    const genericPatterns = [
      'details not available',
      'unable to determine',
      'stay informed',
      'understanding cybersecurity',
      'this may affect',
      'various stakeholders',
      'key lessons',
      'important to understand',
      'cybersecurity landscape',
      'potential implications',
      'further investigation',
      'monitor the situation',
      'remain vigilant',
      'best practices',
      'security measures'
    ];
    
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        missingFields.push(field);
      } else if (!parsed[field] || typeof parsed[field] !== 'string' || parsed[field].trim() === '') {
        emptyFields.push(field);
      } else {
        // Check for generic placeholder text
        const fieldValue = parsed[field].toLowerCase();
        const isGeneric = genericPatterns.some(pattern => fieldValue.includes(pattern));
        
        // Also check for very short or repetitive content
        const isTooShort = fieldValue.length < 20;
        const isRepetitive = fieldValue.split(' ').length < 5;
        
        if (isGeneric || isTooShort || isRepetitive) {
          genericFields.push(field);
          console.warn(`Field "${field}" contains generic or insufficient content: "${parsed[field]}"`);
        }
      }
    }
    
    if (missingFields.length > 0 || emptyFields.length > 0 || genericFields.length > 0) {
      console.warn("AI response validation failed:", {
        missingFields,
        emptyFields,
        genericFields,
        response: parsed
      });
      return null;
    }
    
    // Ensure takeaways is a string (not array)
    if (Array.isArray(parsed.takeaways)) {
      parsed.takeaways = parsed.takeaways.join(" • ");
    }
    
    // Trim all fields to remove extra whitespace
    for (const field of requiredFields) {
      parsed[field] = parsed[field].trim();
    }
    
    console.log("✅ AI response validated successfully with all 5 required fields");
    console.log("✅ AI summary generated:", JSON.stringify(parsed, null, 2));
    return parsed;
}

/**
 * Process a single article with AI
 */
async function processArticleWithAI(article) {
  try {
    console.log(`🔄 Processing article: "${article.title}"`);
    
    // Use article.content or article.description as the content source
    let articleContent = article.content || article.description || '';
    
    // Clean the content
    articleContent = cleanText(articleContent);
    
    // If content is too short, try to fetch full article text
    if (!articleContent || articleContent.length < 600) {
      try {
        console.log(`🔍 Content too short (${articleContent.length} chars), fetching full article: ${article.url}`);
        const hostless = article.url.replace(/^https?:\/\//i, '');
        const jinaUrl = `https://r.jina.ai/http://${hostless}`;
        const res = await fetch(jinaUrl, { method: 'GET' });
        if (res.ok) {
          const fullText = await res.text();
          const readableText = fullText.replace(/\s+/g, ' ').trim();
          if (readableText && readableText.length > articleContent.length) {
            articleContent = readableText;
            console.log(`✅ Fetched full article text: ${articleContent.length} chars`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch full article text: ${error.message}`);
      }
    }
    
    // If still no content, skip this article
    if (!articleContent || articleContent.trim().length < 100) {
      console.warn(`⚠️ Skipping article "${article.title}" - insufficient content (${articleContent.length} chars)`);
      return null;
    }
    
    // Trim to ~6000 chars to keep token usage sane
    const promptContent = articleContent.slice(0, 6000);
    
    // Generate AI details using the specified prompt
    const ai = await generateAiDetails(promptContent);
    
    // If AI generation failed, skip this article
    if (!ai) {
      console.error(`❌ Skipping article "${article.title}" - AI generation failed`);
      return null;
    }
    
    // Create processed article object with AI-generated content only
    const processedArticle = {
      id: article.id,
      title: cleanText(article.title),
      source_url: article.url,
      source: article.source.name,
      author: article.author || null,
      published_at: article.publishedAt,
      image_url: article.urlToImage,
      category: article.category,
      summary: ai.summary,
      what: ai.what,
      impact: ai.impact,
      takeaways: ai.takeaways,
      why_this_matters: ai.why_this_matters,
      ai_summary_generated: true
    };
    
    console.log(`✅ Article processed successfully: "${processedArticle.title}"`);
    console.log(`   - Summary: ${processedArticle.summary.length} chars`);
    console.log(`   - What: ${processedArticle.what.length} chars`);
    console.log(`   - Impact: ${processedArticle.impact.length} chars`);
    console.log(`   - Takeaways: ${processedArticle.takeaways.length} chars`);
    console.log(`   - Why this matters: ${processedArticle.why_this_matters.length} chars`);
    
    return processedArticle;
  } catch (error) {
    console.error(`❌ Failed to process article "${article.title}":`, error);
    return null; // Skip this article if processing fails
  }
}

async function fetchArticlesForCategory(category, query) {
  try {
    console.log(`🔄 Fetching ${category} articles from NewsAPI...`);
    
    const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${newsApiKey}&pageSize=5&sortBy=publishedAt&language=en`);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.status} - ${data.message || 'Unknown error'}`);
    }
    
    console.log(`✅ Fetched ${data.articles.length} ${category} articles from NewsAPI`);
    
    // Log raw data from NewsAPI
    console.log(`📰 Raw ${category} articles from NewsAPI:`, JSON.stringify(data.articles, null, 2));
    
    // Convert to our format and process with AI
    console.log(`🔄 Processing ${data.articles.length} ${category} articles with AI...`);
    
    const processedArticles = [];
    for (let i = 0; i < data.articles.length; i++) {
      const article = data.articles[i];
      
      // Create basic article object
      const basicArticle = {
        id: crypto.randomUUID(),
        title: article.title,
        description: article.description || '',
        url: article.url,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage,
        category: category
      };
      
      // Process with AI
      const processedArticle = await processArticleWithAI(basicArticle);
      if (processedArticle) {
        processedArticles.push(processedArticle);
      }
      
      // Small delay between AI requests to avoid rate limiting
      if (i < data.articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Processed ${processedArticles.length} ${category} articles with AI`);
    return processedArticles;
  } catch (error) {
    console.error(`❌ Error fetching ${category} articles:`, error.message);
    return [];
  }
}

async function fetchAndStoreAllArticles() {
  try {
    console.log('🚀 Starting comprehensive article fetch...');
    
    let allArticles = [];
    
    let totalFetched = 0;
    let totalSkipped = 0;
    
    // Fetch articles for each category
    for (const [category, query] of Object.entries(searchQueries)) {
      const articles = await fetchArticlesForCategory(category, query);
      const validArticles = articles.filter(article => article !== null);
      const skippedCount = articles.length - validArticles.length;
      
      allArticles = allArticles.concat(validArticles);
      totalFetched += articles.length;
      totalSkipped += skippedCount;
      
      console.log(`📊 ${category}: ${validArticles.length} processed, ${skippedCount} skipped`);
      
      // Small delay between requests to be respectful to NewsAPI
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`📈 Total articles: ${totalFetched} fetched, ${totalSkipped} skipped, ${allArticles.length} processed`);
    
    if (allArticles.length === 0) {
      throw new Error('No articles successfully processed from any category - all articles failed AI generation');
    }
    
    console.log(`💾 Storing ${allArticles.length} total processed articles in Supabase...`);
    
    // Log summary of processed articles with detailed field validation
    console.log("📰 Processed articles summary:");
    allArticles.forEach((article, index) => {
      const hasAllFields = !!(article.summary && article.what && article.impact && article.takeaways && article.why_this_matters);
      console.log(`  ${index + 1}. "${article.title}"`);
      console.log(`     - All 5 fields generated: ${hasAllFields ? '✅ YES' : '❌ NO'}`);
      console.log(`     - Summary: ${article.summary ? article.summary.substring(0, 100) + '...' : 'MISSING'}`);
      console.log(`     - What: ${article.what ? 'Generated' : 'MISSING'}`);
      console.log(`     - Impact: ${article.impact ? 'Generated' : 'MISSING'}`);
      console.log(`     - Takeaways: ${article.takeaways ? 'Generated' : 'MISSING'}`);
      console.log(`     - Why this matters: ${article.why_this_matters ? 'Generated' : 'MISSING'}`);
    });
    
    // Validate that all articles have complete AI-generated content
    const incompleteArticles = allArticles.filter(article => 
      !article.summary || !article.what || !article.impact || !article.takeaways || !article.why_this_matters
    );
    
    if (incompleteArticles.length > 0) {
      console.warn(`⚠️ Warning: ${incompleteArticles.length} articles have incomplete AI-generated content`);
      incompleteArticles.forEach(article => {
        console.warn(`   - "${article.title}" missing fields`);
      });
    }
    
    // Store all articles in Supabase with all required structured JSON fields
    console.log("🔍 Validating articles before Supabase insertion...");
    
    // Final validation before insertion
    const validForInsertion = allArticles.filter(article => {
      const hasAllFields = !!(article.summary && article.what && article.impact && article.takeaways && article.why_this_matters);
      if (!hasAllFields) {
        console.error(`❌ Skipping article "${article.title}" - missing required AI fields`);
      }
      return hasAllFields;
    });
    
    if (validForInsertion.length === 0) {
      console.error('❌ No articles with complete AI-generated content to store');
      console.log('📊 Summary: All articles failed AI generation or validation');
      return 0; // Return 0 to indicate no articles were processed
    }
    
    if (validForInsertion.length < allArticles.length) {
      console.warn(`⚠️ Filtered out ${allArticles.length - validForInsertion.length} articles with incomplete AI content`);
    }
    
    console.log(`💾 Inserting ${validForInsertion.length} articles with complete structured JSON data...`);
    
    const { data: storedArticles, error } = await supabaseAdmin
      .from('articles')
      .upsert(validForInsertion, { onConflict: 'id' });
    
    if (error) {
      console.error("❌ Failed to insert articles into Supabase:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    } else {
      console.log("✅ Successfully inserted articles into Supabase with structured JSON fields:", storedArticles?.length || validForInsertion.length);
      
      // Log sample of inserted data structure
      if (validForInsertion.length > 0) {
        const sample = validForInsertion[0];
        console.log("📋 Sample inserted article structure with all 5 AI fields:");
        console.log(`   - Title: ${sample.title}`);
        console.log(`   - Summary: ${sample.summary?.substring(0, 50)}...`);
        console.log(`   - What: ${sample.what?.substring(0, 50)}...`);
        console.log(`   - Impact: ${sample.impact?.substring(0, 50)}...`);
        console.log(`   - Takeaways: ${sample.takeaways?.substring(0, 50)}...`);
        console.log(`   - Why this matters: ${sample.why_this_matters?.substring(0, 50)}...`);
        console.log(`   - AI Summary Generated: ${sample.ai_summary_generated}`);
        
        // Verify all 5 fields are present and non-null
        const hasAllFields = !!(sample.summary && sample.what && sample.impact && sample.takeaways && sample.why_this_matters);
        console.log(`   - All 5 AI fields present: ${hasAllFields ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    console.log(`✅ Successfully stored ${allArticles.length} articles in Supabase`);
    
    // Show breakdown by category
    const categoryCounts = {};
    allArticles.forEach(article => {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    });
    
    console.log('\n📊 Articles by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} articles`);
    });
    
    console.log('\n✅ Workflow completed successfully!');
    console.log(`📈 Final results: ${validForInsertion.length} articles successfully processed and stored`);
    
    return validForInsertion.length; // Return the number of successfully processed articles
    
  } catch (error) {
    console.error('❌ Fatal error in article processing:', error);
    console.log('📊 Summary: Workflow failed due to unexpected error');
    return 0; // Return 0 to indicate failure
  }
}

// Retry mechanism wrapper
async function runWithRetry() {
  let retries = 0;
  console.log('🔄 Starting article processing with retry mechanism...');
  
  let successCount = await fetchAndStoreAllArticles();
  
  if (successCount === 0 && retries < 1) {
    console.warn("⚠️ No articles processed on first attempt, retrying once...");
    retries++;
    console.log(`🔄 Retry attempt ${retries}/1`);
    successCount = await fetchAndStoreAllArticles();
  }
  
  if (successCount === 0) {
    console.error("❌ Fatal: No articles processed after retry");
    console.log('📊 Summary: All attempts failed - exiting with error code');
    process.exit(1);
  } else {
    console.log(`✅ Finished with ${successCount} articles processed.`);
    console.log(`📊 Summary: Successfully processed ${successCount} articles after ${retries + 1} attempt(s)`);
  }
}

// Run the function with retry mechanism
runWithRetry();
