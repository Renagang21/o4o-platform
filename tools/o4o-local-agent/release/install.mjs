import path from "node:path";
import fs from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { installPackage, locations } from "./install-core.mjs";
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
    if (!allowNewData) {
      console.log(
        "기존 데이터 위치를 확인한 뒤 다시 실행해 주세요. 새 데이터는 만들지 않았습니다.",
      );
      process.exitCode = 1;
    } else console.log("새 PC 설치를 진행합니다.");
  }
  if (process.exitCode) process.exit(process.exitCode);
  const result = await installPackage({
    source: path.dirname(fileURLToPath(import.meta.url)),
    ...targets,
    allowNewData,
  });
  console.log(
    `PC 연결 프로그램 ${result.version} 적용 완료. 기존 데이터와 계정 연결 정보는 유지됩니다.`,
  );
  console.log(
    result.shortcut
      ? "시작 메뉴의 O4O PC 연결을 실행해 주세요."
      : "설치 폴더의 Start.cmd를 실행해 주세요.",
  );
  console.log(
    "Main의 이 PC 연결에서 다시 확인을 눌러 실제 버전과 데이터 준비 상태를 확인하세요. 실행 확인 전에는 업데이트 완료로 표시하지 않습니다.",
  );
} catch (error) {
  console.error(
    messages[error.message] ||
      "설치를 완료하지 못했습니다. 기존 데이터를 보존한 채 중단했습니다. 패키지를 다시 내려받아 확인해 주세요.",
  );
  process.exitCode = 1;
}
