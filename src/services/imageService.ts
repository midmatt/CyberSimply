export class ImageService {
  // Get relevant cybersecurity images from reliable sources
  static getRelevantImageUrl(title: string, category: string): string {
    // Map categories to relevant image keywords
    const categoryKeywords = {
      'scams': 'phishing scam cybersecurity',
      'privacy': 'data privacy protection',
      'breaches': 'data breach security',
      'basics': 'cybersecurity protection'
    };

    const keywords = categoryKeywords[category as keyof typeof categoryKeywords] || 'cybersecurity';
    const searchQuery = encodeURIComponent(`${title} ${keywords}`);
    
    // Use reliable image services
    const imageServices = [
      `https://picsum.photos/400/200?random=${Math.floor(Math.random() * 1000)}`,
      `https://via.placeholder.com/400x200/1a1a1a/ffffff?text=${encodeURIComponent(title.substring(0, 30))}`,
      `https://source.unsplash.com/400x200/?${searchQuery}`
    ];
    
    return imageServices[0]; // Use Picsum as primary
  }

  // Generate a relevant placeholder with category-based colors
  static getCategoryBasedImage(title: string, category: string): string {
    const colors = {
      'scams': 'ff4444',      // Red for scams
      'privacy': '2196F3',    // Blue for privacy
      'breaches': 'ff9800',   // Orange for breaches
      'basics': '4caf50'      // Green for basics
    };
    
    const bgColor = colors[category as keyof typeof colors] || '666666';
    const textColor = 'ffffff';
    
    return `https://via.placeholder.com/400x200/${bgColor}/${textColor}?text=${encodeURIComponent(title.substring(0, 40))}`;
  }

  // Get image attribution text
  static getImageAttribution(imageUrl: string): string {
    if (imageUrl.includes('picsum.photos')) {
      return 'Photo: Lorem Picsum';
    } else if (imageUrl.includes('placeholder.com')) {
      return 'Generated';
    } else if (imageUrl.includes('unsplash.com')) {
      return 'Photo: Unsplash';
    }
    return 'Web Source';
  }
}
