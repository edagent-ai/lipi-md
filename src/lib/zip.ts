/**
 * A minimal ZIP writer.
 *
 * Hand-written rather than pulled from npm for the same reason as `idb.ts`: it
 * is a couple of well-specified headers, and the shipped dependency graph stays
 * exactly as small as it is. Compression is the browser's own
 * `CompressionStream('deflate-raw')`, which emits precisely the raw DEFLATE
 * stream ZIP's method 8 expects — so there is no bundled compressor either.
 *
 * Deliberately not implemented: ZIP64, encryption, and anything to do with
 * reading archives. Nothing here needs them.
 */

export interface ZipEntry {
  /** Forward-slash relative path inside the archive. */
  path: string;
  text: string;
  /** Modification time, so files carry a sensible date once extracted. */
  modified?: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS date and time, which is what the format stores. */
function dosStamp(ms: number): { time: number; date: number } {
  const d = new Date(ms);
  // The epoch is 1980; anything earlier cannot be represented.
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(
      new CompressionStream('deflate-raw'),
    );
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

interface Staged {
  nameBytes: Uint8Array;
  body: Uint8Array;
  crc: number;
  method: number;
  rawSize: number;
  offset: number;
  stamp: { time: number; date: number };
}

/**
 * Builds the archive.
 *
 * Sizes are known before anything is written because each entry is compressed
 * up front, so no data descriptors are needed and every header can be filled in
 * one pass.
 */
export async function makeZip(entries: ZipEntry[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const staged: Staged[] = [];
  const chunks: BlobPart[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path.replace(/\\/g, '/').replace(/^\/+/, ''));
    const raw = encoder.encode(entry.text);
    const crc = crc32(raw);

    const packed = await deflateRaw(raw);
    // Text that fails to get smaller is stored as-is; a "compressed" entry
    // larger than its input would be a silly thing to write.
    const useDeflate = packed !== null && packed.length < raw.length;
    const body = useDeflate ? (packed as Uint8Array) : raw;

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    const stamp = dosStamp(entry.modified ?? Date.now());

    view.setUint32(0, 0x04034b50, true); // local file header
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0x0800, true); // UTF-8 names
    view.setUint16(8, useDeflate ? 8 : 0, true);
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, body.length, true);
    view.setUint32(22, raw.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // no extra field
    header.set(nameBytes, 30);

    chunks.push(header as BlobPart, body as BlobPart);
    staged.push({
      nameBytes,
      body,
      crc,
      method: useDeflate ? 8 : 0,
      rawSize: raw.length,
      offset,
      stamp,
    });
    offset += header.length + body.length;
  }

  const directoryOffset = offset;
  let directorySize = 0;

  for (const item of staged) {
    const record = new Uint8Array(46 + item.nameBytes.length);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x02014b50, true); // central directory header
    view.setUint16(4, 20, true); // version made by
    view.setUint16(6, 20, true); // version needed
    view.setUint16(8, 0x0800, true); // UTF-8 names
    view.setUint16(10, item.method, true);
    view.setUint16(12, item.stamp.time, true);
    view.setUint16(14, item.stamp.date, true);
    view.setUint32(16, item.crc, true);
    view.setUint32(20, item.body.length, true);
    view.setUint32(24, item.rawSize, true);
    view.setUint16(28, item.nameBytes.length, true);
    view.setUint16(30, 0, true); // extra length
    view.setUint16(32, 0, true); // comment length
    view.setUint16(34, 0, true); // disk number
    view.setUint16(36, 0, true); // internal attributes
    view.setUint32(38, 0o644 << 16, true); // external attributes: a regular file
    view.setUint32(42, item.offset, true);
    record.set(item.nameBytes, 46);

    chunks.push(record as BlobPart);
    directorySize += record.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); // end of central directory
  endView.setUint16(4, 0, true); // this disk
  endView.setUint16(6, 0, true); // disk with the directory
  endView.setUint16(8, staged.length, true);
  endView.setUint16(10, staged.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, directoryOffset, true);
  endView.setUint16(20, 0, true); // no comment
  chunks.push(end as BlobPart);

  return new Blob(chunks, { type: 'application/zip' });
}
