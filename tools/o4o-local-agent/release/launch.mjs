import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { verifyPackage } from "./install-core.mjs";
try {
  const slot = path.dirname(fileURLToPath(import.meta.url));
  verifyPackage(slot);
  // A detached Windows console receives NUL standard streams from the installer.
  // Reopen its own console devices so status is visible and Ctrl+C is usable.
  // Manual Start.cmd keeps its existing streams and console.
  let stdio = "inherit";
  const handles = [];
  if (process.platform === "win32" && process.argv.includes("--console")) {
    const input = fs.openSync("\\\\.\\CONIN$", "r");
    handles.push(input);
    const output = fs.openSync("\\\\.\\CONOUT$", "w");
    handles.push(output);
    fs.writeSync(
      output,
      "O4O PC 연결 프로그램 실행 중\r\n이 창을 켜 두고 O4O 화면으로 돌아가세요.\r\n업데이트하거나 종료하려면 이 창에서 Ctrl+C를 누르세요.\r\n\r\n",
    );
    stdio = [input, output, output];
  }
  const child = spawn(
    path.join(slot, "runtime", "node.exe"),
    [path.join(slot, "src", "index.mjs"), "run"],
    { cwd: slot, stdio, windowsHide: true, env: process.env },
  );
  for (const handle of handles) fs.closeSync(handle);
  child.once("error", () => {
    console.error("PC 연결 프로그램을 실행하지 못했습니다.");
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
} catch {
  console.error(
    "설치 파일을 검증하지 못했습니다. Main에서 설치 파일을 다시 내려받아 주세요.",
  );
  process.exitCode = 1;
}
