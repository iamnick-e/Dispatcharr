import React, { useState, useEffect } from 'react';
import { Stack, Box, Tabs } from '@mantine/core';
import { Tv, CalendarDays } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import SourcesGrid from '../components/grids/SourcesGrid';
import M3UForm from '../components/forms/M3U';
import EPGForm from '../components/forms/EPG';
import ConfirmationDialog from '../components/ConfirmationDialog';
import usePlaylistsStore from '../store/playlists';
import useEpgsStore from '../store/epgs';
import useWarningsStore from '../store/warnings';
import API from '../api';

const PageContent = () => {
  const [activeTab, setActiveTab] = useState('m3u');
  
  // M3U state
  const [m3uModalOpen, setM3uModalOpen] = useState(false);
  const [selectedM3u, setSelectedM3u] = useState(null);
  const [m3uToDelete, setM3uToDelete] = useState(null);
  const [m3uDeleteOpen, setM3uDeleteOpen] = useState(false);
  const [m3uDeleting, setM3uDeleting] = useState(false);

  // EPG state
  const [epgModalOpen, setEpgModalOpen] = useState(false);
  const [selectedEpg, setSelectedEpg] = useState(null);
  const [epgToDelete, setEpgToDelete] = useState(null);
  const [epgDeleteOpen, setEpgDeleteOpen] = useState(false);
  const [epgDeleting, setEpgDeleting] = useState(false);

  // Store data
  const playlists = usePlaylistsStore((s) => s.playlists);
  const refreshProgress = usePlaylistsStore((s) => s.refreshProgress);
  const setRefreshProgress = usePlaylistsStore((s) => s.setRefreshProgress);
  const editPlaylistId = usePlaylistsStore((s) => s.editPlaylistId);
  const setEditPlaylistId = usePlaylistsStore((s) => s.setEditPlaylistId);
  
  const epgs = useEpgsStore((s) => s.epgs);
  const editEpgId = useEpgsStore((s) => s.editEpgId);
  const setEditEpgId = useEpgsStore((s) => s.setEditEpgId);

  const isWarningSuppressed = useWarningsStore((s) => s.isWarningSuppressed);
  const suppressWarning = useWarningsStore((s) => s.suppressWarning);

  // Filter out locked playlists
  const activeePlaylists = playlists.filter((p) => !p.locked);

  // M3U handlers
  const handleAddM3u = () => {
    setSelectedM3u(null);
    setM3uModalOpen(true);
  };

  const handleEditM3u = (playlist) => {
    setSelectedM3u(playlist);
    setM3uModalOpen(true);
  };

  const handleDeleteM3u = (id) => {
    const playlist = playlists.find((p) => p.id === id);
    setM3uToDelete(playlist);

    if (isWarningSuppressed('delete-m3u')) {
      return executeDeleteM3u(id);
    }

    setM3uDeleteOpen(true);
  };

  const executeDeleteM3u = async (id) => {
    setM3uDeleting(true);
    try {
      await API.deletePlaylist(id || m3uToDelete?.id);
    } finally {
      setM3uDeleting(false);
      setM3uDeleteOpen(false);
      setM3uToDelete(null);
    }
  };

  const handleRefreshM3u = async (id) => {
    setRefreshProgress(id, {
      action: 'initializing',
      progress: 0,
      account: id,
      type: 'm3u_refresh',
    });

    try {
      await API.refreshPlaylist(id);
    } catch (error) {
      setRefreshProgress(id, {
        action: 'error',
        progress: 0,
        account: id,
        type: 'm3u_refresh',
        error: 'Failed to start refresh task',
        status: 'error',
      });
    }
  };

  const handleToggleM3uActive = async (playlist) => {
    try {
      await API.updatePlaylist(
        {
          id: playlist.id,
          is_active: !playlist.is_active,
        },
        true
      );
    } catch (error) {
      console.error('Error toggling M3U active state:', error);
    }
  };

  // EPG handlers
  const handleAddEpg = () => {
    setSelectedEpg(null);
    setEpgModalOpen(true);
  };

  const handleEditEpg = (epg) => {
    setSelectedEpg(epg);
    setEpgModalOpen(true);
  };

  const handleDeleteEpg = (id) => {
    const epg = epgs.find((e) => e.id === id);
    setEpgToDelete(epg);

    if (isWarningSuppressed('delete-epg')) {
      return executeDeleteEpg(id);
    }

    setEpgDeleteOpen(true);
  };

  const executeDeleteEpg = async (id) => {
    setEpgDeleting(true);
    try {
      await API.deleteEPG(id || epgToDelete?.id);
    } finally {
      setEpgDeleting(false);
      setEpgDeleteOpen(false);
      setEpgToDelete(null);
    }
  };

  const handleToggleEpgActive = async (epg) => {
    try {
      await API.updateEPG({
        id: epg.id,
        is_active: !epg.is_active,
      });
    } catch (error) {
      console.error('Error toggling EPG active state:', error);
    }
  };

  // Listen for edit requests from notifications
  useEffect(() => {
    if (editPlaylistId) {
      const playlist = playlists.find((p) => p.id === editPlaylistId);
      if (playlist) {
        handleEditM3u(playlist);
        setEditPlaylistId(null);
        setActiveTab('m3u');
      }
    }
  }, [editPlaylistId, playlists]);

  useEffect(() => {
    if (editEpgId) {
      const epg = epgs.find((e) => e.id === editEpgId);
      if (epg) {
        handleEditEpg(epg);
        setEditEpgId(null);
        setActiveTab('epg');
      }
    }
  }, [editEpgId, epgs]);

  return (
    <Box p="md" style={{ height: '100%', overflowY: 'auto' }}>
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="m3u" leftSection={<Tv size={16} />}>
            M3U Accounts ({activeePlaylists.length})
          </Tabs.Tab>
          <Tabs.Tab value="epg" leftSection={<CalendarDays size={16} />}>
            EPG Sources ({epgs.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="m3u">
          <SourcesGrid
            sources={activeePlaylists}
            type="m3u"
            title="M3U Accounts"
            onAdd={handleAddM3u}
            onEdit={handleEditM3u}
            onDelete={handleDeleteM3u}
            onRefresh={handleRefreshM3u}
            onToggleActive={handleToggleM3uActive}
            refreshProgress={refreshProgress}
          />
        </Tabs.Panel>

        <Tabs.Panel value="epg">
          <SourcesGrid
            sources={epgs}
            type="epg"
            title="EPG Sources"
            onAdd={handleAddEpg}
            onEdit={handleEditEpg}
            onDelete={handleDeleteEpg}
            onToggleActive={handleToggleEpgActive}
            refreshProgress={{}} // EPGs don't have refresh progress yet
          />
        </Tabs.Panel>
      </Tabs>

      {/* M3U Form Modal */}
      <M3UForm
        m3uAccount={selectedM3u}
        isOpen={m3uModalOpen}
        onClose={(newPlaylist) => {
          setM3uModalOpen(false);
          setSelectedM3u(null);
        }}
        playlistCreated={false}
      />

      {/* EPG Form Modal */}
      <EPGForm
        epg={selectedEpg}
        isOpen={epgModalOpen}
        onClose={() => {
          setEpgModalOpen(false);
          setSelectedEpg(null);
        }}
      />

      {/* M3U Delete Confirmation */}
      <ConfirmationDialog
        opened={m3uDeleteOpen}
        onClose={() => setM3uDeleteOpen(false)}
        onConfirm={() => executeDeleteM3u()}
        loading={m3uDeleting}
        title="Confirm M3U Account Deletion"
        message={
          m3uToDelete ? (
            <div style={{ whiteSpace: 'pre-line' }}>
              {`Are you sure you want to delete the following M3U account?

Name: ${m3uToDelete.name}
Type: ${m3uToDelete.account_type === 'XC' ? 'Xtream Codes' : 'Standard'}
Server: ${m3uToDelete.server_url || 'Local file'}

This will remove all related streams and may affect channels using these streams.
This action cannot be undone.`}
            </div>
          ) : (
            'Are you sure you want to delete this M3U account? This action cannot be undone.'
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        actionKey="delete-m3u"
        onSuppressChange={suppressWarning}
        size="lg"
      />

      {/* EPG Delete Confirmation */}
      <ConfirmationDialog
        opened={epgDeleteOpen}
        onClose={() => setEpgDeleteOpen(false)}
        onConfirm={() => executeDeleteEpg()}
        loading={epgDeleting}
        title="Confirm EPG Source Deletion"
        message={
          epgToDelete ? (
            <div style={{ whiteSpace: 'pre-line' }}>
              {`Are you sure you want to delete the following EPG source?

Name: ${epgToDelete.name}
URL: ${epgToDelete.url || 'Local file'}

This will remove all associated program data.
This action cannot be undone.`}
            </div>
          ) : (
            'Are you sure you want to delete this EPG source? This action cannot be undone.'
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        actionKey="delete-epg"
        onSuppressChange={suppressWarning}
        size="lg"
      />
    </Box>
  );
};

const ContentSourcesPage = () => {
  return (
    <ErrorBoundary>
      <PageContent />
    </ErrorBoundary>
  );
};

export default ContentSourcesPage;
