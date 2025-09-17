export class LocalThumbnailService {
  // Generate attractive thumbnails locally without external APIs
  static generateThumbnail(article: any): string {
    const colors = {
      'scams': 'ff4444',      // Red for scams
      'privacy': '2196F3',    // Blue for privacy
      'breaches': 'ff9800',   // Orange for breaches
      'basics': '4caf50'      // Green for basics
    };
    
    const bgColor = colors[article.category as keyof typeof colors] || '666666';
    const textColor = 'ffffff';
    
    // Create a more visually appealing placeholder
    const title = this.formatTitle(article.title);
    const encodedTitle = encodeURIComponent(title);
    
    return `https://via.placeholder.com/400x200/${bgColor}/${textColor}?text=${encodedTitle}`;
  }

  // Format title for better visual appearance
  private static formatTitle(title: string): string {
    if (title.length <= 40) {
      return title;
    }
    
    // Try to break at word boundaries
    const words = title.split(' ');
    let result = '';
    
    for (const word of words) {
      if ((result + ' ' + word).length <= 40) {
        result += (result ? ' ' : '') + word;
      } else {
        break;
      }
    }
    
    return result + '...';
  }

  // Get category-specific design elements
  static getCategoryDesign(category: string): { color: string; icon: string; pattern: string } {
    const designs = {
      'scams': {
        color: 'ff4444',
        icon: 'shield',
        pattern: 'diagonal'
      },
      'privacy': {
        color: '2196F3',
        icon: 'lock',
        pattern: 'dots'
      },
      'breaches': {
        color: 'ff9800',
        icon: 'warning',
        pattern: 'stripes'
      },
      'basics': {
        color: '4caf50',
        icon: 'check',
        pattern: 'grid'
      }
    };
    
    return designs[category as keyof typeof designs] || {
      color: '666666',
      icon: 'news',
      pattern: 'solid'
    };
  }

  // Generate enhanced thumbnail with better visual design
  static generateEnhancedThumbnail(article: any): string {
    const design = this.getCategoryDesign(article.category);
    const title = this.formatTitle(article.title);
    const encodedTitle = encodeURIComponent(title);
    
    // Use a more sophisticated placeholder service that supports patterns
    return `https://via.placeholder.com/400x200/${design.color}/${design.color}20?text=${encodedTitle}`;
  }
}
