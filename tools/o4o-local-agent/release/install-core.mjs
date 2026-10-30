import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
function compareNames(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ID = /^[a-f0-9]{64}$/;
const allowed = (name) =>
  /^(src\/[A-Za-z0-9_.-]+\.(mjs|ps1|mts)|src\/build-info\.json|runtime\/(node\.exe|LICENSE)|install\.mjs|install-core\.mjs|launch\.mjs|Install\.cmd)$/.test(
    name,
  );
function plain(target, directory = false) {
  const stat = fs.lstatSync(target);
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile())
  )
    throw new Error("UNSAFE_INSTALL_PATH");
}
function mkdir(target) {
  if (fs.existsSync(target)) plain(target, true);
  else fs.mkdirSync(target, { recursive: true });
}
function canonical(target) {
  let base = path.resolve(target);
  const parts = [];
  while (!fs.existsSync(base)) {
    parts.unshift(path.basename(base));
    const parent = path.dirname(base);
    if (parent === base) throw new Error("UNSAFE_INSTALL_LOCATION");
    base = parent;
  }
  return path.join(fs.realpathSync(base), ...parts);
}
function overlap(a, b) {
  const key = (v) =>
    process.platform === "win32"
      ? path.resolve(v).toLowerCase()
      : path.resolve(v);
  a = key(a);
  b = key(b);
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}
export function locations(env = process.env) {
  const base = env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return {
    home: env.O4O_PC_INSTALL_HOME || path.join(base, "o4o-pc-connection"),
    dataHome: env.O4O_AGENT_HOME || path.join(base, "o4o-local-agent"),
    programs: env.APPDATA
      ? path.join(env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs")
      : null,
  };
}
export function verifyPackage(source) {
  plain(source, true);
  plain(path.join(source, "release.json"));
  let manifest;
  try {
    manifest = JSON.parse(
      fs.readFileSync(path.join(source, "release.json"), "utf8"),
    );
  } catch {
    throw new Error("INVALID_RELEASE_MANIFEST");
  }
  if (
    manifest.format !== "o4o-pc-package-v1" ||
    !ID.test(manifest.releaseId) ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceSha) ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
    manifest.nodeVersion !== "22.18.0" ||
    !manifest.files ||
    Array.isArray(manifest.files) ||
    Object.keys(manifest.files).length > 200
  )
    throw new Error("INVALID_RELEASE_MANIFEST");
  for (const required of [
    "runtime/node.exe",
    "runtime/LICENSE",
    "src/index.mjs",
    "src/local-db.mjs",
    "src/build-info.json",
    "launch.mjs",
    "install-core.mjs",
  ])
    if (!manifest.files[required]) throw new Error("INCOMPLETE_RELEASE");
  for (const [name, hash] of Object.entries(manifest.files)) {
    if (!allowed(name) || !ID.test(hash))
      throw new Error("INVALID_RELEASE_FILE");
    const file = path.join(source, ...name.split("/"));
    plain(path.dirname(file), true);
    plain(file);
    if (digest(fs.readFileSync(file)) !== hash)
      throw new Error("RELEASE_INTEGRITY_FAILED");
  }
  const code = Object.entries(manifest.files)
    .filter(([name]) => name !== "src/build-info.json")
    .sort(([a], [b]) => compareNames(a, b));
  if (
    digest(
      JSON.stringify({
        version: manifest.version,
        node: manifest.nodeVersion,
        code,
      }),
    ) !== manifest.releaseId
  )
    throw new Error("INVALID_RELEASE_IDENTITY");
  const build = JSON.parse(
    fs.readFileSync(path.join(source, "src/build-info.json"), "utf8"),
  );
  if (
    build.releaseId !== manifest.releaseId ||
    build.version !== manifest.version ||
    build.sourceSha !== manifest.sourceSha
  )
    throw new Error("INVALID_BUILD_IDENTITY");
  return manifest;
}
export function runningAgent() {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port: 47821 });
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") resolve(false);
      else reject(new Error("PC_STATE_UNKNOWN"));
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("PC_STATE_UNKNOWN"));
    });
  });
}
export function dataPreflight(slot, dataHome) {
  const exe = path.join(slot, "runtime", "node.exe"),
    entry = path.join(slot, "src", "index.mjs");
  const options = {
    env: { ...process.env, O4O_AGENT_HOME: dataHome },
    cwd: slot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60000,
    windowsHide: true,
  };
  // Existing backup/bootstrap chain owns SQLite. No credential reads, file copies or DB resets here.
  if (fs.existsSync(path.join(dataHome, "local.db")))
    execFileSync(exe, [entry, "data", "backup"], options);
  const status = JSON.parse(
    execFileSync(exe, [entry, "data", "status"], options),
  );
  if (status.ready !== true) throw new Error("LOCAL_DATA_NOT_READY");
}
function atomic(file, bytes) {
  const tmp = file + ".tmp-" + randomUUID();
  fs.writeFileSync(tmp, bytes, { flag: "wx", mode: 0o600 });
  try {
    fs.renameSync(tmp, file);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
function removeStage(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fs.unlinkSync(target);
    return;
  }
  for (const name of fs.readdirSync(target))
    removeStage(path.join(target, name));
  fs.rmdirSync(target);
}
export function installedSlot(home) {
  plain(home, true);
  plain(path.join(home, "current.json"));
  const current = JSON.parse(
    fs.readFileSync(path.join(home, "current.json"), "utf8"),
  );
  if (current.format !== "o4o-pc-install-v1" || !ID.test(current.releaseId))
    throw new Error("INVALID_INSTALLED_RELEASE");
  plain(path.join(home, "versions"), true);
  const slot = path.join(home, "versions", current.releaseId);
  const manifest = verifyPackage(slot);
  if (manifest.releaseId !== current.releaseId)
    throw new Error("INVALID_INSTALLED_RELEASE");
  return slot;
}
// OS-owned mutex: process termination releases it; no persistent lock file to strand updates.
// Windows named pipe / Linux abstract socket accepts no commands and is closed after installation.
function closeLock(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
export function acquireInstallLock(home) {
  const key = digest(canonical(home).toLowerCase());
  const name =
    process.platform === "win32"
      ? "\\\\.\\pipe\\o4o-pc-install-" + key
      : "\0o4o-pc-install-" + key;
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => socket.destroy());
    server.once("error", (error) =>
      reject(
        new Error(
          error.code === "EADDRINUSE"
            ? "ANOTHER_INSTALL_RUNNING"
            : "INSTALL_LOCK_UNAVAILABLE",
        ),
      ),
    );
    server.listen(name, () => resolve(() => closeLock(server)));
  });
}
function validateLocations(source, home, dataHome, programs) {
  if (
    overlap(home, dataHome) ||
    overlap(home, source) ||
    (programs && overlap(dataHome, canonical(programs))) ||
    /[\r\n"%]/.test(home + dataHome)
  )
    throw new Error("UNSAFE_INSTALL_LOCATION");
}
function validateInstalledData(pointer, launcher, dataHome, allowNewData) {
  for (const file of [pointer, launcher]) if (fs.existsSync(file)) plain(file);
  if (fs.existsSync(launcher) && !fs.existsSync(pointer))
    throw new Error("UNRECOGNIZED_INSTALLATION");
  if (fs.existsSync(pointer)) {
    const prior = JSON.parse(fs.readFileSync(pointer, "utf8"));
    if (
      prior.format !== "o4o-pc-install-v1" ||
      !ID.test(prior.releaseId) ||
      !path.isAbsolute(prior.dataHome ?? "")
    )
      throw new Error("INVALID_INSTALLED_RELEASE");
    if (prior.dataHome !== dataHome) throw new Error("DATA_LOCATION_CHANGED");
  }
  if (
    !allowNewData &&
    !fs.existsSync(path.join(dataHome, "local.db")) &&
    !fs.existsSync(path.join(dataHome, "credentials.json"))
  )
    throw new Error("NEW_INSTALL_CONFIRMATION_REQUIRED");
}
function activateRelease(pointer, launcher, manifest, dataHome, slot) {
  const previousPointer = fs.existsSync(pointer)
      ? fs.readFileSync(pointer)
      : null,
    previousLauncher = fs.existsSync(launcher)
      ? fs.readFileSync(launcher)
      : null;
  const next = JSON.stringify({
    format: "o4o-pc-install-v1",
    releaseId: manifest.releaseId,
    version: manifest.version,
    dataHome,
  });
  const start = Buffer.from(
    `@echo off\r\nchcp 65001 >nul\r\nsetlocal DisableDelayedExpansion\r\nset "O4O_AGENT_HOME=${dataHome}"\r\n"${path.join(slot, "runtime", "node.exe")}" "${path.join(slot, "launch.mjs")}"\r\nif errorlevel 1 pause\r\n`,
  );
  try {
    atomic(pointer, next);
    atomic(launcher, start);
  } catch (error) {
    if (previousPointer) atomic(pointer, previousPointer);
    else if (fs.existsSync(pointer)) fs.unlinkSync(pointer);
    if (previousLauncher) atomic(launcher, previousLauncher);
    else if (fs.existsSync(launcher)) fs.unlinkSync(launcher);
    throw error;
  }
  return start;
}
function writeShortcut(programs, start) {
  let shortcut = false;
  if (programs) {
    try {
      mkdir(programs);
      const target = path.join(programs, "O4O PC 연결.cmd");
      if (fs.existsSync(target)) plain(target);
      atomic(target, start);
      shortcut = true;
    } catch {
      /* Installation is valid; the local Start.cmd remains usable. */
    }
  }
  return shortcut;
}
export async function installPackage({
  source,
  home,
  dataHome,
  programs = null,
  allowNewData = false,
  probe = runningAgent,
  preflight = dataPreflight,
  beforeActivate = () => {},
}) {
  source = canonical(source);
  home = canonical(home);
  dataHome = canonical(dataHome);
  validateLocations(source, home, dataHome, programs);
  const manifest = verifyPackage(source);
  if (await probe()) throw new Error("CLOSE_PC_PROGRAM_FIRST");
  mkdir(home);
  mkdir(path.join(home, "versions"));
  const unlock = await acquireInstallLock(home);
  const stage = path.join(home, "versions", ".stage-" + randomUUID());
  let activated = false,
    damaged = null;
  const slot = path.join(home, "versions", manifest.releaseId);
  try {
    const pointer = path.join(home, "current.json"),
      launcher = path.join(home, "Start.cmd");
    validateInstalledData(pointer, launcher, dataHome, allowNewData);
    let valid = false;
    if (fs.existsSync(slot)) {
      plain(slot, true);
      try {
        verifyPackage(slot);
        valid = true;
      } catch {
        /* Damaged code is quarantined, never executed or used as package input. */
      }
    }
    if (!valid) {
      mkdir(stage);
      for (const name of [...Object.keys(manifest.files), "release.json"]) {
        const output = path.join(stage, ...name.split("/"));
        mkdir(path.dirname(output));
        fs.copyFileSync(
          path.join(source, ...name.split("/")),
          output,
          fs.constants.COPYFILE_EXCL,
        );
      }
      verifyPackage(stage);
      if (fs.existsSync(slot)) {
        const quarantine = path.join(
          home,
          "versions",
          ".damaged-" + manifest.releaseId + "-" + randomUUID(),
        );
        fs.renameSync(slot, quarantine);
        damaged = quarantine;
      }
      fs.renameSync(stage, slot);
    }
    await Promise.resolve(preflight(slot, dataHome));
    await Promise.resolve(beforeActivate());
    const start = activateRelease(pointer, launcher, manifest, dataHome, slot);
    activated = true;
    const shortcut = writeShortcut(programs, start);
    return {
      version: manifest.version,
      releaseId: manifest.releaseId,
      activated,
      shortcut,
      started: false,
    };
  } finally {
    try {
      if (damaged && !activated) {
        removeStage(slot);
        fs.renameSync(damaged, slot);
      }
      removeStage(stage);
    } finally {
      await unlock();
    }
  }
}
