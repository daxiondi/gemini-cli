/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { ContentGenerator } from './contentGenerator.js';
import { ModelConfig } from '../config/models.js';
import OpenAI from 'openai';

/**
 * OpenAI 兼容的客户端适配器
 * 使用官方 OpenAI 库实现工具调用和对话功能
 */
export class OpenAICompatibleClient implements ContentGenerator {
  private client: OpenAI;
  private isDebugMode: boolean;

  constructor(private config: ModelConfig) {
    this.isDebugMode = process.env.DEBUG === '1' || process.env.NODE_ENV === 'development';
    
    console.log('🔧 初始化客户端，配置信息:', {
      provider: process.env.AI_PROVIDER,
      baseUrl: config.baseUrl,
      model: config.model
    });

    // 检测是否是 Azure OpenAI
    const isAzure = config.baseUrl?.includes('azure.com') || config.baseUrl?.includes('openai.azure.com');
    
    // 检测是否是豆包 (Doubao) - 更严格的检测条件
    const isDoubao = (config.baseUrl?.includes('volces.com') || 
                     config.baseUrl?.includes('volcengine') ||
                     config.baseUrl?.includes('ark.cn-beijing.volces.com')) &&
                     process.env.AI_PROVIDER === 'doubao'; // 必须同时满足URL和Provider
    
    this.debugLog('🔍 提供商检测结果:', { isAzure, isDoubao });
    
    if (isAzure) {
      this.debugLog('🔵 检测到 Azure OpenAI，使用特殊配置');
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: {
          'api-key': config.apiKey,
        },
      });
    } else if (isDoubao) {
      this.debugLog('🟠 检测到豆包 (Doubao)，使用特殊配置');
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        defaultHeaders: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      this.debugLog('🟢 使用标准 OpenAI 配置');
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.openai.com/v1',
      });
    }
  }

  private debugLog(message: string, ...args: any[]) {
    if (this.isDebugMode) {
      console.log(message, ...args);
    }
  }

  private safeParseJSON(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('⚠️ JSON 解析失败:', jsonString, error);
      return {};
    }
  }

  private extractReasoningContent(response: any): { content: string; reasoning: string } {
    // 处理 doubao 模型的 reasoning_content
    const mainContent = response.message?.content || '';
    const reasoningContent = response.message?.reasoning_content || '';
    
    if (reasoningContent) {
      this.debugLog('🤔 检测到思考内容:', reasoningContent.slice(0, 100) + '...');
      return { content: mainContent, reasoning: reasoningContent };
    }
    
    // 如果没有 reasoning_content，尝试从主内容中提取
    if (mainContent) {
      const thinkingPatterns = [
        /\<thinking\>(.*?)\<\/thinking\>/s,
        /\*\*思考过程\*\*(.*?)\*\*回答\*\*/s,
        /【思考】(.*?)【回答】/s,
      ];
      
      for (const pattern of thinkingPatterns) {
        const match = mainContent.match(pattern);
        if (match) {
          const thinking = match[1].trim();
          const content = mainContent.replace(match[0], '').trim();
          this.debugLog('🤔 从内容中提取思考:', thinking.slice(0, 100) + '...');
          return { content, reasoning: thinking };
        }
      }
    }
    
    return { content: mainContent, reasoning: '' };
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    this.debugLog('🔄 开始 OpenAI 兼容 API 调用');
    this.debugLog('📋 模型:', this.config.model);
    this.debugLog('🌐 API地址:', this.config.baseUrl);
    
    // 立即测试日志是否显示
    this.debugLog('🚨 这是一个测试日志，应该在控制台显示');
    console.error('🚨 这是一个错误测试日志，应该在控制台显示');

    // 转换 Gemini 格式的 contents 为 OpenAI 格式的 messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    const contents = Array.isArray(request.contents) ? request.contents : [request.contents];
    
    for (const content of contents) {
      if (typeof content === 'string') continue;
      
      // 确保是 Content 对象而不是 Part
      if ('role' in content && 'parts' in content) {
        const role = content.role === 'model' ? 'assistant' : content.role as 'user' | 'system';
        
        // 处理工具调用消息
        if (content.parts) {
          for (const part of content.parts) {
            if ('functionCall' in part && part.functionCall) {
              // 这是一个工具调用消息
              messages.push({
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: `call_${Date.now()}`,
                  type: 'function',
                  function: {
                    name: part.functionCall.name || '',
                    arguments: JSON.stringify(part.functionCall.args || {}),
                  },
                }],
              });
            } else if ('functionResponse' in part && part.functionResponse) {
              // 这是一个工具响应消息
              messages.push({
                role: 'tool',
                content: JSON.stringify(part.functionResponse.response),
                tool_call_id: `call_${Date.now()}`,
              });
            } else if ('text' in part && part.text) {
              // 普通文本消息
              messages.push({
                role,
                content: part.text,
              });
            }
          }
        }
      }
    }

    this.debugLog('💬 消息数量:', messages.length);
    messages.forEach((msg, i) => {
      this.debugLog(`  [${i}] ${msg.role}: ${msg.content?.slice(0, 100)}${msg.content && msg.content.length > 100 ? '...' : ''}`);
    });

    // 转换工具定义
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
    this.debugLog('🔧 开始工具转换...');
    this.debugLog('📋 request 完整内容:', JSON.stringify(request, null, 2));
    this.debugLog('📋 request.config 内容:', JSON.stringify(request.config, null, 2));
    this.debugLog('📋 request.config.tools 内容:', JSON.stringify(request.config?.tools, null, 2));
    
    if (request.config?.tools) {
      this.debugLog('📋 发现', request.config.tools.length, '个工具配置');
      for (let i = 0; i < request.config.tools.length; i++) {
        const tool = request.config.tools[i];
        this.debugLog('🔧 处理工具', i, ':', JSON.stringify(tool, null, 2));
        
        if ('functionDeclarations' in tool && tool.functionDeclarations) {
          this.debugLog('📋 发现', tool.functionDeclarations.length, '个函数声明');
          for (let j = 0; j < tool.functionDeclarations.length; j++) {
            const func = tool.functionDeclarations[j];
            this.debugLog('🛠️ 处理函数', j, ':', JSON.stringify(func, null, 2));
            
            tools.push({
              type: 'function',
              function: {
                name: func.name || '',
                description: func.description || '',
                parameters: (func.parameters as any) || {},
              },
            });
          }
        } else {
          this.debugLog('⚠️ 工具没有 functionDeclarations 属性');
        }
      }
    } else {
      this.debugLog('⚠️ request.config.tools 为空或未定义');
    }

    if (tools.length > 0) {
      this.debugLog('🔧 可用工具:', tools.map(t => t.function.name).join(', '));
      this.debugLog('🛠️ 工具详情:', JSON.stringify(tools, null, 2));
    } else {
      this.debugLog('⚠️ 没有检测到可用工具');
      this.debugLog('🔍 请求配置中的工具:', JSON.stringify(request.config?.tools, null, 2));
    }

    // 检查是否启用了思考功能
    const hasThinkingConfig = request.config && 'thinkingConfig' in request.config;
    const includeThoughts = hasThinkingConfig && (request.config as any).thinkingConfig?.includeThoughts;

    // 检测提供商类型 - 与构造函数保持一致
    const isDoubao = (this.config.baseUrl?.includes('volces.com') || 
                     this.config.baseUrl?.includes('volcengine') ||
                     this.config.baseUrl?.includes('ark.cn-beijing.volces.com')) &&
                     process.env.AI_PROVIDER === 'doubao';
    
    this.debugLog('🔍 当前检测结果:', {
      baseUrl: this.config.baseUrl,
      provider: process.env.AI_PROVIDER,
      isDoubao
    });

    try {
      const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: this.config.model,
        messages,
        temperature: request.config?.temperature || 0.7,
        max_tokens: request.config?.maxOutputTokens || 2048,
        stream: false, // 强制关闭流式输出
        ...(tools.length > 0 && { 
          tools,
          tool_choice: "auto" // 明确指定工具选择策略
        }),
      };

      // 豆包特殊处理
      if (isDoubao) {
        this.debugLog('🟠 应用豆包特殊配置');
        
        // 豆包可能需要特殊的工具调用格式
        if (tools.length > 0) {
          // 强制工具调用模式
          (requestOptions as any).tool_choice = "required";
          
          // 添加豆包特有的参数
          (requestOptions as any).stream = false;
          (requestOptions as any).response_format = { type: "json_object" };
        }
      }

      // 如果启用了思考功能，添加相关参数
      if (includeThoughts && this.config.model?.includes('thinking')) {
        // 对于思考模型的特殊处理
        (requestOptions as any).include_reasoning = true;
      }

      // 改进工具调用提示
      if (tools.length > 0) {
        const toolDescriptions = tools.map(tool => 
          `${tool.function.name}: ${tool.function.description}\nParameters: ${JSON.stringify(tool.function.parameters)}`
        ).join('\n\n');
        
        let systemContent;
        
        if (isDoubao) {
          // 豆包特殊的提示格式
          systemContent = `你是一个能够调用工具的AI助手。当用户需要执行命令或操作文件时，你必须调用相应的工具。

可用工具：
${toolDescriptions}

重要规则：
1. 当用户说"执行"、"运行"、"帮我执行"等词时，必须调用工具
2. 不要解释你要做什么，直接调用工具
3. 例如：用户说"帮我执行npm run build"，你应该立即调用run_shell_command工具
4. 使用JSON格式返回工具调用

示例：
用户："帮我执行npm run build"
你的回复：直接调用run_shell_command工具，参数{"command": "npm run build"}`;
        } else {
          // 标准格式
          systemContent = `You are an assistant with access to tools. When the user asks you to perform actions that require tool usage, you MUST respond with a tool call using the following format:

Available tools:
${toolDescriptions}

CRITICAL: When you need to execute commands or perform file operations, you MUST use the tools. Do NOT explain what you would do - actually call the tool.

Example: If user says "run npm build", you should call run_shell_command with {"command": "npm run build"}.`;
        }
        
        const systemMessage = {
          role: 'system' as const,
          content: systemContent
        };
        
        // 将 system message 插入到消息开头
        requestOptions.messages = [systemMessage, ...requestOptions.messages];
        
        this.debugLog('📢 已添加工具使用说明到 system message');
        if (isDoubao) {
          this.debugLog('🟠 使用豆包优化的提示格式');
        }
      }

      this.debugLog('📤 发送请求...');
      this.debugLog('🚀 完整请求参数:', JSON.stringify(requestOptions, null, 2));
      const response = await this.client.chat.completions.create(requestOptions);
      
      this.debugLog('📥 收到响应');
      this.debugLog('📊 原始响应:', JSON.stringify(response, null, 2));
      this.debugLog('🎯 完成原因:', response.choices[0]?.finish_reason);
      if (response.usage) {
        console.log(`📊 token使用: ${response.usage.prompt_tokens}(输入) + ${response.usage.completion_tokens}(输出) = ${response.usage.total_tokens}(总计)`);
      }

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No choices returned from API');
      }

      // 处理工具调用
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        this.debugLog('🔧 检测到工具调用:', `${choice.message.tool_calls.length}个`);
        
        const parts: any[] = [];
        
        for (const toolCall of choice.message.tool_calls) {
          this.debugLog('  ⚙️ 调用工具:', toolCall.function.name);
          this.debugLog('  📝 参数:', toolCall.function.arguments);
          
          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: this.safeParseJSON(toolCall.function.arguments || '{}'),
            },
          });
        }

        this.debugLog('🎯 返回工具调用响应，不触发后续API调用');
        
        // 创建 functionCalls 数组以匹配预期格式
        const functionCalls = choice.message.tool_calls.map(toolCall => ({
          name: toolCall.function.name,
          args: this.safeParseJSON(toolCall.function.arguments || '{}'),
        }));
        
        return {
          candidates: [{
            content: {
              parts,
              role: 'model',
            },
            finishReason: 'STOP', // 明确标记为 STOP，避免触发继续对话
            index: 0,
          }],
          functionCalls, // 添加这个以匹配 turn.ts 期望的格式
          usageMetadata: response.usage ? {
            promptTokenCount: response.usage.prompt_tokens,
            candidatesTokenCount: response.usage.completion_tokens,
            totalTokenCount: response.usage.total_tokens,
          } : undefined,
        } as GenerateContentResponse;
      }

      // 处理普通文本响应
      const { content: responseText, reasoning: thinkingContent } = this.extractReasoningContent(choice);

      const parts: any[] = [];
      
      if (thinkingContent) {
        parts.push({
          text: thinkingContent,
          type: 'thinking'
        });
      }
      
      if (responseText) {
        parts.push({ text: responseText });
      }

      this.debugLog('✅ 响应处理完成:', responseText.slice(0, 100) + (responseText.length > 100 ? '...' : ''));
      if (thinkingContent) {
        this.debugLog('🤔 思考内容:', thinkingContent.slice(0, 100) + (thinkingContent.length > 100 ? '...' : ''));
      }

      return {
        candidates: [{
          content: {
            parts: parts.length > 0 ? parts : [{ text: responseText }],
            role: 'model',
          },
          finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'OTHER',
          index: 0,
        }],
        usageMetadata: response.usage ? {
          promptTokenCount: response.usage.prompt_tokens,
          candidatesTokenCount: response.usage.completion_tokens,
          totalTokenCount: response.usage.total_tokens,
        } : undefined,
      } as GenerateContentResponse;

    } catch (error) {
      console.error('❌ OpenAI API 调用失败:', error);
      console.error('❌ 错误详情:', JSON.stringify(error, null, 2));
      
      // 如果是网络错误或API错误，显示更多信息
      if (error instanceof Error) {
        console.error('❌ 错误消息:', error.message);
        console.error('❌ 错误堆栈:', error.stack);
      }
      
      // 检查是否是OpenAI库的特定错误
      if ((error as any).status) {
        console.error('❌ HTTP状态码:', (error as any).status);
        console.error('❌ 响应体:', (error as any).response?.data);
      }
      
      throw error;
    }
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    this.debugLog('⚠️ OpenAI 兼容客户端不支持流式输出，将使用非流式方式');
    
    // 调用非流式方法并包装成生成器
    const response = await this.generateContent(request);
    
    async function* singleResponseGenerator(): AsyncGenerator<GenerateContentResponse> {
      yield response;
    }
    
    return singleResponseGenerator();
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // 对于 OpenAI 兼容的 API，我们通过实际调用来获取准确的 token 计数
    this.debugLog('📊 正在计算 tokens...');
    
    try {
      // 转换消息格式
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      const contents = Array.isArray(request.contents) ? request.contents : [request.contents];
      
      for (const content of contents) {
        if (typeof content === 'string') continue;
        
        if ('role' in content && 'parts' in content) {
          const role = content.role === 'model' ? 'assistant' : content.role as 'user' | 'system';
          const text = content.parts
            ?.filter((part: any) => 'text' in part)
            .map((part: any) => part.text)
            .join('\n') || '';
          
          if (text) {
            messages.push({ role, content: text });
          }
        }
      }

      // 使用最小的 max_tokens 来获取 token 计数，避免实际生成大量内容
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        max_tokens: 1, // 最小 token 数，只为了获取 usage 信息
        temperature: 0,
      });

      const totalTokens = response.usage?.total_tokens || 0;
      const promptTokens = response.usage?.prompt_tokens || 0;
      
      this.debugLog('📊 Token 计数结果:', `${promptTokens} (输入) + ${response.usage?.completion_tokens || 0} (输出) = ${totalTokens} (总计)`);
      
      return {
        totalTokens: promptTokens, // 对于 count tokens，我们主要关心输入的 token 数
      };
      
    } catch (error) {
      console.warn('⚠️ 无法获取准确的 token 计数，使用估算方式');
      
      // 回退到估算方式
      const contents = Array.isArray(request.contents) ? request.contents : [request.contents];
      let totalChars = 0;
      
      for (const content of contents) {
        if (typeof content === 'string') {
          totalChars += content.length;
        } else if ('role' in content && 'parts' in content && content.parts) {
          for (const part of content.parts) {
            if ('text' in part && part.text) {
              totalChars += part.text.length;
            }
          }
        }
      }
      
      const estimatedTokens = Math.ceil(totalChars / 4);
      this.debugLog('📊 Token 估算:', `${totalChars} 字符 ≈ ${estimatedTokens} tokens`);
      
      return {
        totalTokens: estimatedTokens,
      };
    }
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    // 嵌入实现
    throw new Error('Embedding not yet implemented for OpenAI compatible client');
  }
}