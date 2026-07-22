import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
const TF = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-erdosteine-300mg-jeong-v1.json');

async function main() {
  const j = JSON.parse(fs.readFileSync(TF, 'utf8')) as { translations: DrugOtcEnTranslation[]; summary?: string };
  const built = buildDrugOtcEnConsumerHtml(j.translations[0]);
  console.log('missing:', built.missing);
  console.log('buildMd5:', md5(built.html), 'len', built.html.length);
  console.log('summary(file):', JSON.stringify(j.summary));

  const { Client } = await import('pg');
  const c = new Client({ host: '127.0.0.1', port: 5442, user: 'o4o_api', database: 'o4o_platform', password: process.env.DB_PASSWORD });
  await c.connect();
  const r = await c.query(`
    SELECT md5(content) h, count(*)::int n, count(DISTINCT summary) sdist, min(summary) summ
    FROM shared_product_descriptions
    WHERE source_ref_id='03e0af9d-5236-460a-86d4-1af8b0c00c61'::uuid
      AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
    GROUP BY 1`);
  console.log('live out-en:', JSON.stringify(r.rows));
  const match = md5(built.html) === r.rows[0]?.h;
  console.log('MATCH content:', match, '| summary match:', j.summary === r.rows[0]?.summ);
  if (!match) {
    const SP = 'C:/Users/home/AppData/Local/Temp/claude/c--Users-home-coding-o4o-platform/963d6387-3f75-4584-9a38-c8abb478b639/scratchpad';
    const live = await c.query(`SELECT content FROM shared_product_descriptions WHERE source_ref_id='03e0af9d-5236-460a-86d4-1af8b0c00c61'::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL LIMIT 1`);
    fs.writeFileSync(SP + '/build.html', built.html);
    fs.writeFileSync(SP + '/live.html', live.rows[0].content);
    console.log('wrote build.html / live.html');
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
