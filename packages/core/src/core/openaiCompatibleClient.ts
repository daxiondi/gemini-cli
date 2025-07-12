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
 * OpenAI 兼容的客户端适配器，用于支持 doubao 等遵循 OpenAI API 格式的模型
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
    // 对于流式响应，我们先实现一个简单的版本
    const response = await this.generateContent(request);
    
    async function* streamGenerator() {
      yield response;
    }
    
    return streamGenerator();
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