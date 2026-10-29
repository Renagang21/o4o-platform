import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { verifyPackage } from "./install-core.mjs";
try {
  const slot = path.dirname(fileURLToPath(import.meta.url));
  verifyPackage(slot);
  process.title = "O4O PC 연결";
  console.log("O4O PC 연결 프로그램 실행 중");
  console.log("이 창을 켜 두고 O4O 화면으로 돌아가세요.");
  console.log("업데이트하거나 종료하려면 이 창에서 Ctrl+C를 누르세요.");
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
