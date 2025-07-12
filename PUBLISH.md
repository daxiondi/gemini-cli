# Universal AI CLI 发布指南

## 🎯 项目命名

**项目名称**: `universal-ai-cli`

**原因**:
- 简洁易记，体现通用性
- 支持多种 AI 提供商
- 在 npm 生态中容易发现

## 🚀 发布流程

### 1. 准备发布

```bash
# 确保工作目录干净
git status

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build
```

### 2. 使用发布脚本

```bash
# Patch 版本 (1.0.0 -> 1.0.1)
node scripts/publish.js

# Minor 版本 (1.0.0 -> 1.1.0)
node scripts/publish.js minor

# Major 版本 (1.0.0 -> 2.0.0)
node scripts/publish.js major
```

### 3. 手动发布步骤

如果需要手动控制发布过程：

```bash
# 1. 更新版本
npm version patch  # 或 minor, major

# 2. 构建项目
npm run build

# 3. 发布到 npm
npm publish --access public

# 4. 推送到 GitHub
git push origin main --tags
```

## 📦 用户使用方式

### 方式 1: 全局安装
```bash
npm install -g universal-ai-cli
uai
```

### 方式 2: 直接使用 npx
```bash
npx universal-ai-cli
```

### 方式 3: 从 GitHub 直接运行
```bash
npx github:daxiondi/universal-ai-cli
```

## 🔧 配置示例

### Gemini
```bash
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.5-pro
AI_THINK_SUPPORT=true
```

### OpenAI
```bash
AI_PROVIDER=openai
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o
AI_BASE_URL=https://api.openai.com/v1
```

### Doubao
```bash
AI_PROVIDER=doubao
AI_API_KEY=your_doubao_api_key
AI_MODEL=doubao-pro-4k
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AI_THINK_SUPPORT=true
```

### DeepSeek
```bash
AI_PROVIDER=openai
AI_API_KEY=your_deepseek_api_key
AI_MODEL=deepseek-chat
AI_BASE_URL=https://api.deepseek.com
```

## 📋 发布清单

- [ ] 代码审查完成
- [ ] 测试通过
- [ ] 文档更新
- [ ] 版本号更新
- [ ] CHANGELOG.md 更新
- [ ] 构建成功
- [ ] npm 发布
- [ ] GitHub 标签创建
- [ ] Release notes 发布

## 🎉 发布后

1. 在 GitHub 创建 Release
2. 更新项目文档
3. 发布公告/博客
4. 收集用户反馈
5. 监控问题和 bug 报告

## 📞 支持渠道

- GitHub Issues: 报告 bug 和功能请求
- GitHub Discussions: 社区讨论
- npm 包页面: 使用统计和下载量