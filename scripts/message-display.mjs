import fs from 'node:fs';
import path from 'node:path';
import {
  loadConfig,
  chat,
  cacheGet,
  cacheSet,
  cacheKey,
  stripCode,
  cjkCount,
  latinLetterCount,
  splitLines,
  readHookInput,
  debugLog,
  dataRoot,
  pruneDataDir,
  OUT_SYSTEM,
} from './lib.mjs';

const input = await readHookInput();
if (!input) process.exit(0);

const cfg = loadConfig();
if (!cfg.enabled || !cfg.outputEnabled) process.exit(0);

const delta = typeof input.delta === 'string' ? input.delta : '';
const sessionId = String(input.session_id ?? '');
const messageId = String(input.message_id ?? '');
const statePath = path.join(dataRoot(), 'state', `${cacheKey('state', sessionId, messageId)}.json`);

let state = { inFence: false };
try {
  state = { inFence: false, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) };
} catch {}

if (Math.random() < 0.05) pruneDataDir();

function saveState() {
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state));
  } catch {}
}

function clearState() {
  try {
    fs.unlinkSync(statePath);
  } catch {}
}

function classify(lines, inFence) {
  const items = [];
  let fence = inFence;
  for (const line of lines) {
    const body = line.replace(/\n$/, '');
    const isFence = /^\s*(```|~~~)/.test(body);
    if (fence || isFence) {
      items.push({ type: 'code', text: line });
      if (isFence) fence = !fence;
    } else if (body.trim() === '') {
      items.push({ type: 'blank', text: line });
    } else {
      items.push({ type: 'text', text: line });
    }
  }
  return { items, inFence: fence };
}

function groupTextItems(items, maxChars = 2500) {
  const groups = [];
  let cur = [];
  let len = 0;
  for (const item of items) {
    if (item.type !== 'text') {
      if (cur.length) {
        groups.push(cur);
        cur = [];
        len = 0;
      }
      continue;
    }
    if (len + item.text.length > maxChars && cur.length) {
      groups.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(item);
    len += item.text.length;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

async function translateChunk(source) {
  const key = cacheKey('out', cfg.model, OUT_SYSTEM, source);
  const hit = cacheGet(key);
  if (hit != null) return hit;
  const translated = await chat(cfg, OUT_SYSTEM, source, cfg.outputTimeoutMs);
  cacheSet(key, translated);
  return translated;
}

function normalize(translated, source) {
  let out = translated.replace(/^\n+/, '').replace(/\s+$/, '');
  if (/\n$/.test(source)) out += '\n';
  return out;
}

if (!delta) {
  if (input.final) clearState();
  process.exit(0);
}

const { items, inFence } = classify(splitLines(delta), state.inFence);
state.inFence = inFence;

const textItems = items.filter((item) => item.type === 'text');
const analysis = stripCode(textItems.map((item) => item.text).join(''));
const latin = latinLetterCount(analysis);
const cjk = cjkCount(analysis);
const shouldTranslate = latin >= 2 && !(cjk > 0 && cjk * 2 >= latin);

if (shouldTranslate) {
  for (const group of groupTextItems(items)) {
    const source = group.map((item) => item.text).join('');
    let translated;
    try {
      translated = normalize(await translateChunk(source), source);
    } catch (e) {
      debugLog('output translate failed:', e.message);
      continue;
    }
    if (!translated) continue;
    group[0].translated = translated;
    for (let i = 1; i < group.length; i++) group[i].skipped = true;
  }
}

saveState();
if (input.final) clearState();

const out = items
  .map((item) => {
    if (item.translated != null) return item.translated;
    if (item.skipped) return '';
    return item.text;
  })
  .join('');

if (out && out !== delta) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'MessageDisplay',
        displayContent: out,
      },
    }),
  );
}
