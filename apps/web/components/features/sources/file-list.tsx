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
  Image,
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
  ingestingIds?: Set<string>;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['xlsx', 'xls', 'csv'].includes(ext))
    return <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext))
    return <Image className="h-4 w-4 text-sky-400 shrink-0" />;
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
  ingestingIds,
}: FileListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-white/4 animate-pulse"
            style={{ animationDelay: `${i * 0.07}s` }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="rounded-full p-4 bg-white/4 border border-white/8">
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
      <div className="grid grid-cols-[1fr_72px_140px_72px_100px] gap-3 px-4 py-2 border-b border-white/4 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold sticky top-0 bg-background/60 backdrop-blur-sm z-10">
        <span>Name</span>
        <span>Type</span>
        <span>Status</span>
        <span className="text-right">Size</span>
        <span className="text-right">Action</span>
      </div>

      <AnimatePresence initial={false}>
        {sorted.map((item, i) => {
          const status = statuses[item.id] ?? item.status ?? 'NOT_UPLOADED';
          const isIngesting = ingestingIds?.has(item.id) ?? false;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.025, ease: 'easeOut' }}
              className={cn(
                'grid grid-cols-[1fr_72px_140px_72px_100px] gap-3 items-center px-4 py-3 border-b border-white/4 last:border-b-0 transition-colors',
                item.isFolder
                  ? 'hover:bg-purple-500/5 cursor-pointer group/folder'
                  : 'hover:bg-white/4',
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
                      ? 'text-violet-300 group-hover/folder:text-violet-200'
                      : 'text-primary-medium',
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
              <div className="flex justify-end">
                {!item.isFolder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-accent-purple hover:bg-purple-500/10 gap-1.5 font-medium"
                    disabled={isIngesting || status === 'PROCESSING'}
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
                    {status === 'COMPLETED' ? 'Re-ingest' : 'Ingest'}
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
