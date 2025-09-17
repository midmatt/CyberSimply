// News Service - handles news-related API calls and data management

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  author?: string;
  category?: string;
  imageUrl?: string;
}

export interface ProcessedArticle {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  author: string | null;
  authorDisplay: string; // New field for UI display
  publishedAt: string;
  imageUrl: string | null;
  category: 'cybersecurity' | 'hacking' | 'general';
  what: string;
  impact: string;
  takeaways: string;
  whyThisMatters: string;
}

export interface NewsResponse {
  articles: NewsItem[];
  totalCount: number;
  hasMore: boolean;
}

class NewsService {
  private baseUrl: string;

  constructor() {
    // Use environment variables or configuration
    this.baseUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_NEWS_API_URL) || 'https://api.example.com/news';
  }

  async getLatestNews(page: number = 1, limit: number = 20): Promise<NewsResponse> {
    try {
      // Use fetch instead of require() for modern ES6 syntax
      const response = await fetch(`${this.baseUrl}/latest?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching latest news:', error);
      throw error;
    }
  }

  async getNewsByCategory(category: string, page: number = 1): Promise<NewsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/category/${category}?page=${page}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching news for category ${category}:`, error);
      throw error;
    }
  }

  async getNewsById(id: string): Promise<NewsItem> {
    try {
      const response = await fetch(`${this.baseUrl}/article/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching news article ${id}:`, error);
      throw error;
    }
  }
}

export const newsService = new NewsService();
export default newsService;