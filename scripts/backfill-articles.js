// Backfill script to process existing articles with NULL summaries and sections
// Run this with: npm run backfill:articles

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Use environment variables for credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  if (!openaiApiKey) console.error('  - OPENAI_API_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey
});

console.log('🤖 OpenAI client initialized for AI processing');
console.log('🔗 Supabase client initialized for backfill processing');

// AI Processing Methods (copied from fetch-more-articles.js)

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

/**
 * Simplify text using OpenAI ChatGPT API
 */
async function simplifyWithAI(text) {
  if (!text || text.trim().length === 0) return "";

  try {
    console.log(`🤖 Simplifying text with AI: ${text.substring(0, 100)}...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that rewrites and summarizes cybersecurity articles for a general audience.
- Remove technical jargon and replace it with plain, everyday language.
- Keep all important facts, names, dates, and numbers accurate.
- Never cut off mid-word or mid-sentence.
- Always end with a logical, complete thought.
- Summaries must be coherent and self-contained.
- Keep summaries concise (3–5 sentences), but ensure they cover the main points.`
        },
        {
          role: "user",
          content: `Rewrite and summarize this article in plain English: ${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const summary = response.choices[0]?.message?.content?.trim();
    console.log(`✅ AI simplification complete: ${summary ? summary.substring(0, 100) + '...' : 'No summary generated'}`);
    return summary || text; // fallback to original if AI fails
  } catch (error) {
    console.error("❌ AI simplification failed:", error);
    return text; // fallback to original
  }
}

/**
 * Generate article sections using AI
 */
async function generateArticleSections(title, summary) {
  try {
    console.log(`🤖 Generating sections for: "${title}"`);
    
    const content = `${title}. ${summary}`.trim();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a cybersecurity expert who creates clear, simple explanations. For each article, provide exactly 4 sections in this format:

What happened: [Brief explanation of the event]
Impact: [How this affects people/security]
Key takeaways: [Main points to remember]
Why this matters: [Why people should care about this]

Keep each section concise (1-2 sentences) and easy to understand.`
        },
        {
          role: "user",
          content: `Create sections for this cybersecurity article: ${content}`
        }
      ],
      temperature: 0.5,
      max_tokens: 400
    });

    const aiContent = response.choices[0]?.message?.content?.trim();
    if (!aiContent) {
      console.log(`❌ AI returned empty content for sections`);
      return getFallbackSections(title);
    }

    console.log(`🤖 AI generated sections: ${aiContent.substring(0, 200)}...`);

    // Parse the AI response
    const whatMatch = aiContent.match(/What happened:\s*(.+?)(?=\n|$)/i);
    const impactMatch = aiContent.match(/Impact:\s*(.+?)(?=\n|$)/i);
    const takeawaysMatch = aiContent.match(/Key takeaways:\s*(.+?)(?=\n|$)/i);
    const whyMatch = aiContent.match(/Why this matters:\s*(.+?)(?=\n|$)/i);

    const sections = {
      what: whatMatch ? whatMatch[1].trim() : `What happened: ${title}`,
      impact: impactMatch ? impactMatch[1].trim() : `Impact: This event affects cybersecurity awareness and best practices.`,
      takeaways: takeawaysMatch ? takeawaysMatch[1].trim() : `Key takeaways: Stay informed, follow best practices, and monitor new threats.`,
      whyThisMatters: whyMatch ? whyMatch[1].trim() : `Why this matters: Understanding these events helps protect your digital safety.`
    };

    console.log(`✅ AI sections generated successfully`);
    return sections;
  } catch (error) {
    console.error("❌ AI section generation failed:", error);
    return getFallbackSections(title);
  }
}

/**
 * Get fallback sections when AI fails
 */
function getFallbackSections(title) {
  return {
    what: `What happened: ${title}`,
    impact: `Impact: This event affects cybersecurity awareness and best practices.`,
    takeaways: `Key takeaways: Stay informed, follow best practices, and monitor new threats.`,
    whyThisMatters: `Why this matters: Understanding these events helps protect your digital safety.`
  };
}

/**
 * Process a single article with AI
 */
