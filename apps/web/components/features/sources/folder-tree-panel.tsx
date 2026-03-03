'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode2,
  FileArchive,
  FileVideo,
  FileAudio,
  File as FileIconGeneric,
} from 'lucide-react';
import { Tree, Folder, File } from '@/components/ui/file-tree';
import { sharePointApi } from '@/lib/api/sharepoint';
import type { FileItem } from './file-list';

// ── File icon helper ──────────────────────────────────────────────────────────
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (['doc', 'docx', 'txt', 'md', 'rtf', 'odt'].includes(ext))
    return <FileText className={`${cls} text-blue-400`} />;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
    return <FileSpreadsheet className={`${cls} text-emerald-400`} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext))
    return <FileImage className={`${cls} text-pink-400`} />;
  if (
    [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'json',
      'html',
      'css',
      'sh',
      'yaml',
      'yml',
    ].includes(ext)
  )
    return <FileCode2 className={`${cls} text-yellow-400`} />;
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext))
    return <FileArchive className={`${cls} text-orange-400`} />;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext))
    return <FileVideo className={`${cls} text-violet-400`} />;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext))
    return <FileAudio className={`${cls} text-cyan-400`} />;
  if (['pdf'].includes(ext))
    return <FileText className={`${cls} text-red-400`} />;
  return <FileIconGeneric className={`${cls} text-muted-foreground/50`} />;
}

interface SharePointRawItem {
  id: string;
  name: string;
  folder?: object;
  size?: number;
  lastModifiedDateTime?: string;
}

function mapRaw(raw: SharePointRawItem[], parentPath: string): FileItem[] {
  return raw.map((item) => ({
    id: item.id,
    name: item.name,
    isFolder: !!item.folder,
    path: parentPath ? `${parentPath}/${item.name}` : item.name,
    size: item.size,
    modifiedAt: item.lastModifiedDateTime,
  }));
}

// ── Lazy children loader ───────────────────────────────────────────────────
// This component mounts only when its parent <Folder> accordion opens.
// The useEffect fires on first mount, triggering the API call for that path.
function FolderChildren({
  path,
  selectedPath,
  onSelect,
  foldersOnly,
}: {
  path: string;
  selectedPath: string;
  onSelect: (path: string) => void;
  foldersOnly: boolean;
}) {
  const [children, setChildren] = useState<FileItem[] | null>(null);

  useEffect(() => {
    sharePointApi
      .listFiles(path)
      .then((data) =>
        setChildren(mapRaw(data.items as SharePointRawItem[], path)),
      )
      .catch(() => setChildren([]));
  }, [path]);

  if (children === null) {
    return (
      <div className="flex items-center gap-1.5 pl-1 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        Loading…
      </div>
    );
  }

  const visible = foldersOnly ? children.filter((c) => c.isFolder) : children;

  if (visible.length === 0) {
    return (
      <span className="pl-1 py-0.5 text-[11px] text-muted-foreground/40 italic">
        {foldersOnly ? 'No subfolders' : 'Empty'}
      </span>
    );
  }

  return (
    <>
      {visible.map((child) => (
        <TreeNode
          key={child.id}
          item={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          foldersOnly={foldersOnly}
        />
      ))}
    </>
  );
}

// ── Single tree node (folder or file) ─────────────────────────────────────
function TreeNode({
  item,
  selectedPath,
  onSelect,
  foldersOnly,
}: {
  item: FileItem;
  selectedPath: string;
  onSelect: (path: string) => void;
  foldersOnly: boolean;
}) {
  if (item.isFolder) {
    return (
      // Outer div: catches the click that bubbles from the accordion trigger
      // button, turning it into a navigation event.
      <div onClick={() => onSelect(item.path)}>
        <Folder
          value={item.id}
          element={item.name}
          isSelect={selectedPath === item.path}
        >
          {/*
           * Stop propagation so clicking a child node doesn't also fire
           * this folder's onSelect (only the child's own onSelect fires).
           */}
          <div onClick={(e) => e.stopPropagation()}>
            <FolderChildren
              path={item.path}
              selectedPath={selectedPath}
              onSelect={onSelect}
              foldersOnly={foldersOnly}
            />
          </div>
        </Folder>
      </div>
    );
  }

  if (foldersOnly) return null;

  return (
    <File
      value={item.id}
      isSelect={selectedPath === item.path}
      fileIcon={getFileIcon(item.name)}
      onClick={() => onSelect(item.path)}
    >
      <span
        className={`truncate max-w-[148px] text-xs transition-colors ${
          selectedPath === item.path
            ? 'text-violet-300 font-medium'
            : 'text-foreground/60 hover:text-[var(--brand-link)]'
        }`}
      >
        {item.name}
      </span>
    </File>
  );
}

// ── Public component ───────────────────────────────────────────────────────
export interface FolderTreePanelProps {
  selectedPath: string;
  onSelect: (path: string) => void;
  /** When true, only folder nodes are rendered (hide individual files). */
  foldersOnly?: boolean;
}

export function FolderTreePanel({
  selectedPath,
  onSelect,
  foldersOnly = false,
}: FolderTreePanelProps) {
  const [rootItems, setRootItems] = useState<FileItem[] | null>(null);

  useEffect(() => {
    sharePointApi
      .listFiles('')
      .then((data) =>
        setRootItems(mapRaw(data.items as SharePointRawItem[], '')),
      )
      .catch(() => setRootItems([]));
  }, []);

  if (rootItems === null) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const visible = foldersOnly ? rootItems.filter((i) => i.isFolder) : rootItems;

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground/50">
        <FolderOpen className="h-8 w-8 opacity-40" />
        <span className="text-xs">No items found</span>
      </div>
    );
  }

  return (
    <Tree className="h-full text-sm">
      {visible.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          selectedPath={selectedPath}
          onSelect={onSelect}
          foldersOnly={foldersOnly}
        />
      ))}
    </Tree>
  );
}
