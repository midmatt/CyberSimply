import { ProcessedArticle } from './newsService';

export interface SearchResult {
  article: ProcessedArticle;
  relevanceScore: number;
  matchedTerms: string[];
  semanticMatch: boolean;
}

export interface SearchQuery {
  query: string;
  filters?: {
    category?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
    complexity?: 'beginner' | 'intermediate' | 'advanced';
  };
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  suggestions: string[];
  relatedTopics: string[];
  success: boolean;
  error?: string;
}

export class SmartSearchService {
  private static instance: SmartSearchService;
  private apiKey: string;
  private baseUrl: string;

  private constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    this.baseUrl = process.env.EXPO_PUBLIC_OPENAI_API_URL || 'https://api.openai.com/v1';
  }

  public static getInstance(): SmartSearchService {
    if (!SmartSearchService.instance) {
      SmartSearchService.instance = new SmartSearchService();
    }
    return SmartSearchService.instance;
  }

  /**
   * Perform smart semantic search on articles
   */
  public async searchArticles(
    articles: ProcessedArticle[],
    searchQuery: SearchQuery
  ): Promise<SearchResponse> {
    try {
      // First, do a basic text search
      const basicResults = this.performBasicSearch(articles, searchQuery);
      
      // Then enhance with AI-powered semantic search
      const enhancedResults = await this.enhanceWithSemanticSearch(basicResults, searchQuery);
      
      // Generate suggestions and related topics
      const suggestions = await this.generateSearchSuggestions(searchQuery.query);
      const relatedTopics = await this.generateRelatedTopics(searchQuery.query);

      return {
        results: enhancedResults,
        totalResults: enhancedResults.length,
        suggestions,
        relatedTopics,
        success: true
      };

    } catch (error) {
      console.error('Smart search error:', error);
      return {
        results: [],
        totalResults: 0,
        suggestions: [],
        relatedTopics: [],
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Perform basic text-based search
   */
  private performBasicSearch(articles: ProcessedArticle[], searchQuery: SearchQuery): SearchResult[] {
    const query = searchQuery.query.toLowerCase();
    const results: SearchResult[] = [];

    for (const article of articles) {
      let relevanceScore = 0;
      const matchedTerms: string[] = [];
      const queryWords = query.split(' ').filter(word => word.length > 2);

      // Check title matches
      const titleLower = article.title.toLowerCase();
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          relevanceScore += 3;
          matchedTerms.push(word);
        }
      }

      // Check summary matches
      const summaryLower = article.summary.toLowerCase();
      for (const word of queryWords) {
        if (summaryLower.includes(word)) {
          relevanceScore += 2;
          if (!matchedTerms.includes(word)) {
            matchedTerms.push(word);
          }
        }
      }

      // Check content matches
      const contentLower = (article.what + ' ' + article.impact + ' ' + article.takeaways).toLowerCase();
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          relevanceScore += 1;
          if (!matchedTerms.includes(word)) {
            matchedTerms.push(word);
          }
        }
      }

      // Check category filter
      if (searchQuery.filters?.category && article.category !== searchQuery.filters.category) {
        continue;
      }

      // Check date range filter
      if (searchQuery.filters?.dateRange) {
        const articleDate = new Date(article.publishedAt);
        if (articleDate < searchQuery.filters.dateRange.start || 
            articleDate > searchQuery.filters.dateRange.end) {
          continue;
        }
      }

      if (relevanceScore > 0) {
        results.push({
          article,
          relevanceScore,
          matchedTerms,
          semanticMatch: false
        });
      }
    }

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Enhance search results with AI-powered semantic understanding
   */
  private async enhanceWithSemanticSearch(
    basicResults: SearchResult[],
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    try {
      if (basicResults.length === 0) {
        return basicResults;
      }

      // Create a prompt to analyze article relevance
      const articlesText = basicResults.map((result, index) => 
        `${index + 1}. Title: ${result.article.title}\n   Summary: ${result.article.summary}\n   Content: ${result.article.what}\n`
      ).join('\n');

      const prompt = `You are a cybersecurity search expert. Analyze these articles and determine their relevance to the search query: "${searchQuery.query}"

Articles:
${articlesText}

For each article, provide:
1. A relevance score from 0-10 (10 = highly relevant)
2. Whether it's a semantic match (meaning it's relevant even if it doesn't contain exact keywords)
3. Key terms that make it relevant

Respond in JSON format:
{
  "results": [
    {
      "index": 1,
      "relevanceScore": 8,
      "semanticMatch": true,
      "keyTerms": ["data breach", "privacy", "security"]
    }
  ]
}`;

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
              content: 'You are a cybersecurity search expert who understands the nuances of security topics and can identify relevant content even when exact keywords are not present.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return basicResults;
      }

      // Parse AI response and enhance results
      const aiAnalysis = JSON.parse(content);
      const enhancedResults = basicResults.map((result, index) => {
        const aiResult = aiAnalysis.results?.find((r: any) => r.index === index + 1);
        if (aiResult) {
          return {
            ...result,
            relevanceScore: Math.max(result.relevanceScore, aiResult.relevanceScore),
            semanticMatch: aiResult.semanticMatch || result.semanticMatch,
            matchedTerms: [...result.matchedTerms, ...(aiResult.keyTerms || [])]
          };
        }
        return result;
      });

      // Sort by enhanced relevance score
      return enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      console.error('Semantic search enhancement failed:', error);
      return basicResults;
    }
  }

  /**
   * Generate search suggestions based on query
   */
  private async generateSearchSuggestions(query: string): Promise<string[]> {
    try {
      const prompt = `Generate 5 search suggestions for the cybersecurity query: "${query}"

Provide variations, related terms, and alternative phrasings that users might find helpful. Focus on cybersecurity-specific terminology and common search patterns.

Format as a simple list, one suggestion per line.`;

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
              content: 'You are a cybersecurity search assistant who helps users find relevant information by suggesting better search terms and related concepts.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return [];
      }

      return content.split('\n')
        .map(suggestion => suggestion.trim())
        .filter(suggestion => suggestion.length > 0)
        .slice(0, 5);

    } catch (error) {
      console.error('Error generating search suggestions:', error);
      return [];
    }
  }

  /**
   * Generate related topics based on query
   */
  private async generateRelatedTopics(query: string): Promise<string[]> {
    try {
      const prompt = `Generate 5 related cybersecurity topics for the query: "${query}"

These should be topics that users interested in this query might also want to explore. Include both broader and more specific related topics.

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
              content: 'You are a cybersecurity knowledge expert who understands the relationships between different security topics and can suggest related areas of interest.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return [];
      }

      return content.split('\n')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0)
        .slice(0, 5);

    } catch (error) {
      console.error('Error generating related topics:', error);
      return [];
    }
  }

  /**
   * Get trending search terms
   */
  public async getTrendingSearchTerms(): Promise<{ terms: string[]; success: boolean; error?: string }> {
    try {
      const prompt = `Generate 10 trending cybersecurity search terms for today. These should be:
1. Current and relevant to today's cybersecurity landscape
2. Popular topics people are searching for
3. Mix of beginner and advanced topics
4. Include both threats and solutions

Format as a simple list, one term per line.`;

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
              content: 'You are a cybersecurity trend analyst who identifies popular search topics and emerging security concerns.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No trending terms generated');
      }

      const terms = content.split('\n')
        .map(term => term.trim())
        .filter(term => term.length > 0)
        .slice(0, 10);

      return { terms, success: true };

    } catch (error) {
      console.error('Error getting trending search terms:', error);
      return {
        terms: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trending terms'
      };
    }
  }
}

// Export singleton instance
export const smartSearchService = SmartSearchService.getInstance();
