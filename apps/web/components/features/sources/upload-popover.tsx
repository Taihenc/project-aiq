'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, FolderIcon, FileIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderTreePanel } from './folder-tree-panel';

interface UploadPopoverProps {
  /** Pre-selected destination — the currently viewed folder. */
  defaultPath: string;
  /** Called with the chosen file and destination folder path. */
  onUpload: (file: File, path: string) => Promise<void>;
  uploading: boolean;
}

export function UploadPopover({
  defaultPath,
  onUpload,
  uploading,
}: UploadPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pickedPath, setPickedPath] = useState(defaultPath);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      // Reset to the currently-viewed folder each time the dialog opens
      setPickedPath(defaultPath);
      setSelectedFile(null);
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, pickedPath);
    setOpen(false);
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/18 text-violet-300 hover:text-violet-200 shrink-0"
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload File
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm gap-4">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Upload File to SharePoint
          </DialogTitle>
        </DialogHeader>

        {/* ── Destination folder picker ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Destination folder
          </p>

          {/* Picked path chip */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 min-h-7">
            <FolderIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{pickedPath || 'Root'}</span>
          </div>

          {/* Mini folder-only tree */}
          <div className="h-52 overflow-hidden rounded-lg border border-white/8 bg-black/20 p-2">
            <FolderTreePanel
              selectedPath={pickedPath}
              onSelect={setPickedPath}
              foldersOnly
            />
          </div>
        </div>

        {/* ── File picker ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">File</p>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-violet-400/70" />
            <span className="truncate">
              {selectedFile ? selectedFile.name : 'Choose a file…'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setOpen(false)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white"
            disabled={!selectedFile || uploading}
            onClick={handleConfirm}
            type="button"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
