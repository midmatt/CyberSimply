import { ProcessedArticle } from './newsService';

export interface ContentQualityScore {
  overall: number; // 0-100
  accuracy: number; // 0-100
  relevance: number; // 0-100
  readability: number; // 0-100
  trustworthiness: number; // 0-100
  actionability: number; // 0-100
}

export interface ModerationResult {
  isApproved: boolean;
  qualityScore: ContentQualityScore;
  issues: string[];
  suggestions: string[];
  confidence: number; // 0-100
}

export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  keyTopics: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class ContentModerationService {
  private static instance: ContentModerationService;
  private apiKey: string;
  private baseUrl: string;

  private constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    this.baseUrl = process.env.EXPO_PUBLIC_OPENAI_API_URL || 'https://api.openai.com/v1';
  }

  public static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  /**
   * Moderate and score article content
   */
  public async moderateArticle(article: ProcessedArticle): Promise<ModerationResult> {
    try {
      const analysis = await this.analyzeContent(article);
      const qualityScore = await this.calculateQualityScore(article, analysis);
      const issues = this.identifyIssues(article, analysis);
      const suggestions = this.generateSuggestions(article, analysis, issues);
      
      const isApproved = this.shouldApprove(qualityScore, issues);
      const confidence = this.calculateConfidence(analysis, qualityScore);

      return {
        isApproved,
        qualityScore,
        issues,
        suggestions,
        confidence
      };

    } catch (error) {
      console.error('Content moderation error:', error);
      return {
        isApproved: false,
        qualityScore: {
          overall: 0,
          accuracy: 0,
          relevance: 0,
          readability: 0,
          trustworthiness: 0,
          actionability: 0
        },
        issues: ['Content analysis failed'],
        suggestions: ['Please review the article manually'],
        confidence: 0
      };
    }
  }

  /**
   * Analyze article content for various attributes
   */
  private async analyzeContent(article: ProcessedArticle): Promise<ContentAnalysis> {
    try {
      const prompt = `Analyze this cybersecurity article and provide a comprehensive content analysis:

Title: ${article.title}
Summary: ${article.summary}
Content: ${article.what}
Impact: ${article.impact}
Takeaways: ${article.takeaways}

Provide analysis in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "urgency": "low|medium|high|critical",
  "complexity": "beginner|intermediate|advanced",
  "category": "specific category name",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "riskLevel": "low|medium|high"
}

Consider:
- Sentiment: Overall tone and emotional impact
- Urgency: How time-sensitive or critical the information is
- Complexity: Technical difficulty level for readers
- Category: Most appropriate cybersecurity category
- Key Topics: Main themes and subjects covered
- Risk Level: Potential risk or threat level discussed`;

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
              content: 'You are a cybersecurity content analyst with expertise in evaluating news articles for accuracy, relevance, and quality. Provide objective, detailed analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No analysis generated');
      }

      return JSON.parse(content);

    } catch (error) {
      console.error('Content analysis error:', error);
      return {
        sentiment: 'neutral',
        urgency: 'medium',
        complexity: 'intermediate',
        category: 'general',
        keyTopics: [],
        riskLevel: 'medium'
      };
    }
  }

  /**
   * Calculate quality score for the article
   */
  private async calculateQualityScore(
    article: ProcessedArticle,
    analysis: ContentAnalysis
  ): Promise<ContentQualityScore> {
    try {
      const prompt = `Rate this cybersecurity article on multiple quality dimensions (0-100 scale):

Title: ${article.title}
Summary: ${article.summary}
Content: ${article.what}
Impact: ${article.impact}
Takeaways: ${article.takeaways}

Rate each dimension:
1. ACCURACY: Factual correctness and reliability of information
2. RELEVANCE: How relevant and timely the content is for cybersecurity
3. READABILITY: Clarity, structure, and ease of understanding
4. TRUSTWORTHINESS: Credibility of source and information
5. ACTIONABILITY: How actionable and useful the advice is

Provide scores in JSON format:
{
  "accuracy": 85,
  "relevance": 90,
  "readability": 80,
  "trustworthiness": 75,
  "actionability": 88
}

Consider:
- Accuracy: Are the facts correct and well-researched?
- Relevance: Is this important for cybersecurity readers?
- Readability: Is it clear and well-structured?
- Trustworthiness: Is the source credible and information reliable?
- Actionability: Does it provide useful, actionable advice?`;

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
              content: 'You are a cybersecurity content quality assessor. Rate articles objectively on multiple quality dimensions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No quality score generated');
      }

      const scores = JSON.parse(content);
      const overall = Math.round(
        (scores.accuracy + scores.relevance + scores.readability + 
         scores.trustworthiness + scores.actionability) / 5
      );

      return {
        overall,
        accuracy: scores.accuracy || 0,
        relevance: scores.relevance || 0,
        readability: scores.readability || 0,
        trustworthiness: scores.trustworthiness || 0,
        actionability: scores.actionability || 0
      };

    } catch (error) {
      console.error('Quality score calculation error:', error);
      return {
        overall: 50,
        accuracy: 50,
        relevance: 50,
        readability: 50,
        trustworthiness: 50,
        actionability: 50
      };
    }
  }

  /**
   * Identify potential issues with the content
   */
  private identifyIssues(article: ProcessedArticle, analysis: ContentAnalysis): string[] {
    const issues: string[] = [];

    // Check for basic content issues
    if (!article.title || article.title.length < 10) {
      issues.push('Title is too short or missing');
    }

    if (!article.summary || article.summary.length < 50) {
      issues.push('Summary is too short or missing');
    }

    if (!article.what || article.what.length < 20) {
      issues.push('Content section is too short or missing');
    }

    if (!article.impact || article.impact.length < 20) {
      issues.push('Impact section is too short or missing');
    }

    if (!article.takeaways || article.takeaways.length < 20) {
      issues.push('Takeaways section is too short or missing');
    }

    // Check for quality issues based on analysis
    if (analysis.sentiment === 'negative' && analysis.urgency === 'critical') {
      issues.push('Content may be alarmist or overly negative');
    }

    if (analysis.complexity === 'advanced' && article.title.toLowerCase().includes('beginner')) {
      issues.push('Content complexity doesn\'t match title expectations');
    }

    if (analysis.riskLevel === 'high' && !article.takeaways.toLowerCase().includes('action')) {
      issues.push('High-risk content lacks actionable advice');
    }

    // Check for missing key elements
    if (!article.source || article.source === 'Unknown') {
      issues.push('Source information is missing or unreliable');
    }

    if (!article.publishedAt || new Date(article.publishedAt) > new Date()) {
      issues.push('Publication date is missing or invalid');
    }

    return issues;
  }

  /**
   * Generate suggestions for content improvement
   */
  private generateSuggestions(
    article: ProcessedArticle,
    analysis: ContentAnalysis,
    issues: string[]
  ): string[] {
    const suggestions: string[] = [];

    // Generate suggestions based on issues
    if (issues.includes('Title is too short or missing')) {
      suggestions.push('Add a more descriptive and engaging title');
    }

    if (issues.includes('Summary is too short or missing')) {
      suggestions.push('Expand the summary to provide more context');
    }

    if (issues.includes('Content section is too short or missing')) {
      suggestions.push('Provide more detailed explanation of what happened');
    }

    if (issues.includes('Impact section is too short or missing')) {
      suggestions.push('Explain the broader implications and who is affected');
    }

    if (issues.includes('Takeaways section is too short or missing')) {
      suggestions.push('Add specific, actionable advice for readers');
    }

    // Generate suggestions based on analysis
    if (analysis.complexity === 'advanced' && analysis.urgency === 'high') {
      suggestions.push('Consider simplifying technical language for broader audience');
    }

    if (analysis.sentiment === 'negative' && analysis.urgency === 'critical') {
      suggestions.push('Balance negative information with positive solutions or preventive measures');
    }

    if (analysis.actionability < 70) {
      suggestions.push('Include more specific, actionable steps readers can take');
    }

    if (analysis.readability < 70) {
      suggestions.push('Improve clarity and structure of the content');
    }

    return suggestions;
  }

  /**
   * Determine if content should be approved
   */
  private shouldApprove(qualityScore: ContentQualityScore, issues: string[]): boolean {
    // Reject if critical issues
    const criticalIssues = issues.filter(issue => 
      issue.includes('missing') || 
      issue.includes('invalid') || 
      issue.includes('unreliable')
    );

    if (criticalIssues.length > 0) {
      return false;
    }

    // Reject if quality is too low
    if (qualityScore.overall < 40) {
      return false;
    }

    // Reject if accuracy is too low
    if (qualityScore.accuracy < 50) {
      return false;
    }

    // Reject if trustworthiness is too low
    if (qualityScore.trustworthiness < 40) {
      return false;
    }

    return true;
  }

  /**
   * Calculate confidence in the moderation decision
   */
  private calculateConfidence(analysis: ContentAnalysis, qualityScore: ContentQualityScore): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on quality scores
    if (qualityScore.overall > 80) confidence += 20;
    else if (qualityScore.overall > 60) confidence += 10;
    else if (qualityScore.overall < 40) confidence -= 20;

    // Increase confidence based on content analysis
    if (analysis.urgency === 'high' || analysis.urgency === 'critical') confidence += 10;
    if (analysis.complexity === 'intermediate') confidence += 5;
    if (analysis.keyTopics.length > 2) confidence += 5;

    // Ensure confidence is within bounds
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Batch moderate multiple articles
   */
  public async moderateArticles(articles: ProcessedArticle[]): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];
    
    for (const article of articles) {
      try {
        const result = await this.moderateArticle(article);
        results.push(result);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to moderate article ${article.id}:`, error);
        results.push({
          isApproved: false,
          qualityScore: {
            overall: 0,
            accuracy: 0,
            relevance: 0,
            readability: 0,
            trustworthiness: 0,
            actionability: 0
          },
          issues: ['Moderation failed'],
          suggestions: ['Manual review required'],
          confidence: 0
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const contentModerationService = ContentModerationService.getInstance();
