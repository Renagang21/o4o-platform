import { Storage } from "@google-cloud/storage";
import { createHash } from "node:crypto";
import type { EntityManager } from "typeorm";
export interface ClosureStorage {
  inspect(
    bucket: string,
    path: string,
    documentId: string,
  ): Promise<string | null>;
  remove(
    bucket: string,
    path: string,
    documentId: string,
    generation: string,
  ): Promise<void>;
}
const gcs = new Storage();
export const closureStorage: ClosureStorage = {
  async inspect(bucket, path, documentId) {
    try {
      const [metadata] = await gcs.bucket(bucket).file(path).getMetadata();
      if (
        metadata.metadata?.o4o_document_id !== documentId ||
        metadata.metadata?.o4o_asset_purpose !== "personal"
      )
        throw new Error("STORE_CLOSURE_FILE_OWNERSHIP_REVIEW_REQUIRED");
      if (!metadata.generation)
        throw new Error("STORE_CLOSURE_FILE_GENERATION_REQUIRED");
      return String(metadata.generation);
    } catch (error) {
      if ((error as { code?: number }).code === 404) return null;
      throw error;
    }
  },
  async remove(bucket, path, documentId, generation) {
    const file = gcs.bucket(bucket).file(path);
    try {
      const [metadata] = await file.getMetadata();
      if (
        metadata.metadata?.o4o_document_id !== documentId ||
        metadata.metadata?.o4o_asset_purpose !== "personal" ||
        String(metadata.generation) !== generation ||
        !metadata.metageneration
      )
        throw new Error("STORE_CLOSURE_FILE_GENERATION_CHANGED");
      await gcs
        .bucket(bucket)
        .file(path, {
          preconditionOpts: {
            ifGenerationMatch: generation,
            ifMetagenerationMatch: metadata.metageneration,
          },
        })
        .delete();
    } catch (error) {
      if ((error as { code?: number }).code === 404) {
        const [exists] = await file.exists();
        if (!exists) return;
      }
      throw error;
    }
  },
};
/** Preserve the document and journal until the pinned storage generation is gone. */
export async function purgeClosureDocuments(
  db: Pick<EntityManager, "query">,
  caseId: string,
  organizationId: string,
  storage: ClosureStorage = closureStorage,
) {
  const documents = await db.query(
    `SELECT d.id,d."fileUrl" AS url FROM kyc_documents d JOIN organizations o
 ON o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text WHERE o.id=$1`,
    [organizationId],
  );
  for (const document of documents) {
    const url = new URL(document.url);
    if (
      url.protocol !== "gcs:" ||
      url.hostname !==
        (process.env.GCS_PRIVATE_DOCUMENT_BUCKET || "o4o-private-documents") ||
      url.search ||
      url.hash
    )
      throw new Error("STORE_CLOSURE_FILE_MANIFEST_REVIEW_REQUIRED");
    const path = decodeURIComponent(url.pathname.slice(1));
    if (!path || path.includes(".."))
      throw new Error("STORE_CLOSURE_FILE_MANIFEST_REVIEW_REQUIRED");
    await db.query(
      `INSERT INTO store_closure_file_tasks(case_id,document_id,object_hash,bucket,object_path) VALUES($1,$2,$3,$4,$5) ON CONFLICT(case_id,object_hash) DO NOTHING`,
      [
        caseId,
        document.id,
        createHash("sha256")
          .update(url.hostname + "/" + path)
          .digest("hex"),
        url.hostname,
        path,
      ],
    );
  }
  const tasks = await db.query(
    `SELECT * FROM store_closure_file_tasks WHERE case_id=$1 AND state='pending' ORDER BY id`,
    [caseId],
  );
  for (const task of tasks) {
    try {
      if (!task.document_id)
        throw new Error("STORE_CLOSURE_FILE_MANIFEST_REVIEW_REQUIRED");
      // Another business may use the same document; do not delete a shared proof.
      const [used] = await db.query(
        `SELECT EXISTS(SELECT 1 FROM organizations WHERE id<>$1 AND metadata->'businessProfile'->>'businessRegistrationDocumentId'=$2)
    OR EXISTS(SELECT 1 FROM neture_suppliers WHERE $2::uuid IN (business_registration_document_id,settlement_bankbook_document_id,mail_order_sales_document_id))
    OR EXISTS(SELECT 1 FROM neture_supplier_regulated_categories WHERE evidence_document_id=$2::uuid) AS shared`,
        [organizationId, task.document_id],
      );
      if (used.shared)
        throw new Error("STORE_CLOSURE_SHARED_DOCUMENT_REVIEW_REQUIRED");
      const current = await storage.inspect(
        task.bucket,
        task.object_path,
        task.document_id,
      );
      if (current === null) {
        await db.query(
          `UPDATE store_closure_file_tasks SET state='already_absent',error_code=NULL,updated_at=now() WHERE id=$1`,
          [task.id],
        );
        continue;
      }
      if (task.generation && task.generation !== current)
        throw new Error("STORE_CLOSURE_FILE_GENERATION_CHANGED");
      if (!task.generation) {
        await db.query(
          "UPDATE store_closure_file_tasks SET generation=$2,updated_at=now() WHERE id=$1",
          [task.id, current],
        );
        continue; // Commit the pin before the next explicit pass can perform external deletion.
      }
      await storage.remove(
        task.bucket,
        task.object_path,
        task.document_id,
        task.generation ?? current,
      );
      await db.query(
        `UPDATE store_closure_file_tasks SET state='deleted',error_code=NULL,updated_at=now() WHERE id=$1`,
        [task.id],
      );
    } catch (error) {
      const message = (error as Error).message;
      const code = /^STORE_CLOSURE_[A-Z_]+$/.test(message)
        ? message
        : "STORE_CLOSURE_FILE_DELETE_FAILED";
      await db.query(
        "UPDATE store_closure_file_tasks SET error_code=$2,updated_at=now() WHERE id=$1",
        [task.id, code],
      );
      throw new Error(code);
    }
  }
  await db.query(
    `DELETE FROM kyc_documents d USING store_closure_file_tasks f WHERE f.case_id=$1 AND f.document_id=d.id AND f.state IN ('deleted','already_absent')`,
    [caseId],
  );
}
