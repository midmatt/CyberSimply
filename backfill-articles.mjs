// backfill-articles.js
// Script to enrich articles with missing category, impact, or takeaways fields using OpenAI

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * Enrich an article with AI-generated category, impact, and takeaways
 */
async function enrichArticle(article) {
  try {
    const prompt = `
Analyze this article and return JSON with the following fields:
- category: Choose ONE from: "cybersecurity", "hacking", "general" (based on the article topic)
- what: What happened in 1-2 sentences
- impact: Real-world impact in 1-2 sentences
- takeaways: Key takeaways as a single string (2-3 bullet points)
- why_this_matters: Why this matters in 1-2 sentences

Title: ${article.title}
Summary: ${article.summary || 'No summary available'}
Source: ${article.source || 'Unknown'}

Return ONLY valid JSON in this exact format:
{
  "category": "cybersecurity",
  "what": "What happened: ...",
  "impact": "Impact: ...",
  "takeaways": "Key takeaways: ...",
  "why_this_matters": "Why this matters: ..."
}
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      category: parsed.category || 'general',
      what: parsed.what || 'What happened: Details not available',
      impact: parsed.impact || 'Impact: Unable to determine impact',
      takeaways: parsed.takeaways || 'Key takeaways: Stay informed about developments',
      why_this_matters: parsed.why_this_matters || 'Why this matters: Understanding this topic helps protect your digital safety'
    };

  } catch (err) {
    console.error('❌ Failed to parse AI response:', err.message);
    return {
      category: 'general',
      what: 'What happened: Details not available',
      impact: 'Impact: Unable to determine impact',
      takeaways: 'Key takeaways: Stay informed about developments',
      why_this_matters: 'Why this matters: Understanding this topic helps protect your digital safety'
    };
  }
}

/**
 * Main backfill function
 */
async function backfill() {
  try {
    console.log('🚀 Starting article backfill process...');
    console.log('='.repeat(60));

    // Query all articles with missing fields
    const { data: rows, error } = await supabase
      .from('articles')
      .select('*')
      .or('category.is.null,what.is.null,impact.is.null,takeaways.is.null,why_this_matters.is.null');

    if (error) {
      console.error('❌ Failed to fetch articles:', error);
      return;
    }

    console.log(`📊 Found ${rows.length} articles with missing fields`);
    console.log('='.repeat(60));

    if (rows.length === 0) {
      console.log('✅ No articles need enrichment - all complete!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each article
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      console.log(`\n[${i + 1}/${rows.length}] Processing: ${row.title?.substring(0, 60)}...`);
      
      try {
        // Enrich the article with AI
        const enriched = await enrichArticle(row);

        // Prepare update data - only update fields that are missing
        const updateData = {
          id: row.id,
          category: row.category || enriched.category,
          what: row.what || enriched.what,
          impact: row.impact || enriched.impact,
          takeaways: row.takeaways || enriched.takeaways,
          why_this_matters: row.why_this_matters || enriched.why_this_matters,
          ai_summary_generated: true,
          updated_at: new Date().toISOString()
        };

        console.log(`   📝 Enriched with: category=${updateData.category}`);

        // Update in Supabase
        const { error: upsertError } = await supabase
          .from('articles')
          .update(updateData)
          .eq('id', row.id);

        if (upsertError) {
          console.error(`   ❌ Failed to update: ${upsertError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Updated successfully`);
          successCount++;
        }

      } catch (err) {
        console.error(`   ❌ Error processing article:`, err.message);
        errorCount++;
      }

      // Rate limiting to avoid API spam
      if (i < rows.length - 1) {
        await new Promise(r => setTimeout(r, 1500)); // 1.5 second delay
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 BACKFILL COMPLETED!');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${successCount} articles`);
    console.log(`❌ Errors: ${errorCount} articles`);
    console.log(`📊 Total processed: ${successCount + errorCount} articles`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('💥 Backfill script crashed:', err);
    process.exit(1);
  }
}

// Run the backfill
backfill();
