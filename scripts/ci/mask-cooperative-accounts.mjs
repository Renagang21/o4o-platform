import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Register dispatch selectors with the runner before a later step prints its environment. */
export function maskCooperativeAccounts(event, write) {
  const values = ['operator_email', 'member_email'].map(key => event?.inputs?.[key]);
  if (values.some(value => typeof value !== 'string' || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))) {
    throw new Error('COOP_ACCOUNT_SELECTORS_REQUIRED');
  }
  for (const value of new Set(values.flatMap(value => [value, value.trim().toLowerCase()]))) {
    const escaped = value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    write(`::add-mask::${escaped}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    maskCooperativeAccounts(event, line => process.stdout.write(`${line}\n`));
  } catch {
    process.stderr.write('COOP_ACCOUNT_MASKING_FAILED: account selectors could not be masked.\n');
    process.exitCode = 1;
  }
}
