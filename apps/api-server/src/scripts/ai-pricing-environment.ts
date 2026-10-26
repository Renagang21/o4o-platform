import { runAiPricingEnvironmentCli } from '../modules/ai-policy/ai-pricing-environment.js';

process.exitCode = await runAiPricingEnvironmentCli(process.argv.slice(2));
