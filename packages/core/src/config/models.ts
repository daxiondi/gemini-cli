/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';

// Gemini Models
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

// Doubao Models
export const DEFAULT_DOUBAO_MODEL = 'doubao-pro-4k';
export const DEFAULT_DOUBAO_EMBEDDING_MODEL = 'doubao-embedding-001';

// OpenAI Models  
export const DEFAULT_OPENAI_MODEL = 'gpt-4o';
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

export enum ModelProvider {
  GEMINI = 'gemini',
  DOUBAO = 'doubao', 
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  thinkSupport: boolean;
  embeddingModel?: string;
}

export interface ProviderConfig {
  defaultModel: string;
  defaultBaseUrl?: string;
  thinkSupportedModels: string[];
  embeddingModel: string;
}

export const PROVIDER_CONFIGS: Record<ModelProvider, ProviderConfig> = {
  [ModelProvider.GEMINI]: {
    defaultModel: DEFAULT_GEMINI_MODEL,
    thinkSupportedModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
  },
  [ModelProvider.DOUBAO]: {
    defaultModel: DEFAULT_DOUBAO_MODEL,
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    thinkSupportedModels: ['Doubao-Seed-1.6-thinking','Doubao-Seed-1.6'], 
    embeddingModel: DEFAULT_DOUBAO_EMBEDDING_MODEL,
  },
  [ModelProvider.OPENAI]: {
    defaultModel: DEFAULT_OPENAI_MODEL,
    defaultBaseUrl: 'https://api.openai.com/v1',
    thinkSupportedModels: ['o1-preview', 'o1-mini'], // OpenAI o1 系列支持推理
    embeddingModel: DEFAULT_OPENAI_EMBEDDING_MODEL,
  },
  [ModelProvider.ANTHROPIC]: {
    defaultModel: 'claude-3-5-sonnet-20241022',
    defaultBaseUrl: 'https://api.anthropic.com',
    thinkSupportedModels: [], // Claude 暂不支持类似的 think 模式
    embeddingModel: '', // Anthropic 没有 embedding 模型
  },
};

function getEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

export function getModelConfig(): ModelConfig {
  // 优先使用新的通用环境变量，然后回退到原有的 GEMINI_* 变量
  const provider = (getEnvVar('AI_PROVIDER') || ModelProvider.GEMINI) as ModelProvider;
  const providerConfig = PROVIDER_CONFIGS[provider];
  
  if (!providerConfig) {
    throw new Error(`Unsupported model provider: ${provider}`);
  }

  const apiKey = getEnvVar('AI_API_KEY') || 
                 getEnvVar('GEMINI_API_KEY') || 
                 getEnvVar('OPENAI_API_KEY') || 
                 getEnvVar('ANTHROPIC_API_KEY') || '';

  const model = getEnvVar('AI_MODEL') || 
                getEnvVar('GEMINI_MODEL') || 
                providerConfig.defaultModel;

  const baseUrl = getEnvVar('AI_BASE_URL') || providerConfig.defaultBaseUrl;

  const thinkSupport = getEnvVar('AI_THINK_SUPPORT') === 'true' || 
                       providerConfig.thinkSupportedModels.includes(model);

  const embeddingModel = getEnvVar('AI_EMBEDDING_MODEL') || 
                         providerConfig.embeddingModel;

  return {
    provider,
    model,
    apiKey,
    baseUrl,
    thinkSupport,
    embeddingModel,
  };
}

export function isThinkingSupported(model: string, provider?: ModelProvider): boolean {
  const currentProvider = provider || getModelConfig().provider;
  const providerConfig = PROVIDER_CONFIGS[currentProvider];
  
  // 检查环境变量显式设置
  if (getEnvVar('AI_THINK_SUPPORT') === 'true') {
    return true;
  }
  if (getEnvVar('AI_THINK_SUPPORT') === 'false') {
    return false;
  }
  
  // 否则根据模型和提供商判断
  return providerConfig.thinkSupportedModels.includes(model) || 
         (currentProvider === ModelProvider.GEMINI && model.startsWith('gemini-2.5'));
}
