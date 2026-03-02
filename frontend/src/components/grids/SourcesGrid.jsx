import React, { useState } from 'react';
import {
  Box,
  SimpleGrid,
  Button,
  Flex,
  Text,
  SegmentedControl,
  TextInput,
  Group,
  Select,
} from '@mantine/core';
import { SquarePlus, Grid3x3, List, Search } from 'lucide-react';
import SourceCard from '../cards/SourceCard';

/**
 * SourcesGrid - Grid/list layout for M3U/EPG sources
 * 
 * Improvements over table:
 * - Toggle between card grid and compact list
 * - Better responsive behavior (1-3 columns based on screen size)
 * - Filtering and search
 * - Sort controls
 */

const SourcesGrid = ({
  sources,
  type, // 'm3u' or 'epg'
  title,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  onToggleActive,
  refreshProgress,
}) => {
  const [layout, setLayout] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter sources
  const filteredSources = sources
    .filter((source) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (source.server_url &&
          source.server_url.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (source.file_path &&
          source.file_path.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && source.is_active) ||
        (filterStatus === 'inactive' && !source.is_active) ||
        (filterStatus === 'error' && source.status === 'error');

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort logic
      switch (sortBy) {
        case 'name':
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'updated':
          return (b.updated_at || '').localeCompare(a.updated_at || '');
        case 'active':
          return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
        default:
          return 0;
      }
    });

  return (
    <Box>
      {/* Header */}
      <Flex
        justify="space-between"
        align="center"
        mb="md"
        gap="md"
        wrap="wrap"
      >
        <Text
          size="xl"
          weight={500}
          style={{
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </Text>

        <Button
          leftSection={<SquarePlus size={16} />}
          variant="light"
          size="sm"
          onClick={onAdd}
          color="green"
        >
          Add {type === 'm3u' ? 'M3U' : 'EPG'}
        </Button>
      </Flex>

      {/* Controls */}
      <Flex gap="sm" mb="md" wrap="wrap" align="flex-end">
        {/* Search */}
        <TextInput
          placeholder={`Search ${type === 'm3u' ? 'M3U accounts' : 'EPG sources'}...`}
          leftSection={<Search size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: '1 1 250px', minWidth: '200px' }}
          size="sm"
        />

        {/* Filter by status */}
        <Select
          placeholder="Filter by status"
          value={filterStatus}
          onChange={setFilterStatus}
          data={[
            { value: 'all', label: 'All Sources' },
            { value: 'active', label: 'Active Only' },
            { value: 'inactive', label: 'Inactive Only' },
            { value: 'error', label: 'Errors Only' },
          ]}
          style={{ flex: '0 0 150px' }}
          size="sm"
        />

        {/* Sort */}
        <Select
          placeholder="Sort by"
          value={sortBy}
          onChange={setSortBy}
          data={[
            { value: 'name', label: 'Name' },
            { value: 'status', label: 'Status' },
            { value: 'updated', label: 'Last Updated' },
            { value: 'active', label: 'Active First' },
          ]}
          style={{ flex: '0 0 150px' }}
          size="sm"
        />

        {/* Layout Toggle */}
        <SegmentedControl
          value={layout}
          onChange={setLayout}
          data={[
            {
              value: 'grid',
              label: (
                <Group spacing={4}>
                  <Grid3x3 size={14} />
                  <span>Grid</span>
                </Group>
              ),
            },
            {
              value: 'list',
              label: (
                <Group spacing={4}>
                  <List size={14} />
                  <span>List</span>
                </Group>
              ),
            },
          ]}
          size="sm"
        />
      </Flex>

      {/* Results Count */}
      <Text size="xs" color="dimmed" mb="sm">
        Showing {filteredSources.length} of {sources.length}{' '}
        {type === 'm3u' ? 'accounts' : 'sources'}
      </Text>

      {/* Sources Grid/List */}
      {filteredSources.length === 0 ? (
        <Box
          p="xl"
          style={{
            textAlign: 'center',
            border: '1px dashed var(--mantine-color-gray-4)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Text color="dimmed">
            {searchQuery || filterStatus !== 'all'
              ? 'No sources match your filters'
              : `No ${type === 'm3u' ? 'M3U accounts' : 'EPG sources'} configured yet`}
          </Text>
        </Box>
      ) : (
        <SimpleGrid
          cols={layout === 'grid' ? { base: 1, sm: 2, lg: 3 } : 1}
          spacing={layout === 'grid' ? 'md' : 'sm'}
        >
          {filteredSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              type={type}
              onEdit={onEdit}
              onDelete={onDelete}
              onRefresh={onRefresh}
              onToggleActive={onToggleActive}
              refreshProgress={refreshProgress}
              compact={layout === 'list'}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default SourcesGrid;
