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
      WHERE id=$1 AND organization_id=$2 AND operator_user_id=$3 AND epoch=$4 AND active=true RETURNING *`,
      [row.id, row.organization_id, row.operator_user_id, row.epoch, ...values],
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
    return this.snapshot(await this.update(row, "operator_seen_at=now()"));
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
  async recordTranslation(
    actor: string,
    org: string,
    id: string,
    epoch: unknown,
    result: Json,
  ) {
    const row = await this.owned(actor, org, id, epoch);
    if (
      result.mode !== row.mode ||
      !CONSULTATION_SCREEN_LANGUAGES.some((l) => l.key === result.language) ||
      (result.direction === "to-customer" &&
        result.language !== row.language) ||
      !["to-customer", "to-staff"].includes(String(result.direction))
    )
      fail(409, "CONSULTATION_CHANGED", "상담 방식이나 언어가 변경되었습니다.");
    const deliveryId = randomUUID();
    await this.update(
      row,
      "translation=jsonb_set(translation,ARRAY[$5::text],$6::jsonb),operator_seen_at=now()",
      [result.direction, JSON.stringify({ ...result, deliveryId })],
    );
    return { ...result, deliveryId };
  }
  async action(actor: string, org: string, id: string, input: Json) {
    const row = await this.owned(actor, org, id, input.epoch);
    switch (input.action) {
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
        if (input.kind === "translation") {
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
        } else if (input.kind === "product") {
          const product = await this.product(actor, org, input);
          shared = {
            kind: "product",
            title: product.name,
            text: product.location
              ? `위치: ${product.location}`
              : "직원에게 상품 위치를 확인해 주세요.",
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
            text: phrase.text,
            language: "ko",
          };
        } else
          return fail(400, "INVALID_SHARE", "공유할 안내를 선택해 주세요.");
        // Recheck after the resource lookup and compare the generation in the UPDATE.
        await this.authorize(actor, org, row.mode);
        return this.snapshot(
          await this.update(row, "shared=$5::jsonb,operator_seen_at=now()", [
            JSON.stringify(shared),
          ]),
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
    return {
      id: current.id,
      name: current.name,
      epoch: current.epoch,
      version: Number(current.version),
      language: current.language,
      state: active ? "active" : "waiting",
      shared:
        active && Object.keys(current.shared).length ? current.shared : null,
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
