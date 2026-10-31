import {
  consultationCopy,
  validConsultationLanguage,
} from "./consultation-copy.js";
import type { GuidanceProof } from "./consultation-guidance.js";
import { ModelControlService } from '../../../services/ai-management/model-controls.js';
import { consultationRuntimeSchema } from '../../../services/ai-management/consultation-runtime.js';
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { NeturePharmacyError } from "../constants.js";
import {
  CONSULTATION_SCREEN_LANGUAGES,
  CONSULTATION_STAFF_PHRASES,
} from "./multilingual-consultation.js";

type Json = Record<string, unknown>;
type Row = {
  id: string;
  organization_id: string;
  station_key: string;
  name: string;
  operator_user_id: string;
  mode: string;
  language: string;
  active: boolean;
  epoch: string;
  version: string | number;
  shared: Json;
  translation: Record<string, Json>;
  reply: Json;
  device_hash: string | null;
  device_seen_at: Date | string | null;
  operator_seen_at: Date | string | null;
};
export type StationAuthorization = (
  actor: string,
  org: string,
  mode: string,
) => Promise<void>;
export type StationProduct = (
  actor: string,
  org: string,
  input: Json,
) => Promise<{ name: string; location: string; publicKey?: string | null }>;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const recent = (date: Row["operator_seen_at"]) =>
  !!date && Date.now() - new Date(date).getTime() < 90_000;
const fail = (status: number, code: string, message: string): never => {
  throw new NeturePharmacyError(status, code, message);
};

