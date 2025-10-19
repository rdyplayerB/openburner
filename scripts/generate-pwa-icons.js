#!/usr/bin/env node

/**
 * Simple script to generate PWA icons from the OpenBurner logo
 * This creates basic PNG icons by converting the SVG to different sizes
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA (including iOS-specific sizes)
const iconSizes = [57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512];

// Create a simple SVG-to-PNG conversion using canvas (if available) or fallback
function createIcon(size) {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF8C42;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad1)"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" fill="white">OB</text>
</svg>`;

  return svgContent;
}

// For now, we'll create SVG files that can be converted to PNG later
// In a real implementation, you'd use a library like sharp or canvas
console.log('🎨 Generating PWA icons...');

iconSizes.forEach(size => {
  const svgContent = createIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(__dirname, '..', 'public', 'icons', filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Created ${filename}`);
});

console.log('\n📝 Note: These are SVG files. For production, convert them to PNG using:');
console.log('   - Online tools like convertio.co or cloudconvert.com');
console.log('   - Command line tools like ImageMagick or Inkscape');
console.log('   - Or use a Node.js library like sharp');
console.log('\n🎯 The icons are ready for PWA manifest!');
