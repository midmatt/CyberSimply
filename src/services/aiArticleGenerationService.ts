import { ProcessedArticle } from './newsService';
import { getRealisticAIDate } from '../utils/dateUtils';

export interface AIGenerationRequest {
  topic?: string;
  category?: string;
  count?: number;
  style?: 'news' | 'analysis' | 'tutorial' | 'opinion';
  complexity?: 'beginner' | 'intermediate' | 'advanced';
}

export interface AIGenerationResponse {
  articles: ProcessedArticle[];
  success: boolean;
  error?: string;
  quotaUsed?: number;
  remainingQuota?: number;
}

export class AIArticleGenerationService {
  private static instance: AIArticleGenerationService;
  private apiKey: string;
  private baseUrl: string;
  private quotaUsed: number = 0;
  private maxQuota: number = 100000; // High limit for Pro accounts

  private constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    this.baseUrl = process.env.EXPO_PUBLIC_OPENAI_API_URL || 'https://api.openai.com/v1';
    
    // Validate API key and adjust limits accordingly
    const isProAccount = this.apiKey.startsWith('sk-') && this.apiKey.length > 20;
    if (isProAccount) {
      this.maxQuota = 100000; // High limit for Pro accounts
      console.log('AIArticleGenerationService: Pro account detected - unlimited generation enabled');
    } else {
      this.maxQuota = 1000; // Lower limit for free accounts
      console.log('AIArticleGenerationService: Free tier account detected - limited generation');
    }
  }

  public static getInstance(): AIArticleGenerationService {
    if (!AIArticleGenerationService.instance) {
      AIArticleGenerationService.instance = new AIArticleGenerationService();
    }
    return AIArticleGenerationService.instance;
  }

  /**
   * Generate new cybersecurity articles using AI
   */
  public async generateArticles(request: AIGenerationRequest = {}): Promise<AIGenerationResponse> {
    try {
      const {
        topic = 'cybersecurity',
        category = 'general',
        count = 5,
        style = 'news',
        complexity = 'intermediate'
      } = request;

      if (this.quotaUsed >= this.maxQuota) {
        return {
          articles: [],
          success: false,
          error: 'Daily AI quota exceeded. Please try again tomorrow.',
          quotaUsed: this.quotaUsed,
          remainingQuota: 0
        };
      }

      const prompt = this.buildGenerationPrompt(topic, category, count, style, complexity);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a cybersecurity journalist and expert. Generate realistic, informative cybersecurity news articles that would be valuable to readers. Each article should be unique, well-researched, and provide actionable insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content generated');
      }

      // Parse the generated articles
      const articles = this.parseGeneratedArticles(content, category);
      
      // Update quota usage
      this.quotaUsed += data.usage?.total_tokens || 0;

      return {
        articles,
        success: true,
        quotaUsed: this.quotaUsed,
        remainingQuota: this.maxQuota - this.quotaUsed
      };

    } catch (error) {
      console.error('AI Article Generation Error:', error);
      return {
        articles: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate articles',
        quotaUsed: this.quotaUsed,
        remainingQuota: this.maxQuota - this.quotaUsed
      };
    }
  }

  /**
   * Generate trending topics for article generation
   */
  public async generateTrendingTopics(): Promise<{ topics: string[]; success: boolean; error?: string }> {
    try {
      const prompt = `Generate 10 trending cybersecurity topics for today. Each topic should be:
1. Current and relevant
2. Specific enough to write an article about
3. Interesting to cybersecurity professionals and enthusiasts
4. Not too broad or generic

Format as a simple list, one topic per line.`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a cybersecurity trend analyst. Identify current, relevant cybersecurity topics that would make for engaging news articles.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No topics generated');
      }

      const topics = content.split('\n')
        .map((topic: string) => topic.trim())
        .filter((topic: string) => topic.length > 0)
        .slice(0, 10);

      return { topics, success: true };

    } catch (error) {
      console.error('Trending Topics Generation Error:', error);
      return {
        topics: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate trending topics'
      };
    }
  }

  /**
   * Generate personalized article recommendations
   */
  public async generatePersonalizedRecommendations(
    userPreferences: {
      categories: string[];
      readingHistory: string[];
      favoriteTopics: string[];
    }
  ): Promise<{ recommendations: string[]; success: boolean; error?: string }> {
    try {
      const prompt = `Based on the user's preferences, generate 5 personalized cybersecurity article topics:

User Categories: ${userPreferences.categories.join(', ')}
Recent Reading: ${userPreferences.readingHistory.slice(0, 5).join(', ')}
Favorite Topics: ${userPreferences.favoriteTopics.join(', ')}

Generate topics that:
1. Match their interests
2. Are current and relevant
3. Provide variety while staying within their preferences
4. Include both beginner and advanced topics

Format as a simple list, one topic per line.`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a personalized content recommendation engine for cybersecurity news. Generate relevant, engaging topics based on user preferences and reading history.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No recommendations generated');
      }

      const recommendations = content.split('\n')
        .map((rec: string) => rec.trim())
        .filter((rec: string) => rec.length > 0)
        .slice(0, 5);

      return { recommendations, success: true };

    } catch (error) {
      console.error('Personalized Recommendations Error:', error);
      return {
        recommendations: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate recommendations'
      };
    }
  }

  /**
   * Build the generation prompt based on parameters
   */
  private buildGenerationPrompt(
    topic: string,
    category: string,
    count: number,
    style: string,
    complexity: string
  ): string {
    return `Generate ${count} ${complexity}-level cybersecurity ${style} articles about "${topic}" in the "${category}" category.

For each article, provide:
1. A compelling, click-worthy title
2. A comprehensive summary (2-3 paragraphs)
3. The main content (4-6 paragraphs)
4. Key takeaways (3-5 bullet points)
5. Why this matters to readers
6. A realistic source name
7. A current date
8. A relevant category

Format each article as JSON with these fields:
{
  "title": "Article Title",
  "summary": "Article summary...",
  "content": "Full article content...",
  "source": "Source Name",
  "publishedAt": "2024-01-15T10:30:00Z",
  "category": "cybersecurity",
  "what": "What happened section",
  "impact": "Impact analysis",
  "takeaways": ["Key takeaway 1", "Key takeaway 2"],
  "whyThisMatters": "Why this matters to readers"
}

Make the articles:
- Realistic and well-researched
- Current and relevant
- Educational and actionable
- Varied in approach and angle
- Professional but accessible
- Include specific examples and details

Return only the JSON array of articles, no other text.`;
  }

  /**
   * Parse generated articles from AI response
   */
  private parseGeneratedArticles(content: string, category: string): ProcessedArticle[] {
    try {
      // Clean the content and extract JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const articlesData = JSON.parse(jsonMatch[0]);
      
      return articlesData.map((article: any, index: number) => ({
        id: `ai-generated-${Date.now()}-${index}`,
        title: article.title || 'AI Generated Article',
        summary: article.summary || '',
        sourceUrl: `https://cybersafely.news/ai-article-${Date.now()}-${index}`,
        source: article.source || 'AI Generated',
        author: null,
        authorDisplay: article.source || 'AI Generated',
        publishedAt: article.publishedAt || getRealisticAIDate(),
        imageUrl: null,
        category: article.category || category,
        what: article.what || article.summary,
        impact: article.impact || 'This development has significant implications for cybersecurity practices.',
        takeaways: article.takeaways || ['Stay informed about cybersecurity trends'],
        whyThisMatters: article.whyThisMatters || 'Understanding these developments helps you stay secure online.'
      }));

    } catch (error) {
      console.error('Error parsing generated articles:', error);
      return [];
    }
  }

  /**
   * Get current quota status
   */
  public getQuotaStatus(): { used: number; remaining: number; max: number } {
    return {
      used: this.quotaUsed,
      remaining: this.maxQuota - this.quotaUsed,
      max: this.maxQuota
    };
  }

  /**
   * Reset quota (for testing or daily reset)
   */
  public resetQuota(): void {
    this.quotaUsed = 0;
  }
}

// Export singleton instance
export const aiArticleGenerationService = AIArticleGenerationService.getInstance();
