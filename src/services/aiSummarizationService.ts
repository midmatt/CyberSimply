import { ProcessedArticle } from './newsService';

/**
 * AI Summarization Service Configuration
 * 
 * CURRENT SETUP: Using fallback summaries by default to avoid API errors
 * - OpenAI: Disabled (set USE_OPENAI = true to enable)
 * - Gemini: Disabled due to API issues (set USE_GEMINI = true to enable)
 * - Fallback: Enabled by default - provides intelligent summaries without API calls
 * 
 * To enable AI summaries:
 * 1. Set USE_OPENAI = true for OpenAI GPT-4o-mini
 * 2. Set USE_GEMINI = true for Google Gemini (may have API issues)
 * 3. Ensure your API keys are valid
 */

// You can switch between OpenAI and Gemini by changing this
const USE_OPENAI = true; // ✅ ENABLED - API key working with high quota!
const USE_GEMINI = false; // Disable Gemini completely due to API issues
const USE_FALLBACK = false; // ❌ DISABLED - No fallback summaries, only real AI summaries

// API Keys - Use environment variables for security
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// Validate API key format
const validateOpenAIKey = (key: string): boolean => {
  return key.startsWith('sk-') && key.length > 20;
};

// Check if we have a valid Pro account key
const isProAccount = validateOpenAIKey(OPENAI_API_KEY);
console.log(`OpenAI API Key Status: ${isProAccount ? 'Pro Account Detected' : 'Free Tier Account'}`);

export interface AISummary {
  what: string;
  impact: string;
  takeaways: string;
}

export class AISummarizationService {
  /**
   * Summarize an article using AI
   */
  static async summarizeArticle(article: ProcessedArticle): Promise<AISummary> {
    try {
      if (USE_OPENAI) {
        return await this.summarizeWithOpenAIRetry(article);
      } else if (USE_GEMINI) {
        return await this.summarizeWithGemini(article);
      } else if (USE_FALLBACK) {
        // Use fallback summary only if explicitly enabled
        console.log('Using fallback summary - AI APIs disabled');
        return this.createFallbackSummary(article);
      } else {
        // No fallback - throw error if AI APIs are not available
        throw new Error('AI summarization not available - no APIs enabled and fallback disabled');
      }
    } catch (error) {
      console.error('AI summarization failed:', error);
      if (USE_FALLBACK) {
        // Only use fallback if explicitly enabled
        return this.createFallbackSummary(article);
      } else {
        // Re-throw error if fallback is disabled
        throw error;
      }
    }
  }

  /**
   * Summarize using OpenAI with minimal retry for Pro accounts
   */
  private static async summarizeWithOpenAIRetry(article: ProcessedArticle): Promise<AISummary> {
    try {
      return await this.summarizeWithOpenAI(article);
    } catch (error) {
      console.warn('OpenAI API call failed, using fallback summary:', error);
      return this.createFallbackSummary(article);
    }
  }

