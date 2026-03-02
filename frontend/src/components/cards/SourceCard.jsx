import React from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  Switch,
  Box,
  Flex,
  Progress,
} from '@mantine/core';
import {
  SquareMinus,
  SquarePen,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertCircle,
} from 'lucide-react';
import { format, useDateTimeFormat } from '../../utils/dateTimeUtils.js';

/**
 * SourceCard - Improved card layout for M3U/EPG sources
 * 
 * Improvements over table layout:
 * - Better information hierarchy (name prominent, details secondary)
 * - Optimized spacing (more density without clutter)
 * - Combined status (icon + text + message in one area)
 * - Clearer action buttons (larger, easier to tap)
 * - Responsive design (stacks on mobile, horizontal on desktop)
 */

const getStatusIcon = (status) => {
  const iconProps = { size: 16 };
  
  switch (status) {
    case 'success':
      return <CheckCircle2 {...iconProps} color="var(--mantine-color-green-5)" />;
    case 'error':
      return <XCircle {...iconProps} color="var(--mantine-color-red-5)" />;
    case 'fetching':
    case 'parsing':
      return <Download {...iconProps} color="var(--mantine-color-blue-5)" />;
    case 'pending_setup':
      return <AlertCircle {...iconProps} color="var(--mantine-color-orange-5)" />;
    case 'idle':
    default:
      return <Clock {...iconProps} color="var(--mantine-color-gray-5)" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'success':
      return 'green';
    case 'error':
      return 'red';
    case 'fetching':
    case 'parsing':
      return 'blue';
    case 'pending_setup':
      return 'orange';
    case 'idle':
    default:
      return 'gray';
  }
};

const formatStatusText = (status) => {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'fetching':
      return 'Fetching';
    case 'parsing':
      return 'Parsing';
    case 'error':
      return 'Error';
    case 'success':
      return 'Success';
    case 'pending_setup':
      return 'Pending Setup';
    default:
      return status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : 'Unknown';
  }
};

const SourceCard = ({
  source,
  type, // 'm3u' or 'epg'
  onEdit,
  onDelete,
  onRefresh,
  onToggleActive,
  refreshProgress,
  compact = false,
}) => {
  const { fullDateTimeFormat } = useDateTimeFormat();

  // Get progress data if refreshing
  const progressData = refreshProgress?.[source.id];
  const isRefreshing = progressData && progressData.progress < 100;

  // Determine what to show for URL/path
  const sourceLocation = source.server_url || source.file_path || source.url || 'N/A';
  const accountType = source.account_type === 'XC' ? 'Xtream Codes' : 'M3U';

  return (
    <Card
      shadow="xs"
      padding={compact ? 'xs' : 'sm'}
      radius="md"
      withBorder
      style={{
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: 'var(--mantine-shadow-md)',
        },
      }}
    >
      <Stack spacing={compact ? 'xs' : 'sm'}>
        {/* Header: Name + Actions */}
        <Group position="apart" spacing="xs">
          <Group spacing="sm" style={{ flex: 1, minWidth: 0 }}>
            {/* Source Name (prominent) */}
            <Text
              weight={600}
              size={compact ? 'sm' : 'md'}
              lineClamp={1}
              style={{ flex: 1, minWidth: 0 }}
            >
              {source.name}
            </Text>
            
            {/* Type Badge */}
            <Badge size="sm" variant="dot" color={type === 'm3u' ? 'blue' : 'violet'}>
              {type === 'm3u' ? accountType : 'EPG'}
            </Badge>
          </Group>

          {/* Actions */}
          <Group spacing={4}>
            <ActionIcon
              variant="subtle"
              color="yellow"
              onClick={() => onEdit(source)}
              size={compact ? 'sm' : 'md'}
            >
              <SquarePen size={compact ? 16 : 18} />
            </ActionIcon>
            
            {type === 'm3u' && (
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={() => onRefresh(source.id)}
                disabled={!source.is_active}
                size={compact ? 'sm' : 'md'}
              >
                <RefreshCcw size={compact ? 16 : 18} />
              </ActionIcon>
            )}
            
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onDelete(source.id)}
              size={compact ? 'sm' : 'md'}
            >
              <SquareMinus size={compact ? 16 : 18} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Source Location (URL/File) */}
        <Tooltip label={sourceLocation} multiline maw={400}>
          <Text
            size="xs"
            color="dimmed"
            lineClamp={1}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
            }}
          >
            {sourceLocation}
          </Text>
        </Tooltip>

        {/* Status Section */}
        <Box>
          {isRefreshing ? (
            // Show progress during refresh
            <Stack spacing={4}>
              <Group spacing={6} noWrap>
                <Download size={14} color="var(--mantine-color-blue-5)" />
                <Text size="xs" weight={500}>
                  {progressData.action || 'Processing'}...
                </Text>
                <Text size="xs" color="dimmed">
                  {Math.round(progressData.progress)}%
                </Text>
              </Group>
              <Progress
                value={progressData.progress}
                size="xs"
                color="blue"
                animate
              />
              {progressData.error && (
                <Text size="xs" color="red" lineClamp={2}>
                  {progressData.error}
                </Text>
              )}
            </Stack>
          ) : (
            // Show normal status
            <Group spacing={6} noWrap>
              {getStatusIcon(source.status)}
              <Badge size="sm" variant="light" color={getStatusColor(source.status)}>
                {formatStatusText(source.status)}
              </Badge>
              {source.last_message && (
                <Tooltip label={source.last_message} multiline maw={400}>
                  <Text
                    size="xs"
                    color={source.status === 'error' ? 'red' : 'dimmed'}
                    lineClamp={1}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    {source.last_message}
                  </Text>
                </Tooltip>
              )}
            </Group>
          )}
        </Box>

        {/* Metadata Footer */}
        <Group position="apart" spacing="xs">
          <Group spacing="md">
            {type === 'm3u' && source.max_streams && (
              <Text size="xs" color="dimmed">
                <strong>Streams:</strong> {source.max_streams}
              </Text>
            )}
            
            {source.updated_at && (
              <Text size="xs" color="dimmed">
                <strong>Updated:</strong> {format(source.updated_at, fullDateTimeFormat)}
              </Text>
            )}
          </Group>

          {/* Active Toggle */}
          <Group spacing={6}>
            <Text size="xs" color="dimmed">Active</Text>
            <Switch
              size="xs"
              checked={source.is_active}
              onChange={() => onToggleActive(source)}
            />
          </Group>
        </Group>
      </Stack>
    </Card>
  );
};

export default SourceCard;
