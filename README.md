# fable-zh

[English](README.en.md) | 简体中文

Claude Code 中英互译插件：

- **输入**（UserPromptSubmit hook）：你输入中文时，自动翻译成英文并注入上下文，让模型以英文版本为准处理。
- **输出**（MessageDisplay hook）：模型回复的英文在屏幕上实时翻译成简体中文显示；代码块、行内代码、URL、路径等原样保留。

翻译默认使用 DeepSeek（`deepseek/deepseek-v4-flash`），接口地址和 key 从环境变量或 `~/.config/fable-zh/.env` 读取。

## 安装

克隆到 Claude Code 的 skills 目录（官方支持的 skills-dir 插件方式，无需 marketplace）：

```bash
git clone https://github.com/Ma1oneZhang/fable-zh ~/.claude/skills/fable-zh
```

重启 Claude Code（或运行 `/reload-plugins`）后自动生效。也可以克隆到项目的 `.claude/skills/` 目录，仅在单个项目启用。

检查状态：

```
/fable-zh:status
```

或直接运行：

```bash
node ~/.claude/skills/fable-zh/scripts/status.mjs
```

## 工作原理

| Hook | 作用 |
| --- | --- |
| `UserPromptSubmit` | 检测到中文输入 → 调 API 翻译成英文 → 以 `additionalContext` 注入（原文仍在上下文里，这是 Claude Code 插件机制的限制，无法真正替换 prompt） |
| `MessageDisplay` | 助手文本按批流式渲染时，逐批翻译成中文后替换显示；代码块自动跳过，按 `message_id` 记录围栏状态 |

注意：MessageDisplay 只改屏幕显示，**会话记录（transcript）和模型上下文仍是英文**，`Ctrl+O` verbose 模式看到的是原文。

## 配置

配置文件（可选）：`~/.config/fable-zh/.env`，参考 `.env.example`。真实环境变量优先于 `.env` 文件中的同名项。

环境变量（同时也是 `.env` 文件的键名）：

- `FABLE_ZH_MODEL`：模型 ID，默认 `deepseek/deepseek-v4-flash`
- `FABLE_ZH_BASE_URL` / `FABLE_ZH_API_KEY`：接口地址和 key（OpenAI 兼容 `/chat/completions`，两者都配置后才会发起调用）
- `FABLE_ZH_ENABLED` / `FABLE_ZH_INPUT_ENABLED` / `FABLE_ZH_OUTPUT_ENABLED`：总开关与方向开关，设为 `false` 关闭
- `FABLE_ZH_MAX_INPUT_CHARS`：超过该长度的中文输入不翻译（默认 3000，避免大段粘贴拖慢提交）
- `FABLE_ZH_INPUT_TIMEOUT_MS` / `FABLE_ZH_OUTPUT_TIMEOUT_MS`：单次翻译超时（默认 15s / 12s，超时回退原文）
- `FABLE_ZH_DISABLE_REASONING`：默认 `true`，翻译请求带 `enable_thinking: false`，把单次延迟从 ~3s 降到 ~1.2s
- `FABLE_ZH_CONFIG`：自定义 `.env` 文件路径
- `FABLE_ZH_DISABLED=1`：临时全部关闭

## 调试

- 失败原因写入数据目录日志：`~/.claude/plugins/data/fable-zh-skills-dir/fable-zh.log`（手动运行脚本时为 `~/.cache/fable-zh/fable-zh.log`）
- `claude --debug` 查看 hook 调用详情

## 限制

- 输入侧只能注入英文翻译，不能替换原文（Claude Code 限制）；如要彻底替换需要自建翻译代理。
- 输出侧逐批翻译，每批约 1~2s 延迟；批次很长时会分块翻译。
- 模型如果直接用中文回复，会自动跳过翻译。
- 翻译质量取决于 `deepseek-v4-flash`，专业术语可能不够准确。

## License

[MIT](LICENSE)
