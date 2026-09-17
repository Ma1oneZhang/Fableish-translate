import fs from 'node:fs';
import { loadConfig, chat, envFilePath, dataRoot, OUT_SYSTEM } from './lib.mjs';

const cfg = loadConfig();
const mask = (key) => (key ? `${key.slice(0, 4)}...${key.slice(-4)}` : '(none)');

console.log('fableish-translate status');
console.log('env file      :', envFilePath(), fs.existsSync(envFilePath()) ? '(found)' : '(not found)');
console.log('enabled       :', cfg.enabled);
console.log('input enabled :', cfg.inputEnabled);
console.log('output enabled:', cfg.outputEnabled);
console.log('model         :', cfg.model);
console.log('baseURL       :', cfg.baseURL || '(unresolved)');
console.log('apiKey        :', mask(cfg.apiKey));
console.log('data dir      :', dataRoot());
console.log('node          :', process.version);

try {
  const t0 = Date.now();
  const out = await chat(cfg, OUT_SYSTEM, 'The build succeeded.', 15000);
  console.log(`api test      : OK (${Date.now() - t0}ms) -> ${out.trim()}`);
} catch (e) {
  console.log('api test      : FAILED -', e.message);
  process.exitCode = 1;
}
