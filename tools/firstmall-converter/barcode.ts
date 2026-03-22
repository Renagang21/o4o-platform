/**
 * Deterministic EAN-13 barcode generator
 *
 * Generates a valid 13-digit EAN-13 barcode from an arbitrary input string.
 * Uses MD5 hash → extract 12 numeric digits → calculate check digit.
 *
 * Prefix "200" is used (in-store / internal use range per GS1).
 */

import crypto from 'crypto';

export function generateBarcode(input: string): string {
  const hash = crypto.createHash('md5').update(input).digest('hex');

  // Extract digits from hash
  const numeric = hash.replace(/[^0-9]/g, '');

  // Use "200" prefix (GS1 internal use range) + 9 digits from hash
  const base = '200' + numeric.padEnd(9, '0').slice(0, 9);

  // Calculate EAN-13 check digit
  const checkDigit = calculateCheckDigit(base);

  return base + checkDigit;
}

function calculateCheckDigit(code: string): string {
  const digits = code.split('').map(Number);
  const sum = digits.reduce((acc, d, i) => {
    return acc + (i % 2 === 0 ? d : d * 3);
  }, 0);

  const mod = sum % 10;
  return String((10 - mod) % 10);
}
