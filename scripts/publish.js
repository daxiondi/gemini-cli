#!/usr/bin/env node

/**
 * Universal AI CLI 发布脚本
 * 自动化版本更新、构建和发布流程
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PACKAGE_NAME = 'universal-ai-cli';
const REPO_URL = 'https://github.com/daxiondi/universal-ai-cli';

function log(message) {
  console.log(`\n📦 ${message}`);
}

function error(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function runCommand(command, description) {
  log(description);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    error(`Failed to ${description.toLowerCase()}: ${err.message}`);
  }
}

function updatePackageJson() {
  log('Updating package.json...');
  
  const packageJsonPath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // 更新包名和相关信息
  packageJson.name = PACKAGE_NAME;
  packageJson.description = 'Universal AI CLI - Multi-provider AI assistant with support for Gemini, OpenAI, Anthropic, Doubao and more';
  packageJson.keywords = [
    'ai', 'cli', 'gemini', 'openai', 'anthropic', 'doubao', 
    'chatgpt', 'claude', 'assistant', 'universal', 'multi-provider'
  ];
  packageJson.repository = {
    type: 'git',
    url: `git+${REPO_URL}.git`
  };
  packageJson.bugs = {
    url: `${REPO_URL}/issues`
  };
  packageJson.homepage = `${REPO_URL}#readme`;
  packageJson.author = 'Universal AI CLI Contributors';
  packageJson.license = 'MIT';
  
  // 更新二进制文件名
  packageJson.bin = {
    'uai': 'bundle/gemini.js',
    'universal-ai': 'bundle/gemini.js'
  };
  
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log('✅ package.json updated');
}

function updateCorePackageJson() {
  log('Updating core package.json...');
  
  const corePackagePath = join(process.cwd(), 'packages/core/package.json');
  const corePackage = JSON.parse(readFileSync(corePackagePath, 'utf8'));
  
  corePackage.name = `${PACKAGE_NAME}-core`;
  corePackage.description = 'Core library for Universal AI CLI';
  
  writeFileSync(corePackagePath, JSON.stringify(corePackage, null, 2));
  log('✅ Core package.json updated');
}

function updateCliPackageJson() {
  log('Updating CLI package.json...');
  
  const cliPackagePath = join(process.cwd(), 'packages/cli/package.json');
  const cliPackage = JSON.parse(readFileSync(cliPackagePath, 'utf8'));
  
  cliPackage.name = `${PACKAGE_NAME}-cli`;
  cliPackage.description = 'CLI interface for Universal AI CLI';
  
  writeFileSync(cliPackagePath, JSON.stringify(cliPackage, null, 2));
  log('✅ CLI package.json updated');
}

function createReadme() {
  log('Creating README.md...');
  
  const readme = `# Universal AI CLI

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

\`\`\`bash
# Global installation
npm install -g ${PACKAGE_NAME}

# Or use directly with npx
npx ${PACKAGE_NAME}
\`\`\`

### Basic Usage

\`\`\`bash
# Start interactive mode
uai

# Or use the full command
universal-ai
\`\`\`

### Configuration

Create a \`.env\` file or set environment variables:

\`\`\`bash
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
\`\`\`

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
| \`AI_PROVIDER\` | ✅ | AI service provider | \`gemini\`, \`openai\`, \`anthropic\`, \`doubao\` |
| \`AI_API_KEY\` | ✅ | API key for the provider | \`your_api_key_here\` |
| \`AI_MODEL\` | ✅ | Model name | \`gemini-2.5-pro\`, \`gpt-4o\` |
| \`AI_BASE_URL\` | ❌ | Custom API endpoint | \`https://api.example.com/v1\` |
| \`AI_THINK_SUPPORT\` | ❌ | Force enable/disable thinking | \`true\`, \`false\` |
| \`AI_EMBEDDING_MODEL\` | ❌ | Custom embedding model | \`text-embedding-3-small\` |

## 💭 Thinking Mode

When enabled, you'll see the AI's reasoning process in real-time:

\`\`\`
🤔 Thinking: Let me analyze this step by step...
   1. First, I need to understand the user's request
   2. Then I'll search for relevant information
   3. Finally, I'll formulate a comprehensive response

💬 Response: Based on my analysis, here's what I found...
\`\`\`

## 🔧 Advanced Usage

### Custom Provider Setup

\`\`\`bash
# Using a custom OpenAI-compatible API
AI_PROVIDER=openai
AI_API_KEY=your_custom_key
AI_MODEL=your_custom_model
AI_BASE_URL=https://your-api-endpoint.com/v1
\`\`\`

### Development Mode

\`\`\`bash
# Enable debug logging
DEBUG=1 uai

# Or with environment variable
export DEBUG=1
uai
\`\`\`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Based on the excellent [Gemini CLI](https://github.com/google-gemini/gemini-cli) by Google, extended to support multiple AI providers.

## 📞 Support

- 🐛 [Report Issues](${REPO_URL}/issues)
- 💡 [Request Features](${REPO_URL}/issues/new?template=feature_request.md)
- 📖 [Documentation](${REPO_URL}/wiki)
- 💬 [Discussions](${REPO_URL}/discussions)
`;

  writeFileSync('README.md', readme);
  log('✅ README.md created');
}

function bumpVersion(type = 'patch') {
  log(`Bumping ${type} version...`);
  runCommand(`npm version ${type} --no-git-tag-version`, `Bump ${type} version`);
}

function publishPackage() {
  log('Publishing to npm...');
  
  // 检查是否已登录 npm
  try {
    execSync('npm whoami', { stdio: 'pipe' });
  } catch {
    error('Please login to npm first: npm login');
  }
  
  runCommand('npm publish --access public', 'Publish to npm');
}

function createGitTag() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = packageJson.version;
  
  log(`Creating git tag v${version}...`);
  runCommand(`git add .`, 'Stage all changes');
  runCommand(`git commit -m "Release v${version}"`, 'Commit changes');
  runCommand(`git tag v${version}`, 'Create git tag');
  runCommand(`git push origin main --tags`, 'Push to repository');
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major
  
  console.log('🚀 Universal AI CLI Publishing Script');
  console.log('=====================================');
  
  // 检查工作目录是否clean
  try {
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
  } catch {
    error('Working directory is not clean. Please commit or stash changes first.');
  }
  
  // 更新包信息
  updatePackageJson();
  updateCorePackageJson();
  updateCliPackageJson();
  createReadme();
  
  // 版本管理
  bumpVersion(versionType);
  
  // 构建项目
  runCommand('npm run build', 'Build project');
  
  // 运行测试
  runCommand('npm test', 'Run tests');
  
  // 发布
  publishPackage();
  
  // Git 操作
  createGitTag();
  
  log('🎉 Successfully published Universal AI CLI!');
  console.log('\n📋 Next steps:');
  console.log(`   1. Users can install with: npm install -g ${PACKAGE_NAME}`);
  console.log(`   2. Or use directly with: npx ${PACKAGE_NAME}`);
  console.log(`   3. View on npm: https://npmjs.com/package/${PACKAGE_NAME}`);
  console.log(`   4. GitHub releases: ${REPO_URL}/releases`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}