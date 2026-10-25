import { runAiPricingReadinessCli } from '../modules/ai-policy/ai-pricing-readiness-cli.js';

process.exitCode = await runAiPricingReadinessCli(process.argv.slice(2));
