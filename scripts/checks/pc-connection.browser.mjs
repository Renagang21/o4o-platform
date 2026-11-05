import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const origin = process.env.PC_UI_TEST_ORIGIN || "http://127.0.0.1:3030";
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const artifacts = await mkdtemp(join(tmpdir(), "pc-connection-ui-"));
const release = {
  format: "o4o-pc-release-v1",
  releaseId: "a".repeat(64),
  sourceSha: "b".repeat(40),
  version: "0.4.0",
  nodeVersion: "22.18.0",
  dataSchemaVersion: 10,
  filename: `o4o-pc-connection-${"b".repeat(12)}-${"a".repeat(12)}.zip`,
  sha256: "c".repeat(64),
  bytes: 20,
};
const html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">
import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';const {createRoot}=ReactDOM;import LocalAgentCard from '/src/components/mypage/LocalAgentCard.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(LocalAgentCard));</script></body></html>`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      serviceWorkers: "block",
    });
    try {
      const page = await context.newPage(),
        errors = [],
        external = [];
      let program = false,
        allowAccount = false,
        pairs = 0,
        nonces = 0;
      page.on("pageerror", (e) => errors.push(e.message));
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "permissions", {
          value: { query: async () => ({ state: "granted" }) },
          configurable: true,
        });
      });
      await page.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        if (url.origin === origin && url.pathname === "/__pc_ui_fixture")
          return route.fulfill({ contentType: "text/html", body: html });
        if (url.pathname === "/downloads/pc-connection/release.json")
          return route.fulfill({ json: release });
        if (url.origin === "http://127.0.0.1:47821") {
          if (url.pathname === "/health") {
            if (!program) return route.abort();
            return route.fulfill({
              json: {
                ok: true,
                agentVersion: "0.4.0",
                releaseId: release.releaseId,
                connected: true,
                localData: { ready: true, schemaVersion: 10 },
                nonce: `fixture-${++nonces}`,
              },
            });
          }
          if (url.pathname === "/pair") {
            pairs++;
            return allowAccount
              ? route.fulfill({
                  json: { ok: true, status: "already_connected" },
                })
              : route.fulfill({
                  status: 409,
                  json: { ok: false, code: "DEVICE_ALREADY_PAIRED" },
                });
          }
        }
        if (url.pathname === "/api/local-agent/pairing-grants")
          return route.fulfill({
            json: { data: { grant: "fixture-only-not-a-credential" } },
          });
        if (url.origin !== origin) {
          external.push(url.origin);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(origin + "/__pc_ui_fixture");
      await page
        .getByText(/이 브라우저에서 PC 프로그램의 응답을 받지 못했습니다/)
        .waitFor()
        .catch((error) => {
          process.stdout.write(
            JSON.stringify({ pageErrors: errors, external }) + "\n",
          );
          throw error;
        });
      assert.equal(
        await page
          .getByText("PC 연결 프로그램이 실행되고 있지 않습니다.")
          .count(),
        0,
      );
      program = true;
      await page
        .getByRole("button", { name: "설치된 프로그램 연결 확인", exact: true })
        .click();
      await page.getByText(/다른 O4O 계정에 이미 연결/).waitFor();
      assert.equal(
        await page.getByText("이 PC가 현재 계정에 연결됐습니다.").count(),
        0,
      );
      allowAccount = true;
      await page
        .getByRole("button", { name: "설치된 프로그램 연결 확인", exact: true })
        .click();
      await page
        .getByText("이 PC가 현재 계정에 연결됐습니다.", { exact: true })
        .waitFor();
      assert.equal(pairs, 2);
      assert(nonces >= 2);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await page.screenshot({
        path: join(artifacts, `connected-${width}.png`),
        fullPage: true,
      });
      process.stdout.write(
        `PASS PC UI ${width}px: neutral network failure, account mismatch retained, explicit verification success\n`,
      );
    } finally {
      await context.close();
    }
  }
  process.stdout.write(`Artifacts: ${artifacts}\n`);
} finally {
  await browser.close();
}
