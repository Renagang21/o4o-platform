#!/usr/bin/env npx tsx
/**
 * WO-NETURE-FIRSTMALL-CONVERTER-V1
 *
 * FirstMall Excel (.xlsx) → O4O CSV Import 변환기
 *
 * Usage:
 *   npx tsx tools/firstmall-converter/index.ts <input.xlsx> [output.csv]
 *
 * Example:
 *   npx tsx tools/firstmall-converter/index.ts 3lifezone_goods_50-1.csv
 *   npx tsx tools/firstmall-converter/index.ts 3lifezone_goods_50-1.csv output/converted.csv
 */

import path from 'path';
import { parseExcel } from './parser.js';
import { mapRow } from './mapper.js';
import { writeCsv } from './writer.js';
import type { ConversionStats } from './types.js';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
FirstMall → O4O CSV Converter
==============================

Usage:
  npx tsx tools/firstmall-converter/index.ts <input.xlsx> [output.csv]

Options:
  --help    Show this help message

Example:
  npx tsx tools/firstmall-converter/index.ts 3lifezone_goods_50-1.csv
    `);
    process.exit(0);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1]
    ? path.resolve(args[1])
    : path.resolve('tools/firstmall-converter/output/o4o_import.csv');

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║    FirstMall → O4O CSV Converter                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  // 1. Parse Excel
  const rawRows = parseExcel(inputPath);

  // 2. Map rows
  const stats: ConversionStats = {
    totalInput: rawRows.length,
    converted: 0,
    skipped: 0,
    zeroPriceCount: 0,
    noNameCount: 0,
  };

  const mappedRows = [];
  const seenBarcodes = new Set<string>();
  let duplicateCount = 0;

  for (const raw of rawRows) {
    const mapped = mapRow(raw);

    if (!mapped) {
      stats.skipped++;
      stats.noNameCount++;
      continue;
    }

    // Deduplicate by barcode (same 상품기본코드 + 상품명 = true duplicate)
    if (seenBarcodes.has(mapped.barcode)) {
      duplicateCount++;
      stats.skipped++;
      continue;
    }
    seenBarcodes.add(mapped.barcode);

    if (mapped.supply_price === 0) {
      stats.zeroPriceCount++;
    }

    mappedRows.push(mapped);
    stats.converted++;
  }

  // 3. Write CSV
  writeCsv(mappedRows, outputPath);

  // 4. Report
  console.log('\n─── Conversion Report ───');
  console.log(`Total input rows:    ${stats.totalInput}`);
  console.log(`Converted:           ${stats.converted}`);
  console.log(`Skipped (no name):   ${stats.noNameCount}`);
  console.log(`Skipped (duplicate): ${duplicateCount}`);
  console.log(`Zero supply_price:   ${stats.zeroPriceCount}`);

  if (stats.zeroPriceCount > 0) {
    console.log(`\n⚠  ${stats.zeroPriceCount} rows have supply_price=0 (매입가/판매가/정가 모두 0 또는 누락)`);
    console.log('   → CSV Importer Phase 1에서 REJECT될 수 있습니다.');
  }

  console.log(`\n✅ Done: ${outputPath}`);
}

main();
