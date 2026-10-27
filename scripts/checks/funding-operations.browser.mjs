/** Isolated Chromium UI regression: synthetic auth/API, no production requests or business data. */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "@playwright/test";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const entry = "/funding-smoke-entry.jsx";
const source = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Participants from '/services/web-neture/src/pages/operator/FundingParticipantsSection.tsx';
import History from '/services/web-neture/src/pages/operator/FundingParticipantHistory.tsx';
import OfflineHistory from '/services/web-neture/src/pages/operator/FundingOfflineHistory.tsx';
import { MyParticipationsPage } from '/services/web-neture/src/pages/market-trial/MyParticipationsPage.tsx';
import '/services/web-neture/src/index.css';
const h = React.createElement;
function App() {
  const [version, setVersion] = useState(0);
  const p = { id:'participant', paymentVersion:version, name:'격리 참여자', type:'store_owner', rewardType:'product', rewardStatus:'pending', joinedAt:'2026-10-01', paymentStatus:'paid', paidAmount:version ? 13000 : 12000, paidAt:'2026-10-01', confirmedAt:'2026-10-02', paymentReference:null, paymentNote:null };
  return h('main', { style:{padding:16,maxWidth:960,margin:'auto'} },
    h('button', {onClick:()=>setVersion(v=>v+1)}, '다른 운영자 변경 재현'),
    h(Participants, {participants:[p], totalCount:1, trialStatus:'recruiting', filter:'all', paymentFilter:'', onFilterChange:()=>{}, onPaymentFilterChange:()=>{}, onExport:()=>{}, exportLoading:false, onToggleRewardStatus:()=>{}, updatingId:null, updatingPaymentId:null, loading:false, error:'', onRetry:()=>{}, onPaymentStatusChange:async(_p,input)=>{window.saved=input;return true;}}),
    h(History, {trialId:'trial',participantId:'participant'}),
    h(OfflineHistory, {id:'trial',initial:[{id:'new',action:'withdraw',reason:'현재 철회 이력',at:'2026-10-20',actorId:null,participantId:null,after:{}}],hasMore:true,participantPage:1}),
    h(MemoryRouter, null, h(MyParticipationsPage))
  );
}
createRoot(document.getElementById('root')).render(h(App));`;
const server = await createServer({
  root,
  configFile: false,
  appType: "custom",
  logLevel: "error",
  esbuild: { jsx: "automatic" },
  resolve: {
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
  define: {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      "http://127.0.0.1:4197",
    ),
  },
  server: { host: "127.0.0.1", port: 4197, strictPort: true },
  plugins: [
    {
      name: "isolated-funding-fixture",
      enforce: "pre",
      resolveId(id, importer) {
        if (id === entry) return path.join(root, entry);
        if (id === "@o4o/shared-space-ui") return "\0funding-guide";
        if (id.endsWith("/api/guideContent")) return "\0funding-guide-content";
        if (id.endsWith("/lib/apiClient")) return "\0funding-api";
        if (
          importer?.endsWith("/MyParticipationsPage.tsx") &&
          id.endsWith("/contexts/AuthContext")
        )
          return "\0funding-auth";
      },
      load(id) {
        if (id === path.join(root, entry)) return source;
        if (id === "\0funding-api")
          return `export const API_BASE_URL='http://127.0.0.1:4197'; export const api={get:async(path,options)=>{const url=new URL(path.startsWith('http')?path:'/api/v1'+path,API_BASE_URL);for(const [key,value] of Object.entries(options?.params??{}))url.searchParams.set(key,String(value));const res=await fetch(url);const data=await res.json();if(!res.ok)throw Object.assign(new Error('Synthetic API failure'),{response:{data,status:res.status}});return {data};}};`;
        if (id === "\0funding-guide-content")
          return "export const fetchGuidePageContent=async()=>({});";
        if (id === "\0funding-guide")
          return "export const GuideBlock=()=>null;";
        if (id === "\0funding-auth")
          return "export const useAuth=()=>({isAuthenticated:true,isLoading:false});";
      },
    },
  ],
});
server.middlewares.use((req, res, next) => {
  if (req.url !== "/") return next();
  res.setHeader("Content-Type", "text/html");
  res.end(
    `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`,
  );
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    executablePath: process.env.O4O_BROWSER_EXECUTABLE || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    const errors = [],
      external = [];
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("requestfailed", (req) =>
      console.error(
        "Fixture request failed:",
        req.url(),
        req.failure()?.errorText,
      ),
    );
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().includes("503 (Service Unavailable)")
      )
        errors.push(message.text());
    });
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.stack);
    });
    let historyFailure = true;
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1") {
        external.push(url.origin);
        return route.abort();
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      let body = { success: true, data: [] };
      if (url.pathname.endsWith("/history")) {
        const second = url.searchParams.get("page") === "2";
        if (second && historyFailure) {
          historyFailure = false;
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "격리 실패" }),
          });
        }
        body = {
          success: true,
          data: [
            {
              id: second ? "older" : "newer",
              action: "funding.offline_operation",
              offlineAction: second ? "withdraw" : "refund",
              reason: second ? "이전 철회 확인" : "합성 환급 확인",
              beforeRefundAmount: "0",
              afterRefundAmount: "20",
              at: "2026-10-20",
            },
          ],
          page: second ? 2 : 1,
          hasMore: !second,
        };
      } else if (url.pathname.endsWith("/offline-operations")) {
        body = {
          success: true,
          data: {
            history: [
              {
                id: "older-offline",
                action: "pledge",
                reason: "이전 약정 이력",
                actorId: null,
                at: "2026-10-19",
                participantId: null,
                after: {},
              },
            ],
            historyPage: 2,
            historyHasMore: false,
          },
        };
      } else if (
        url.pathname.includes("my-participations") ||
        url.pathname.endsWith("/my-participation")
      ) {
        const item = {
          id: "own",
          trialId: "trial",
          joinedAt: "2026-10-01",
          settlementStatus: "pending",
          paymentStatus: "paid",
          paidAmount: 12000,
          paidAt: "2026-10-01",
          confirmedAt: "2026-10-02",
          contributionAmount: 15000,
          refundedAmount: 20,
          trial: { id: "trial", title: "격리 펀딩", status: "recruiting" },
        };
        body = {
          success: true,
          data: url.pathname.endsWith("/my-participation") ? item : [item],
        };
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto("http://127.0.0.1:4197/");
    await page.getByRole("button", { name: "재확인·정정" }).click();
    await page.getByRole("button", { name: "다른 운영자 변경 재현" }).click();
    await page.getByRole("alert").filter({ hasText: "현황이 변경" }).waitFor();
    assert(await page.getByRole("button", { name: "기록 저장" }).isDisabled());
    await page.getByRole("button", { name: "재확인·정정" }).click();
    assert.equal(
      await page.getByLabel("입금 확인 금액 (원)").inputValue(),
      "13000",
    );
    await page.getByRole("button", { name: "기록 저장" }).click();
    assert.equal(await page.evaluate(() => window.saved.version), 1);
    await page.getByText(/합성 환급 확인/).waitFor();
    await page
      .getByRole("button", { name: "이전 이력 더 보기", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "처리 이력을 조회하지 못했습니다" })
      .waitFor();
    await page.getByText(/합성 환급 확인/).waitFor();
    await page
      .getByRole("button", { name: "이전 이력 더 보기", exact: true })
      .click();
    await page.getByText("이전 철회 확인").waitFor();
    await page
      .getByRole("button", { name: "이전 사후 처리 이력 더 보기" })
      .click();
    await page.getByText(/이전 약정 이력/).waitFor();
    await page.getByRole("button", { name: "상세 보기", exact: true }).click();
    await page.getByText("입금 확인 상태", { exact: true }).waitFor();
    await page.getByText("마지막 확인일", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      `PASS ${width}px: stale form, versioned save, history 503/retry/paging, own payment detail, no overflow/page errors/external requests`,
    );
    await context.close();
  }
} catch (error) {
  if (browser)
    for (const context of browser.contexts())
      for (const page of context.pages())
        console.error("Fixture page:", await page.content());
  throw error;
} finally {
  if (browser) await browser.close();
  await server.close();
}
