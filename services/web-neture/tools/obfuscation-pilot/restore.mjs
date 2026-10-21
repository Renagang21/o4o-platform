import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { SourceMap } from 'node:module';
import path from 'node:path';

// Usage: node restore.mjs <extracted-private-dir> <asset-file> <line> <column>
// Coordinates are the browser stack's one-based values. No map is served over HTTP.
const [directory, asset, lineText, columnText] = process.argv.slice(2);
const line = Number(lineText), column = Number(columnText);
if (!directory || !asset || !Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line < 1 || column < 1) {
  throw new Error('Usage: node restore.mjs <private-dir> <asset-file> <line> <column>');
}
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
if (asset !== manifest.file) throw new Error('Asset does not match this image debug manifest');
const map = await readFile(path.join(directory, 'neture-logic.js.map'), 'utf8');
if (createHash('sha256').update(map).digest('hex') !== manifest.mapSha256) throw new Error('Private map checksum mismatch');
const original = new SourceMap(JSON.parse(map)).findEntry(line - 1, column - 1);
if (!original.originalSource) throw new Error('No original position found');
console.log(JSON.stringify({ source: original.originalSource, line: original.originalLine + 1, column: original.originalColumn + 1, name: original.name }));
