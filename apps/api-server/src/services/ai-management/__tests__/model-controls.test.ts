import {
  ModelControlService,
  MODEL_CONTROL_KEY,
  ModelControlError,
} from "../model-controls.js";
import {
  executeManagedAi,
  prepareManagedAiRequest,
} from "../runtime-models.js";

function fixture() {
  let value: any = null;
  const references: any[] = [];
  const db = {
    isInitialized: true,
    query: jest.fn(async (sql: string, params?: any[]) => {
      if (sql.startsWith("SELECT pg_advisory_xact_lock")) return [];
      if (sql.startsWith("SELECT value FROM settings"))
        return value ? [{ value: structuredClone(value) }] : [];
      if (sql.startsWith("SELECT 'gemini' AS provider")) return references;
      if (sql.startsWith("INSERT INTO settings")) {
        if (value && value.revision !== params![2]) return [];
        value = JSON.parse(params![1]);
        return [{ key: MODEL_CONTROL_KEY }];
      }
      throw new Error("Unexpected test SQL");
    }),
  };
  Object.assign(db, {
    transaction: async (run: (manager: typeof db) => Promise<unknown>) =>
      run(db),
  });
  return {
    db,
    references,
    get value() {
      return value;
    },
    corrupt: (next: any) => {
      value = next;
    },
  };
}
const actor = "10000000-0000-4000-8000-000000000001";
const model = {
  provider: "openai" as const,
  id: "gpt-fixture",
  name: "Synthetic model",
  capabilities: ["text" as const, "image" as const],
};
it("persists create, name edit, unused ID replacement and deletion across service instances without touching historical usage", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  const created = await service.change(0, actor, { action: "create", model });
  const updated = await new ModelControlService(db).change(
    created.revision,
    actor,
    {
      action: "update",
      provider: model.provider,
      id: model.id,
      model: { ...model, name: "Renamed", id: "gpt-fixture-new" },
    },
  );
  expect(updated.deleted).toContain("openai:gpt-fixture");
  expect(updated.models.find((x) => x.id === "gpt-fixture-new")?.name).toBe(
    "Renamed",
  );
  const deleted = await service.change(updated.revision, actor, {
    action: "delete",
    provider: "openai",
    id: "gpt-fixture-new",
  });
  expect(
    (await new ModelControlService(db).snapshot()).models.some(
      (x) => x.id === "gpt-fixture-new",
    ),
  ).toBe(false);
  expect(deleted.deleted).toContain("openai:gpt-fixture-new");
  expect(
    db.query.mock.calls
      .filter(([sql]) => !sql.startsWith("SELECT"))
      .every(([sql]) => sql.startsWith("INSERT INTO settings")),
  ).toBe(true);
  expect(JSON.stringify(deleted)).not.toContain(actor);
});
it("assigns a newly registered model, protects it, and releases the protection only after unassigning", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  await service.change(0, actor, { action: "create", model });
  const selected = await service.change(1, actor, {
    action: "select",
    target: "home.chat",
    selection: { provider: "openai", model: model.id },
  });
  expect(selected.protectedModels).toContain("openai:" + model.id);
  expect(
    await new ModelControlService(db).resolve("home.chat", {
      provider: "gemini",
      model: "gemini-3.8-flash",
    }),
  ).toMatchObject({ provider: "openai", model: model.id });
  await expect(
    service.change(2, actor, {
      action: "delete",
      provider: "openai",
      id: model.id,
    }),
  ).rejects.toMatchObject({ status: 409, code: "AI_MODEL_IN_USE" });
  const renamed = await service.change(2, actor, {
    action: "update",
    provider: "openai",
    id: model.id,
    model: { ...model, name: "Usable label edit" },
  });
  await service.change(renamed.revision, actor, {
    action: "select",
    target: "home.chat",
    selection: null,
  });
  await service.change(4, actor, {
    action: "delete",
    provider: "openai",
    id: model.id,
  });
  await expect(
    service.resolve("home.chat", { provider: "openai", model: model.id }),
  ).rejects.toMatchObject({ code: "AI_MODEL_REMOVED" });
});
it("rejects a stale concurrent mutation and a duplicate without silently replacing catalog entries", async () => {
  const { db } = fixture();
  const a = new ModelControlService(db),
    b = new ModelControlService(db);
  const changes = await Promise.allSettled([
    a.change(0, actor, { action: "create", model }),
    b.change(0, actor, {
      action: "create",
      model: { ...model, id: "gpt-fixture-second" },
    }),
  ]);
  expect(changes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(
    changes
      .filter((x) => x.status === "rejected")
      .map((x) => (x as PromiseRejectedResult).reason.code),
  ).toEqual(["AI_MODEL_CONTROL_CONFLICT"]);
  const state = await a.snapshot();
  const existing = state.models.find((x) => x.id.startsWith("gpt-fixture"))!;
  await expect(
    a.change(state.revision, actor, { action: "create", model: existing }),
  ).rejects.toMatchObject({ status: 409, code: "AI_MODEL_ALREADY_EXISTS" });
});
it("retains legacy configured and fallback models, including disabled policies, and sanitizes failed reference reads", async () => {
  const f = fixture();
  f.references.push({ provider: "openai", model: "gpt-4o" });
  const service = new ModelControlService(f.db);
  for (const id of ["gpt-4o", "gpt-6-astra"])
    await expect(
      service.change(0, actor, { action: "delete", provider: "openai", id }),
    ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
  const original = f.db.query.getMockImplementation()!;
  f.db.query.mockImplementation(async (sql, params) => {
    if (sql.startsWith("SELECT 'gemini'"))
      throw new Error("private DB details");
    return original(sql, params);
  });
  await expect(
    service.change(0, actor, {
      action: "delete",
      provider: "openai",
      id: "gpt-4o",
    }),
  ).rejects.toMatchObject({
    status: 503,
    code: "AI_MODEL_REFERENCES_UNAVAILABLE",
  });
});
it("rejects incompatible image, speech, provider and unknown usage selections", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  for (const [target, provider, id] of [
    ["home.attachments", "openai", "gpt-4o"],
    ["home.chat", "openai", "gpt-4o-mini-tts"],
    ["audio.synthesis.openai", "gemini", "gemini-3.1-flash-tts-preview"],
    ["supplier.hub", "gemini", "gemini-3.8-flash"],
  ])
    await expect(
      service.change(0, actor, {
        action: "select",
        target,
        selection: { provider: provider as any, model: id },
      }),
    ).rejects.toBeInstanceOf(ModelControlError);
});
it("shares translation selection but does not overwrite quota, retry, prompts or request limits during runtime preparation", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  await service.change(0, actor, {
    action: "select",
    target: "policy.CONTENT_TRANSLATION",
    selection: { provider: "gemini", model: "gemini-2.5-flash" },
  });
  expect(
    (
      await service.resolve("pharmacy.consultation", {
        provider: "gemini",
        model: "gemini-3.8-flash",
      })
    ).model,
  ).toBe("gemini-2.5-flash");
  const request = {
    systemPrompt: "synthetic system",
    userPrompt: "synthetic text",
    config: {
      apiKey: "synthetic-key",
      model: "gemini-3.8-flash",
      maxTokens: 123,
      temperature: 0.2,
    },
    retry: { maxAttempts: 1 },
    meta: { service: "store", callerName: "fixture" },
  };
  const prepared = await prepareManagedAiRequest(
    db as any,
    "store.translation",
    request,
  );
  expect(prepared).toEqual({
    ...request,
    provider: "gemini",
    config: { ...request.config, model: "gemini-2.5-flash" },
  });
});
it("does not reset corrupt or unreadable persisted policy to a successful default", async () => {
  const f = fixture();
  f.corrupt({ revision: 1, models: [] });
  await expect(new ModelControlService(f.db).read()).rejects.toMatchObject({
    status: 503,
  });
  f.db.query.mockRejectedValue(new Error("private details"));
  await expect(new ModelControlService(f.db).read()).rejects.toMatchObject({
    code: "AI_MODEL_CONTROL_UNAVAILABLE",
  });
});

