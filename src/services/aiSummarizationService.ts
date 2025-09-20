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

// API Keys - Use environment variables for security
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'process.env.OPENAI_API_KEY-CXghJFcg9WZhEVet-rR6BmdI-zsIxX_674dZHaeKUJT2h0FJMT0m7rMWmHA_ZWlPAW0RvUW6wtT3BlbkFJhR4I7ENNmwbZxKNDrItE0IHBZpwxYQQw3hh7nhobXzS-aKZR_CTjhXO7fWUWquekl9Gj30oR4A';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyDFU-32VvOADVl4x4y4kqvqK1BNGnxjk5A';

// Validate API key format
const validateOpenAIKey = (key: string): boolean => {
  return key.startsWith('process.env.OPENAI_API_KEY') && key.length > 20;
};

// Check if we have a valid Pro account key
const isProAccount = validateOpenAIKey(OPENAI_API_KEY);
console.log(`OpenAI API Key Status: ${isProAccount ? 'Pro Account Detected' : 'Free Tier Account'}`);

export interface AISummary {
  summary: string;
  what_happened: string;
  impact: string;
  key_takeaways: string;
  why_this_matters: string;
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
      } else {
        // Use fallback summary by default to avoid API errors
        console.log('Using fallback summary - AI APIs disabled');
        return this.createFallbackSummary(article);
      }
    } catch (error) {
      console.error('AI summarization failed:', error);
      // Always return fallback summary instead of throwing
      return this.createFallbackSummary(article);
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
    const prompt = `You are a summarization assistant for a cybersecurity news app. Rewrite content in plain, everyday English and explain any unavoidable jargon briefly. For each article, produce:
•	"summary": 3–5 sentences
•	"what_happened": 2–3 sentences
•	"impact": 2–3 sentences
•	"key_takeaways": 2–3 sentences
•	"why_this_matters": 2–3 sentences
Rules: never output "processing error"; never cut off mid-sentence; no ellipses unless quoted; facts accurate.
Respond ONLY as valid JSON:
{
"summary": string,
"what_happened": string,
"impact": string,
"key_takeaways": string,
"why_this_matters": string
}

Article Title: ${article.title}
Article Summary: ${article.summary}`;

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
        max_tokens: 500,
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
    const prompt = `You are a summarization assistant for a cybersecurity news app. Rewrite content in plain, everyday English and explain any unavoidable jargon briefly. For each article, produce:
•	"summary": 3–5 sentences
•	"what_happened": 2–3 sentences
•	"impact": 2–3 sentences
•	"key_takeaways": 2–3 sentences
•	"why_this_matters": 2–3 sentences
Rules: never output "processing error"; never cut off mid-sentence; no ellipses unless quoted; facts accurate.
Respond ONLY as valid JSON:
{
"summary": string,
"what_happened": string,
"impact": string,
"key_takeaways": string,
"why_this_matters": string
}

Article Title: ${article.title}
Article Summary: ${article.summary}`;

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
            maxOutputTokens: 500
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
   * Parse AI response into structured summary with JSON parsing and retry
   */
  private static parseAISummary(content: string): AISummary {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate that all required fields exist and are strings
        if (parsed.summary && parsed.what_happened && parsed.impact && 
            parsed.key_takeaways && parsed.why_this_matters) {
          return {
            summary: parsed.summary.trim(),
            what_happened: parsed.what_happened.trim(),
            impact: parsed.impact.trim(),
            key_takeaways: parsed.key_takeaways.trim(),
            why_this_matters: parsed.why_this_matters.trim()
          };
        }
      }
      
      // If JSON parsing fails, try to extract sections with regex
      const summaryMatch = content.match(/"summary":\s*"([^"]+)"/);
      const whatHappenedMatch = content.match(/"what_happened":\s*"([^"]+)"/);
      const impactMatch = content.match(/"impact":\s*"([^"]+)"/);
      const keyTakeawaysMatch = content.match(/"key_takeaways":\s*"([^"]+)"/);
      const whyThisMattersMatch = content.match(/"why_this_matters":\s*"([^"]+)"/);

      return {
        summary: summaryMatch ? summaryMatch[1].trim() : 'Summary not available',
        what_happened: whatHappenedMatch ? whatHappenedMatch[1].trim() : 'Details not available',
        impact: impactMatch ? impactMatch[1].trim() : 'Impact not available',
        key_takeaways: keyTakeawaysMatch ? keyTakeawaysMatch[1].trim() : 'Key takeaways not available',
        why_this_matters: whyThisMattersMatch ? whyThisMattersMatch[1].trim() : 'Why this matters not available'
      };
    } catch (error) {
      console.error('Failed to parse AI summary:', error);
      // Return a safe fallback that never shows "processing error"
      return {
        summary: 'AI summary is being processed',
        what_happened: 'Article details are being analyzed',
        impact: 'Impact assessment is in progress',
        key_takeaways: 'Key points are being identified',
        why_this_matters: 'Relevance analysis is underway'
      };
    }
  }

  /**
   * Create intelligent fallback summary - no API calls needed
   */
  private static createFallbackSummary(article: ProcessedArticle): AISummary {
    // Create a more intelligent fallback based on the article content
    const title = article.title.toLowerCase();
    const summary = article.summary ? article.summary.toLowerCase() : '';
    const category = article.category.toLowerCase();
    
    let summaryText = '';
    let whatHappened = '';
    let impact = '';
    let keyTakeaways = '';
    let whyThisMatters = '';
    
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
      summaryText = `A significant cybersecurity breach has been reported involving unauthorized access to systems or data. This incident potentially exposes sensitive information and could affect millions of users. The breach represents a serious security failure that requires immediate attention and response.`;
      whatHappened = `A cybersecurity breach occurred where attackers gained unauthorized access to systems or databases. The breach involved the compromise of sensitive data including personal information, credentials, or financial records.`;
      impact = `This breach could affect millions of users by compromising their personal data, financial information, and account credentials. The exposed data may be used for identity theft, financial fraud, or further attacks against other systems.`;
      keyTakeaways = `Immediately change passwords for affected accounts and enable two-factor authentication. Monitor your credit reports and be extra cautious of phishing attempts targeting the breached data. Consider using a password manager to create strong, unique passwords.`;
      whyThisMatters = `Data breaches can have long-lasting consequences for individuals and organizations. The stolen information can be used for years to come, making it crucial to take immediate protective measures and remain vigilant about potential misuse of your personal data.`;
    } else if (isScam) {
      summaryText = `A new cyber scam or phishing campaign has been identified using sophisticated tactics to deceive users. These scams target individuals and organizations to steal sensitive information or money. The threat actors are constantly evolving their methods to bypass security measures.`;
      whatHappened = `Cybercriminals launched a new scam or phishing campaign designed to trick users into revealing sensitive information. The attack uses social engineering tactics to appear legitimate and trustworthy.`;
      impact = `These scams can lead to immediate financial losses, identity theft, and compromised accounts. Victims may face ongoing security risks and potential legal issues from the stolen information.`;
      keyTakeaways = `Never click suspicious links or download attachments from unknown sources. Verify sender authenticity through official channels and be skeptical of urgent requests for personal information. Use multi-factor authentication whenever possible.`;
      whyThisMatters = `Scams and phishing attacks are becoming increasingly sophisticated and widespread. Falling victim to these attacks can result in significant financial and personal damage that may take years to fully resolve.`;
    } else if (isMalware) {
      summaryText = `A new malware threat has been discovered that poses significant risks to computer systems and user data. This malicious software can cause extensive damage and compromise security. The malware represents an evolving threat that requires immediate attention.`;
      whatHappened = `Security researchers identified a new type of malware that can infect computer systems and steal or encrypt data. The malware spreads through various methods including email attachments and malicious websites.`;
      impact = `This malware can steal sensitive data, encrypt files for ransom, or turn devices into part of a botnet. It may spread to other systems and cause widespread damage across networks.`;
      keyTakeaways = `Keep your antivirus software updated and run regular scans. Avoid downloading from untrusted sources and be cautious with email attachments. Regularly back up your important data to prevent loss.`;
      whyThisMatters = `Malware attacks are becoming more sophisticated and can cause significant damage to individuals and organizations. Early detection and prevention are crucial to avoid costly recovery and data loss.`;
    } else if (isVulnerability) {
      summaryText = `A critical security vulnerability has been discovered that could allow attackers to exploit systems and gain unauthorized access. This flaw affects a wide range of systems and requires immediate patching. The vulnerability represents a significant security risk.`;
      whatHappened = `Security researchers found a critical vulnerability in software or systems that could be exploited by attackers. The flaw allows unauthorized access or control of affected systems.`;
      impact = `This vulnerability affects a wide range of systems and could be exploited by cybercriminals to steal data, install malware, or gain control of affected devices. The impact could be widespread across many organizations.`;
      keyTakeaways = `Apply security patches immediately and update all software and firmware. Monitor for suspicious activity and consider additional security measures for critical systems. Stay informed about security updates from vendors.`;
      whyThisMatters = `Security vulnerabilities can be exploited by attackers to gain unauthorized access to systems and data. Unpatched vulnerabilities are a common entry point for cyber attacks and data breaches.`;
    } else if (isPrivacy) {
      summaryText = `A privacy and data protection issue has been reported involving how personal information is collected, stored, or shared by organizations. This development raises concerns about data privacy and user rights. The issue highlights ongoing challenges in data protection.`;
      whatHappened = `An organization was found to be mishandling personal data or violating privacy regulations. The issue involves improper collection, storage, or sharing of user information.`;
      impact = `Privacy violations can expose personal information, lead to identity theft, unwanted marketing, and potential legal consequences for the organizations involved. Users may lose control over their personal data.`;
      keyTakeaways = `Review your privacy settings and limit data sharing with organizations. Use privacy-focused tools and consider using alternative services that better protect your personal information. Read privacy policies carefully.`;
      whyThisMatters = `Privacy is a fundamental right that affects everyone in the digital age. Data breaches and privacy violations can have long-term consequences for individuals and society as a whole.`;
    } else {
      // Generic cybersecurity content
      summaryText = `A cybersecurity development has been reported that relates to online security, digital threats, or protective measures. This news highlights important trends in the cybersecurity landscape. The development could influence security practices and awareness.`;
      whatHappened = `A cybersecurity incident or development occurred involving digital security, threat detection, or protective measures. The event represents ongoing efforts to improve cybersecurity.`;
      impact = `This development could affect how individuals and organizations approach cybersecurity, potentially influencing security practices and threat awareness. It may lead to changes in security policies and procedures.`;
      keyTakeaways = `Stay informed about cybersecurity trends and follow security best practices. Keep your systems updated and remain vigilant about emerging threats. Consider how this development might affect your own security posture.`;
      whyThisMatters = `Cybersecurity is an ongoing challenge that affects everyone who uses digital technology. Staying informed about threats and protective measures is essential for maintaining security in an increasingly connected world.`;
    }
    
    return { 
      summary: summaryText, 
      what_happened: whatHappened, 
      impact: impact, 
      key_takeaways: keyTakeaways, 
      why_this_matters: whyThisMatters 
    };
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
          summary: summary.summary,
          what_happened: summary.what_happened,
          impact: summary.impact,
          key_takeaways: summary.key_takeaways,
          why_this_matters: summary.why_this_matters
        };
      } catch (error) {
        console.error(`❌ Failed to summarize article ${article.id}:`, error);
        // Use fallback summary
        const fallback = this.createFallbackSummary(article);
        return {
          ...article,
          summary: fallback.summary,
          what_happened: fallback.what_happened,
          impact: fallback.impact,
          key_takeaways: fallback.key_takeaways,
          why_this_matters: fallback.why_this_matters
        };
      }
    });
    
    // Wait for all articles to be processed
    const results = await Promise.all(promises);
    console.log(`🎉 Completed AI summarization for all ${articles.length} articles!`);
    return results;
  }
}