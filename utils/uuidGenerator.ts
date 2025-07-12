/**
 * 🔧 REACT NATIVE COMPATIBLE UUID GENERATOR
 * Generates UUIDs without relying on crypto.getRandomValues()
 */

/**
 * Generate a random number between 0 and 1
 */
function random(): number {
  return Math.random();
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Generate a random hex string of specified length
 */
function randomHex(length: number): string {
  const hex = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += hex[randomInt(0, 15)];
  }
  return result;
}

/**
 * Generate a UUID v4 string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * Where x is any hex digit and y is one of 8, 9, A, or B
 */
export function generateUUID(): string {
  const time = Date.now();
  const random1 = randomHex(8);
  const random2 = randomHex(4);
  const random3 = randomHex(4);
  const random4 = randomHex(4);
  const random5 = randomHex(12);
  
  // Ensure version 4 format (4xxx)
  const version = '4';
  const variant = ['8', '9', 'a', 'b'][randomInt(0, 3)];
  
  return `${random1}-${random2}-${version}${random3.substring(1)}-${variant}${random4.substring(1)}-${random5}`;
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(): string {
  return randomHex(8);
}

/**
 * Generate a timestamp-based ID
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${randomHex(4)}`;
} 