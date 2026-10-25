/** Standalone PH commerce/content development-data maintenance; no media/GCS mutation. */
import {runJob,runnerFailureMessage} from './pharmacy-hub-administrative-purge-job.mjs';
try {await runJob({development:true});}catch(error) {
  console.error(runnerFailureMessage(error));
  process.exitCode=1;
}
