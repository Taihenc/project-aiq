'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  ChevronRight,
  Home,
  DatabaseZap,
  Search,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sharePointApi } from '@/lib/api/sharepoint';
import { StatusDashboard, type StatusCounts } from './status-dashboard';
import { FileList, type FileItem } from './file-list';
import type { IngestionStatus } from '@/components/features/sharepoint/file-status-badge';
import {
  useFileStatusEvents,
  type FileStatusEvent,
} from '@/hooks/useFileStatusEvents';
import { FolderTreePanel } from './folder-tree-panel';
import { UploadPopover } from './upload-popover';

interface SharePointRawItem {
  id: string;
  name: string;
  folder?: object;
  size?: number;
  lastModifiedDateTime?: string;
}

export function SourcesContent() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  // Statuses for files in the current view
  const [statuses, setStatuses] = useState<Record<string, IngestionStatus>>({});
  // Accumulated statuses across all visited folders for the dashboard counters
  const [allStatuses, setAllStatuses] = useState<
    Record<string, IngestionStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingestingIds, setIngestingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // ── Live SSE updates from NestJS (triggered by FSS webhooks) ───────────────
  const handleStatusEvent = useCallback((event: FileStatusEvent) => {
    const status = event.status as IngestionStatus;
    // Only update the current-view statuses if the file is actually loaded
    setStatuses((prev) => {
      // We key current-view statuses by SharePoint source_id, which equals
      // the item.id used as the key in the statuses map.
      if (event.source_id in prev) {
        return { ...prev, [event.source_id]: status };
      }
      return prev;
    });
    // Always update the global dashboard counters
    setAllStatuses((prev) => ({
      ...prev,
      [event.source_id]: status,
    }));
  }, []);

  useFileStatusEvents(handleStatusEvent);
  // ─────────────────────────────────────────────────────────────────

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const data = await sharePointApi.listFiles(path);
      const mapped: FileItem[] = (data.items as SharePointRawItem[]).map(
        (item) => ({
          id: item.id,
          name: item.name,
          isFolder: !!item.folder,
          path: path ? `${path}/${item.name}` : item.name,
          size: item.size,
          modifiedAt: item.lastModifiedDateTime,
        }),
      );
      setItems(mapped);
      setLastRefreshed(new Date());

      // Fetch individual file statuses async without blocking UI
      const files = mapped.filter((i) => !i.isFolder);
      files.forEach(async (file) => {
        try {
          const { status } = await sharePointApi.getFileStatus(file.id);
          setStatuses((prev) => ({ ...prev, [file.id]: status }));
          setAllStatuses((prev) => ({ ...prev, [file.id]: status }));
        } catch {
          const fallback: IngestionStatus = 'NOT_UPLOADED';
          setStatuses((prev) => ({ ...prev, [file.id]: fallback }));
          setAllStatuses((prev) => ({ ...prev, [file.id]: fallback }));
        }
      });
    } catch {
      toast.error('Failed to load SharePoint files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles(currentPath);
    // Clear current-view statuses when navigating so stale values don't linger
    setStatuses({});
  }, [currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Navigation ---
  const breadcrumbs = useMemo(
    () => (currentPath ? currentPath.split('/').filter(Boolean) : []),
    [currentPath],
  );

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(index < 0 ? '' : breadcrumbs.slice(0, index + 1).join('/'));
    setSearch('');
  };

  const handleFolderClick = (item: FileItem) => {
    setCurrentPath(item.path);
    setSearch('');
  };

  // --- Actions ---
  const handleIngest = async (item: FileItem) => {
    setIngestingIds((prev) => new Set([...prev, item.id]));
    setStatuses((prev) => ({ ...prev, [item.id]: 'PROCESSING' }));
    setAllStatuses((prev) => ({ ...prev, [item.id]: 'PROCESSING' }));
    try {
      // Actually trigger ingestion via the webhook service
      await sharePointApi.ingestFile(item.id);
      toast.success(`Ingestion triggered for "${item.name}"`);
      // Status will update in real-time via SSE once FSS sets INDEXING/INDEXED.
      // Read the current status once so the badge transitions from PROCESSING
      // to the real server state without waiting for the next SSE event.
      const { status } = await sharePointApi.getFileStatus(item.id);
      setStatuses((prev) => ({ ...prev, [item.id]: status }));
      setAllStatuses((prev) => ({ ...prev, [item.id]: status }));
    } catch {
      toast.error(`Failed to trigger ingestion for "${item.name}"`);
      try {
        const { status } = await sharePointApi.getFileStatus(item.id);
        setStatuses((prev) => ({ ...prev, [item.id]: status }));
        setAllStatuses((prev) => ({ ...prev, [item.id]: status }));
      } catch (error) {
        console.error(
          `Failed to fetch file status for item "${item.name}" (ID: ${item.id}) after ingestion error:`,
          error,
        );
      }
    } finally {
      setIngestingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleDelete = async (item: FileItem) => {
    setDeletingIds((prev) => new Set([...prev, item.id]));
    try {
      await sharePointApi.deleteFile(item.id);
      toast.success(`"${item.name}" removed from the index`);
      const notUploaded: IngestionStatus = 'NOT_UPLOADED';
      setStatuses((prev) => ({ ...prev, [item.id]: notUploaded }));
      setAllStatuses((prev) => ({ ...prev, [item.id]: notUploaded }));
    } catch {
      toast.error(`Failed to delete "${item.name}"`);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleUpload = async (file: File, uploadPath: string) => {
    setUploading(true);
    try {
      await sharePointApi.uploadFile(file, uploadPath || undefined);
      toast.success(`"${file.name}" uploaded successfully`);
      // Navigate to the upload destination so the user sees the new file
      setCurrentPath(uploadPath);
      loadFiles(uploadPath);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // --- Derived values ---
  const counts: StatusCounts = useMemo(() => {
    const vals = Object.values(allStatuses);
    return {
      total: vals.length,
      // Fully indexed into vector DB
      ingested: vals.filter((s) => s === 'INDEXED').length,
      // Actively in-flight: uploading to S3 or being indexed
      processing: vals.filter((s) => s === 'PROCESSING' || s === 'INDEXING')
        .length,
      // Any failure: upload failure or indexing failure
      failed: vals.filter((s) => s === 'FAILED' || s === 'INDEX_FAILED').length,
      // Waiting to be processed: initial state or uploaded to S3 but not yet indexed
      pending: vals.filter((s) => s === 'PENDING' || s === 'COMPLETED').length,
    };
  }, [allStatuses]);

  const filteredItems = useMemo(
    () =>
      search.trim()
        ? items.filter((i) =>
            i.name.toLowerCase().includes(search.toLowerCase()),
          )
        : items,
    [items, search],
  );

  const timeSinceRefresh = useMemo(() => {
    const secs = Math.round((Date.now() - lastRefreshed.getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
    return `${Math.round(secs / 3600)}h ago`;
  }, [lastRefreshed]);

  const isDashboardLoading = loading && Object.keys(allStatuses).length === 0;

  return (
    <div className="relative z-10 flex flex-col h-full overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0 bg-background/50 backdrop-blur-sm">
        <SidebarTrigger className="text-muted-foreground hover:text-[var(--brand-fg-accent)] shrink-0" />

        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 shrink-0">
            <DatabaseZap className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-primary-medium leading-none">
              Data Sources
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              SharePoint files &amp; ingestion
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
            Updated {timeSinceRefresh}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-accent-purple"
            onClick={() => loadFiles(currentPath)}
            disabled={loading}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col px-5 max-w-7xl mx-auto w-full">
          {/* Status dashboard */}
          <div className="pt-5 pb-4 shrink-0">
            <StatusDashboard counts={counts} isLoading={isDashboardLoading} />
          </div>

          {/* Tree card + file browser card side-by-side */}
          <div className="flex gap-4 flex-1 overflow-hidden pb-5">
            {/* ── Folder tree card ── */}
            <div className="w-56 shrink-0 flex flex-col rounded-2xl border border-border bg-card backdrop-blur-sm overflow-hidden">
              {/* Card header — same height as file browser toolbar */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40 min-h-[52px]">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 shrink-0">
                  <FolderOpen className="h-4 w-4 text-violet-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  SharePoint
                </span>
              </div>
              {/* Tree body */}
              <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                <FolderTreePanel
                  selectedPath={currentPath}
                  onSelect={(path) => {
                    setCurrentPath(path);
                    setSearch('');
                  }}
                />
              </div>
            </div>

            {/* ── File browser card ── */}
            <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border bg-card backdrop-blur-sm overflow-hidden">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40 min-h-[52px]">
                {/* Breadcrumb nav */}
                <nav
                  className="flex items-center gap-0.5 text-sm flex-1 min-w-0 overflow-x-auto no-scrollbar"
                  aria-label="File path"
                >
                  <button
                    onClick={() => navigateToBreadcrumb(-1)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6 shrink-0',
                      !currentPath
                        ? 'text-violet-400 bg-violet-500/10'
                        : 'text-muted-foreground hover:text-[var(--brand-link)]',
                    )}
                  >
                    <Home className="h-3.5 w-3.5" />
                    Root
                  </button>

                  {breadcrumbs.map((segment, i) => (
                    <span key={i} className="flex items-center gap-0.5 min-w-0">
                      <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                      <button
                        onClick={() => navigateToBreadcrumb(i)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6 truncate max-w-40',
                          i === breadcrumbs.length - 1
                            ? 'text-violet-400 bg-violet-500/10'
                            : 'text-muted-foreground hover:text-[var(--brand-link)]',
                        )}
                        title={segment}
                      >
                        {segment}
                      </button>
                    </span>
                  ))}
                </nav>

                {/* Search */}
                <div className="relative shrink-0 hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-44 text-xs pl-8 bg-muted border-input focus-visible:ring-violet-500/40 placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Upload file */}
                <UploadPopover
                  defaultPath={currentPath}
                  onUpload={handleUpload}
                  uploading={uploading}
                />
              </div>

              {/* Current path context chip */}
              {currentPath && (
                <div className="px-4 py-2 border-b border-border bg-violet-500/4 flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5 text-violet-400/70 shrink-0" />
                  <span className="text-[11px] text-muted-foreground/70 truncate">
                    {currentPath}
                  </span>
                </div>
              )}

              {/* File list */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <FileList
                  items={filteredItems}
                  statuses={statuses}
                  isLoading={loading && items.length === 0}
                  onFolderClick={handleFolderClick}
                  onIngest={handleIngest}
                  onDelete={handleDelete}
                  ingestingIds={ingestingIds}
                  deletingIds={deletingIds}
                />
              </div>
            </div>
          </div>
          {/* end flex gap-4 */}
        </div>
        {/* end inner column */}
      </div>
      {/* end body */}
    </div>
  );
}
