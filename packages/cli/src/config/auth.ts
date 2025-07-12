/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import { AuthType, getModelConfig, ModelProvider } from '@google/gemini-cli-core';
import { loadEnvironment } from './settings.js';

export const validateAuthMethod = (authMethod: string): string | null => {
  loadEnvironment();
  
  // 检查是否配置了新的通用 AI 环境变量
  const hasAIProvider = !!process.env.AI_PROVIDER;
  const hasAIApiKey = !!process.env.AI_API_KEY;
  
  // 如果配置了新的环境变量，使用新的验证逻辑
  if (hasAIProvider && hasAIApiKey) {
    try {
      const modelConfig = getModelConfig();
      
      // 对于非 Gemini 提供商，直接返回成功（使用 API Key 认证）
      if (modelConfig.provider !== ModelProvider.GEMINI) {
        // 任何认证方法都可以，因为我们会使用 API Key
        return null;
      }
    } catch (error) {
      // 如果获取配置失败，继续使用原有逻辑
    }
  }
  
  // 原有的 Gemini 认证逻辑
  if (
    authMethod === AuthType.LOGIN_WITH_GOOGLE ||
    authMethod === AuthType.CLOUD_SHELL
  ) {
    return null;
  }

  if (authMethod === AuthType.USE_GEMINI) {
    // 检查新的 AI_API_KEY 或传统的 GEMINI_API_KEY
    const hasGeminiKey = !!(process.env.AI_API_KEY || process.env.GEMINI_API_KEY);
    if (!hasGeminiKey) {
      return 'API Key not found. Set AI_API_KEY or GEMINI_API_KEY environment variable and try again (no reload needed if using .env)!';
    }
    return null;
  }

  if (authMethod === AuthType.USE_VERTEX_AI) {
    const hasVertexProjectLocationConfig =
      !!process.env.GOOGLE_CLOUD_PROJECT && !!process.env.GOOGLE_CLOUD_LOCATION;
    const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
    if (!hasVertexProjectLocationConfig && !hasGoogleApiKey) {
      return (
        'When using Vertex AI, you must specify either:\n' +
        '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
        '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
        'Update your environment and try again (no reload needed if using .env)!'
      );
    }
    return null;
  }

  return 'Invalid auth method selected.';
};
