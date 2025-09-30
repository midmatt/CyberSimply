// scripts/fetch-more-articles.js
// This is a redirect script that calls the main fetch-articles.js script
// This file exists to maintain compatibility with any workflows that might reference it

console.log("🔄 Redirecting to main fetch-articles.js script...");
console.log("⚠️  Note: This script is deprecated. Please update workflows to use 'node fetch-articles.js' directly.");

// Import and run the main script
import('./fetch-articles.js').then(() => {
  console.log("✅ Main script completed successfully");
}).catch((error) => {
  console.error("❌ Main script failed:", error);
  process.exit(1);
});
