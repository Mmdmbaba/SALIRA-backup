/**
 * Minimal ZIP writer (store method, no compression, no deps).
 * Enough for bundling generated .conf files client-side.
 */

/* ------------------------------- CRC32 ------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------ helpers ------------------------------ */

function dosDateTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

interface ZipEntry {
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
  time: number;
  date: number;
}

/** Build a ZIP blob from files. */
export function createZip(files: { name: string; content: string }[]): Blob {
  const enc = new TextEncoder();
  const now = dosDateTime(new Date());
  const entries: ZipEntry[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v: number) =>
    new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
  const join = (...arrs: Uint8Array[]) => {
    const len = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const a of arrs) {
      out.set(a, o);
      o += a.length;
    }
    return out;
  };

  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);

    const local = join(
      u32(0x04034b50),
      u16(20), // version needed
      u16(0x0800), // UTF-8 names flag
      u16(0), // method: store
      u16(now.time),
      u16(now.date),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data
    );
    chunks.push(local);
    entries.push({ name, data, crc, offset, time: now.time, date: now.date });
    offset += local.length;
  }

  const centralStart = offset;
  for (const e of entries) {
    chunks.push(
      join(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(e.time),
        u16(e.date),
        u32(e.crc),
        u32(e.data.length),
        u32(e.data.length),
        u16(e.name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(e.offset),
        e.name
      )
    );
    offset += 46 + e.name.length;
  }

  chunks.push(
    join(
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(entries.length),
      u16(entries.length),
      u32(offset - centralStart),
      u32(centralStart),
      u16(0)
    )
  );

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return new Blob([out], { type: "application/zip" });
}