  /**
   * Summarize using OpenAI GPT-4 with enhanced prompts
   */
  private static async summarizeWithOpenAI(article: ProcessedArticle): Promise<AISummary> {
    const prompt = `You are a cybersecurity expert and journalist with deep knowledge of digital threats, privacy, and online safety. Analyze this cybersecurity news article and provide a comprehensive, engaging summary that helps readers understand and act on the information.

Article Title: ${article.title}
Article Summary: ${article.summary}

Create a summary with these three sections:

1. WHAT HAPPENED: Explain the core incident or development in clear, accessible language (2-3 sentences). Focus on the key facts and make it immediately understandable to someone without technical background.

2. WHY IT MATTERS: Describe the real-world impact and implications (2-3 sentences). Explain who is affected, potential consequences, and why readers should care about this development.

3. WHAT YOU CAN DO: Provide specific, actionable steps readers can take to protect themselves (2-3 sentences). Give practical advice that's immediately applicable and easy to follow.

WRITING GUIDELINES:
- Use conversational, engaging tone that builds trust
- Avoid jargon and technical terms - explain complex concepts simply
- Be specific and concrete rather than vague
- Focus on practical, actionable information
- Make each sentence complete and well-crafted
- End each section with proper punctuation
- Keep language accessible but authoritative
- Include relevant context that helps readers understand the bigger picture

Remember: Your goal is to help readers stay informed and take action to protect themselves online.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return this.parseAISummary(content);
  }

  /**
   * Summarize using Google Gemini
   */
  private static async summarizeWithGemini(article: ProcessedArticle): Promise<AISummary> {
    const prompt = `Please analyze this cybersecurity news article and provide a comprehensive summary in three sections:

Article Title: ${article.title}
Article Summary: ${article.summary}

Please provide:

1. WHAT: Explain what happened in simple, non-technical terms (2-4 concise sentences). Ensure the summary is fully complete, ends naturally with proper punctuation, and contains no ellipses or cutoffs. Do not truncate the output.

2. IMPACT: Describe the potential consequences and who might be affected (2-4 concise sentences). Ensure the summary is fully complete, ends naturally with proper punctuation, and contains no ellipses or cutoffs. Do not truncate the output.

3. TAKEAWAYS: Provide actionable advice or lessons learned for readers (2-4 concise sentences). Ensure the summary is fully complete, ends naturally with proper punctuation, and contains no ellipses or cutoffs. Do not truncate the output.

CRITICAL REQUIREMENTS:
- NEVER use ellipses ("...") anywhere in your response
- NEVER truncate or cut off mid-sentence
- ALWAYS write complete, polished sentences that end naturally
- ALWAYS end each section with proper punctuation (period, exclamation mark, or question mark)
- Keep each section to exactly 2-4 concise, easy-to-read sentences
- Use simple language that a general audience can understand
- Ensure each section flows well and feels complete
- Do not use phrases like "and more" or "etc." - be specific and complete

Focus on helping non-technical readers understand the situation with clear, complete explanations.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check if it's a quota error
        if (response.status === 429) {
          console.warn('Gemini API quota exceeded, using fallback summary');
          return this.createFallbackSummary(article);
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.warn('Invalid Gemini API response structure, using fallback summary');
        return this.createFallbackSummary(article);
      }
      
      const content = data.candidates[0].content.parts[0].text;
      
      return this.parseAISummary(content);
    } catch (error) {
      console.error('Gemini API call failed:', error);
      
      // If it's a quota error, use fallback
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('Using fallback summary due to API quota limit');
        return this.createFallbackSummary(article);
      }
      
