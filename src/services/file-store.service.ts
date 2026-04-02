/**
 * Simple JSON file store — used as a persistence fallback when Redis is
 * unavailable. Reads on startup, writes on every mutation (fire-and-forget).
 *
 * Not suitable for high-concurrency production use; fine for local dev and
 * low-traffic single-process deployments.
 */
import fs   from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readStore<T>(name: string, defaultValue: T): T {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const raw = fs.readFileSync(filePath(name), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function writeStore<T>(name: string, data: T): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath(name), JSON.stringify(data), 'utf-8');
  } catch {
    // best-effort — never crash the server over a stats write
  }
}