it("passes a newly registered and selected model to the existing OpenAI transport", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  await service.change(0, actor, { action: "create", model });
  await service.change(1, actor, {
    action: "select",
    target: "home.chat",
    selection: {
      provider: "openai",
      model: model.id,
      apiKey: "must-not-persist",
    } as any,
  });
  expect(JSON.stringify(await service.snapshot())).not.toContain(
    "must-not-persist",
  );
  const original = global.fetch;
  const calls: { url: string; body: any }[] = [];
  global.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response(
      JSON.stringify({
        choices: [
          { message: { content: "synthetic result" }, finish_reason: "stop" },
        ],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      }),
      { status: 200 },
    );
  }) as any;
  try {
    const result = await executeManagedAi(db as any, "home.chat", {
      provider: "openai",
      systemPrompt: "synthetic system",
      userPrompt: "synthetic input",
      config: {
        apiKey: "synthetic-key",
        model: "gpt-4o-mini",
        maxTokens: 123,
        temperature: 0.2,
        responseMode: "text",
      },
      retry: { maxAttempts: 1 },
    });
    expect(result.content).toBe("synthetic result");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(calls[0].body).toMatchObject({ model: model.id, temperature: 0.2 });
    expect(calls[0].body.messages).toEqual([
      { role: "system", content: "synthetic system" },
      { role: "user", content: "synthetic input" },
    ]);
  } finally {
    global.fetch = original;
  }
});
it("uses selected speech models in the existing TTS adapter without accepting a caller supplied model", async () => {
  const { TtsNarrationService, validateTtsRequest } = await import(
    "../../../modules/automation/services/tts-narration.service.js"
  );
  const { db } = fixture();
  const service = new ModelControlService(db);
  await service.change(0, actor, {
    action: "create",
    model: { ...model, id: "gpt-speech-fixture", capabilities: ["speech"] },
  });
  await service.change(1, actor, {
    action: "select",
    target: "audio.synthesis.openai",
    selection: { provider: "openai", model: "gpt-speech-fixture" },
  });
  const fetchMock = jest.fn(
    async () => new Response(Buffer.from("ID3synthetic"), { status: 200 }),
  );
  const tts = new TtsNarrationService(
    async () => "synthetic-key",
    fetchMock,
    async (provider) =>
      (
        await service.resolve("audio.synthesis." + provider, {
          provider,
          model: "gpt-4o-mini-tts",
        })
      ).model,
  );
  const result = await tts.synthesize(
    validateTtsRequest({
      provider: "openai",
      text: "합성 문장",
      model: "caller-must-not-win",
    }),
  );
  expect(result.model).toBe("gpt-speech-fixture");
  const body = JSON.parse(
    (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as string,
  );
  expect(body).toMatchObject({
    model: "gpt-speech-fixture",
    voice: "nova",
    response_format: "mp3",
  });
});
it("requires image capability for the strong planner that may receive screen captures", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  await service.change(0, actor, {
    action: "create",
    model: { ...model, capabilities: ["text"] },
  });
  await expect(
    service.change(1, actor, {
      action: "select",
      target: "work.planning.strong",
      selection: { provider: "openai", model: model.id },
    }),
  ).rejects.toMatchObject({ status: 400 });
});

