# fable-zh

[English](README.en.md) | [简体中文](README.md)

A Claude Code plugin for bidirectional Chinese–English translation:

- **Input** (UserPromptSubmit hook): when you type Chinese, it is automatically translated into English and injected as context, so the model processes the English version as the authoritative request.
- **Output** (MessageDisplay hook): the assistant's English replies are translated into Simplified Chinese on screen in real time; code blocks, inline code, URLs, and file paths are left untouched.

Translation uses DeepSeek by default (`deepseek/deepseek-v4-flash`); the endpoint and API key are read from environment variables or `~/.config/fable-zh/.env`.

## Installation

Clone into Claude Code's skills directory (an officially supported skills-dir plugin — no marketplace or install step needed):

```bash
git clone https://github.com/Ma1oneZhang/Fableish-translate ~/.claude/skills/fable-zh
```

Restart Claude Code (or run `/reload-plugins`) and the plugin takes effect automatically.

To enable it for a single project only, clone into the project's `.claude/skills/` directory instead.

Check the status:

```
/fable-zh:status
```

Or run directly:

```bash
node ~/.claude/skills/fable-zh/scripts/status.mjs
```

## How it works

| Hook | What it does |
| --- | --- |
| `UserPromptSubmit` | Detects Chinese input → calls the API to translate it into English → injects it via `additionalContext` (the original text stays in context; this is a limitation of the Claude Code plugin mechanism — the prompt cannot be truly replaced) |
| `MessageDisplay` | As assistant text streams in batches, each batch is translated into Chinese and replaces what is shown; code blocks are skipped automatically, fence state is tracked per `message_id` |

Note: MessageDisplay only changes what is shown on screen; **the session transcript and the model's context remain in English** — `Ctrl+O` verbose mode shows the original text.

## Configuration

Optional config file: `~/.config/fable-zh/.env`, see `.env.example`. Real environment variables take precedence over entries in the `.env` file.

Environment variables (also the key names in the `.env` file):

- `FABLE_ZH_MODEL`: model ID, default `deepseek/deepseek-v4-flash`
- `FABLE_ZH_BASE_URL` / `FABLE_ZH_API_KEY`: endpoint and key (OpenAI-compatible `/chat/completions`; calls are only made when both are set)
- `FABLE_ZH_ENABLED` / `FABLE_ZH_INPUT_ENABLED` / `FABLE_ZH_OUTPUT_ENABLED`: master switch and per-direction switches; set to `false` to disable
- `FABLE_ZH_MAX_INPUT_CHARS`: Chinese input longer than this is not translated (default 3000, so large pastes don't slow down submission)
- `FABLE_ZH_INPUT_TIMEOUT_MS` / `FABLE_ZH_OUTPUT_TIMEOUT_MS`: per-call timeout (default 15s / 12s; falls back to the original text on timeout)
- `FABLE_ZH_DISABLE_REASONING`: default `true`; sends `enable_thinking: false` with translation requests, cutting per-call latency from ~3s to ~1.2s
- `FABLE_ZH_CONFIG`: custom `.env` file path
- `FABLE_ZH_DISABLED=1`: temporarily disable everything

## Debugging

- Failures are logged to the data directory: `~/.claude/plugins/data/fable-zh-skills-dir/fable-zh.log` (`~/.cache/fable-zh/fable-zh.log` when running scripts manually)
- `claude --debug` shows hook invocation details

## Limitations

- On the input side, only the English translation can be injected — the original prompt cannot be replaced (a Claude Code limitation); fully replacing it would require a translation proxy.
- On the output side, translation happens batch by batch, adding ~1–2s per batch; long batches are split into chunks.
- If the model replies in Chinese directly, translation is skipped.
- Translation quality depends on `deepseek-v4-flash`; technical terms may be imprecise.

## License

[MIT](LICENSE)