'use client';

import { motion, AnimatePresence } from 'motion/react';
import {
  File,
  FileText,
  FileSpreadsheet,
  FolderOpen,
  ChevronRight,
  Upload,
  Loader2,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FileStatusBadge,
  type IngestionStatus,
} from '@/components/features/sharepoint/file-status-badge';
import { cn } from '@/lib/utils';

export interface FileItem {
  id: string;
  name: string;
  isFolder: boolean;
  path: string;
  size?: number;
  modifiedAt?: string;
  status?: IngestionStatus;
}

interface FileListProps {
  items: FileItem[];
  statuses: Record<string, IngestionStatus>;
  isLoading?: boolean;
  onFolderClick: (item: FileItem) => void;
  onIngest: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  ingestingIds?: Set<string>;
  deletingIds?: Set<string>;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['xlsx', 'xls', 'csv'].includes(ext))
    return <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext))
    return <ImageIcon className="h-4 w-4 text-sky-400 shrink-0" aria-hidden />;
  if (ext === 'pdf')
    return <FileText className="h-4 w-4 text-red-400 shrink-0" />;
  if (['doc', 'docx'].includes(ext))
    return <FileText className="h-4 w-4 text-blue-400 shrink-0" />;
  return <File className="h-4 w-4 text-muted-foreground/60 shrink-0" />;
}

function getFileType(name: string) {
  return name.split('.').pop()?.toUpperCase() ?? 'FILE';
}

function formatSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({
  items,
  statuses,
  isLoading,
  onFolderClick,
  onIngest,
  onDelete,
  ingestingIds,
  deletingIds,
}: FileListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-muted animate-pulse"
            style={{ animationDelay: `${i * 0.07}s` }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="rounded-full p-4 bg-muted border border-border">
          <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            This folder is empty
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Upload a file using the button above to get started
          </p>
        </div>
      </div>
    );
  }

  // Sort: folders first, then files
  const sorted = [...items].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_72px_140px_72px_148px] gap-3 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <span>Name</span>
        <span>Type</span>
        <span>Status</span>
        <span className="text-right">Size</span>
        <span className="text-right">Actions</span>
      </div>

      <AnimatePresence initial={false}>
        {sorted.map((item, i) => {
          const status = statuses[item.id] ?? item.status ?? 'NOT_UPLOADED';
          const isIngesting = ingestingIds?.has(item.id) ?? false;
          const isDeleting = deletingIds?.has(item.id) ?? false;
          // Show delete button and "Re-ingest" label once fully indexed (or failed to index)
          const isCompleted = status === 'INDEXED' || status === 'INDEX_FAILED';
          // Block ingest button while uploading, indexing, or already in-flight
          const ingestDisabled =
            isIngesting ||
            isDeleting ||
            status === 'PROCESSING' ||
            status === 'INDEXING';

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.025, ease: 'easeOut' }}
              className={cn(
                'grid grid-cols-[1fr_72px_140px_72px_148px] gap-3 items-center px-4 py-3 border-b border-border last:border-b-0 transition-colors',
                item.isFolder
                  ? 'hover:bg-violet-500/5 cursor-pointer group/folder'
                  : 'hover:bg-muted/60',
              )}
              onClick={item.isFolder ? () => onFolderClick(item) : undefined}
            >
              {/* Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                {item.isFolder ? (
                  <FolderOpen className="h-4 w-4 text-violet-400 shrink-0 group-hover/folder:text-violet-300 transition-colors" />
                ) : (
                  getFileIcon(item.name)
                )}
                <span
                  className={cn(
                    'truncate text-sm font-medium',
                    item.isFolder
                      ? 'text-violet-500 group-hover/folder:text-violet-600 dark:text-violet-300 dark:group-hover/folder:text-violet-200'
                      : 'text-foreground/70',
                  )}
                  title={item.name}
                >
                  {item.name}
                </span>
                {item.isFolder && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-hover/folder:text-violet-400 group-hover/folder:translate-x-0.5 transition-all" />
                )}
              </div>

              {/* Type */}
              <span className="text-[11px] text-muted-foreground/60 font-mono tabular-nums">
                {item.isFolder ? 'DIR' : getFileType(item.name)}
              </span>

              {/* Status */}
              <div>{!item.isFolder && <FileStatusBadge status={status} />}</div>

              {/* Size */}
              <span className="text-[11px] text-muted-foreground/50 tabular-nums text-right">
                {item.isFolder ? '—' : formatSize(item.size)}
              </span>

              {/* Action */}
              <div className="flex justify-end gap-1">
                {!item.isFolder && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-accent-purple hover:bg-purple-500/10 gap-1.5 font-medium"
                      disabled={ingestDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIngest(item);
                      }}
                    >
                      {isIngesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {isCompleted ? 'Re-ingest' : 'Ingest'}
                    </Button>
                    {isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        disabled={isDeleting || isIngesting}
                        title="Remove from index"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
