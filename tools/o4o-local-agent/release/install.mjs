import path from "node:path";
import fs from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import {
  installPackage,
  locations,
  installedSlot,
  verifyPackage,
} from "./install-core.mjs";
let installed = false;
const windowMode = process.argv.includes("--window");
const powershell = path.join(
  process.env.SystemRoot || "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
);
const messages = {
  CLOSE_PC_PROGRAM_FIRST:
    "진행 중 업무를 마친 뒤 열린 PC 연결 프로그램을 정상 종료하고 다시 실행해 주세요.",
  PC_STATE_UNKNOWN:
    "PC 실행 상태를 확인하지 못했습니다. 실행 중인 프로그램과 연결 권한을 확인해 주세요.",
  ANOTHER_INSTALL_RUNNING:
    "다른 설치가 진행 중입니다. 끝난 뒤 다시 실행해 주세요.",
  UNSAFE_INSTALL_LOCATION: "프로그램 설치 폴더와 데이터 폴더를 분리해 주세요.",
  UNRECOGNIZED_INSTALLATION:
    "기존 설치 위치를 안전하게 확인할 수 없습니다. 기존 파일을 보존한 채 설치를 중단했습니다.",
};
try {
  if (process.platform !== "win32")
    throw new Error("Windows 10/11 x64에서 실행해 주세요.");
  if (process.arch !== "x64")
    throw new Error("이 패키지는 Windows x64용입니다.");
  const targets = locations();
  const pointer = path.join(targets.home, "current.json");
  if (fs.existsSync(pointer) && !process.env.O4O_AGENT_HOME) {
    const stat = fs.lstatSync(pointer);
    if (stat.isSymbolicLink()) throw new Error("UNSAFE_INSTALL_PATH");
    const current = JSON.parse(fs.readFileSync(pointer, "utf8"));
    if (
      current.format !== "o4o-pc-install-v1" ||
      !path.isAbsolute(current.dataHome ?? "")
    )
      throw new Error("INVALID_INSTALLED_RELEASE");
    targets.dataHome = current.dataHome;
  }
  let allowNewData = false;
  if (
    !fs.existsSync(path.join(targets.dataHome, "local.db")) &&
    !fs.existsSync(path.join(targets.dataHome, "credentials.json"))
  ) {
    if (windowMode) {
      // Same consent as the terminal installer, expressed as buttons. Default is No.
      allowNewData =
        execFileSync(
          powershell,
          [
            "-NoProfile",
            "-Command",
            "[void][Reflection.Assembly]::LoadWithPartialName('PresentationFramework'); $answer=[System.Windows.MessageBox]::Show('처음 설치하는 PC인가요? 기존에 사용하던 PC라면 아니요를 누르고 기존 데이터 위치를 확인해 주세요.','O4O PC 연결','YesNo','Question','No'); if ($answer -eq 'Yes') { 'yes' } else { 'no' }",
          ],
          { encoding: "utf8", windowsHide: true },
        ).trim() === "yes";
    } else {
      const prompt = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        allowNewData =
          (
            await prompt.question(
              "처음 설치하는 PC입니까? 기존 PC를 업데이트하는 경우 N을 선택하세요. [Y/N] ",
            )
          )
            .trim()
            .toLowerCase() === "y";
      } finally {
        prompt.close();
      }
    }
    if (!allowNewData) {
      console.log(
        "기존 데이터 위치를 확인한 뒤 다시 실행해 주세요. 새 데이터는 만들지 않았습니다.",
      );
      process.exitCode = 1;
    } else console.log("새 PC 설치를 진행합니다.");
  }
  if (process.exitCode) process.exit(process.exitCode);
  console.log(
    "[3/4] 프로그램과 기존 데이터를 확인하고 설치합니다. 잠시 기다려 주세요.",
  );
  const result = await installPackage({
    source: path.dirname(fileURLToPath(import.meta.url)),
    ...targets,
    allowNewData,
  });
  console.log(
    `PC 연결 프로그램 ${result.version} 적용 완료. 기존 데이터와 계정 연결 정보는 유지됩니다.`,
  );
  installed = true;
  if (windowMode) {
    console.log("[4/4] PC 연결 프로그램을 실행하고 응답을 확인합니다.");
    const slot = installedSlot(targets.home);
    const expected = verifyPackage(slot);
    const child = spawn(
      path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe"),
      [
        "/d",
        "/v:off",
        "/s",
        "/c",
        '"start "O4O PC 연결" /D "%O4O_RUN_CWD%" "%O4O_RUN_NODE%" "%O4O_RUN_ENTRY%" --console"',
      ],
      {
        cwd: slot,
        windowsHide: true,
        windowsVerbatimArguments: true,
        stdio: "ignore",
        // Fixed command, quoted environment selectors: no user text in cmd code.
        // `start` creates a real console with normal Ctrl+C handling. A detached
        // process with NUL streams can otherwise leave no readable/usable console.
        env: {
          ...process.env,
          O4O_AGENT_HOME: targets.dataHome,
          O4O_RUN_CWD: slot,
          O4O_RUN_NODE: path.join(slot, "runtime", "node.exe"),
          O4O_RUN_ENTRY: path.join(slot, "launch.mjs"),
        },
      },
    );
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    child.unref();
    // A spawned process is not proof of a usable runtime. Keep errors visible in
    // this installer while the detached runtime has its own readable, closeable console.
    const deadline = Date.now() + 30000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const response = await fetch("http://127.0.0.1:47821/health", {
          headers: { Origin: "https://neture.co.kr" },
          redirect: "error",
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          const health = await response.json();
          if (
            health.ok &&
            health.releaseId === result.releaseId &&
            health.agentVersion === result.version &&
            health.localData?.ready === true &&
            health.localData.schemaVersion === expected.dataSchemaVersion
          ) {
            ready = true;
            break;
          }
        }
      } catch {
        /* Starting up; bounded retry, without printing local responses. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("PC_START_NOT_CONFIRMED");
    console.log(
      "설치와 프로그램 실행을 확인했습니다. O4O 화면으로 돌아가 주세요. 새로 열린 PC 연결 창은 켜 두세요. 종료하려면 그 창에서 Ctrl+C를 누르세요.",
    );
  } else {
    console.log(
      result.shortcut
        ? "시작 메뉴의 O4O PC 연결을 실행해 주세요."
        : "설치 폴더의 Start.cmd를 실행해 주세요.",
    );
    console.log(
      "Main의 이 PC 연결에서 다시 확인을 눌러 실제 버전과 데이터 준비 상태를 확인하세요. 실행 확인 전에는 업데이트 완료로 표시하지 않습니다.",
    );
  }
} catch (error) {
  console.error(
    (installed
      ? "설치는 끝났지만 실행하지 못했습니다. 시작 메뉴의 O4O PC 연결을 열어 주세요."
      : messages[error.message]) ||
      "설치를 완료하지 못했습니다. 기존 데이터를 보존한 채 중단했습니다. 패키지를 다시 내려받아 확인해 주세요.",
  );
  process.exitCode = 1;
}
