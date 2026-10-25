#!/usr/bin/env node
/** Synthetic local browser smoke. No real account, remote media or application DB access. */
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "lecture-captions-"));
let browser, server;
try {
  const media = join(scratch, "fixture.webm");
  const generated = spawnSync("ffmpeg", [
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=160x90:d=3",
    "-c:v",
    "libvpx",
    "-an",
    media,
  ]);
  if (generated.error || generated.status !== 0)
    throw new Error("ffmpeg with libvpx is required for the synthetic fixture");
  const video = await readFile(media);
  server = await createServer({
    root,
    configFile: false,
    plugins: [
      react(),
      {
        name: "lecture-caption-fixture",
        enforce: "pre",
        resolveId(id, importer) {
          if (
            id.endsWith("/apiClient") &&
            importer?.includes("/services/web-lecture/src/")
          )
            return "/__preview-api.ts";
          if (
            id.includes("AuthContext") &&
            importer?.includes("/services/web-lecture/src/")
          )
            return "/__profile-auth.ts";
          if (
            id === "@o4o/shared-space-ui" &&
            importer?.includes("/InstructorApplyPage.tsx")
          )
            return "/__profile-policy.ts";
          if (id === "/__caption-fixture.tsx") return id;
        },
        load(id) {
          if (id === "/__profile-auth.ts")
            return `const user={id:'synthetic',roles:[]};export const useAuth=()=>({user});`;
          if (id === "/__profile-policy.ts")
            return `export const useServiceEnrollmentPolicies=()=>({ready:true,references:[]});export const ServiceEnrollmentPolicyAgreement=()=>null;`;
          if (id === "/__preview-api.ts")
            return `async function request(method,path,body){const r=await fetch('/api/v1'+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error('fixture HTTP failure');return {data:await r.json()}};export const api={get:path=>request('GET',path),post:(path,body)=>request('POST',path,body),patch:(path,body)=>request('PATCH',path,body),delete:path=>request('DELETE',path)};`;
          if (id === "/__caption-fixture.tsx")
            return `
      import React, {useRef,useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {ResumeVideo} from '/packages/lms-ui/src/views/ResumeVideo.tsx';
      import {LessonMediaFields} from '/services/web-lecture/src/components/LessonMediaFields.tsx';
      import '/services/web-lecture/src/index.css';
      import {BrowserRouter,Routes,Route} from 'react-router-dom';
      import PreviewPage,{PublicPreviewList} from '/services/web-lecture/src/pages/learner/PublicPreview.tsx';
      import InstructorApplyPage from '/services/web-lecture/src/pages/learner/InstructorApplyPage.tsx';
      import OperatorInstructorsPage from '/services/web-lecture/src/pages/operator/OperatorInstructorsPage.tsx';
      import {ToastProvider} from '/services/web-lecture/src/components/Toast.tsx';
      const track={src:'https://media.example.invalid/ko.vtt',srcLang:'ko',label:'한국어'};
      function App(){const ref=useRef(null);const [value,setValue]=useState({title:'fixture',type:'video',metadata:{captions:[track]}});return <main style={{maxWidth:900,margin:'auto',padding:12}}><h1>자막 합성 검증</h1><ResumeVideo videoRef={ref} src="https://media.example.invalid/fixture.webm" captions={value.metadata.captions} enabled={false} courseId="fixture" lessonId="fixture" port={{}} onTimeUpdate={()=>{}}/><LessonMediaFields value={value} onChange={setValue}/></main>};
      createRoot(document.getElementById('root')).render(<ToastProvider><BrowserRouter><Routes><Route path="/my/instructor-apply" element={<InstructorApplyPage/>}/><Route path="/operator/instructors" element={<OperatorInstructorsPage/>}/><Route path="/__caption-smoke" element={<App/>}/><Route path="/courses/c" element={<PublicPreviewList courseId="c"/>}/><Route path="/courses/:courseId/preview/:lessonId" element={<PreviewPage/>}/></Routes></BrowserRouter></ToastProvider>);`;
        },
        configureServer(s) {
          s.middlewares.use(async (req, res, next) => {
            if (
              req.url !== "/__caption-smoke" &&
              !req.url?.startsWith("/courses/c") &&
              !["/my/instructor-apply", "/operator/instructors"].includes(
                req.url,
              )
            )
              return next();
            try {
              const html = await s.transformIndexHtml(
                "/__caption-smoke",
                '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/__caption-fixture.tsx"></script></body></html>',
              );
              res.setHeader("Content-Type", "text/html");
              res.end(html);
            } catch (e) {
              next(e);
            }
          });
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error("Synthetic page error:", e.message);
    });
    await page.route("https://media.example.invalid/**", (route) =>
      route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: route.request().url().endsWith(".vtt")
          ? "text/vtt"
          : "video/webm",
        body: route.request().url().endsWith(".vtt")
          ? "WEBVTT\n\n00:00.000 --> 00:02.900\n자막 fixture\n"
          : video,
      }),
    );
    await page.goto(`http://127.0.0.1:${address.port}/__caption-smoke`);
    await page.locator("video").waitFor();
    await page.locator("video").evaluate((element) => {
      element.textTracks[0].mode = "showing";
      void element.play().catch(() => {});
    });
    await page.waitForFunction(
      () => document.querySelector("video")?.currentTime > 0,
    );
    await page.waitForFunction(
      () => document.querySelector("track")?.track.cues?.length === 1,
    );
    await page.getByLabel("자막 이름 1").fill("한국어 CC");
    await page.waitForFunction(
      () => document.querySelector("track")?.label === "한국어 CC",
    );
    if (
      (await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )) ||
      errors.length
    )
      throw new Error(`Browser failure at ${width}px: ${errors.join(";")}`);
    await page.getByRole("button", { name: "자막 1 삭제" }).click();
    if (await page.locator("track").count())
      throw new Error("Caption removal failed");
    console.log(
      `PASS: ${width}px actual synthetic video/WebVTT load, caption edit/remove, no page errors/overflow`,
    );
    let listAttempts = 0;
    const protectedCalls = [];
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== "GET" || !path.includes("/previews"))
        protectedCalls.push(path);
      if (path.endsWith("/previews") && ++listAttempts === 1)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        });
      const data = path.endsWith("/previews")
        ? { items: [{ id: "l", title: "Sample", duration: 1 }] }
        : {
            preview: {
              id: "l",
              title: "Sample",
              duration: 1,
              videoUrl: "https://media.example.invalid/fixture.webm",
            },
          };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data }),
      });
    });
    await page.goto(`http://127.0.0.1:${address.port}/courses/c`);
    await page.getByRole("button", { name: "미리보기 다시 조회" }).click();
    await page.getByRole("link", { name: "Sample 미리보기" }).click();
    await page.getByRole("heading", { name: "Sample" }).waitFor();
    await page.locator("video").evaluate((element) => {
      void element.play().catch(() => {});
    });
    await page.waitForFunction(
      () => document.querySelector("video")?.currentTime > 0,
    );
    await page.goto(`http://127.0.0.1:${address.port}/courses/c/preview/l`);
    await page.getByRole("heading", { name: "Sample" }).waitFor();
    await page.getByRole("link", { name: "강의 소개로" }).click();
    await page.getByRole("link", { name: "Sample 미리보기" }).waitFor();
    if (
      protectedCalls.length ||
      errors.length ||
      (await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ))
    )
      throw new Error("Public preview regression");
    console.log(
      `PASS: ${width}px unsigned preview list 503/retry, menu/direct URL/back navigation, no protected API or write calls`,
    );
    let application = null;
    let profileWrites = 0;
    await page.route("**/api/v1/lms/instructor/**", async (route) => {
      if (route.request().method() === "POST") {
        profileWrites++;
        const body = route.request().postDataJSON();
        if (body.bio !== "검증 소개" || body.expertise !== "검증 분야")
          throw new Error("Profile payload lost");
        application = {
          id: "synthetic-application",
          userId: "synthetic",
          status: "pending",
          createdAt: "2026-10-25",
          bio: body.bio,
          expertise: body.expertise,
          user: { name: "검증 신청자" },
        };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ data: { application } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: application ? [application] : [] }),
      });
    });
    await page.goto(`http://127.0.0.1:${address.port}/my/instructor-apply`);
    await page.getByLabel(/강사 소개/).fill("검증 소개");
    await page.getByLabel(/전문 분야/).fill("검증 분야");
    await page.getByRole("button", { name: "강사 신청하기" }).click();
    await page.getByText(/강사 신청이 접수/).waitFor();
    await page.goto(`http://127.0.0.1:${address.port}/operator/instructors`);
    await page.getByText("검증 소개", { exact: true }).waitFor();
    await page.getByText("검증 분야", { exact: true }).waitFor();
    if (
      profileWrites !== 1 ||
      errors.length ||
      (await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ))
    )
      throw new Error("Profile browser regression");
    console.log(
      `PASS: ${width}px synthetic applicant submit to operator review, payload retained, no page errors/overflow (auth/policy/API fixtures, not real login)`,
    );
    await page.close();
  }
} finally {
  await browser?.close();
  await server?.close();
  await rm(scratch, { recursive: true, force: true });
}
