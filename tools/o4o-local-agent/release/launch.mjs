import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { verifyPackage } from "./install-core.mjs";
try {
  const slot = path.dirname(fileURLToPath(import.meta.url));
  verifyPackage(slot);
  const child = spawn(
    path.join(slot, "runtime", "node.exe"),
    [path.join(slot, "src", "index.mjs"), "run"],
    { cwd: slot, stdio: "inherit", env: process.env },
  );
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
