/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import util from 'util';
import { ConsoleMessageItem } from '../types.js';

interface UseConsolePatcherParams {
  onNewMessage: (message: Omit<ConsoleMessageItem, 'id'>) => void;
  debugMode: boolean;
}

export const useConsolePatcher = ({
  onNewMessage,
  debugMode,
}: UseConsolePatcherParams): void => {
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleDebug = console.debug;

    const formatArgs = (args: unknown[]): string => util.format(...args);

    const patchConsoleMethod =
      (
        type: 'log' | 'warn' | 'error' | 'debug',
        originalMethod: (...args: unknown[]) => void,
      ) =>
      (...args: unknown[]) => {
        const content = formatArgs(args);
        
        // 始终显示到真实控制台用于调试
        if (debugMode || 
            content.includes('🔄') || content.includes('🔧') || content.includes('📋') || content.includes('⚙️') ||
            content.includes('📤') || content.includes('📥') || content.includes('📊') || content.includes('✅') ||
            content.includes('❌') || content.includes('⚠️') || content.includes('🤔') || content.includes('🛠️')) {
          originalMethod.apply(console, args);
        }

        // 同时发送到UI消息系统（避免重复）
        if ((type !== 'debug' || debugMode) && !debugMode) {
          onNewMessage({
            type,
            content,
            count: 1,
          });
        }
      };

    console.log = patchConsoleMethod('log', originalConsoleLog);
    console.warn = patchConsoleMethod('warn', originalConsoleWarn);
    console.error = patchConsoleMethod('error', originalConsoleError);
    console.debug = patchConsoleMethod('debug', originalConsoleDebug);

    return () => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      console.debug = originalConsoleDebug;
    };
  }, [onNewMessage, debugMode]);
};
