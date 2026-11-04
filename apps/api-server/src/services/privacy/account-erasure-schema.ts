import { CLOSED_STORE_WRITER_GAPS_SQL } from '../store/store-closure-inventory.js';
import { ERASURE_WRITER_GAPS_SQL } from './erasure-writer-manifest.js';

/** Shared by runtime and the read-only production audit. No enablement flags are faked. */
export const ACCOUNT_ERASURE_SCHEMA_READY_SQL = `SELECT to_regclass('public.account_erasure_operations') IS NOT NULL
      AND to_regclass('public.account_erasure_file_tasks') IS NOT NULL
      AND to_regclass('public.account_erasure_reference_keys') IS NOT NULL
      AND to_regclass('public.account_erasure_community_evidence') IS NOT NULL
      AND to_regclass('public.account_erasure_audit_events') IS NOT NULL
      AND to_regproc('public.account_erasure_write_fence') IS NOT NULL
      AND to_regclass('public.store_closure_file_tasks') IS NOT NULL
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.organizations') AND attname='full_closure_at' AND NOT attisdropped)
      AND NOT EXISTS(${CLOSED_STORE_WRITER_GAPS_SQL})
      AND NOT EXISTS(${ERASURE_WRITER_GAPS_SQL})
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.account_erasure_reference_keys')
        AND conname='account_erasure_uuid_keys_only' AND contype='c' AND convalidated) AS ready`;