/** One current delivery state per store/counter. Never a user-scoped AI history. */
export class ConsultationStationService {
  constructor(
    private readonly db: DataSource,
    private readonly authorize: StationAuthorization,
    private readonly product: StationProduct,
    private readonly verifyGuidance?: (
      actor: string,
      org: string,
      proof: GuidanceProof,
    ) => Promise<void>,
    private readonly verifySupport?: (actor: string, org: string, mode: string, proof: Json) => Promise<void>,
  ) {}
  private async query(sql: string, values: unknown[]) {
    const result = await this.db.query(sql, values);
    // PostgreSQL UPDATE ... RETURNING is [rows, count] in TypeORM's raw query API.
    return (Array.isArray(result[0]) ? result[0] : result) as Row[];
  }
  private snapshot(row: Row) {
    return {
      id: row.id,
      stationKey: row.station_key,
      name: row.name,
      mode: row.mode,
      language: row.language,
      active: row.active,
      epoch: row.epoch,
      version: Number(row.version),
      shared: row.shared,
      reply: Object.keys(row.reply).length ? row.reply : null,
      connected: !!row.device_hash,
      deviceSeenAt: row.device_seen_at,
      operatorSeenAt: row.operator_seen_at,
    };
  }
  async open(actor: string, org: string, input: Json) {
    if (
      typeof input.stationKey !== "string" ||
      !/^[a-z0-9_-]{1,40}$/i.test(input.stationKey) ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 80 ||
      !["counter-pharmacist", "counter-staff"].includes(String(input.mode)) ||
      !CONSULTATION_SCREEN_LANGUAGES.some((l) => l.key === input.language)
    )
      fail(400, "INVALID_STATION", "상담 자리와 방식을 확인해 주세요.");
    await this.authorize(actor, org, String(input.mode));
    const stationName = String(input.name).trim();
    return this.db.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `consultation:${org}:${input.stationKey}`,
      ]);
      const [row]: Row[] = await manager.query(
        "SELECT * FROM store_consultation_stations WHERE organization_id=$1 AND station_key=$2 FOR UPDATE",
        [org, input.stationKey],
      );
      if (
        row?.active &&
        recent(row.operator_seen_at) &&
        input.replace !== true
      ) {
        if (
          row.operator_user_id !== actor ||
          row.mode !== input.mode ||
          row.language !== input.language
        )
          fail(
            409,
            "STATION_IN_USE",
            "이 자리에서 진행 중인 상담이 있습니다. 새 상담 시작 여부를 확인해 주세요.",
          );
        const [rows] = await manager.query(
          "UPDATE store_consultation_stations SET operator_seen_at=now() WHERE id=$1 RETURNING *",
          [row.id],
        );
        const renewed = rows[0];
        return this.snapshot(renewed);
      }
      // A stopped/abandoned station starts a new generation; paired hardware stays paired.
      const [updated] = await manager.query(
        `INSERT INTO store_consultation_stations
        (id,organization_id,station_key,name,operator_user_id,mode,language,active,epoch,operator_seen_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,now()) ON CONFLICT(organization_id,station_key) DO UPDATE SET
        name=EXCLUDED.name,operator_user_id=EXCLUDED.operator_user_id,mode=EXCLUDED.mode,language=EXCLUDED.language,
        active=true,epoch=EXCLUDED.epoch,shared='{}',translation='{}',reply='{}',pairing_hash=NULL,pairing_expires_at=NULL,version=store_consultation_stations.version+1,
        operator_seen_at=now(),updated_at=now() RETURNING *`,
        [
          row?.id ?? randomUUID(),
          org,
          input.stationKey,
          stationName,
          actor,
          input.mode,
          input.language,
          randomUUID(),
        ],
      );
      return this.snapshot(updated);
    });
  }
  private async owned(actor: string, org: string, id: string, epoch: unknown) {
    if (!uuid(id) || !uuid(epoch))
      fail(400, "INVALID_STATION", "상담 자리를 확인해 주세요.");
    const [row]: Row[] = await this.query(
      "SELECT * FROM store_consultation_stations WHERE id=$1 AND organization_id=$2",
      [id, org],
    );
    if (
      !row ||
      row.operator_user_id !== actor ||
      row.epoch !== epoch ||
      !row.active
    )
      fail(
        409,
        "CONSULTATION_CHANGED",
        "상담 담당자나 내용이 변경되었습니다. 현재 상담을 다시 확인해 주세요.",
      );
    await this.authorize(actor, org, row.mode);
    return row;
  }
  async validate(actor: string, org: string, id: string, epoch: unknown) {
    await this.owned(actor, org, id, epoch);
  }
  private async update(row: Row, sql: string, values: unknown[] = []) {
    const [updated] = await this.query(
      `UPDATE store_consultation_stations SET ${sql},version=version+1,updated_at=now()
      WHERE id=$1 AND organization_id=$2 AND operator_user_id=$3 AND epoch=$4 AND active=true AND language=$${values.length + 5} RETURNING *`,
      [row.id, row.organization_id, row.operator_user_id, row.epoch, ...values, row.language],
    );
    if (!updated)
      fail(
        409,
        "CONSULTATION_CHANGED",
        "상담이 변경되었습니다. 다시 확인해 주세요.",
      );
    return updated as Row;
  }
  async heartbeat(actor: string, org: string, id: string, input: Json) {
    const row = await this.owned(actor, org, id, input.epoch);
    // A heartbeat publishes no content. Accept a concurrent language correction,
    // but still fence the actor and consultation generation.
    const [current] = await this.query(
      `UPDATE store_consultation_stations SET operator_seen_at=now(),version=version+1,updated_at=now()
       WHERE id=$1 AND organization_id=$2 AND operator_user_id=$3 AND epoch=$4 AND active=true RETURNING *`,
      [row.id, org, actor, row.epoch],
    );
    if (!current) fail(409, "CONSULTATION_CHANGED", "상담이 변경되었습니다. 다시 확인해 주세요.");
    return this.snapshot(current);
  }
  async pairing(actor: string, org: string, id: string, input: Json) {
    const row = await this.owned(actor, org, id, input.epoch);
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomBytes(5).toString("hex").toUpperCase();
      try {
        await this.update(
          row,
          `pairing_hash=$5,pairing_expires_at=now()+interval '10 minutes'`,
          [hash(code)],
        );
        return {
          code: `${code.slice(0, 5)}-${code.slice(5)}`,
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        };
      } catch (error) {
        if ((error as { code?: string }).code !== "23505") throw error;
      }
    }
    return fail(
      503,
      "PAIRING_UNAVAILABLE",
      "연결 코드를 만들지 못했습니다. 다시 시도해 주세요.",
    );
  }
  async authorizeSpeech(actor: string, org: string, mode: string) {
    await this.authorize(actor, org, mode);
  }
  async recordTranslation(
    actor: string,
    org: string,
    id: string,
    epoch: unknown,
    result: Json,
  ) {
    const row = await this.owned(actor, org, id, epoch);
    if (result.supportSource) {
      if (!this.verifySupport) fail(503, 'GUIDANCE_UNAVAILABLE', '상담 근거를 확인하지 못했습니다.');
      await this.verifySupport!(actor, org, row.mode, result.supportSource as Json);
    }
    if (
      result.mode !== row.mode ||
      !CONSULTATION_SCREEN_LANGUAGES.some((l) => l.key === result.language) ||
      (result.direction === "to-customer" &&
        result.language !== row.language) ||
      !["to-customer", "to-staff"].includes(String(result.direction))
    )
      fail(409, "CONSULTATION_CHANGED", "상담 방식이나 언어가 변경되었습니다.");
    const deliveryId = randomUUID();
    if (result.detectedLanguage !== undefined && (!validConsultationLanguage(result.detectedLanguage) ||
      result.direction !== 'to-staff' || result.initialStationLanguage !== row.language))
      fail(409, 'CONSULTATION_CHANGED', '상담 언어가 변경되었습니다. 현재 언어로 다시 준비해 주세요.');
    const detected = typeof result.detectedLanguage === 'string' ? result.detectedLanguage : null;
    const updated = await this.update(row,
      detected ? "language=$7,shared='{}',translation=jsonb_set('{}'::jsonb,ARRAY[$5::text],$6::jsonb),operator_seen_at=now()"
        : "translation=jsonb_set(translation,ARRAY[$5::text],$6::jsonb),operator_seen_at=now()",
      [result.direction, JSON.stringify({ ...result, deliveryId }), ...(detected ? [detected] : [])]);
    return { ...result, deliveryId, ...(detected ? { station: this.snapshot(updated) } : {}) };
  }
  async recordGuidance(
    actor: string,
    org: string,
    id: string,
    epoch: unknown,
    proof: GuidanceProof,
  ) {
    const row = await this.owned(actor, org, id, epoch);
    if (proof.mode !== row.mode || proof.requestedLanguage !== row.language)
      fail(409, "CONSULTATION_CHANGED", "상담 언어나 방식이 변경되었습니다.");
    if (!this.verifyGuidance)
      fail(503, "GUIDANCE_UNAVAILABLE", "상담 안내를 확인하지 못했습니다.");
    await this.verifyGuidance!(actor, org, proof);
    const deliveryId = randomUUID();
    await this.update(
      row,
      "translation=jsonb_set(translation,'{guidance}',$5::jsonb),operator_seen_at=now()",
      [JSON.stringify({ ...proof, deliveryId })],
    );
    return deliveryId;
  }
  async action(actor: string, org: string, id: string, input: Json) {
    const row = await this.owned(actor, org, id, input.epoch);
    switch (input.action) {
      case "language": {
        if (!validConsultationLanguage(input.language))
          fail(400, "INVALID_LANGUAGE", "고객 언어를 확인해 주세요.");
        return this.snapshot(
          await this.update(
            row,
            "language=$5,shared='{}',translation='{}',operator_seen_at=now()",
            [input.language],
          ),
        );
      }
      case "end":
        return this.snapshot(
          await this.update(
            row,
            `active=false,epoch=$5,shared='{}',translation='{}',reply='{}',pairing_hash=NULL,pairing_expires_at=NULL`,
            [randomUUID()],
          ),
        );
      case "disconnect":
        return this.snapshot(
          await this.update(
            row,
            `device_hash=NULL,device_seen_at=NULL,pairing_hash=NULL,pairing_expires_at=NULL`,
          ),
        );
      case "ack": {
        if (row.reply.id !== input.replyId)
          fail(409, "REPLY_CHANGED", "새 고객 답변을 다시 확인해 주세요.");
        // The row is locked by an atomic compare: never acknowledge a later customer reply.
        const [updated] = await this.query(
          `UPDATE store_consultation_stations SET reply='{}',version=version+1,updated_at=now()
          WHERE id=$1 AND organization_id=$2 AND operator_user_id=$3 AND epoch=$4 AND active=true AND reply->>'id'=$5 RETURNING *`,
          [row.id, org, actor, row.epoch, input.replyId],
        );
        if (!updated) fail(409, "REPLY_CHANGED", "고객 답변이 변경되었습니다.");
        return this.snapshot(updated);
      }
      case "share": {
        let shared: Json;
        let sharedProof: Json | null = null;
        let supportProof: Json | null = null;
        if (input.kind === "guidance") {
          const prepared = row.translation.guidance;
          if (
            !prepared ||
            prepared.deliveryId !== input.deliveryId ||
            prepared.requestedLanguage !== row.language ||
            !this.verifyGuidance
          )
            fail(409, "GUIDANCE_CHANGED", "공유할 안내를 다시 준비해 주세요.");
          await this.verifyGuidance!(
            actor,
            org,
            prepared as unknown as GuidanceProof,
          );
          shared = prepared.card as Json;
          sharedProof = prepared;
        } else if (input.kind === "translation") {
          const draft = row.translation["to-customer"];
          if (!draft || draft.deliveryId !== input.deliveryId)
            fail(
              409,
              "TRANSLATION_CHANGED",
              "공유할 번역을 다시 준비해 주세요.",
            );
          shared = {
            kind: "translation",
            title: "상담 안내",
            text: draft.translation,
            language: draft.language,
          };
          if (draft.supportSource) {
            if (!this.verifySupport) fail(503, 'GUIDANCE_UNAVAILABLE', '상담 근거를 확인하지 못했습니다.');
            supportProof = draft.supportSource as Json;
            await this.verifySupport!(actor, org, row.mode, supportProof);
          }
        } else if (input.kind === "product") {
          const product = await this.product(actor, org, input);
          shared = {
            kind: "product",
            title: product.name,
            text: product.location
              ? `${consultationCopy(row.language).location}: ${product.location}`
              : consultationCopy(row.language).missingLocation,
            language: row.language,
            publicKey: product.publicKey ?? null,
          };
        } else if (input.kind === "notice") {
          const phrase = CONSULTATION_STAFF_PHRASES.find(
            (p) => p.key === input.phrase,
          );
          if (!phrase)
            fail(400, "INVALID_NOTICE", "안내 문구를 확인해 주세요.");
          shared = {
            kind: "notice",
            title: "매장 안내",
            text:
              input.phrase === "pharmacist"
                ? consultationCopy(row.language).pharmacist
                : phrase.text,
            language: input.phrase === "pharmacist" ? row.language : "ko",
          };
        } else
          return fail(400, "INVALID_SHARE", "공유할 안내를 선택해 주세요.");
        // Recheck after the resource lookup and compare the generation in the UPDATE.
        await this.authorize(actor, org, row.mode);
        return this.snapshot(
          await this.update(
            row,
            "shared=$5::jsonb,translation=(CASE WHEN $6::jsonb IS NULL THEN translation-'shared-guidance' ELSE jsonb_set(translation,'{shared-guidance}',$6::jsonb) END)-'shared-support'||CASE WHEN $7::jsonb IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('shared-support',$7::jsonb) END,operator_seen_at=now()",
            [
              JSON.stringify(shared),
              sharedProof ? JSON.stringify(sharedProof) : null,
              supportProof ? JSON.stringify(supportProof) : null,
            ],
          ),
        );
      }
      default:
        return fail(400, "INVALID_ACTION", "상담 동작을 확인해 주세요.");
    }
  }
  private async peer(input: Json) {
    if (
      !uuid(input.id) ||
      typeof input.token !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.token)
    )
      fail(401, "DEVICE_NOT_CONNECTED", "고객 화면을 다시 연결해 주세요.");
    const [row]: Row[] = await this.query(
      "SELECT * FROM store_consultation_stations WHERE id=$1 AND device_hash=$2",
      [input.id, hash(String(input.token))],
    );
    if (!row)
      fail(401, "DEVICE_NOT_CONNECTED", "고객 화면 연결이 해제되었습니다.");
    if (!row.operator_user_id)
      fail(
        403,
        "CONSULTATION_ACCESS_REVOKED",
        "상담 이용 상태를 확인해 주세요.",
      );
    await this.authorize(row.operator_user_id, row.organization_id, row.mode);
    return row;
  }
  private async verifySharedSupport(row: Row) {
    const proof = row.translation['shared-support'];
    if (!proof) return;
    if (!this.verifySupport) fail(503, 'GUIDANCE_UNAVAILABLE', '상담 근거를 확인하지 못했습니다.');
    await this.verifySupport!(row.operator_user_id, row.organization_id, row.mode, proof as Json);
  }
  async deviceSpeechAccess(input: Json) {
    const row = await this.peer(input);
    if (!row.active || !recent(row.operator_seen_at) || row.epoch !== input.epoch)
      fail(409, 'CONSULTATION_CHANGED', '현재 상담을 다시 연결해 주세요.');
    const proof = row.translation['shared-guidance'];
    if (proof && this.verifyGuidance) await this.verifyGuidance(row.operator_user_id, row.organization_id, proof as unknown as GuidanceProof);
    await this.verifySharedSupport(row);
    return { actorId: row.operator_user_id, organizationId: row.organization_id, mode: row.mode, language: row.language, shared: row.shared };
  }
  async claim(input: Json) {
    const code =
      typeof input.code === "string"
        ? input.code.replace(/[-\s]/g, "").toUpperCase()
        : "";
    if (!/^[A-F0-9]{10}$/.test(code))
      fail(400, "INVALID_PAIRING_CODE", "연결 코드를 확인해 주세요.");
    const [row]: Row[] = await this.query(
      `SELECT * FROM store_consultation_stations WHERE pairing_hash=$1 AND pairing_expires_at>now() AND active=true`,
      [hash(code)],
    );
    if (!row || !recent(row.operator_seen_at))
      fail(
        404,
        "INVALID_PAIRING_CODE",
        "연결 코드가 만료되었거나 상담 화면이 열려 있지 않습니다.",
      );
    await this.authorize(row.operator_user_id, row.organization_id, row.mode);
    const token = randomBytes(32).toString("hex");
    const [updated] = await this.query(
      `UPDATE store_consultation_stations SET device_hash=$2,device_seen_at=now(),pairing_hash=NULL,pairing_expires_at=NULL,version=version+1
      WHERE id=$1 AND pairing_hash=$3 AND pairing_expires_at>now() AND active=true AND epoch=$4 RETURNING id,name`,
      [row.id, hash(token), hash(code), row.epoch],
    );
    if (!updated)
      fail(
        404,
        "INVALID_PAIRING_CODE",
        "이미 사용되었거나 만료된 연결 코드입니다.",
      );
    return { id: updated.id, name: updated.name, token };
  }
  async read(input: Json) {
    const row = await this.peer(input);
    const [current]: Row[] = await this.query(
      `UPDATE store_consultation_stations SET device_seen_at=now()
      WHERE id=$1 AND device_hash=$2 AND epoch=$3 AND operator_user_id=$4 RETURNING *`,
      [row.id, hash(String(input.token)), row.epoch, row.operator_user_id],
    );
    if (!current)
      fail(
        409,
        "CONSULTATION_CHANGED",
        "상담이 변경되었습니다. 다시 확인해 주세요.",
      );
    const active = current.active && recent(current.operator_seen_at);
    let visible =
      active && Object.keys(current.shared).length ? current.shared : null;
    const proof = current.translation["shared-guidance"];
    if (visible && proof && this.verifyGuidance) {
      try {
        await this.verifyGuidance(
          current.operator_user_id,
          current.organization_id,
          proof as unknown as GuidanceProof,
        );
      } catch (error) {
        if (
          error instanceof NeturePharmacyError &&
          [403, 404, 409].includes(error.httpStatus)
        )
          visible = null;
        else throw error;
      }
    }
    if (visible && current.translation['shared-support']) {
      try { await this.verifySharedSupport(current); }
      catch (error) {
        if (error instanceof NeturePharmacyError && [403, 404, 409].includes(error.httpStatus)) visible = null;
        else throw error;
      }
    }
    const [unchanged] = await this.query(
      "SELECT id FROM store_consultation_stations WHERE id=$1 AND device_hash=$2 AND epoch=$3 AND language=$4 AND active=$5 AND shared=$6::jsonb",
      [
        current.id,
        hash(String(input.token)),
        current.epoch,
        current.language,
        current.active,
        JSON.stringify(current.shared),
      ],
    );
    if (!unchanged)
      fail(
        409,
        "CONSULTATION_CHANGED",
        "상담이 변경되었습니다. 다시 확인해 주세요.",
      );
    return {
      id: current.id,
      name: current.name,
      epoch: current.epoch,
      version: Number(current.version),
      language: current.language,
      state: active ? "active" : "waiting",
      shared: visible,
      runtime: consultationRuntimeSchema.parse((await new ModelControlService(this.db).read()).consultation ?? {}),
      languages: CONSULTATION_SCREEN_LANGUAGES,
    };
  }
  async reply(input: Json) {
    const row = await this.peer(input);
    if (
      !row.active ||
      !recent(row.operator_seen_at) ||
      row.epoch !== input.epoch
    )
      fail(409, "CONSULTATION_CHANGED", "현재 상담을 다시 확인해 주세요.");
    if (
      typeof input.text !== "string" ||
      !input.text.trim() ||
      input.text.length > 1000 ||
      !CONSULTATION_SCREEN_LANGUAGES.some((l) => l.key === input.language)
    )
      fail(400, "INVALID_REPLY", "답변을 1,000자 이내로 입력해 주세요.");
    const reply = {
      id: randomUUID(),
      text: String(input.text).trim(),
      language: input.language,
    };
    const [saved] = await this.query(
      `UPDATE store_consultation_stations SET reply=$5::jsonb,version=version+1,device_seen_at=now(),updated_at=now()
      WHERE id=$1 AND device_hash=$2 AND epoch=$3 AND operator_user_id=$4 AND active=true AND reply='{}'::jsonb RETURNING id`,
      [
        row.id,
        hash(String(input.token)),
        row.epoch,
        row.operator_user_id,
        JSON.stringify(reply),
      ],
    );
    if (!saved)
      fail(
        409,
        "REPLY_PENDING",
        "앞선 답변을 직원이 확인하고 있습니다. 잠시 후 다시 시도해 주세요.",
      );
    return { sent: true };
  }
}
