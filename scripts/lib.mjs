import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const HOME = os.homedir();

export const VERSION = '0.2.0';
export const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';

export const IN_SYSTEM = [
  'You are a professional translator. Translate the user text into English.',
  '',
  'Rules:',
  '- Preserve fenced code blocks, inline code, URLs, file paths, command names, environment variables, and identifiers exactly as they are.',
  '- Preserve markdown formatting and line breaks.',
  '- Keep parts that are already in English unchanged.',
  '- Output only the translation. Do not add explanations, notes, or surrounding quotes.',
].join('\n');

export const OUT_SYSTEM = [
  'You are a professional translator. Translate the user text into Simplified Chinese (简体中文).',
  '',
  'Rules:',
  '- Preserve markdown formatting and line breaks. The output must have exactly the same number of lines as the input.',
  '- Do not translate or modify fenced code blocks, inline code, URLs, file paths, command names, environment variables, or identifiers. Keep them byte-for-byte identical.',
  '- Keep markdown markers (#, -, *, 1., >, |, etc.) at the start of lines unchanged.',
  '- Keep parts that are already in Chinese unchanged.',
  '- Output only the translation. Do not add explanations, notes, or surrounding quotes.',
].join('\n');

export function dataRoot() {
  const env = process.env.CLAUDE_PLUGIN_DATA;
  if (env && !env.includes('${') && path.basename(env).includes('fable-zh')) return env;
  const xdg = process.env.XDG_CACHE_HOME;
  return path.join(xdg || path.join(HOME, '.cache'), 'fable-zh');
}

export function envFilePath() {
  return process.env.FABLE_ZH_CONFIG || path.join(HOME, '.config', 'fable-zh', '.env');
}

function loadEnvFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted = value.match(/^(['"])([\s\S]*)\1$/);
    if (quoted) value = quoted[2];
    if (key in process.env) continue;
    process.env[key] = value;
  }
}

export function loadConfig() {
  loadEnvFile(envFilePath());

  return {
    model: process.env.FABLE_ZH_MODEL || DEFAULT_MODEL,
    baseURL: (process.env.FABLE_ZH_BASE_URL || '').replace(/\/+$/, ''),
    apiKey: process.env.FABLE_ZH_API_KEY || '',
    enabled: process.env.FABLE_ZH_ENABLED !== 'false' && process.env.FABLE_ZH_DISABLED !== '1',
    inputEnabled: process.env.FABLE_ZH_INPUT_ENABLED !== 'false',
    outputEnabled: process.env.FABLE_ZH_OUTPUT_ENABLED !== 'false',
    maxInputChars: Number(process.env.FABLE_ZH_MAX_INPUT_CHARS) || 3000,
    inputTimeoutMs: Number(process.env.FABLE_ZH_INPUT_TIMEOUT_MS) || 15000,
    outputTimeoutMs: Number(process.env.FABLE_ZH_OUTPUT_TIMEOUT_MS) || 12000,
    disableReasoning: process.env.FABLE_ZH_DISABLE_REASONING !== 'false',
  };
}

export async function chat(cfg, system, user, timeoutMs) {
  if (!cfg.baseURL || !cfg.apiKey) throw new Error('no API credentials resolved');

  const url = `${cfg.baseURL}/chat/completions`;
  const base = {
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
    stream: false,
  };

  const attempt = async (extra) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ ...base, ...extra }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('empty translation');
    return content;
  };

  if (cfg.disableReasoning) {
    try {
      return await attempt({ enable_thinking: false });
    } catch (e) {
      if (e.status !== 400) throw e;
    }
  }
  return attempt({});
}

export function cacheKey(...parts) {
  return crypto.createHash('sha1').update([VERSION, ...parts].join('\u0000')).digest('hex');
}

export function cacheGet(key) {
  try {
    return fs.readFileSync(path.join(dataRoot(), 'cache', `${key}.txt`), 'utf8');
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  try {
    const p = path.join(dataRoot(), 'cache', `${key}.txt`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, value);
  } catch {}
}

export function debugLog(...args) {
  try {
    const p = path.join(dataRoot(), 'fable-zh.log');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${args.join(' ')}\n`);
  } catch {}
}

export function pruneDataDir() {
  try {
    const now = Date.now();
    for (const sub of ['state', 'cache']) {
      const dir = path.join(dataRoot(), sub);
      const entries = fs.readdirSync(dir);
      for (const name of entries) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        const maxAge = sub === 'state' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
        if (now - st.mtimeMs > maxAge) fs.unlinkSync(p);
      }
    }
  } catch {}
}

const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g;
const HAN_TEST = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

export function cjkCount(text) {
  return (text.match(HAN) || []).length;
}

export function hasCJK(text) {
  return HAN_TEST.test(text);
}

export function latinLetterCount(text) {
  return (text.match(/[A-Za-z]/g) || []).length;
}

export function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

export function splitLines(text) {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

export function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

export function readHookInput() {
  return readStdin().then((raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
}
