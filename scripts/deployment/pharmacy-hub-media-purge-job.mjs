/** Standalone PH-only media/GCS maintenance. Never combines with commerce cleanup. */
import {runJob} from './pharmacy-hub-administrative-purge-job.mjs';
try {await runJob({media:true});}catch(error) {
  console.error(/^PH_JOB_[A-Z_]+(?: permissions=[A-Za-z0-9.,]+)?$/.test(error.message??'')?error.message:
    'PH_JOB_NOT_CONFIRMED; GCS deletions cannot roll back; inspect execution and census before retry');
  process.exitCode=1;
}
