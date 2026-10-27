import { deflateRawSync, inflateRawSync } from "node:zlib";
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc(data) {
  let n = 0xffffffff;
  for (const b of data) n = table[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
export function zip(files) {
  const chunks = [],
    central = [];
  let offset = 0;
  for (const [name, data] of files) {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(name) ||
      name.split("/").includes("..") ||
      name.startsWith("/")
    )
      throw new Error("Invalid release path");
    const filename = Buffer.from(name),
      compressed = deflateRawSync(data),
      checksum = crc(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(33, 14);
    header.writeUInt32LE(checksum, 16);
    header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(filename.length, 28);
    header.writeUInt32LE(offset, 42);
    chunks.push(local, filename, compressed);
    central.push(header, filename);
    offset += local.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}
/** Only retrieves a named member in memory, never extracts archive paths to disk. */
export function member(archive, name) {
  let end = -1;
  for (
    let i = archive.length - 22;
    i >= Math.max(0, archive.length - 65557);
    i--
  )
    if (archive.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("Invalid runtime ZIP");
  let cursor = archive.readUInt32LE(end + 16);
  const count = archive.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50)
      throw new Error("Invalid ZIP directory");
    const length = archive.readUInt16LE(cursor + 28),
      extra = archive.readUInt16LE(cursor + 30),
      comment = archive.readUInt16LE(cursor + 32);
    const found = archive
      .subarray(cursor + 46, cursor + 46 + length)
      .toString();
    if (found === name) {
      return runtimeMember(archive, cursor);
    }
    cursor += 46 + length + extra + comment;
  }
  throw new Error("Runtime executable absent");
}

function runtimeMember(archive, cursor) {
  const size = archive.readUInt32LE(cursor + 24),
    compressed = archive.readUInt32LE(cursor + 20),
    method = archive.readUInt16LE(cursor + 10),
    offset = archive.readUInt32LE(cursor + 42);
  if (size > 150 * 1024 * 1024 || archive.readUInt32LE(offset) !== 0x04034b50)
    throw new Error("Invalid runtime member");
  const start =
    offset +
    30 +
    archive.readUInt16LE(offset + 26) +
    archive.readUInt16LE(offset + 28);
  const raw = archive.subarray(start, start + compressed);
  let bytes = null;
  if (method === 8)
    bytes = inflateRawSync(raw, { maxOutputLength: 150 * 1024 * 1024 });
  else if (method === 0) bytes = raw;
  if (
    !bytes ||
    bytes.length !== size ||
    crc(bytes) !== archive.readUInt32LE(cursor + 16)
  )
    throw new Error("Runtime ZIP integrity failed");
  return bytes;
}
