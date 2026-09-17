# Fableish-translate

[English](README.en.md) | 简体中文

Claude Code 中英互译插件：

- **输入**（UserPromptSubmit hook）：你输入中文时，自动翻译成英文并注入上下文，让模型以英文版本为准处理。
- **输出**（MessageDisplay hook）：模型回复的英文在屏幕上实时翻译成简体中文显示；代码块、行内代码、URL、路径等原样保留。

翻译默认使用 DeepSeek（`deepseek/deepseek-v4-flash`），接口地址和 key 从环境变量或 `~/.config/fableish-translate/.env` 读取。

## 安装

克隆到 Claude Code 的 skills 目录（官方支持的 skills-dir 插件方式，无需 marketplace）：

```bash
git clone https://github.com/Ma1oneZhang/Fableish-translate ~/.claude/skills/fableish-translate
```

重启 Claude Code（或运行 `/reload-plugins`）后自动生效。也可以克隆到项目的 `.claude/skills/` 目录，仅在单个项目启用。

检查状态：

```
/fableish-translate:status
```

或直接运行：

```bash
node ~/.claude/skills/fableish-translate/scripts/status.mjs
```

## 写给 Agent（AI 助手）

如果你是替用户安装本插件的 AI agent，不要 clone 完就宣布成功。请先确认以下三项配置已落实（写入 `~/.config/fableish-translate/.env`，参考 `.env.example`）：

- **模型**：`FABLEISH_TRANSLATE_MODEL`（默认 `deepseek/deepseek-v4-flash`，须与所配接口匹配）
- **API endpoint**：`FABLEISH_TRANSLATE_BASE_URL`（OpenAI 兼容的 `/chat/completions` 接口地址）
- **API key**：`FABLEISH_TRANSLATE_API_KEY`（对应接口的密钥）

然后运行 `/fableish-translate:status`（或 `node ~/.claude/skills/fableish-translate/scripts/status.mjs`）验证，`api test` 输出 `OK` 才算安装完成。注意：endpoint 或 key 缺失时插件不会报错，只会静默不翻译。

## 工作原理

| Hook | 作用 |
| --- | --- |
| `UserPromptSubmit` | 检测到中文输入 → 调 API 翻译成英文 → 以 `additionalContext` 注入（原文仍在上下文里，这是 Claude Code 插件机制的限制，无法真正替换 prompt） |
| `MessageDisplay` | 助手文本按批流式渲染时，逐批翻译成中文后替换显示；代码块自动跳过，按 `message_id` 记录围栏状态 |

注意：MessageDisplay 只改屏幕显示，**会话记录（transcript）和模型上下文仍是英文**，`Ctrl+O` verbose 模式看到的是原文。

## 配置

配置文件（可选）：`~/.config/fableish-translate/.env`，参考 `.env.example`。真实环境变量优先于 `.env` 文件中的同名项。

环境变量（同时也是 `.env` 文件的键名）：

- `FABLEISH_TRANSLATE_MODEL`：模型 ID，默认 `deepseek/deepseek-v4-flash`
- `FABLEISH_TRANSLATE_BASE_URL` / `FABLEISH_TRANSLATE_API_KEY`：接口地址和 key（OpenAI 兼容 `/chat/completions`，两者都配置后才会发起调用）
- `FABLEISH_TRANSLATE_ENABLED` / `FABLEISH_TRANSLATE_INPUT_ENABLED` / `FABLEISH_TRANSLATE_OUTPUT_ENABLED`：总开关与方向开关，设为 `false` 关闭
- `FABLEISH_TRANSLATE_MAX_INPUT_CHARS`：超过该长度的中文输入不翻译（默认 3000，避免大段粘贴拖慢提交）
- `FABLEISH_TRANSLATE_INPUT_TIMEOUT_MS` / `FABLEISH_TRANSLATE_OUTPUT_TIMEOUT_MS`：单次翻译超时（默认 15s / 12s，超时回退原文）
- `FABLEISH_TRANSLATE_DISABLE_REASONING`：默认 `true`，翻译请求带 `enable_thinking: false`，把单次延迟从 ~3s 降到 ~1.2s
- `FABLEISH_TRANSLATE_CONFIG`：自定义 `.env` 文件路径
- `FABLEISH_TRANSLATE_DISABLED=1`：临时全部关闭

## 调试

- 失败原因写入数据目录日志：`~/.claude/plugins/data/fableish-translate-skills-dir/fableish-translate.log`（手动运行脚本时为 `~/.cache/fableish-translate/fableish-translate.log`）
- `claude --debug` 查看 hook 调用详情

## 限制

- 输入侧只能注入英文翻译，不能替换原文（Claude Code 限制）；如要彻底替换需要自建翻译代理。
- 输出侧逐批翻译，每批约 1~2s 延迟；批次很长时会分块翻译。
- 模型如果直接用中文回复，会自动跳过翻译。
- 翻译质量取决于 `deepseek-v4-flash`，专业术语可能不够准确。

## License

[MIT](LICENSE)
