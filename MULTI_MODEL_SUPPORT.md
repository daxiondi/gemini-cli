# Gemini CLI 多模型支持

Gemini CLI 现已支持多种大模型提供商，包括 Gemini、Doubao（字节跳动）、OpenAI 和 Anthropic。

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 文件为 `.env` 并配置所需的环境变量：

```bash
cp .env.example .env
```

### 2. 基本配置

```bash
# 服务提供商
AI_PROVIDER=gemini

# API Key
AI_API_KEY=your_api_key_here

# 模型名称
AI_MODEL=gemini-2.5-pro
```

## 支持的提供商

### Gemini (Google)
```bash
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.5-pro
AI_THINK_SUPPORT=true
```

### Doubao (字节跳动)
```bash
AI_PROVIDER=doubao
AI_API_KEY=your_doubao_api_key
AI_MODEL=doubao-pro-4k
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AI_THINK_SUPPORT=false
```

### OpenAI
```bash
AI_PROVIDER=openai
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o
AI_BASE_URL=https://api.openai.com/v1
AI_THINK_SUPPORT=false
```

### Anthropic (Claude)
```bash
AI_PROVIDER=anthropic
AI_API_KEY=your_anthropic_api_key
AI_MODEL=claude-3-5-sonnet-20241022
AI_BASE_URL=https://api.anthropic.com
AI_THINK_SUPPORT=false
```

## 环境变量说明

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `AI_PROVIDER` | 是 | 服务提供商 | `gemini`, `doubao`, `openai`, `anthropic` |
| `AI_API_KEY` | 是 | API 密钥 | `your_api_key_here` |
| `AI_MODEL` | 是 | 模型名称 | `gemini-2.5-pro`, `doubao-pro-4k` |
| `AI_BASE_URL` | 否 | API 基础 URL（用于自定义端点） | `https://api.example.com/v1` |
| `AI_THINK_SUPPORT` | 否 | 是否强制启用思考功能 | `true`, `false` |
| `AI_EMBEDDING_MODEL` | 否 | 自定义 Embedding 模型 | `text-embedding-3-small` |

## 向后兼容

原有的 Gemini 配置方式仍然支持：

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-pro
```

## 思考功能 (Think Support)

某些模型支持思考功能，可以显示模型的推理过程：

- **Gemini 2.5 系列**: 自动支持
- **OpenAI o1 系列**: 支持推理模式
- **Doubao**: 暂不支持
- **Anthropic**: 暂不支持

可以通过 `AI_THINK_SUPPORT=true` 强制启用，或 `AI_THINK_SUPPORT=false` 强制禁用。

## 使用示例

### 使用 Doubao 模型
```bash
export AI_PROVIDER=doubao
export AI_API_KEY=your_doubao_api_key
export AI_MODEL=doubao-pro-4k
export AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

npm start
```

### 使用自定义 OpenAI 兼容接口
```bash
export AI_PROVIDER=openai
export AI_API_KEY=your_custom_api_key
export AI_MODEL=custom-model-name
export AI_BASE_URL=https://your-custom-endpoint.com/v1

npm start
```

## 故障排除

### 1. API 密钥错误
确保 `AI_API_KEY` 正确设置并有效。

### 2. 模型不存在
检查 `AI_MODEL` 是否为提供商支持的模型名称。

### 3. 网络连接问题
确保可以访问 `AI_BASE_URL` 指定的端点。

### 4. 非 Gemini 提供商功能限制
目前非 Gemini 提供商通过 OpenAI 兼容接口实现，某些高级功能可能不可用。

## 开发说明

### 添加新的提供商

1. 在 `models.ts` 中添加新的提供商配置
2. 实现对应的客户端适配器（参考 `openaiCompatibleClient.ts`）
3. 在 `contentGenerator.ts` 中添加相应的创建逻辑

### 技术架构

- `models.ts`: 提供商配置和环境变量处理
- `contentGenerator.ts`: 内容生成器工厂
- `openaiCompatibleClient.ts`: OpenAI 兼容接口适配器
- `client.ts`: Gemini 客户端实现

新的配置系统向后兼容，原有的使用方式不受影响。