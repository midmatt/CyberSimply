export class LocalImageService {
  private static readonly UNSPLASH_ACCESS_KEY = 'Le6Ru6vJFVZBVIPtqMa7lXvRztWAuiOxc3jcNdGW_t8';
  
  static async getDefaultThumbnail(article: any): Promise<string> {
    try {
      const category = article.category || 'general';
      const title = article.title || 'cybersecurity';
      
      // Search for relevant images based on category and title
      let searchQuery = 'cybersecurity';
      
      if (category.toLowerCase().includes('scam')) {
        searchQuery = 'phishing scam security';
      } else if (category.toLowerCase().includes('privacy')) {
        searchQuery = 'privacy protection digital security';
      } else if (category.toLowerCase().includes('breach')) {
        searchQuery = 'data breach security incident';
      } else if (category.toLowerCase().includes('basic')) {
        searchQuery = 'cybersecurity protection';
      }
      
      // Use Unsplash API to get a relevant image
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=30&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Select a unique image based on article ID
        const articleId = parseInt(article.id) || 1;
        const imageIndex = (articleId - 1) % data.results.length;
        const image = data.results[imageIndex];
        
        // Return the regular size image URL
        return `${image.urls.regular}?w=400&h=200&fit=crop`;
      }
      
      // Fallback to colored blocks if API fails
      return this.getFallbackImage(article);
      
    } catch (error) {
      console.log('Unsplash API error, using fallback:', error);
      return this.getFallbackImage(article);
    }
  }
  
  private static getFallbackImage(article: any): string {
    const articleId = article.id || '1';
    const uniqueSeed = parseInt(articleId) || 1;
    
    // Generate a unique color-based thumbnail for each article
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    const color = colors[(uniqueSeed - 1) % colors.length];
    const title = article.title || 'cybersecurity';
    
    // Create a unique text for each article
    const uniqueText = `${title.substring(0, 20)} (${articleId})`;
    
    // Use a reliable placeholder service that always works
    return `https://dummyimage.com/400x200/${color.substring(1)}/ffffff&text=${encodeURIComponent(uniqueText)}`;
  }
}
