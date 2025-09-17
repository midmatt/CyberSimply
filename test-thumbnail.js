// Test thumbnail generation
const article = {
  title: 'Test Cybersecurity Article',
  category: 'scams'
};

const colors = {
  'scams': 'ff0000',      // Red
  'privacy': '0066ff',    // Blue  
  'breaches': 'ff6600',   // Orange
  'basics': '00cc00'      // Green
};

const bgColor = colors[article.category] || '666666';
const textColor = 'ffffff';
const title = article.title.substring(0, 30);
const encodedTitle = encodeURIComponent(title);

const thumbnailUrl = `https://via.placeholder.com/400x200/${bgColor}/${textColor}?text=${encodedTitle}`;

console.log('Article:', article);
console.log('Generated thumbnail URL:', thumbnailUrl);
console.log('Full URL:', thumbnailUrl);