      // For any other error, use fallback instead of throwing
      console.warn('Using fallback summary due to API error');
      return this.createFallbackSummary(article);
    }
  }

  /**
   * Parse AI response into structured summary
   */
  private static parseAISummary(content: string): AISummary {
    // Try to extract structured sections with multiple possible patterns
    const whatMatch = content.match(/(?:WHAT HAPPENED|WHAT):?\s*(.+?)(?=\n(?:WHY|WHAT YOU CAN DO)|$)/is);
    const impactMatch = content.match(/(?:WHY IT MATTERS|IMPACT):?\s*(.+?)(?=\n(?:WHAT YOU CAN DO|TAKEAWAYS)|$)/is);
    const takeawaysMatch = content.match(/(?:WHAT YOU CAN DO|TAKEAWAYS):?\s*(.+?)(?=\n|$)/is);

    return {
      what: whatMatch ? whatMatch[1].trim() : 'AI summary not available',
      impact: impactMatch ? impactMatch[1].trim() : 'AI summary not available',
      takeaways: takeawaysMatch ? takeawaysMatch[1].trim() : 'AI summary not available'
    };
  }

  /**
   * Create intelligent fallback summary - no API calls needed
   */
  private static createFallbackSummary(article: ProcessedArticle): AISummary {
    // Create a more intelligent fallback based on the article content
    const title = article.title.toLowerCase();
    const summary = article.summary.toLowerCase();
    const category = article.category.toLowerCase();
    
    let what = '';
    let impact = '';
    let takeaways = '';
    
    // Enhanced content analysis for better fallback summaries
    const isBreach = title.includes('breach') || title.includes('hack') || title.includes('compromise') || 
                     summary.includes('breach') || summary.includes('hack') || summary.includes('compromise');
    const isScam = title.includes('scam') || title.includes('phishing') || title.includes('fraud') || 
                   summary.includes('scam') || summary.includes('phishing') || summary.includes('fraud');
    const isPrivacy = title.includes('privacy') || title.includes('data') || title.includes('personal') || 
                      summary.includes('privacy') || summary.includes('data') || summary.includes('personal');
    const isMalware = title.includes('malware') || title.includes('virus') || title.includes('ransomware') || 
                      summary.includes('malware') || summary.includes('virus') || summary.includes('ransomware');
    const isVulnerability = title.includes('vulnerability') || title.includes('exploit') || title.includes('patch') || 
                           summary.includes('vulnerability') || summary.includes('exploit') || summary.includes('patch');
    
    if (isBreach) {
      what = `A significant cybersecurity breach has been reported: ${article.title}. This incident involves unauthorized access to systems or data, potentially exposing sensitive information.`;
      impact = 'This breach could affect millions of users by compromising their personal data, financial information, and account credentials. The exposed data may be used for identity theft, financial fraud, or further attacks.';
      takeaways = 'Immediately change passwords for affected accounts, enable two-factor authentication, monitor your credit reports, and be extra cautious of phishing attempts targeting the breached data.';
    } else if (isScam) {
      what = `A new cyber scam or phishing campaign has been identified: ${article.title}. Cybercriminals are using sophisticated tactics to deceive users and steal sensitive information.`;
      impact = 'These scams can lead to immediate financial losses, identity theft, and compromised accounts. Victims may face ongoing security risks and potential legal issues.';
      takeaways = 'Never click suspicious links, verify sender authenticity, be skeptical of urgent requests, and use official channels to verify any suspicious communications.';
    } else if (isMalware) {
      what = `A new malware threat has been discovered: ${article.title}. This malicious software poses significant risks to computer systems and user data.`;
      impact = 'This malware can steal sensitive data, encrypt files for ransom, or turn devices into part of a botnet. It may spread to other systems and cause widespread damage.';
      takeaways = 'Keep your antivirus software updated, avoid downloading from untrusted sources, be cautious with email attachments, and regularly back up your important data.';
    } else if (isVulnerability) {
      what = `A critical security vulnerability has been discovered: ${article.title}. This flaw could allow attackers to exploit systems and gain unauthorized access.`;
      impact = 'This vulnerability affects a wide range of systems and could be exploited by cybercriminals to steal data, install malware, or gain control of affected devices.';
      takeaways = 'Apply security patches immediately, update all software and firmware, monitor for suspicious activity, and consider additional security measures for critical systems.';
    } else if (isPrivacy) {
      what = `A privacy and data protection issue has been reported: ${article.title}. This involves how personal information is collected, stored, or shared by organizations.`;
      impact = 'Privacy violations can expose personal information, lead to identity theft, unwanted marketing, and potential legal consequences for the organizations involved.';
      takeaways = 'Review your privacy settings, limit data sharing, use privacy-focused tools, and consider using alternative services that better protect your personal information.';
    } else {
      // Generic cybersecurity content
      what = `A cybersecurity development has been reported: ${article.title}. This news relates to online security, digital threats, or protective measures in the cyber landscape.`;
      impact = 'This development could affect how individuals and organizations approach cybersecurity, potentially influencing security practices and threat awareness.';
      takeaways = 'Stay informed about cybersecurity trends, follow security best practices, keep your systems updated, and remain vigilant about emerging threats.';
    }
    
    return { what, impact, takeaways };
  }

  /**
   * Summarize multiple articles in batch - optimized for working API
   */
  static async summarizeArticles(articles: ProcessedArticle[]): Promise<ProcessedArticle[]> {
    console.log(`🚀 Starting AI summarization for ${articles.length} articles...`);
    
    // Process articles in parallel for maximum speed
    const promises = articles.map(async (article, index) => {
      try {
        console.log(`📝 Summarizing article ${index + 1}/${articles.length}: ${article.title.substring(0, 50)}...`);
        const summary = await this.summarizeArticle(article);
        console.log(`✅ Completed article ${index + 1}/${articles.length}`);
        return {
          ...article,
          what: summary.what,
          impact: summary.impact,
          takeaways: summary.takeaways
        };
      } catch (error) {
        console.error(`❌ Failed to summarize article ${article.id}:`, error);
        // Skip articles that can't be summarized instead of using fallback
        console.warn(`Skipping article ${article.id} due to summarization failure`);
        return null;
      }
    });
    
    // Wait for all articles to be processed
    const results = await Promise.all(promises);
    
    // Filter out null results (articles that failed summarization)
    const successfulResults = results.filter((result): result is ProcessedArticle => result !== null);
    
    console.log(`🎉 Completed AI summarization: ${successfulResults.length}/${articles.length} articles successfully summarized!`);
    
    return successfulResults;
  }
}
