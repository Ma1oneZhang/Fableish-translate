import { loadConfig, chat, hasCJK, IN_SYSTEM, readHookInput, debugLog } from './lib.mjs';

const input = await readHookInput();
if (!input) process.exit(0);

const cfg = loadConfig();
if (!cfg.enabled || !cfg.inputEnabled) process.exit(0);

const prompt = typeof input.prompt === 'string' ? input.prompt : '';
if (!prompt.trim()) process.exit(0);
if (prompt.trimStart().startsWith('/')) process.exit(0);
if (!hasCJK(prompt)) process.exit(0);
if (prompt.length > cfg.maxInputChars) process.exit(0);

let translated;
try {
  translated = await chat(cfg, IN_SYSTEM, prompt, cfg.inputTimeoutMs);
} catch (e) {
  debugLog('input translate failed:', e.message);
  process.exit(0);
}

translated = translated.trim();
if (!translated || translated === prompt.trim()) process.exit(0);

const context = [
  '[fableish-translate auto-translate] The user prompt was translated to English for processing. Treat the English version below as the authoritative request, and reply in English (the UI shows Chinese to the user).',
  '---',
  translated,
  '---',
].join('\n');

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context,
    },
  }),
);
