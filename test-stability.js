#!/usr/bin/env node

/**
 * Minimal Stability AI Test Script
 * 
 * Just change the PROMPT variable below and run this script.
 * Make sure you have a .env file with your API keys.
 * 
 * Usage:
 * node test_stability_minimal.js
 */

const fs = require('fs');
const { Buffer } = require('buffer');

// Load environment variables from .env file
require('dotenv').config();

// ========================================
// CHANGE THIS PROMPT TO TEST DIFFERENT IMAGES
// ========================================
const PROMPT = "Technical schematics of a sailboat, front and side views, on light white blueprint paper, highly detailed, illustration drafting style, conceptual art, steampunk, isometric detailed blueprint, patent illustration, poster design, art illustration, silkscreen risograph, technical drawing, precise linework, clear typography labeling key parts, minimal color, clean background, high-resolution, professional blueprint aesthetic";

// ========================================
// API Configuration (from .env file)
// ========================================
const API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
const API_KEY = process.env.EXPO_PUBLIC_STABLITY_API_KEY;

// ========================================
// Main execution
// ========================================
async function main() {
  // Check API key
  if (!API_KEY) {
    console.error('❌ EXPO_PUBLIC_STABLITY_API_KEY not found in .env file');
    console.error('Create a .env file with: EXPO_PUBLIC_STABLITY_API_KEY=your-api-key');
    process.exit(1);
  }

  console.log('🎨 Generating image...');
  console.log('📝 Prompt:', PROMPT);
  console.log('');

  try {
    // Call Stability AI
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{ text: PROMPT, weight: 1 }],
        cfg_scale: 10,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 50,
        style_preset: 'photographic'
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const artifact = data.artifacts[0];

    // Save image
    const filename = `stability-${Date.now()}.png`;
    fs.writeFileSync(filename, Buffer.from(artifact.base64, 'base64'));

    console.log('✅ Success!');
    console.log(`📁 Image saved: ${filename}`);
    console.log(`🌱 Seed: ${artifact.seed}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 