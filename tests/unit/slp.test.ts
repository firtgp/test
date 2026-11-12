import {afterEach, describe, expect, it} from 'vitest';
import net from 'node:net';
import {pingServer, readVarInt} from '../../worker/slp';

function varInt(v: number): Buffer {
  const out: number[] = [];
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v) b |= 0x80;
    out.push(b);
  } while (v);
  return Buffer.from(out);
}

/** Поддельный игровой сервер: отвечает на status request заданным JSON. */
function fakeServer(reply: (socket: net.Socket) => void): Promise<{port: number; close: () => void}> {
  return new Promise(resolve => {
    const srv = net.createServer(socket => {
      socket.on('error', () => {});
      socket.once('data', () => reply(socket));
    });
    srv.listen(0, '127.0.0.1', () => {
      resolve({port: (srv.address() as net.AddressInfo).port, close: () => srv.close()});
    });
  });
}

function statusPacket(json: unknown): Buffer {
  const str = Buffer.from(JSON.stringify(json), 'utf8');
  const body = Buffer.concat([varInt(0), varInt(str.length), str]);
  return Buffer.concat([varInt(body.length), body]);
}

let closers: (() => void)[] = [];
afterEach(() => {
  closers.forEach(c => c());
  closers = [];
});

describe('Server List Ping', () => {
  it('читает онлайн и версию; ответ, пришедший частями, собирается', async () => {
    const pkt = statusPacket({version: {name: 'NeoForge 1.21.1', protocol: 767}, players: {online: 37, max: 100}});
    const s = await fakeServer(socket => {
      socket.write(pkt.subarray(0, 5));
      setTimeout(() => socket.write(pkt.subarray(5)), 20);
    });
    closers.push(s.close);
    const r = await pingServer('127.0.0.1', s.port, 2000);
    expect(r).toMatchObject({online: true, playersOnline: 37, playersMax: 100, versionName: 'NeoForge 1.21.1', error: null});
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('упавший сервер — офлайн с причиной, без выдуманных чисел', async () => {
    const s = await fakeServer(() => {});
    s.close();
    const r = await pingServer('127.0.0.1', s.port, 1000);
    expect(r.online).toBe(false);
    expect(r.playersOnline).toBeNull();
    expect(r.error).toBeTruthy();
  });

  it('молчащий сервер — таймаут', async () => {
    const s = await fakeServer(() => {});
    closers.push(s.close);
    const r = await pingServer('127.0.0.1', s.port, 200);
    expect(r).toMatchObject({online: false, error: 'timeout'});
  });

  it('мусор вместо ответа не роняет воркер', async () => {
    const s = await fakeServer(socket => socket.write(Buffer.from([0x05, 0x00, 0x03, 0x7b, 0x7b, 0x7b])));
    closers.push(s.close);
    const r = await pingServer('127.0.0.1', s.port, 1000);
    expect(r.online).toBe(false);
    expect(r.error).toMatch(/bad response/);
  });

  it('отрицательные и нечисловые значения онлайна отбрасываются', async () => {
    const s = await fakeServer(socket => socket.write(statusPacket({players: {online: -5, max: 'много'}})));
    closers.push(s.close);
    const r = await pingServer('127.0.0.1', s.port, 1000);
    expect(r).toMatchObject({online: true, playersOnline: null, playersMax: null});
  });

  it('readVarInt', () => {
    expect(readVarInt(Buffer.from([0xff, 0x01]), 0)).toEqual({value: 255, size: 2});
    expect(readVarInt(Buffer.from([0x80]), 0)).toBeNull();
  });
});
