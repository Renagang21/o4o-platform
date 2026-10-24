import { CONSULTATION_SCREEN_LANGUAGES } from "../../apps/api-server/dist/modules/neture-pharmacy/services/multilingual-consultation.js";
/** Build api-server first. Disposable loopback PostgreSQL only; never reads production DB variables. */
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { DataSource } from "typeorm";
import express from "express";
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from "../../apps/api-server/dist/database/bootstrap/canonical-schema-baseline.js";
import { CANONICAL_SCHEMA_BASELINE_META } from "../../apps/api-server/dist/database/bootstrap/canonical-schema-baseline.meta.js";
import { INCREMENTAL_MIGRATIONS } from "../../apps/api-server/dist/database/incremental/manifest.js";
import { EXPECTED_SCHEMA_STATES } from "../../apps/api-server/dist/database/incremental/expected-schema-states.js";
import { computeSchemaFingerprint } from "../../apps/api-server/dist/database/bootstrap/schema-fingerprint.js";
import { ConsultationStationService } from "../../apps/api-server/dist/modules/neture-pharmacy/services/consultation-stations.js";
import { StoreStaffSupportService } from "../../apps/api-server/dist/modules/neture-pharmacy/services/store-staff-support.js";
import { ConsultationLayoutService } from "../../apps/api-server/dist/modules/neture-pharmacy/services/consultation-layout.js";
import { consultationWorkspaceRoutes } from "../../apps/api-server/dist/modules/neture-pharmacy/consultation-workspace.routes.js";
import { ConsultationGuidanceService } from "../../apps/api-server/dist/modules/neture-pharmacy/services/consultation-guidance.js";
import { NeturePharmacyError } from "../../apps/api-server/dist/modules/neture-pharmacy/constants.js";
const options = {
  type: "postgres",
  host: "127.0.0.1",
  port: 55456,
  username: "consultation_guidance_fixture",
};
const database = "o4o_consultation_guidance_fixture",
  marker = `store-consultation:${randomUUID()}`;
let count = 0;
async function check(name, fn) {
  await fn();
  console.log(`PASS ${++count}: ${name}`);
}
const actor = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const org = "33333333-3333-4333-8333-333333333333",
  otherOrg = "44444444-4444-4444-8444-444444444444";
let revoked = false;
const authorize = async (user, store) => {
  if (revoked || user !== actor || store !== org)
    throw new NeturePharmacyError(
      403,
      "STORE_ACCESS_REQUIRED",
      "Synthetic access denied",
    );
};
const guidanceFor = (db) =>
  new ConsultationGuidanceService(
    db,
    authorize,
    async () => {},
    async () => [2],
    async ({ text }) => ({ translation: "Translated: " + text }),
  );
const stations = (db) =>
  new ConsultationStationService(
    db,
    authorize,
    async (_a, o) => {
      assert.equal(o, org);
      return { name: "Fixture product", location: "A-1", publicKey: null };
    },
    (a, o, p) => guidanceFor(db).verify(a, o, p),
  );
const input = {
  stationKey: "counter-1",
  name: "Fixture counter",
  mode: "counter-pharmacist",
  language: "ko",
};
async function bootstrap(db) {
  const q = db.createQueryRunner();
  await q.connect();
  await q.startTransaction();
  try {
    for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions)
      await q.query(
        `CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`,
      );
    for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) await q.query(sql);
    for (let i = 0; i <= INCREMENTAL_MIGRATIONS.length; i++) {
      const fp = await computeSchemaFingerprint(q),
        expected = EXPECTED_SCHEMA_STATES[i];
      if (
        i === INCREMENTAL_MIGRATIONS.length &&
        process.argv.includes("--inspect-new-state")
      )
        console.log(`NEW_SCHEMA ${fp.hash} ${fp.lineCount}`);
      else {
        assert.equal(fp.hash, expected?.fingerprint, `schema prefix ${i}`);
        assert.equal(fp.lineCount, expected.fingerprintLineCount);
      }
      if (i < INCREMENTAL_MIGRATIONS.length) {
        await q.query("SET LOCAL search_path TO public");
        await new INCREMENTAL_MIGRATIONS[i]().up(q);
      }
    }
    await q.commitTransaction();
  } catch (e) {
    await q.rollbackTransaction();
    throw e;
  } finally {
    await q.release();
  }
  const q2 = db.createQueryRunner();
  await q2.connect();
  await q2.startTransaction();
  try {
    const migration = new (INCREMENTAL_MIGRATIONS.at(-1))();
    await migration.down(q2);
    const prior = await computeSchemaFingerprint(q2);
    assert.equal(
      prior.hash,
      EXPECTED_SCHEMA_STATES[INCREMENTAL_MIGRATIONS.length - 1].fingerprint,
    );
    await q2.query("SET LOCAL search_path TO public");
    await migration.up(q2);
    await q2.commitTransaction();
  } catch (e) {
    await q2.rollbackTransaction();
    throw e;
  } finally {
    await q2.release();
  }
  console.log("Schema prefixes and empty down/up PASS");
}

