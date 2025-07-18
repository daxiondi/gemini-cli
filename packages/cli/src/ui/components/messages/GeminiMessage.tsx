/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Text, Box } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { Colors } from '../../colors.js';

interface GeminiMessageProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const GeminiMessage: React.FC<GeminiMessageProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
}) => {
  // 根据内容类型添加不同的前缀和样式
  const getMessageTypeAndPrefix = (content: string) => {
    if (content.includes('🔍') || content.toLowerCase().includes('分析') || content.toLowerCase().includes('analysis')) {
      return { prefix: '🔍 ', color: Colors.AccentCyan, type: '分析' };
    }
    if (content.includes('⚠️') || content.toLowerCase().includes('错误') || content.toLowerCase().includes('error')) {
      return { prefix: '⚠️ ', color: Colors.AccentRed, type: '错误' };
    }
    if (content.includes('✅') || content.toLowerCase().includes('成功') || content.toLowerCase().includes('success')) {
      return { prefix: '✅ ', color: Colors.AccentGreen, type: '成功' };
    }
    if (content.includes('💡') || content.toLowerCase().includes('建议') || content.toLowerCase().includes('suggestion')) {
      return { prefix: '💡 ', color: Colors.AccentYellow, type: '建议' };
    }
    return { prefix: '✦ ', color: Colors.AccentPurple, type: 'AI响应' };
  };

  const { prefix, color } = getMessageTypeAndPrefix(text);
  const prefixWidth = 3; // 固定宽度以适应表情符号

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row">
        <Box width={prefixWidth}>
          <Text color={color}>{prefix}</Text>
        </Box>
        <Box flexGrow={1} flexDirection="column">
          <MarkdownDisplay
            text={text}
            isPending={isPending}
            availableTerminalHeight={availableTerminalHeight}
            terminalWidth={terminalWidth - prefixWidth}
          />
        </Box>
      </Box>
    </Box>
  );
};
