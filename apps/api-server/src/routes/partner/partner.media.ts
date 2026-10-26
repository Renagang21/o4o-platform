import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import { constants } from "node:fs";
import { mkdir, open, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { PartnerError, PartnerService } from "./partner.service.js";
import { uuidSchema } from "./partner.schema.js";

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const mediaMimes = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;
export function mediaType(bytes: Buffer): string {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))
  )
    return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp")
    return "video/mp4";
  if (
    bytes.length >= 4 &&
    bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
  )
    return "video/webm";
  throw new PartnerError(415, "UNSUPPORTED_MEDIA");
}
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
export class DiskMediaStore {
  constructor(private root: string) {
    if (!isAbsolute(root)) throw new Error("Media root must be absolute");
  }
  private path(space: string, id: string) {
    uuidSchema.parse(space);
    uuidSchema.parse(id);
    return join(this.root, space, id);
  }
  async put(space: string, id: string, bytes: Buffer) {
    await mkdir(join(this.root, uuidSchema.parse(space)), {
      recursive: true,
      mode: 0o700,
    });
    const f = await open(
      this.path(space, id),
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await f.writeFile(bytes);
      await f.close();
    } catch (error) {
      await f.close().catch(() => {});
      await unlink(this.path(space, id)).catch(() => {});
      throw error;
    }
  }
  async get(
    space: string,
    id: string,
    expected: { size: number; sha256: string },
  ) {
    const f = await open(
      this.path(space, id),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await f.stat();
      if (
        !stat.isFile() ||
        stat.size !== expected.size ||
        stat.size > MAX_MEDIA_BYTES
      )
        throw new PartnerError(503, "MEDIA_INTEGRITY_ERROR");
      const bytes = await f.readFile();
      if (digest(bytes) !== expected.sha256)
        throw new PartnerError(503, "MEDIA_INTEGRITY_ERROR");
      return bytes;
    } finally {
      await f.close();
    }
  }
  async remove(space: string, id: string) {
    await unlink(this.path(space, id)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
export function configuredMediaStore(): DiskMediaStore | undefined {
  const root = process.env.PARTNER_MEDIA_DIR;
  if (
    !root ||
    (process.env.NODE_ENV === "production" &&
      process.env.PARTNER_MEDIA_PERSISTENT_VOLUME !== "true")
  )
    return undefined;
  return new DiskMediaStore(root);
}
type FileRow = {
  id: string;
  asset_id: string;
  group_id: string;
  version: number;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  created_at: string;
};
const fields = "id,asset_id,group_id,version,name,mime,size,sha256,created_at";
export function createPartnerMediaRoutes(
  db: DataSource,
  store: DiskMediaStore | undefined,
): Router {
  const router = Router(),
    service = new PartnerService(db);
  // The parent installs requireAuth and rate limits; every handler also checks req.user and space ACL.
  let inflight = 0;
  router.use((req, res, next) => {
    if (!/\/(?:files|media-capabilities)(?:\/|$)/.test(req.path)) {
      next();
      return;
    }
    if (inflight >= 4) {
      res.status(429).json({ success: false, code: "RATE_LIMITED" });
      return;
    }
    inflight++;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        inflight--;
      }
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  });
  const handle =
    (fn: (user: string, req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      const user = (req as AuthRequest).user?.id;
      if (!user) {
        res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
        return;
      }
      try {
        for (const k of ["id", "assetId", "fileId"])
          if (req.params[k]) uuidSchema.parse(req.params[k]);
        await fn(user, req, res);
      } catch (e) {
        if (res.headersSent) {
          res.end();
          return;
        }
        const error =
          e instanceof PartnerError
            ? e
            : e instanceof Error && e.name === "ZodError"
              ? new PartnerError(400, "INVALID_INPUT")
              : new PartnerError(503, "MEDIA_UNAVAILABLE");
        res.status(error.status).json({ success: false, code: error.code });
      }
    };
  router.get(
    "/spaces/:id/media-capabilities",
    handle(async (user, req, res) => {
      await service.get(user, req.params.id);
      res.json({
        success: true,
        data: {
          enabled: !!store,
          maxFileBytes: MAX_MEDIA_BYTES,
          mimes: mediaMimes,
        },
      });
    }),
  );
  router.get(
    "/spaces/:id/files",
    handle(async (user, req, res) => {
      await service.get(user, req.params.id);
      res.json({
        success: true,
        data: await db.query(
          `SELECT ${fields} FROM partner_support_files WHERE space_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC,id DESC`,
          [req.params.id],
        ),
      });
    }),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_MEDIA_BYTES, files: 1, fields: 0, parts: 2 },
  }).single("file");
  router.post(
    [
      "/spaces/:id/assets/:assetId/files",
      "/spaces/:id/assets/:assetId/files/:fileId/versions",
    ],
    handle(async (user, req, res) => {
      if (req.get("X-Requested-With") !== "O4O-Partner")
        throw new PartnerError(415, "JSON_REQUIRED");
      const space = await service.get(user, req.params.id);
      if (space.role === "viewer") throw new PartnerError(403, "READ_ONLY");
      if (!space.workspace.assets.some((a) => a.id === req.params.assetId))
        throw new PartnerError(404, "ASSET_NOT_FOUND");
      if (!store) throw new PartnerError(503, "MEDIA_NOT_CONFIGURED");
      await new Promise<void>((resolve, reject) =>
        upload(req, res, (e: unknown) =>
          e
            ? reject(new PartnerError(413, "MEDIA_UPLOAD_REJECTED"))
            : resolve(),
        ),
      );
      const file = req.file;
      if (!file || !file.size) throw new PartnerError(400, "FILE_REQUIRED");
      const mime = mediaType(file.buffer);
      if (mime !== file.mimetype)
        throw new PartnerError(415, "UNSUPPORTED_MEDIA");
      let original = file.originalname;
      if ([...original].every((c) => c.charCodeAt(0) <= 255)) {
        const decoded = Buffer.from(original, "latin1").toString("utf8");
        if (!decoded.includes("\uFFFD")) original = decoded;
      }
      const id = randomUUID(),
        name =
          original
            .split("")
            .map((c) =>
              c.charCodeAt(0) < 32 ||
              c.charCodeAt(0) === 127 ||
              c === "/" ||
              c === "\\"
                ? "_"
                : c,
            )
            .join("")
            .normalize("NFC")
            .slice(0, 180) || "media";
      await store.put(req.params.id, id, file.buffer);
      try {
        const row = await db.transaction(async (q) => {
          const s = await service.space(q, user, req.params.id, true);
          if (s.role === "viewer") throw new PartnerError(403, "READ_ONLY");
          if (!s.workspace.assets.some((a) => a.id === req.params.assetId))
            throw new PartnerError(404, "ASSET_NOT_FOUND");
          const [{ count, size }] = await q.query(
            "SELECT count(*)::int AS count,COALESCE(sum(size),0)::bigint AS size FROM partner_support_files WHERE space_id=$1 AND deleted_at IS NULL",
            [s.id],
          );
          if (count >= 100 || Number(size) + file.size > 500 * 1024 * 1024)
            throw new PartnerError(409, "MEDIA_QUOTA");
          let group = id,
            version = 1;
          if (req.params.fileId) {
            const [previous] = await q.query(
              "SELECT group_id FROM partner_support_files WHERE space_id=$1 AND asset_id=$2 AND id=$3 AND deleted_at IS NULL",
              [s.id, req.params.assetId, req.params.fileId],
            );
            if (!previous) throw new PartnerError(404, "FILE_NOT_FOUND");
            group = previous.group_id;
            const [v] = await q.query(
              "SELECT max(version)::int AS version FROM partner_support_files WHERE group_id=$1",
              [group],
            );
            version = v.version + 1;
          }
          const [created] = await q.query(
            `INSERT INTO partner_support_files(id,space_id,asset_id,group_id,version,name,mime,size,sha256,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${fields}`,
            [
              id,
              s.id,
              req.params.assetId,
              group,
              version,
              name,
              mime,
              file.size,
              digest(file.buffer),
              user,
            ],
          );
          await service.event(q, s, user, "media_uploaded", {
            fileId: id,
            assetId: req.params.assetId,
            version,
          });
          return created;
        });
        res.status(201).json({ success: true, data: row });
      } catch (e) {
        await store.remove(req.params.id, id);
        throw e;
      }
    }),
  );
  router.get(
    "/spaces/:id/files/:fileId",
    handle(async (user, req, res) => {
      await service.get(user, req.params.id);
      const [file]: FileRow[] = await db.query(
        `SELECT ${fields} FROM partner_support_files WHERE space_id=$1 AND id=$2 AND deleted_at IS NULL`,
        [req.params.id, req.params.fileId],
      );
      if (!file) throw new PartnerError(404, "FILE_NOT_FOUND");
      if (!store) throw new PartnerError(503, "MEDIA_NOT_CONFIGURED");
      const bytes = await store.get(req.params.id, file.id, file);
      res.setHeader("Content-Type", file.mime);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Cross-Origin-Resource-Policy", "same-site");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="media"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16))}`,
      );
      res.setHeader("Accept-Ranges", "bytes");
      const range = req.get("range");
      if (range) {
        const match = range.match(/^bytes=(\d+)-(\d*)$/);
        const start = match ? Number(match[1]) : -1,
          end = match && match[2] ? Number(match[2]) : bytes.length - 1;
        if (
          start < 0 ||
          start >= bytes.length ||
          end < start ||
          end >= bytes.length
        ) {
          res.status(416).setHeader("Content-Range", `bytes */${bytes.length}`);
          res.end();
          return;
        }
        res
          .status(206)
          .setHeader("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
        res.setHeader("Content-Length", end - start + 1);
        res.end(bytes.subarray(start, end + 1));
        return;
      }
      res.setHeader("Content-Length", bytes.length);
      res.end(bytes);
    }),
  );
  router.delete(
    "/spaces/:id/files/:fileId",
    handle(async (user, req, res) => {
      if (req.get("X-Requested-With") !== "O4O-Partner")
        throw new PartnerError(415, "JSON_REQUIRED");
      const rows: FileRow[] = await db.transaction(async (q) => {
        const s = await service.space(q, user, req.params.id, true);
        if (s.role === "viewer") throw new PartnerError(403, "READ_ONLY");
        if (!store) throw new PartnerError(503, "MEDIA_NOT_CONFIGURED");
        const [file] = await q.query(
          "SELECT group_id FROM partner_support_files WHERE id=$1 AND space_id=$2 AND deleted_at IS NULL",
          [req.params.fileId, s.id],
        );
        if (!file) throw new PartnerError(404, "FILE_NOT_FOUND");
        const files = await q.query(
          `WITH deleted AS (UPDATE partner_support_files SET deleted_at=now() WHERE group_id=$1 AND space_id=$2 AND deleted_at IS NULL RETURNING ${fields}) SELECT * FROM deleted`,
          [file.group_id, s.id],
        );
        await service.event(q, s, user, "media_removed", {
          groupId: file.group_id,
        });
        return files;
      });
      // Metadata is revoked atomically; failed physical cleanup cannot restore access.
      let pending = 0;
      if (store)
        await Promise.all(
          rows.map((f) =>
            store.remove(req.params.id, f.id).catch(() => {
              pending++;
            }),
          ),
        );
      res
        .status(pending ? 202 : 200)
        .json({ success: true, data: { cleanupPending: pending > 0 } });
    }),
  );
  router.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      res.status(400).json({ success: false, code: "MEDIA_UPLOAD_REJECTED" });
    },
  );
  return router;
}
