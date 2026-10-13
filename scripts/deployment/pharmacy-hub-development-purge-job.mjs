/** Standalone PH commerce/content development-data maintenance; no media/GCS mutation. */
import {runJob} from './pharmacy-hub-administrative-purge-job.mjs';
try {await runJob({development:true});}catch(error) {
  console.error(/^PH_JOB_[A-Z_]+(?: permissions=[A-Za-z0-9.,]+)?$/.test(error.message??'')?error.message:
    'PH_JOB_NOT_CONFIRMED; inspect execution and rerun read-only census before retry');
  process.exitCode=1;
}