async function tests(db) {
  await db.query(
    `INSERT INTO users(id,email,status,"isActive","isEmailVerified") VALUES($1,'staff-a@example.invalid','active',true,true),($2,'staff-b@example.invalid','active',true,true)`,
    [actor, other],
  );
  await db.query(
    `INSERT INTO organizations(id,name,code,type,metadata) VALUES($1,'Fixture Pharmacy A','fixture-pharmacy-a','pharmacy','{"keep":"unchanged"}'),($2,'Fixture Pharmacy B','fixture-pharmacy-b','pharmacy','{}')`,
    [org, otherOrg],
  );
  await db.query(
    `INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,'active','Fixture Pharmacy A','fixture-a','fixture-a'),($3,$4,'active','Fixture Pharmacy B','fixture-b','fixture-b')`,
    [org, actor, otherOrg, other],
  );
  await db.query(
    "INSERT INTO store_local_products(id,organization_id,name) VALUES('55555555-5555-4555-8555-555555555555',$1,'Fixture product')",
    [org],
  );
  const service = stations(db),
    layouts = new ConsultationLayoutService(db);
  await check(
    "product lookup verifies active resource and owning store in SQL",
    async () => {
      const products = new StoreStaffSupportService(db),
        id = "55555555-5555-4555-8555-555555555555";
      assert.equal(
        (await products.product(org, "local", id)).name,
        "Fixture product",
      );
      await assert.rejects(products.product(otherOrg, "local", id), {
        code: "PRODUCT_NOT_FOUND",
      });
      await assert.rejects(products.product(org, "listing", id), {
        code: "PRODUCT_NOT_FOUND",
      });
      await db.query(
        "UPDATE store_local_products SET is_active=false WHERE id=$1",
        [id],
      );
      await assert.rejects(products.product(org, "local", id), {
        code: "PRODUCT_NOT_FOUND",
      });
      await db.query(
        "UPDATE store_local_products SET is_active=true WHERE id=$1",
        [id],
      );
    },
  );
  let room, peer, pairing;
  await check(
    "layout preset preserves metadata and validates pagination/enum",
    async () => {
      assert.equal((await layouts.read(org)).operatingType, "standard");
      assert.equal((await layouts.save(org, "large")).operatingType, "large");
      assert.equal(
        (
          await db.query("SELECT metadata FROM organizations WHERE id=$1", [
            org,
          ])
        )[0].metadata.keep,
        "unchanged",
      );
      assert.equal((await layouts.list({ q: "Fixture", page: 1 })).total, 2);
      await assert.rejects(layouts.list({ page: "Infinity" }), {
        code: "INVALID_PAGE",
      });
      await assert.rejects(layouts.save(org, "admin"), {
        code: "INVALID_LAYOUT",
      });
    },
  );
  await check("scoped open/resume and stale generations", async () => {
    room = await service.open(actor, org, input);
    assert.equal((await service.open(actor, org, input)).epoch, room.epoch);
    await assert.rejects(service.open(actor, otherOrg, input), {
      code: "STORE_ACCESS_REQUIRED",
    });
    await assert.rejects(
      service.open(actor, org, { ...input, language: "en" }),
      { code: "STATION_IN_USE" },
    );
    await assert.rejects(
      service.heartbeat(other, org, room.id, { epoch: room.epoch }),
      { code: "CONSULTATION_CHANGED" },
    );
    await assert.rejects(
      service.heartbeat(actor, otherOrg, room.id, { epoch: room.epoch }),
      { code: "CONSULTATION_CHANGED" },
    );
    await assert.rejects(
      service.open(actor, org, { ...input, mode: "floor-staff" }),
      { code: "INVALID_STATION" },
    );
  });
  await check(
    "one-time pairing is atomic and tokens are hashed at rest",
    async () => {
      pairing = await service.pairing(actor, org, room.id, {
        epoch: room.epoch,
      });
      const claims = await Promise.allSettled([
        service.claim({ code: pairing.code }),
        service.claim({ code: pairing.code }),
      ]);
      assert.equal(claims.filter((c) => c.status === "fulfilled").length, 1);
      peer = claims.find((c) => c.status === "fulfilled").value;
      const [row] = await db.query(
        "SELECT device_hash,pairing_hash FROM store_consultation_stations WHERE id=$1",
        [room.id],
      );
      assert.notEqual(row.device_hash, peer.token);
      assert.equal(row.device_hash.length, 64);
      assert.equal(row.pairing_hash, null);
      await assert.rejects(
        service.read({ id: room.id, token: "login-or-display-token" }),
        { code: "DEVICE_NOT_CONNECTED" },
      );
    },
  );
  await check(
    "only server-approved outgoing translation can be published",
    async () => {
      const draft = await service.recordTranslation(
        actor,
        org,
        room.id,
        room.epoch,
        {
          mode: input.mode,
          language: "ko",
          direction: "to-customer",
          translation: "Approved text",
          source: "Approved text",
        },
      );
      await service.action(actor, org, room.id, {
        epoch: room.epoch,
        action: "share",
        kind: "translation",
        deliveryId: draft.deliveryId,
      });
      const screen = await service.read(peer);
      assert.equal(screen.shared.text, "Approved text");
      for (const key of [
        "operator_user_id",
        "organization_id",
        "translation",
        "reply",
        "device_hash",
        "pairing_hash",
        "token",
      ])
        assert.equal(key in screen, false, key);
      await assert.rejects(
        service.action(actor, org, room.id, {
          epoch: room.epoch,
          action: "share",
          kind: "translation",
          deliveryId: randomUUID(),
          text: "forged",
        }),
        { code: "TRANSLATION_CHANGED" },
      );
      await assert.rejects(
        service.recordTranslation(actor, org, room.id, room.epoch, {
          mode: input.mode,
          language: "ja",
          direction: "to-customer",
        }),
        { code: "CONSULTATION_CHANGED" },
      );
    },
  );
  await check(
    "customer replies cannot overwrite an unacknowledged reply; acknowledgement compares identity",
    async () => {
      await service.reply({
        ...peer,
        epoch: room.epoch,
        text: "First reply",
        language: "ko",
      });
      await assert.rejects(
        service.reply({
          ...peer,
          epoch: room.epoch,
          text: "Overwrite",
          language: "ko",
        }),
        { code: "REPLY_PENDING" },
      );
      const privateState = await service.heartbeat(actor, org, room.id, {
        epoch: room.epoch,
      });
      await assert.rejects(
        service.action(actor, org, room.id, {
          epoch: room.epoch,
          action: "ack",
          replyId: randomUUID(),
        }),
        { code: "REPLY_CHANGED" },
      );
      await service.action(actor, org, room.id, {
        epoch: room.epoch,
        action: "ack",
        replyId: privateState.reply.id,
      });
      await service.reply({
        ...peer,
        epoch: room.epoch,
        text: "Second reply",
        language: "en",
      });
      await assert.rejects(
        service.action(actor, org, room.id, {
          epoch: room.epoch,
          action: "ack",
          replyId: privateState.reply.id,
        }),
        { code: "REPLY_CHANGED" },
      );
    },
  );
  await check(
    "revoked staff access stops reads, replies and private updates",
    async () => {
      revoked = true;
      try {
        await assert.rejects(service.read(peer), {
          code: "STORE_ACCESS_REQUIRED",
        });
        await assert.rejects(
          service.reply({
            ...peer,
            epoch: room.epoch,
            text: "Should not send",
            language: "ko",
          }),
          { code: "STORE_ACCESS_REQUIRED" },
        );
        await assert.rejects(
          service.heartbeat(actor, org, room.id, { epoch: room.epoch }),
          { code: "STORE_ACCESS_REQUIRED" },
        );
      } finally {
        revoked = false;
      }
    },
  );
  await check(
    "new pairing revokes the previous device and expired codes fail",
    async () => {
      const expired = await service.pairing(actor, org, room.id, {
        epoch: room.epoch,
      });
      await db.query(
        "UPDATE store_consultation_stations SET pairing_expires_at=now()-interval '1 second' WHERE id=$1",
        [room.id],
      );
      await assert.rejects(service.claim({ code: expired.code }), {
        code: "INVALID_PAIRING_CODE",
      });
      pairing = await service.pairing(actor, org, room.id, {
        epoch: room.epoch,
      });
      const replacement = await service.claim({ code: pairing.code });
      await assert.rejects(service.read(peer), {
        code: "DEVICE_NOT_CONNECTED",
      });
      peer = replacement;
    },
  );
  await check(
    "end clears payloads, a new generation rejects all previous work",
    async () => {
      const ended = await service.action(actor, org, room.id, {
        epoch: room.epoch,
        action: "end",
      });
      assert.equal(ended.active, false);
      assert.notEqual(ended.epoch, room.epoch);
      assert.equal((await service.read(peer)).state, "waiting");
      assert.equal((await service.read(peer)).shared, null);
      const previous = room;
      room = await service.open(actor, org, input);
      assert.notEqual(room.epoch, previous.epoch);
      assert.equal(room.reply, null);
      assert.deepEqual(room.shared, {});
      await assert.rejects(
        service.reply({
          ...peer,
          epoch: previous.epoch,
          text: "Late customer",
          language: "ko",
        }),
        { code: "CONSULTATION_CHANGED" },
      );
      await assert.rejects(
        service.validate(actor, org, room.id, previous.epoch),
        { code: "CONSULTATION_CHANGED" },
      );
      await assert.rejects(
        service.recordTranslation(actor, org, room.id, previous.epoch, {
          mode: input.mode,
          language: "ko",
          direction: "to-customer",
        }),
        { code: "CONSULTATION_CHANGED" },
      );
    },
  );
  await check(
    "operator absence hides content and the next open gets a fresh generation",
    async () => {
      await service.action(actor, org, room.id, {
        epoch: room.epoch,
        action: "share",
        kind: "product",
        productKind: "local",
        productId: randomUUID(),
      });
      await db.query(
        "UPDATE store_consultation_stations SET operator_seen_at=now()-interval '91 seconds' WHERE id=$1",
        [room.id],
      );
      const waiting = await service.read(peer);
      assert.equal(waiting.state, "waiting");
      assert.equal(waiting.shared, null);
      const previous = room;
      room = await service.open(actor, org, input);
      assert.notEqual(room.epoch, previous.epoch);
      assert.deepEqual(room.shared, {});
    },
  );
  await check(
    "replacement expires a pending code from the previous consultation",
    async () => {
      const old = await service.pairing(actor, org, room.id, {
        epoch: room.epoch,
      });
      room = await service.open(actor, org, { ...input, replace: true });
      await assert.rejects(service.claim({ code: old.code }), {
        code: "INVALID_PAIRING_CODE",
      });
    },
  );
  await check("disconnect invalidates device immediately", async () => {
    await service.action(actor, org, room.id, {
      epoch: room.epoch,
      action: "disconnect",
    });
    await assert.rejects(service.read(peer), { code: "DEVICE_NOT_CONNECTED" });
  });
  await check("populated down refuses to destroy data", async () => {
    const q = db.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    try {
      await assert.rejects(
        new (INCREMENTAL_MIGRATIONS.at(-1))().down(q),
        /STORE_CONSULTATION_DATA_EXISTS/,
      );
    } finally {
      await q.rollbackTransaction();
      await q.release();
    }
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS count FROM store_consultation_stations",
        )
      )[0].count,
      1,
    );
  });
  await guidanceTests(db);
  await db.query("DELETE FROM store_consultation_stations");
  console.log(`Consultation SQL fixture ${count} checks PASS`);
}
async function guidanceTests(db) {
  const group = "66666666-6666-4666-8666-666666666666",
    page = "77777777-7777-4777-8777-777777777777",
    product = "55555555-5555-4555-8555-555555555555";
  await db.query(
    `INSERT INTO store_multilingual_product_content_groups(id,organization_id,target_kind,target_id,title,public_key,status) VALUES($1,$2,'local',$3,'Fixture published guide','fixture-public-guide','published')`,
    [group, org, product],
  );
  await db.query(
    `INSERT INTO store_multilingual_product_content_pages(id,group_id,locale,title,summary,content_format,content,status) VALUES($1,$2,'ko','Fixture source','첫 번째 공개 문단','html',$3::jsonb,'published')`,
    [
      page,
      group,
      JSON.stringify({
        html: "<p>두 번째 공개 문단</p><p>세 번째 공개 문단</p>",
      }),
    ],
  );
  const guides = guidanceFor(db),
    service = stations(db),
    base = {
      mode: "counter-pharmacist",
      language: "ko",
      intent: "product-details",
      question: "Private inquiry",
      productKind: "local",
      productId: product,
    };
  let room = await service.open(actor, org, {
      ...input,
      stationKey: "counter-guide",
    }),
    prepared,
    delivery,
    peer;
  await check(
    "guidance resolves only current store published source and marks missing locale",
    async () => {
      prepared = await guides.prepare(actor, org, { ...base, language: "ja" });
      assert.equal(prepared.card.language, "ko");
      assert.equal(prepared.card.fallbackUsed, true);
      await assert.rejects(guides.prepare(actor, otherOrg, base), {
        code: "STORE_ACCESS_REQUIRED",
      });
    },
  );
  await check(
    "AI selection is verbatim, server-issued and never persists the question",
    async () => {
      prepared = await guides.prepare(actor, org, { ...base, useAi: true });
      assert.equal(prepared.card.text, "두 번째 공개 문단");
      delivery = await service.recordGuidance(
        actor,
        org,
        room.id,
        room.epoch,
        prepared.proof,
      );
      await service.action(actor, org, room.id, {
        epoch: room.epoch,
        action: "share",
        kind: "guidance",
        deliveryId: delivery,
      });
      const pairing = await service.pairing(actor, org, room.id, {
        epoch: room.epoch,
      });
      peer = await service.claim({ code: pairing.code });
      const screen = await service.read(peer);
      assert.equal(screen.shared.text, "두 번째 공개 문단");
      assert.equal(JSON.stringify(screen).includes("sourceVersion"), false);
      const [row] = await db.query(
        "SELECT translation FROM store_consultation_stations WHERE id=$1",
        [room.id],
      );
      assert.equal(JSON.stringify(row).includes("Private inquiry"), false);
      await assert.rejects(
        service.action(actor, org, room.id, {
          epoch: room.epoch,
          action: "share",
          kind: "guidance",
          deliveryId: randomUUID(),
        }),
        { code: "GUIDANCE_CHANGED" },
      );
    },
  );
  await check(
    "withdrawn guidance disappears from customer reads and cannot be newly shared",
    async () => {
      await db.query(
        "UPDATE store_multilingual_product_content_pages SET status='draft',updated_at=now() WHERE id=$1",
        [page],
      );
      assert.equal((await service.read(peer)).shared, null);
      await assert.rejects(
        service.action(actor, org, room.id, {
          epoch: room.epoch,
          action: "share",
          kind: "guidance",
          deliveryId: delivery,
        }),
        { code: "GUIDANCE_SOURCE_CHANGED" },
      );
      await db.query(
        "UPDATE store_multilingual_product_content_pages SET status='published',updated_at=now() WHERE id=$1",
        [page],
      );
    },
  );
  await check(
    "language correction keeps the session, device and pending reply, invalidating prepared output",
    async () => {
      await service.reply({
        ...peer,
        epoch: room.epoch,
        text: "Unsent follow-up",
        language: "ko",
      });
      const oldEpoch = room.epoch;
      room = await service.action(actor, org, room.id, {
        epoch: room.epoch,
        action: "language",
        language: "ja",
      });
      assert.equal(room.epoch, oldEpoch);
      assert.equal(room.connected, true);
      assert.equal(room.reply.text, "Unsent follow-up");
      assert.equal((await service.read(peer)).language, "ja");
      assert.equal((await service.read(peer)).shared, null);
      await assert.rejects(
        service.recordGuidance(actor, org, room.id, room.epoch, prepared.proof),
        { code: "CONSULTATION_CHANGED" },
      );
    },
  );
  await check('localized pharmacist notice retains its proof through a JSONB round trip',async()=>{
    const notice=await guides.prepare(actor,org,{...base,intent:'pharmacist',language:'ja'});
    const id=await service.recordGuidance(actor,org,room.id,room.epoch,notice.proof);
    await service.action(actor,org,room.id,{epoch:room.epoch,action:'share',kind:'guidance',deliveryId:id});
    assert.equal((await service.read(peer)).shared.text,'薬の選び方や服用については、薬剤師にご相談ください。');
  });

}
async function serve(db) {
  const service = stations(db),
    app = express();
  app.use(express.json());
  const guard = (req, res, next) => {
    if (req.headers.authorization !== "Bearer synthetic-staff") {
      res.status(401).json({ success: false });
      return;
    }
    req.user = { id: actor };
    req.organizationId = org;
    next();
  };
  const deny = (req, res, next) =>
    req.headers.authorization === "Bearer synthetic-admin"
      ? next()
      : res.status(403).json({ success: false });
  app.use(
    "/api/v1/neture",
    consultationWorkspaceRoutes(db, service, [guard], [deny], guidanceFor(db)),
  );
  app.get(
    "/api/v1/neture/pharmacy/multilingual-consultation/context",
    guard,
    (_req, res) =>
      res.json({
        success: true,
        data: {
          organizationId: org,
          languages: CONSULTATION_SCREEN_LANGUAGES,
        phrases: [
            { key: "pharmacist", text: "약사에게 연결해 드리겠습니다." },
          ],
          supportAllowed: true,
          modes: [
            {
              key: "counter-pharmacist",
              label: "매대 약사 상담",
              professional: true,
              entitled: true,
              allowed: true,
            },
            {
              key: "counter-staff",
              label: "매대 직원 안내",
              professional: false,
              entitled: true,
              allowed: true,
            },
            {
              key: "floor-staff",
              label: "매장 직원 안내",
              professional: false,
              entitled: true,
              allowed: true,
            },
            {
              key: "floor-pharmacist",
              label: "매장 약사 상담",
              professional: true,
              entitled: true,
              allowed: true,
            },
          ],
        },
      }),
  );
  app.post(
    "/api/v1/neture/pharmacy/multilingual-consultation/translate",
    guard,
    async (req, res) => {
      try {
        const b = req.body;
        if (b.stationId)
          await service.validate(actor, org, b.stationId, b.epoch);
        const result = {
          organizationId: org,
          mode: b.mode,
          language: b.language,
          direction: b.direction,
          source: b.text || "약사에게 연결해 드리겠습니다.",
          translation: b.text || "약사에게 연결해 드리겠습니다.",
        };
        res.json({
          success: true,
          data: b.stationId
            ? await service.recordTranslation(
                actor,
                org,
                b.stationId,
                b.epoch,
                result,
              )
            : result,
        });
      } catch (e) {
        res
          .status(e.httpStatus || 503)
          .json({ success: false, error: e.message, code: e.code });
      }
    },
  );
  app.get(
    "/api/v1/neture/pharmacy/staff-support/products",
    guard,
    (_req, res) =>
      res.json({
        success: true,
        data: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            kind: "local",
            name: "Fixture product",
            location: "A-1",
            publicKey: null,
          },
        ],
      }),
  );
  const server = app.listen(55457, "127.0.0.1");
  await once(server, "listening");
  console.log("FIXTURE_SERVER_READY 55457");
  await Promise.race([once(process, "SIGINT"), once(process, "SIGTERM")]);
  await new Promise((resolve) => server.close(resolve));
}

