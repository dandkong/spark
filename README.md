# ⚡ Spark

English | [简体中文](README.zh-CN.md)

A fast, simple, and elegant local AI assistant.

![Spark](public/images/hero.png)

Built with Tauri 2, Spark is a lightweight desktop app that supports multiple AI model providers.

## Features

- **Multi-model support** — OpenAI, Anthropic, Google, DeepSeek, Moonshot, Qwen, and any OpenAI-compatible API
- **Multiple assistants** — Create separate assistants with independent system prompts and chat histories
- **Reasoning mode** — Supports auto/on/off thinking modes for different reasoning models
- **MCP tool extensions** — Configure MCP servers so assistants can call external tools

## Tech Stack

- Desktop framework: Tauri 2
- Frontend: React 19 + TypeScript
- UI components: shadcn/ui + AI Elements
- Styling: Tailwind CSS 4
- Animation: Motion
- Routing: React Router
- AI integration: AI SDK
- Build tools: Bun + Vite 8

## Development

```bash
# Install dependencies
bun install

# Start development mode
bun run tauri dev

# Build for release
bun run tauri build
```

## License

MIT
