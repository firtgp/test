// Server List Ping (Java Edition, протокол 1.7+): handshake → status request → JSON.
// Работает по исходящему TCP, поэтому запускается на сервере/VPS, а не в браузере.
import net from 'node:net';

export interface SlpResult {
  online: boolean;
  playersOnline: number | null;
  playersMax: number | null;
  versionName: string | null;
  latencyMs: number | null;
  error: string | null;
}

function varInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

/** Читает VarInt; null — данных пока не хватает. */
export function readVarInt(buf: Buffer, offset: number): {value: number; size: number} | null {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buf.length) return null;
    const b = buf[offset + i];
    value |= (b & 0x7f) << (7 * i);
    if ((b & 0x80) === 0) return {value: value >>> 0, size: i + 1};
  }
  throw new Error('varint too long');
}

function packet(id: number, payload: Buffer): Buffer {
  const body = Buffer.concat([varInt(id), payload]);
  return Buffer.concat([varInt(body.length), body]);
}

export function buildHandshake(host: string, port: number): Buffer {
  const hostBuf = Buffer.from(host, 'utf8');
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port);
  // protocol version -1: «узнать версию сервера»; next state 1 = status
  return packet(0x00, Buffer.concat([varInt(-1), varInt(hostBuf.length), hostBuf, portBuf, varInt(1)]));
}

const MAX_RESPONSE = 1024 * 1024;

export function pingServer(host: string, port: number, timeoutMs = 5000): Promise<SlpResult> {
  return new Promise(resolve => {
    const started = Date.now();
    let chunks = Buffer.alloc(0);
    let done = false;
    const socket = net.createConnection({host, port});
    const finish = (r: Partial<SlpResult>) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({
        online: false, playersOnline: null, playersMax: null, versionName: null, latencyMs: null, error: null,
        ...r,
      });
    };
    socket.setTimeout(timeoutMs, () => finish({error: 'timeout'}));
    socket.on('error', e => finish({error: (e as NodeJS.ErrnoException).code ?? e.message}));
    socket.on('close', () => finish({error: 'closed'}));
    socket.on('connect', () => {
      socket.write(Buffer.concat([buildHandshake(host, port), packet(0x00, Buffer.alloc(0))]));
    });
    socket.on('data', (data: Buffer) => {
      chunks = Buffer.concat([chunks, data]);
      if (chunks.length > MAX_RESPONSE) return finish({error: 'response too large'});
      try {
        const len = readVarInt(chunks, 0);
        if (!len || chunks.length < len.size + len.value) return;
        let off = len.size;
        const id = readVarInt(chunks, off);
        if (!id) return;
        off += id.size;
        if (id.value !== 0x00) return finish({error: 'unexpected packet'});
        const strLen = readVarInt(chunks, off);
        if (!strLen) return;
        off += strLen.size;
        const json = JSON.parse(chunks.subarray(off, off + strLen.value).toString('utf8'));
        const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
        finish({
          online: true,
          playersOnline: n(json?.players?.online),
          playersMax: n(json?.players?.max),
          versionName: typeof json?.version?.name === 'string' ? json.version.name.slice(0, 80) : null,
          latencyMs: Date.now() - started,
        });
      } catch (e) {
        finish({error: `bad response: ${(e as Error).message}`});
      }
    });
  });
}