async function main() {
  const control = new DataSource({ ...options, database: "postgres" });
  await control.initialize();
  let created = false;
  try {
    assert.equal(
      (
        await control.query("SELECT 1 FROM pg_database WHERE datname=$1", [
          database,
        ])
      ).length,
      0,
      "Refusing existing fixture database",
    );
    await control.query(`CREATE DATABASE ${database}`);
    created = true;
    await control.query(`COMMENT ON DATABASE ${database} IS '${marker}'`);
    const db = new DataSource({
      ...options,
      database,
      extra: {
        max: 4,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000,
      },
      synchronize: false,
      installExtensions: false,
    });
    await db.initialize();
    try {
      await bootstrap(db);
      if (!process.argv.includes("--inspect-new-state")) {
        await tests(db);
        if (process.argv.includes("--serve")) await serve(db);
      }
    } finally {
      await db.destroy();
    }
  } finally {
    try {
      if (created) {
        const [row] = await control.query(
          "SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1",
          [database],
        );
        assert.equal(row?.marker, marker, "Refusing changed fixture ownership");
        await control.query(`DROP DATABASE ${database}`);
        assert.equal(
          (
            await control.query("SELECT 1 FROM pg_database WHERE datname=$1", [
              database,
            ])
          ).length,
          0,
        );
        console.log("Fixture cleanup PASS: database count 0");
      }
    } finally {
      await control.destroy();
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
