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

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

/**
 * OpenAI 兼容的客户端适配器
 * 
 * 这里我们选择使用 fetch API 而不是 OpenAI 库的原因：
 * 1. 更好的兼容性 - 支持各种 OpenAI 兼容的 API（Doubao、DeepSeek 等）
 * 2. 更灵活的定制 - 容易添加思考功能等特殊参数
 * 3. 更轻量级 - 不增加额外依赖
 * 4. 更好的调试 - 可以完全控制请求和响应处理
 * 
 * 如果需要更完善的功能（如内置重试、流式响应等），
 * 可以考虑在特定情况下使用 OpenAI 库作为后备实现。
 */
export class OpenAICompatibleClient implements ContentGenerator {
  constructor(private config: ModelConfig) {}

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const messages: OpenAIMessage[] = [];

    console.log('Request config:', request.config);
    
    // 转换 Gemini 格式的 contents 为 OpenAI 格式的 messages
    const contents = Array.isArray(request.contents) ? request.contents : [request.contents];
    for (const content of contents) {
      if (typeof content === 'string') continue;
      
      // 确保是 Content 对象而不是 Part
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

    // 智能构建 API URL
    let apiUrl = this.config.baseUrl || '';
    if (!apiUrl.includes('chat/completions')) {
      // 如果 baseUrl 不包含 chat/completions，则添加它
      apiUrl = apiUrl.endsWith('/') ? `${apiUrl}chat/completions` : `${apiUrl}/chat/completions`;
    }

    // 检查是否启用了思考功能
    const hasThinkingConfig = request.config && 'thinkingConfig' in request.config;
    const includeThoughts = hasThinkingConfig && (request.config as any).thinkingConfig?.includeThoughts;
    
    console.log('Thinking config detected:', hasThinkingConfig, 'Include thoughts:', includeThoughts);

    // 构建请求体
    const requestBody: any = {
      model: this.config.model,
      messages,
      temperature: request.config?.temperature || 0.7,
      max_tokens: request.config?.maxOutputTokens || 2048,
      stream: false, // 先禁用流式传输以简化调试
    };

    // 如果启用了思考功能，添加相关参数
    if (includeThoughts) {
      // 对于 Doubao 思考模型，可能需要特殊参数
      if (this.config.model?.includes('thinking')) {
        requestBody.stream = false; // 思考模型通常不支持流式
        // Doubao 思考模型可能需要的参数
        requestBody.include_reasoning = true;
      }
    }

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, response.statusText, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // 处理思考内容
    let responseText = data.choices[0]?.message?.content || '';
    let thinkingContent = '';
    
    // 如果启用了思考功能，尝试提取思考过程
    if (includeThoughts && responseText) {
      // 不同的模型可能有不同的思考内容格式
      // 尝试识别常见的思考标记
      const thinkingPatterns = [
        /\<thinking\>(.*?)\<\/thinking\>/s,  // <thinking></thinking> 标记
        /\*\*思考过程\*\*(.*?)\*\*回答\*\*/s,  // **思考过程** **回答** 标记
        /【思考】(.*?)【回答】/s,  // 【思考】【回答】标记
      ];
      
      for (const pattern of thinkingPatterns) {
        const match = responseText.match(pattern);
        if (match) {
          thinkingContent = match[1].trim();
          responseText = responseText.replace(match[0], '').trim();
          break;
        }
      }
      
      console.log('Extracted thinking content:', thinkingContent);
      console.log('Main response:', responseText);
    }
    
    // 构建响应部分
    const parts: any[] = [];
    
    // 如果有思考内容，添加思考部分
    if (thinkingContent) {
      parts.push({
        text: thinkingContent,
        // 标记这是思考内容，前端可以据此特殊显示
        type: 'thinking'
      });
    }
    
    // 添加主要响应内容
    if (responseText) {
      parts.push({ text: responseText });
    }
    
    // 转换 OpenAI 响应为 Gemini 格式
    return {
      candidates: [{
        content: {
          parts: parts.length > 0 ? parts : [{ text: responseText }],
          role: 'model',
        },
        finishReason: data.choices[0]?.finish_reason === 'stop' ? 'STOP' : 'OTHER',
        index: 0,
      }],
      usageMetadata: data.usage ? {
        promptTokenCount: data.usage.prompt_tokens,
        candidatesTokenCount: data.usage.completion_tokens,
        totalTokenCount: data.usage.total_tokens,
      } : undefined,
    } as GenerateContentResponse;
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const messages: OpenAIMessage[] = [];

    console.log('Stream Request config:', request.config);
    
    // 转换 Gemini 格式的 contents 为 OpenAI 格式的 messages
    const contents = Array.isArray(request.contents) ? request.contents : [request.contents];
    for (const content of contents) {
      if (typeof content === 'string') continue;
      
      // 确保是 Content 对象而不是 Part
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

    // 智能构建 API URL
    let apiUrl = this.config.baseUrl || '';
    if (!apiUrl.includes('chat/completions')) {
      apiUrl = apiUrl.endsWith('/') ? `${apiUrl}chat/completions` : `${apiUrl}/chat/completions`;
    }

    // 检查是否启用了思考功能
    const hasThinkingConfig = request.config && 'thinkingConfig' in request.config;
    const includeThoughts = hasThinkingConfig && (request.config as any).thinkingConfig?.includeThoughts;
    
    console.log('Stream Thinking config detected:', hasThinkingConfig, 'Include thoughts:', includeThoughts);

    // 构建请求体 - 启用流式传输
    const requestBody: any = {
      model: this.config.model,
      messages,
      temperature: request.config?.temperature || 0.7,
      max_tokens: request.config?.maxOutputTokens || 2048,
      stream: true, // 启用流式传输
    };

    // 如果启用了思考功能，添加相关参数
    if (includeThoughts) {
      if (this.config.model?.includes('thinking')) {
        requestBody.include_reasoning = true;
      }
    }

    console.log('Stream Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stream API Error:', response.status, response.statusText, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return this.createStreamGenerator(response, includeThoughts);
  }

  private async *createStreamGenerator(
    response: Response, 
    includeThoughts: boolean
  ): AsyncGenerator<GenerateContentResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let isInThinking = false;
    let thinkingContent = '';
    let mainContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                console.log('Stream content chunk:', content);
                
                // 检测思考开始和结束标记
                if (includeThoughts) {
                  if (content.includes('<thinking>')) {
                    isInThinking = true;
                    const parts = content.split('<thinking>');
                    if (parts[0]) {
                      mainContent += parts[0];
                      yield this.createStreamResponse(parts[0], 'main');
                    }
                    if (parts[1]) {
                      thinkingContent += parts[1];
                    }
                    continue;
                  }
                  
                  if (content.includes('</thinking>')) {
                    isInThinking = false;
                    const parts = content.split('</thinking>');
                    if (parts[0]) {
                      thinkingContent += parts[0];
                    }
                    // 输出完整的思考过程
                    if (thinkingContent) {
                      yield this.createStreamResponse(thinkingContent, 'thinking');
                      thinkingContent = '';
                    }
                    if (parts[1]) {
                      mainContent += parts[1];
                      yield this.createStreamResponse(parts[1], 'main');
                    }
                    continue;
                  }
                }

                // 根据当前状态处理内容
                if (isInThinking) {
                  thinkingContent += content;
                  yield this.createStreamResponse(content, 'thinking');
                } else {
                  mainContent += content;
                  yield this.createStreamResponse(content, 'main');
                }
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private createStreamResponse(content: string, type: 'main' | 'thinking'): GenerateContentResponse {
    const part: any = { text: content };
    if (type === 'thinking') {
      part.type = 'thinking';
    }

    return {
      candidates: [{
        content: {
          parts: [part],
          role: 'model',
        },
        finishReason: 'STOP',
        index: 0,
      }],
    } as GenerateContentResponse;
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // 简单估算：假设每个字符约等于 0.25 个 token
    let text = '';
    
    if (request.contents) {
      const contents = Array.isArray(request.contents) ? request.contents : [request.contents];
      text = contents
        .filter((content: any): content is object => typeof content === 'object' && content !== null && 'parts' in content)
        .flatMap((content: any) => content.parts || [])
        .filter((part: any) => 'text' in part)
        .map((part: any) => part.text)
        .join(' ') || '';
    }
    
    const estimatedTokens = Math.ceil(text.length * 0.25);
    
    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    if (!this.config.embeddingModel) {
      throw new Error(`Embedding model not configured for provider: ${this.config.provider}`);
    }

    const response = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: Array.isArray(request.contents) ? request.contents : [request.contents],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OpenAIEmbeddingResponse = await response.json();
    
    return {
      embeddings: data.data.map(item => ({
        values: item.embedding,
      })),
    } as EmbedContentResponse;
  }
}