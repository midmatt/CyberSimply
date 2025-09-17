export class SimpleThumbnailService {
  static generateThumbnail(article: any): string {
    // Generate a unique, colorful thumbnail based on article content
    const title = article.title || 'cybersecurity';
    const category = article.category || 'general';
    
    // Create a unique hash from the title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate colors based on the hash and category
    let baseColor = '4CAF50'; // Default green
    
    if (category.toLowerCase().includes('scam')) {
      baseColor = 'F44336'; // Red for scams
    } else if (category.toLowerCase().includes('privacy')) {
      baseColor = '2196F3'; // Blue for privacy
    } else if (category.toLowerCase().includes('breach')) {
      baseColor = 'FF9800'; // Orange for breaches
    } else if (category.toLowerCase().includes('basic')) {
      baseColor = '4CAF50'; // Green for basics
    }
    
    // Use a reliable, working placeholder service
    return `https://dummyimage.com/400x200/${baseColor}/ffffff&text=${encodeURIComponent(title.substring(0, 25))}`;
  }
}