it("explicitly rejects registered non-text models while preserving unknown-model discovery", async () => {
  const { db } = fixture();
  const service = new ModelControlService(db);
  await service.change(0, actor, {
    action: "update",
    provider: "gemini",
    id: "gemini-2.0-flash",
    model: {
      provider: "gemini",
      id: "gemini-2.0-flash",
      name: "Synthetic image model",
      capabilities: ["image"],
    },
  });
  expect(await service.allows("gemini", "gemini-2.0-flash")).toBe(false);
  expect(
    await service.allows("gemini", "gemini-unlisted-fixture"),
  ).toBeUndefined();
  const { isGeminiModelAllowed } = await import(
    "../../ai-model-registry.service.js"
  );
  expect(await isGeminiModelAllowed(db as any, "gemini-2.0-flash")).toBe(false);
});

it.each<[string, string, string[], string]>([
  ["gemini", "gemini-2.5-pro", ["work.planning.strong"], "image"],
  ["openai", "gpt-5-mini", ["admin.blocks"], "text"],
  [
    "openai",
    "gpt-4o-mini",
    ["lms.quiz", "lms.assignment", "operator.actions"],
    "text",
  ],
  ["openai", "gpt-4o-mini-tts", ["audio.synthesis.openai"], "speech"],
  [
    "gemini",
    "gemini-3.1-flash-tts-preview",
    ["audio.synthesis.gemini"],
    "speech",
  ],
  ["claude", "claude-sonnet-4.5", ["admin.blocks"], "text"],
])(
  "releases %s:%s only after all managed default consumers change, and refuses to restore its deleted fallback",
  async (provider, id, targets, capability) => {
    const { db } = fixture();
    const service = new ModelControlService(db);
    const replacement = {
      provider,
      id: "replacement-fixture",
      name: "Synthetic replacement",
      capabilities: [capability],
    } as any;
    let state = await service.change(0, actor, {
      action: "create",
      model: replacement,
    });
    const key = provider + ":" + id;
    expect(state.modelReferences[key].map((x) => x.target)).toEqual(targets);
    for (const target of targets as string[]) {
      await expect(
        service.change(state.revision, actor, {
          action: "delete",
          provider,
          id,
        }),
      ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
      state = await service.change(state.revision, actor, {
        action: "select",
        target,
        selection: { provider: provider as any, model: replacement.id },
      });
    }
    expect(state.protectedModels).not.toContain(key);
    expect(state.modelReferences[key]).toBeUndefined();
    state = await service.change(state.revision, actor, {
      action: "delete",
      provider,
      id,
    });
    const fresh = new ModelControlService(db);
    expect(
      (await fresh.snapshot()).models.some(
        (x) => x.provider === provider && x.id === id,
      ),
    ).toBe(false);
    for (const target of targets as string[]) {
      expect(
        await fresh.resolve(target, { provider: provider as any, model: id }),
      ).toMatchObject({ model: replacement.id, managed: true });
      await expect(
        fresh.change(state.revision, actor, {
          action: "select",
          target,
          selection: null,
        }),
      ).rejects.toMatchObject({ code: "AI_MODEL_REMOVED" });
      expect((await fresh.snapshot()).revision).toBe(state.revision);
    }
  },
);

it("does not treat an old whitelist entry as a runtime default, but retains DB policy protection", async () => {
  const f = fixture();
  const service = new ModelControlService(f.db);
  expect((await service.snapshot()).protectedModels).not.toContain(
    "gemini:gemini-2.5-flash",
  );
  f.references.push({ provider: "gemini", model: "gemini-2.5-flash" });
  expect(
    (await service.snapshot()).modelReferences["gemini:gemini-2.5-flash"][0]
      .kind,
  ).toBe("policy");
  await expect(
    service.change(0, actor, {
      action: "delete",
      provider: "gemini",
      id: "gemini-2.5-flash",
    }),
  ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
  f.references.length = 0;
  await service.change(0, actor, {
    action: "delete",
    provider: "gemini",
    id: "gemini-2.5-flash",
  });
  expect(await service.allows("gemini", "gemini-2.5-flash")).toBe(false);
});

it("retains environment and configured fallback references after a managed override", async () => {
  const previous = process.env.AI_STRONG_MODEL;
  process.env.AI_STRONG_MODEL = "gemini-2.5-pro";
  try {
    const f = fixture();
    const service = new ModelControlService(f.db);
    let state = await service.change(0, actor, {
      action: "select",
      target: "work.planning.strong",
      selection: { provider: "gemini", model: "gemini-3.8-flash" },
    });
    expect(
      state.modelReferences["gemini:gemini-2.5-pro"].some(
        (x) => x.kind === "runtime",
      ),
    ).toBe(true);
    await expect(
      service.change(state.revision, actor, {
        action: "delete",
        provider: "gemini",
        id: "gemini-2.5-pro",
      }),
    ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
    delete process.env.AI_STRONG_MODEL;
    f.references.push({ provider: "gemini", model: "gemini-2.5-pro" });
    await expect(
      service.change(state.revision, actor, {
        action: "delete",
        provider: "gemini",
        id: "gemini-2.5-pro",
      }),
    ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
    f.references.length = 0;
    state = await service.change(state.revision, actor, {
      action: "delete",
      provider: "gemini",
      id: "gemini-2.5-pro",
    });
    expect(state.deleted).toContain("gemini:gemini-2.5-pro");
  } finally {
    if (previous === undefined) delete process.env.AI_STRONG_MODEL;
    else process.env.AI_STRONG_MODEL = previous;
  }
});

it("preserves an existing shared translation selection on read, then lets each usage change independently", async () => {
  const f = fixture();
  const service = new ModelControlService(f.db);
  const initial = await service.read();
  f.corrupt({
    ...initial,
    selections: {
      "policy.CONTENT_TRANSLATION": {
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
    },
  });
  const state = await service.snapshot();
  expect(state.selections["store.translation"]).toEqual(
    state.selections["pharmacy.consultation"],
  );
  expect(f.value.selections["policy.CONTENT_TRANSLATION"]).toBeDefined(); // GET did not write.
  await service.change(state.revision, actor, {
    action: "select",
    target: "pharmacy.consultation",
    selection: { provider: "gemini", model: "gemini-2.0-flash" },
  });
  expect(
    await service.resolve("store.translation", {
      provider: "gemini",
      model: "old-code-model",
    }),
  ).toMatchObject({ model: "gemini-2.5-flash" });
  expect(
    await service.resolve("pharmacy.consultation", {
      provider: "gemini",
      model: "old-code-model",
    }),
  ).toMatchObject({ model: "gemini-2.0-flash" });
  expect(f.value.selections["policy.CONTENT_TRANSLATION"]).toBeUndefined();
});

it("releases a legacy scope primary and fallback only after every consuming usage is overridden", async () => {
  const f = fixture();
  f.references.push(
    {
      provider: "gemini",
      model: "gemini-2.0-flash",
      source: "scope",
      scope: "CONTENT_TRANSLATION",
    },
    {
      provider: "openai",
      model: "gpt-4.1",
      source: "scope",
      scope: "CONTENT_TRANSLATION",
    },
  );
  const service = new ModelControlService(f.db);
  let state = await service.change(0, actor, {
    action: "select",
    target: "store.translation",
    selection: { provider: "gemini", model: "gemini-3.8-flash" },
  });
  expect(state.protectedModels).toEqual(
    expect.arrayContaining(["gemini:gemini-2.0-flash", "openai:gpt-4.1"]),
  );
  state = await service.change(state.revision, actor, {
    action: "select",
    target: "pharmacy.consultation",
    selection: { provider: "gemini", model: "gemini-3.8-flash" },
  });
  expect(state.protectedModels).not.toContain("gemini:gemini-2.0-flash");
  expect(state.protectedModels).not.toContain("openai:gpt-4.1");
  state = await service.change(state.revision, actor, {
    action: "delete",
    provider: "gemini",
    id: "gemini-2.0-flash",
  });
  state = await service.change(state.revision, actor, {
    action: "delete",
    provider: "openai",
    id: "gpt-4.1",
  });
  await expect(
    service.change(state.revision, actor, {
      action: "select",
      target: "store.translation",
      selection: null,
    }),
  ).rejects.toMatchObject({ code: "AI_MODEL_REMOVED" });
});

it("retains the query-policy model for direct consumers after every managed usage changes", async () => {
  const f = fixture();
  f.references.push({
    provider: "gemini",
    model: "gemini-2.5-flash",
    source: "query",
  });
  const service = new ModelControlService(f.db);
  let state = await service.snapshot();
  const targets = [
    ...new Set(
      state.modelReferences["gemini:gemini-2.5-flash"].flatMap((x) =>
        x.target ? [x.target] : [],
      ),
    ),
  ];
  expect(targets).toEqual(
    expect.arrayContaining([
      "home.chat",
      "service.query",
      "work.planning",
      "image.analysis",
      "operator.insight",
    ]),
  );
  for (const target of targets) {
    expect(state.protectedModels).toContain("gemini:gemini-2.5-flash");
    state = await service.change(state.revision, actor, {
      action: "select",
      target,
      selection: { provider: "gemini", model: "gemini-3.8-flash" },
    });
  }
  expect(state.protectedModels).toContain("gemini:gemini-2.5-flash");
  await expect(
    service.change(state.revision, actor, {
      action: "delete",
      provider: "gemini",
      id: "gemini-2.5-flash",
    }),
  ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
  expect((await service.snapshot()).revision).toBe(state.revision);
  // News generation still follows the shared policy, not a managed usage selection.
  // Only changing that policy releases its old model; no policy is changed by deletion.
  f.references[0].model = "gemini-3.8-flash";
  state = await service.change(state.revision, actor, {
    action: "delete",
    provider: "gemini",
    id: "gemini-2.5-flash",
  });
  await expect(
    service.change(state.revision, actor, {
      action: "select",
      target: "home.chat",
      selection: null,
    }),
  ).resolves.toMatchObject({ revision: state.revision + 1 });
  expect(await service.allows("gemini", "gemini-2.5-flash")).toBe(false);
});
