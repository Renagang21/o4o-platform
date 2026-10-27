import fs from 'node:fs';
export const PC_AGENT_VERSION = '0.4.0';
/** Build metadata is a fixed application file; never a user-supplied path or credential. */
export function installedReleaseId() {
 try { const value=JSON.parse(fs.readFileSync(new URL('./build-info.json',import.meta.url),'utf8'));return value.version===PC_AGENT_VERSION&&/^[a-f0-9]{64}$/.test(value.releaseId)?value.releaseId:null; }
 catch { return null; }
}
