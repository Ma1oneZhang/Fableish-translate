# Fableish-translate

[English](README.en.md) | [简体中文](README.md)

A Claude Code plugin for bidirectional Chinese–English translation:

- **Input** (UserPromptSubmit hook): when you type Chinese, it is automatically translated into English and injected as context, so the model processes the English version as the authoritative request.
- **Output** (MessageDisplay hook): the assistant's English replies are translated into Simplified Chinese on screen in real time; code blocks, inline code, URLs, and file paths are left untouched.

Translation uses DeepSeek by default (`deepseek/deepseek-v4-flash`); the endpoint and API key are read from environment variables or `~/.config/fableish-translate/.env`.

## Installation

Clone into Claude Code's skills directory (an officially supported skills-dir plugin — no marketplace or install step needed):

```bash
git clone https://github.com/Ma1oneZhang/Fableish-translate ~/.claude/skills/fableish-translate
```

Restart Claude Code (or run `/reload-plugins`) and the plugin takes effect automatically.

To enable it for a single project only, clone into the project's `.claude/skills/` directory instead.

Check the status:

```
/fableish-translate:status
```

Or run directly:

```bash
node ~/.claude/skills/fableish-translate/scripts/status.mjs
```

## For AI agents

If you are an AI agent installing this plugin on behalf of a user, do not declare success after cloning. First make sure the following three settings are in place (written to `~/.config/fableish-translate/.env`, see `.env.example`):

- **Model**: `FABLEISH_TRANSLATE_MODEL` (default `deepseek/deepseek-v4-flash`; must match the endpoint you configure)
- **API endpoint**: `FABLEISH_TRANSLATE_BASE_URL` (an OpenAI-compatible `/chat/completions` URL)
- **API key**: `FABLEISH_TRANSLATE_API_KEY` (the key for that endpoint)

Then verify with `/fableish-translate:status` (or `node ~/.claude/skills/fableish-translate/scripts/status.mjs`) — the installation is only complete once the `api test` line prints `OK`. Note: if the endpoint or key is missing, the plugin does not error out; it silently skips translation.

## How it works

| Hook | What it does |
| --- | --- |
| `UserPromptSubmit` | Detects Chinese input → calls the API to translate it into English → injects it via `additionalContext` (the original text stays in context; this is a limitation of the Claude Code plugin mechanism — the prompt cannot be truly replaced) |
| `MessageDisplay` | As assistant text streams in batches, each batch is translated into Chinese and replaces what is shown; code blocks are skipped automatically, fence state is tracked per `message_id` |

Note: MessageDisplay only changes what is shown on screen; **the session transcript and the model's context remain in English** — `Ctrl+O` verbose mode shows the original text.

## Configuration

Optional config file: `~/.config/fableish-translate/.env`, see `.env.example`. Real environment variables take precedence over entries in the `.env` file.

Environment variables (also the key names in the `.env` file):

- `FABLEISH_TRANSLATE_MODEL`: model ID, default `deepseek/deepseek-v4-flash`
- `FABLEISH_TRANSLATE_BASE_URL` / `FABLEISH_TRANSLATE_API_KEY`: endpoint and key (OpenAI-compatible `/chat/completions`; calls are only made when both are set)
- `FABLEISH_TRANSLATE_ENABLED` / `FABLEISH_TRANSLATE_INPUT_ENABLED` / `FABLEISH_TRANSLATE_OUTPUT_ENABLED`: master switch and per-direction switches; set to `false` to disable
- `FABLEISH_TRANSLATE_MAX_INPUT_CHARS`: Chinese input longer than this is not translated (default 3000, so large pastes don't slow down submission)
- `FABLEISH_TRANSLATE_INPUT_TIMEOUT_MS` / `FABLEISH_TRANSLATE_OUTPUT_TIMEOUT_MS`: per-call timeout (default 15s / 12s; falls back to the original text on timeout)
- `FABLEISH_TRANSLATE_DISABLE_REASONING`: default `true`; sends `enable_thinking: false` with translation requests, cutting per-call latency from ~3s to ~1.2s
- `FABLEISH_TRANSLATE_CONFIG`: custom `.env` file path
- `FABLEISH_TRANSLATE_DISABLED=1`: temporarily disable everything

## Debugging

- Failures are logged to the data directory: `~/.claude/plugins/data/fableish-translate-skills-dir/fableish-translate.log` (`~/.cache/fableish-translate/fableish-translate.log` when running scripts manually)
- `claude --debug` shows hook invocation details

## Limitations

- On the input side, only the English translation can be injected — the original prompt cannot be replaced (a Claude Code limitation); fully replacing it would require a translation proxy.
- On the output side, translation happens batch by batch, adding ~1–2s per batch; long batches are split into chunks.
- If the model replies in Chinese directly, translation is skipped.
- Translation quality depends on `deepseek-v4-flash`; technical terms may be imprecise.

## License

[MIT](LICENSE)