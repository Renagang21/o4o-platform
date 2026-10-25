/** Standalone PH-only media/GCS maintenance. Never combines with commerce cleanup. */
import {runJob,runnerFailureMessage} from './pharmacy-hub-administrative-purge-job.mjs';
try {await runJob({media:true});}catch(error) {
  console.error(runnerFailureMessage(error,'PH_JOB_NOT_CONFIRMED; GCS deletions cannot roll back; inspect execution and census before retry'));
  process.exitCode=1;
}
