# Universal AI CLI

🤖 A unified command-line interface for multiple AI providers including Gemini, OpenAI, Anthropic, Doubao, and more.

## ✨ Features

- 🔄 **Multi-Provider Support**: Gemini, OpenAI, Anthropic, Doubao, DeepSeek, and any OpenAI-compatible API
- 💭 **Thinking Mode**: Real-time display of AI reasoning process (when supported)
- 🔧 **Universal Configuration**: Simple environment variables work across all providers
- 🚀 **Streaming Responses**: Real-time response streaming with thinking process visualization
- 📝 **Context Preservation**: Maintains conversation history across interactions
- 🛠️ **Tool Integration**: Supports function calling and tool usage
- 🎯 **Easy Setup**: Get started in seconds with any AI provider

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g universal-ai-cli

# Or use directly with npx
npx universal-ai-cli
```

### Basic Usage

```bash
# Start interactive mode
uai

# Or use the full command
universal-ai
```

### Configuration

Create a `.env` file or set environment variables:

```bash
# Example: Using Gemini
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.5-pro

# Example: Using OpenAI
AI_PROVIDER=openai
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o
AI_BASE_URL=https://api.openai.com/v1

# Example: Using Doubao
AI_PROVIDER=doubao
AI_API_KEY=your_doubao_api_key
AI_MODEL=doubao-pro-4k
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# Example: Using Anthropic
AI_PROVIDER=anthropic
AI_API_KEY=your_anthropic_api_key
AI_MODEL=claude-3-5-sonnet-20241022
AI_BASE_URL=https://api.anthropic.com
```

## 🎯 Supported Providers

| Provider | Status | Thinking Mode | Models |
|----------|--------|---------------|---------|
| **Gemini** | ✅ Full Support | ✅ Native | gemini-2.5-pro, gemini-2.5-flash |
| **OpenAI** | ✅ Full Support | ✅ o1 Series | gpt-4o, gpt-4, o1-preview, o1-mini |
| **Anthropic** | ✅ Full Support | ❌ | claude-3-5-sonnet, claude-3-haiku |
| **Doubao** | ✅ Full Support | ✅ Thinking Models | doubao-pro-4k, doubao-thinking |
| **DeepSeek** | ✅ OpenAI Compatible | ✅ V3 Series | deepseek-chat, deepseek-coder |
| **Custom** | ✅ OpenAI Compatible | ⚠️ Depends on API | Any OpenAI-compatible API |

## 🛠️ Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AI_PROVIDER` | ✅ | AI service provider | `gemini`, `openai`, `anthropic`, `doubao` |
| `AI_API_KEY` | ✅ | API key for the provider | `your_api_key_here` |
| `AI_MODEL` | ✅ | Model name | `gemini-2.5-pro`, `gpt-4o` |
| `AI_BASE_URL` | ❌ | Custom API endpoint | `https://api.example.com/v1` |
| `AI_THINK_SUPPORT` | ❌ | Force enable/disable thinking | `true`, `false` |
| `AI_EMBEDDING_MODEL` | ❌ | Custom embedding model | `text-embedding-3-small` |

## 💭 Thinking Mode

When enabled, you'll see the AI's reasoning process in real-time:

```
🤔 Thinking: Let me analyze this step by step...
   1. First, I need to understand the user's request
   2. Then I'll search for relevant information
   3. Finally, I'll formulate a comprehensive response

💬 Response: Based on my analysis, here's what I found...
```

## 🔧 Advanced Usage

### Custom Provider Setup

```bash
# Using a custom OpenAI-compatible API
AI_PROVIDER=openai
AI_API_KEY=your_custom_key
AI_MODEL=your_custom_model
AI_BASE_URL=https://your-api-endpoint.com/v1
```

### Development Mode

```bash
# Enable debug logging
DEBUG=1 uai

# Or with environment variable
export DEBUG=1
uai
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Based on the excellent [Gemini CLI](https://github.com/google-gemini/gemini-cli) by Google, extended to support multiple AI providers.

## 📞 Support

- 🐛 [Report Issues](https://github.com/daxiondi/universal-ai-cli/issues)
- 💡 [Request Features](https://github.com/daxiondi/universal-ai-cli/issues/new?template=feature_request.md)
- 📖 [Documentation](https://github.com/daxiondi/universal-ai-cli/wiki)
- 💬 [Discussions](https://github.com/daxiondi/universal-ai-cli/discussions)
