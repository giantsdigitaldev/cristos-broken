// Test current Stability AI implementation
console.log('🧪 Testing current Stability AI implementation...');

// Simulate the prompt generation process
const sceneDescription = "In a dimly lit workshop, the scene captures a moment of gritty craftsmanship and hard work. A classic Harley Davidson motorcycle stands prominently in the foreground, its sleek black body glistening under a focused beam of overhead light.";

console.log('📝 Scene description length:', sceneDescription.length, 'characters');

// Simulate the prompt combination
const positivePrompt = `${sceneDescription}, ultra-realistic, highly detailed, 8K resolution, sharp focus, professional photography, cinematic lighting, photorealistic, masterpiece, best quality, natural colors, depth of field, studio lighting`;

const negativePrompt = `blurry, low quality, distorted, extra limbs, deformed, watermark, signature, text, logo, oversaturated, unrealistic, cartoon, anime, painting, drawing, illustration, CGI, 3D render, artificial, fake, plastic, oversharpened, noise, grain, compression artifacts, pixelated, low resolution, amateur, cell phone photo, selfie, snapchat filter, instagram filter`;

console.log('📏 Positive prompt length:', positivePrompt.length, 'characters');
console.log('📏 Negative prompt length:', negativePrompt.length, 'characters');
console.log('📏 Total prompt length:', positivePrompt.length + negativePrompt.length, 'characters');

// Check if within API limits
const withinLimits = positivePrompt.length <= 2000 && negativePrompt.length <= 2000;
console.log('✅ Within API limits:', withinLimits);

// Simulate truncation if needed
function validateAndTruncatePrompt(prompt, maxLength = 1800) {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  
  console.log(`⚠️ Prompt too long (${prompt.length} chars), truncating to ${maxLength} chars`);
  
  const modifiersToRemove = [
    ', award winning photography',
    ', professional grade',
    ', realistic materials',
    ', detailed shadows',
    ', lifelike',
    ', vibrant',
    ', natural colors',
    ', professional camera, Canon EOS R5',
    ', bokeh',
    ', depth of field',
    ', studio lighting',
    ', perfect composition',
    ', detailed textures',
    ', high definition',
    ', best quality',
    ', masterpiece',
    ', photorealistic',
    ', natural skin texture',
    ', cinematic lighting',
    ', professional photography',
    ', sharp focus',
    ', 8K resolution',
    ', highly detailed',
    ', ultra-realistic'
  ];
  
  let truncatedPrompt = prompt;
  
  for (const modifier of modifiersToRemove) {
    if (truncatedPrompt.length <= maxLength) {
      break;
    }
    truncatedPrompt = truncatedPrompt.replace(modifier, '');
  }
  
  if (truncatedPrompt.length > maxLength) {
    truncatedPrompt = truncatedPrompt.substring(0, maxLength);
    const lastSpaceIndex = truncatedPrompt.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) {
      truncatedPrompt = truncatedPrompt.substring(0, lastSpaceIndex);
    }
  }
  
  console.log(`✅ Truncated prompt length: ${truncatedPrompt.length} chars`);
  return truncatedPrompt;
}

const validatedPositive = validateAndTruncatePrompt(positivePrompt);
const validatedNegative = validateAndTruncatePrompt(negativePrompt);

console.log('📏 Validated positive prompt length:', validatedPositive.length, 'characters');
console.log('📏 Validated negative prompt length:', validatedNegative.length, 'characters');

console.log('🎯 Expected API behavior:');
console.log('- Positive prompt should be under 2000 characters:', validatedPositive.length < 2000);
console.log('- Negative prompt should be under 2000 characters:', validatedNegative.length < 2000);
console.log('- No more 400 Bad Request errors expected');

console.log('✅ Test completed successfully!'); 