'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type IngestionStatus =
  | 'NOT_UPLOADED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'INDEXING'
  | 'INDEXED'
  | 'INDEX_FAILED'
  | 'DELETED';

const statusConfig: Record<
  IngestionStatus,
  { label: string; className: string }
> = {
  NOT_UPLOADED: {
    label: 'Not Uploaded',
    className: 'bg-slate-500/20  text-slate-400  border-slate-500/50',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  },
  PROCESSING: {
    label: 'Uploading…',
    className:
      'bg-blue-500/20   text-blue-400   border-blue-500/50   animate-pulse',
  },
  COMPLETED: {
    label: 'Uploaded',
    className: 'bg-sky-500/20    text-sky-400    border-sky-500/50',
  },
  FAILED: {
    label: 'Upload Failed',
    className: 'bg-red-500/20    text-red-400    border-red-500/50',
  },
  INDEXING: {
    label: 'Indexing…',
    className:
      'bg-violet-500/20 text-violet-400 border-violet-500/50 animate-pulse',
  },
  INDEXED: {
    label: 'Indexed',
    className: 'bg-green-500/20  text-green-400  border-green-500/50',
  },
  INDEX_FAILED: {
    label: 'Index Failed',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  },
  DELETED: {
    label: 'Deleted',
    className: 'bg-slate-500/20  text-slate-400  border-slate-500/50',
  },
};

export function FileStatusBadge({ status }: { status: IngestionStatus }) {
  const config = statusConfig[status] || statusConfig.NOT_UPLOADED;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1.5 py-0 h-4 font-medium whitespace-nowrap',
        config.className,
      )}
    >
      {config.label}
    </Badge>
  );
}