async function processArticleWithAI(article) {
  try {
    console.log(`🔄 Processing article: "${article.title}"`);
    
    // Use content if available, otherwise use existing summary
    const sourceContent = article.content || article.summary || '';
    const cleanDescription = cleanText(sourceContent);
    
    // Generate AI summary
    let aiSummary = '';
    if (cleanDescription && cleanDescription.length > 20) {
      aiSummary = await simplifyWithAI(cleanDescription);
    } else {
      aiSummary = `This article discusses ${article.title.toLowerCase()}. Stay informed about the latest developments in cybersecurity and technology.`;
    }
    
    // Generate article sections
    const sections = await generateArticleSections(article.title, aiSummary);
    
    // Create processed article object
    const processedArticle = {
      id: article.id,
      summary: aiSummary,
      what: sections.what,
      impact: sections.impact,
      takeaways: sections.takeaways,
      why_this_matters: sections.whyThisMatters,
      ai_summary_generated: true
    };
    
    console.log(`✅ Article processed successfully: "${processedArticle.title || article.title}"`);
    console.log(`   - Summary length: ${processedArticle.summary.length} chars`);
    console.log(`   - Has valid sections: ${!!processedArticle.what && !!processedArticle.impact}`);
    
    return processedArticle;
  } catch (error) {
    console.error(`❌ Failed to process article "${article.title}":`, error);
    
    // Return fallback article with basic content
    return {
      id: article.id,
      summary: `This article discusses ${article.title.toLowerCase()}. Stay informed about the latest developments in cybersecurity and technology.`,
      what: `What happened: ${article.title}`,
      impact: `Impact: This event affects cybersecurity awareness and best practices.`,
      takeaways: `Key takeaways: Stay informed, follow best practices, and monitor new threats.`,
      why_this_matters: `Why this matters: Understanding these events helps protect your digital safety.`,
      ai_summary_generated: false
    };
  }
}

/**
 * Query articles with NULL summaries or sections
 */
async function getIncompleteArticles(limit = 50) {
  try {
    console.log(`🔍 Querying for articles with NULL summaries or sections (limit: ${limit})...`);
    
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, content, summary, what, impact, takeaways, why_this_matters')
      .or('summary.is.null,what.is.null,impact.is.null,takeaways.is.null,why_this_matters.is.null')
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    console.log(`📰 Found ${data.length} articles with incomplete data`);
    return data;
  } catch (error) {
    console.error('❌ Error querying incomplete articles:', error);
    return [];
  }
}

/**
 * Update article in Supabase
 */
async function updateArticle(articleId, updates) {
  try {
    const { data, error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', articleId);
    
    if (error) {
      throw error;
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Error updating article ${articleId}:`, error);
    return { success: false, error };
  }
}

/**
 * Main backfill function
 */
async function backfillArticles() {
  try {
    console.log('🚀 Starting article backfill process...');
    
    let totalProcessed = 0;
    let batchNumber = 1;
    
    while (true) {
      console.log(`\n📦 Processing batch ${batchNumber}...`);
      
      // Get incomplete articles
      const incompleteArticles = await getIncompleteArticles(50);
      
      if (incompleteArticles.length === 0) {
        console.log('✅ No more incomplete articles found. Backfill complete!');
        break;
      }
      
      console.log(`🔄 Processing ${incompleteArticles.length} articles in batch ${batchNumber}...`);
      
      // Process each article
      for (let i = 0; i < incompleteArticles.length; i++) {
        const article = incompleteArticles[i];
        
        try {
          // Process with AI
          const processedData = await processArticleWithAI(article);
          
          // Update in Supabase
          const updateResult = await updateArticle(article.id, {
            summary: processedData.summary,
            what: processedData.what,
            impact: processedData.impact,
            takeaways: processedData.takeaways,
            why_this_matters: processedData.why_this_matters,
            ai_summary_generated: processedData.ai_summary_generated
          });
          
          if (updateResult.success) {
            console.log(`✅ Updated article ${article.id}: "${article.title}"`);
            totalProcessed++;
          } else {
            console.error(`❌ Failed to update article ${article.id}: "${article.title}"`);
          }
          
          // Small delay between AI requests to avoid rate limiting
          if (i < incompleteArticles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`❌ Error processing article ${article.id}:`, error);
        }
      }
      
      console.log(`✅ Completed batch ${batchNumber} - processed ${incompleteArticles.length} articles`);
      batchNumber++;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 Backfill complete! Total articles processed: ${totalProcessed}`);
    
  } catch (error) {
    console.error('❌ Backfill process failed:', error);
    process.exit(1);
  }
}

// Run the backfill process
backfillArticles();
