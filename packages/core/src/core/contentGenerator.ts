/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { 
  DEFAULT_GEMINI_MODEL, 
  getModelConfig,
  ModelProvider 
} from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { UserTierId } from '../code_assist/types.js';
import { OpenAICompatibleClient } from './openaiCompatibleClient.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  getTier?(): Promise<UserTierId | undefined>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  baseUrl?: string;
  provider?: ModelProvider;
};

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
): Promise<ContentGeneratorConfig> {
  try {
    const modelConfig = getModelConfig();
    
    // 如果指定了模型，使用指定的模型，否则使用配置中的模型
    const effectiveModel = model || modelConfig.model || DEFAULT_GEMINI_MODEL;
    
    const contentGeneratorConfig: ContentGeneratorConfig = {
      model: effectiveModel,
      authType,
      baseUrl: modelConfig.baseUrl,
      provider: modelConfig.provider,
    };

    // 对于 Gemini，保持原有的认证逻辑
    if (modelConfig.provider === ModelProvider.GEMINI) {
      const geminiApiKey = process.env.GEMINI_API_KEY || modelConfig.apiKey;
      const googleApiKey = process.env.GOOGLE_API_KEY;
      const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
      const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION;

      // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
      if (
        authType === AuthType.LOGIN_WITH_GOOGLE ||
        authType === AuthType.CLOUD_SHELL
      ) {
        return contentGeneratorConfig;
      }

      if (authType === AuthType.USE_GEMINI && geminiApiKey) {
        contentGeneratorConfig.apiKey = geminiApiKey;
        contentGeneratorConfig.vertexai = false;
        contentGeneratorConfig.model = await getEffectiveModel(
          contentGeneratorConfig.apiKey!,
          contentGeneratorConfig.model,
        );
        return contentGeneratorConfig;
      }

      if (
        authType === AuthType.USE_VERTEX_AI &&
        (googleApiKey || (googleCloudProject && googleCloudLocation))
      ) {
        contentGeneratorConfig.apiKey = googleApiKey;
        contentGeneratorConfig.vertexai = true;
        return contentGeneratorConfig;
      }
    } else {
      // 对于其他提供商，使用 API Key 认证
      contentGeneratorConfig.apiKey = modelConfig.apiKey;
      if (!modelConfig.apiKey) {
        throw new Error(`API Key is required for provider: ${modelConfig.provider}`);
      }
    }

    return contentGeneratorConfig;
  } catch (error) {
    // 如果获取配置失败，回退到原有逻辑
    console.warn('Failed to get model config, falling back to Gemini:', error);
    
    const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
    const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
    const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
    const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;

    const effectiveModel = model || DEFAULT_GEMINI_MODEL;

    const contentGeneratorConfig: ContentGeneratorConfig = {
      model: effectiveModel,
      authType,
      provider: ModelProvider.GEMINI,
    };

    if (
      authType === AuthType.LOGIN_WITH_GOOGLE ||
      authType === AuthType.CLOUD_SHELL
    ) {
      return contentGeneratorConfig;
    }

    if (authType === AuthType.USE_GEMINI && geminiApiKey) {
      contentGeneratorConfig.apiKey = geminiApiKey;
      contentGeneratorConfig.vertexai = false;
      contentGeneratorConfig.model = await getEffectiveModel(
        contentGeneratorConfig.apiKey!,
        contentGeneratorConfig.model,
      );
      return contentGeneratorConfig;
    }

    if (
      authType === AuthType.USE_VERTEX_AI &&
      (googleApiKey || (googleCloudProject && googleCloudLocation))
    ) {
      contentGeneratorConfig.apiKey = googleApiKey;
      contentGeneratorConfig.vertexai = true;
      return contentGeneratorConfig;
    }

    return contentGeneratorConfig;
  }
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };

  // 如果是 Gemini 相关的认证方式，使用原有逻辑
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    return createCodeAssistContentGenerator(
      httpOptions,
      config.authType,
      gcConfig,
      sessionId,
    );
  }

  // 对于 Gemini 提供商或未指定提供商，使用 GoogleGenAI
  if (!config.provider || config.provider === ModelProvider.GEMINI) {
    if (
      config.authType === AuthType.USE_GEMINI ||
      config.authType === AuthType.USE_VERTEX_AI
    ) {
      const googleGenAI = new GoogleGenAI({
        apiKey: config.apiKey === '' ? undefined : config.apiKey,
        vertexai: config.vertexai,
        httpOptions,
      });

      return googleGenAI.models;
    }
  } else {
    // 对于其他提供商，使用 OpenAI 兼容的客户端
    const modelConfig = getModelConfig();
    return new OpenAICompatibleClient(modelConfig);
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}
