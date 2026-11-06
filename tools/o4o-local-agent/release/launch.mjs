import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { verifyPackage } from "./install-core.mjs";
try {
  const slot = path.dirname(fileURLToPath(import.meta.url));
  verifyPackage(slot);
  if (process.platform === "win32" && !process.argv.includes("--worker")) {
    const gui = spawn(
      path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      [
        "-NoLogo",
        "-NoProfile",
        "-STA",
        "-WindowStyle",
        "Hidden",
        "-Command",
        "& ([scriptblock]::Create([IO.File]::ReadAllText($env:O4O_WINDOW_SCRIPT)))",
      ],
      {
        windowsHide: true,
        cwd: process.env.SystemRoot || "C:\\Windows",
        stdio: "ignore",
        env: {
          ...process.env,
          O4O_WINDOW_SCRIPT: path.join(slot, "src", "pc-window.ps1"),
          O4O_WINDOW_NODE: path.join(slot, "runtime", "node.exe"),
          O4O_WINDOW_ENTRY: path.join(slot, "launch.mjs"),
          O4O_WINDOW_CWD: slot,
        },
      },
    );
    gui.once("error", () => {
      process.exitCode = 1;
    });
    gui.once("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  } else {
    process.title = "O4O PC 연결";
    console.log("O4O PC 연결 프로그램 실행 중");
    console.log("이 창을 켜 두고 O4O 화면으로 돌아가세요.");
    console.log("업데이트하거나 종료하려면 이 창에서 Ctrl+C를 누르세요.");
    const child = spawn(
      path.join(slot, "runtime", "node.exe"),
      [path.join(slot, "src", "index.mjs"), "run"],
      {
        cwd: slot,
        stdio: process.argv.includes("--worker")
          ? (() => {
              const directory = path.join(process.env.O4O_AGENT_HOME, "logs");
              fs.mkdirSync(directory, { recursive: true });
              const output = fs.openSync(
                path.join(directory, "pc-program.log"),
                "a",
              );
              return ["ignore", output, output];
            })()
          : "inherit",
        env: process.env,
      },
    );
    child.once("error", () => {
      console.error("PC 연결 프로그램을 실행하지 못했습니다.");
      process.exitCode = 1;
    });
    // The runtime receives the same console Ctrl+C and performs its own shutdown.
    process.on("SIGINT", () => {});
    child.once("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  }
} catch {
  console.error(
    "설치 파일을 검증하지 못했습니다. Main에서 설치 파일을 다시 내려받아 주시기 바랍니다.",
  );
  process.exitCode = 1;
}
