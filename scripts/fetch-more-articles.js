#!/usr/bin/env node

// scripts/fetch-more-articles.js
// Redirect script that calls the main fetch-articles.js
// This maintains backward compatibility with old workflow references

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🔄 Redirecting to main fetch-articles.js script...");
console.log("⚠️  Note: Update workflows to use 'node fetch-articles.js' directly");

// Path to the main script (one level up from scripts/ directory)
const mainScriptPath = join(__dirname, '..', 'fetch-articles.mjs');

// Run the main script
const child = spawn('node', [mainScriptPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  if (code === 0) {
    console.log("✅ Main script completed successfully");
  } else {
    console.error(`❌ Main script failed with code ${code}`);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error("❌ Failed to start main script:", error);
  process.exit(1);
});
