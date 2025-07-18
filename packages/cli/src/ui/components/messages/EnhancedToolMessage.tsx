/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

export interface EnhancedToolMessageProps {
  toolName: string;
  parameters?: Record<string, any>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'running': return '⏺';
    case 'completed': return '✅';
    case 'failed': return '❌';
    default: return '⏺';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return Colors.AccentYellow;
    case 'running': return Colors.AccentBlue;
    case 'completed': return Colors.AccentGreen;
    case 'failed': return Colors.AccentRed;
    default: return Colors.AccentBlue;
  }
};

const formatParameters = (params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) return '';
  
  const paramList = Object.entries(params)
    .filter(([key, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === 'string' && value.length > 50) {
        return `${key}="${value.substring(0, 47)}..."`;
      }
      return `${key}=${JSON.stringify(value)}`;
    })
    .join(', ');
    
  return `(${paramList})`;
};

export const EnhancedToolMessage: React.FC<EnhancedToolMessageProps> = ({
  toolName,
  parameters,
  result,
  status,
  description,
}) => {
  const statusIcon = getStatusIcon(status);
  const statusColor = getStatusColor(status);
  const paramString = formatParameters(parameters);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Tool call header */}
      <Box flexDirection="row">
        <Text color={statusColor}>{statusIcon} </Text>
        <Text bold color={Colors.AccentBlue}>
          {toolName}
        </Text>
        {paramString && (
          <Text color={Colors.Gray}>{paramString}</Text>
        )}
      </Box>
      
      {/* Description if provided */}
      {description && status === 'running' && (
        <Box marginLeft={2}>
          <Text color={Colors.Gray} italic>
            {description}
          </Text>
        </Box>
      )}
      
      {/* Result display */}
      {result && status === 'completed' && (
        <Box marginLeft={2} flexDirection="column">
          <Text color={Colors.Gray}>⎿ </Text>
          <Box marginLeft={2}>
            <Text color={Colors.Foreground}>
              {result.length > 200 ? `${result.substring(0, 197)}...` : result}
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Error display */}
      {result && status === 'failed' && (
        <Box marginLeft={2} flexDirection="column">
          <Text color={Colors.AccentRed}>⎿ Error: </Text>
          <Box marginLeft={2}>
            <Text color={Colors.AccentRed}>
              {result}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};