"use client"

import { useState, useCallback, useEffect } from "react"
import { Tree, Folder, File as TreeFile, TreeViewElement } from "@/components/ui/file-tree"
import { sharePointApi } from "@/lib/api/sharepoint"
import { FileStatusBadge, IngestionStatus } from "./file-status-badge"
import { Loader2, RefreshCw, Upload, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SharePointItem extends TreeViewElement {
  id: string
  name: string
  isFolder: boolean
  path: string
  children?: SharePointItem[]
}

export function SharePointExplorer() {
  const [items, setItems] = useState<SharePointItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState<Record<string, IngestionStatus>>({})
  const [uploading, setUploading] = useState(false)

  const loadFiles = useCallback(async (path: string = "") => {
    setLoading(true)
    try {
      const data = await sharePointApi.listFiles(path)
      const mapped: SharePointItem[] = data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        isFolder: !!item.folder,
        path: path ? `${path}/${item.name}` : item.name,
        children: item.folder ? [] : undefined,
      }))

      setItems(mapped)

      // Fetch statuses for files asynchronously
      const files = mapped.filter((i) => !i.isFolder)
      files.forEach(async (file) => {
        try {
          const statusData = await sharePointApi.getFileStatus(file.id)
          setStatuses((prev) => ({ ...prev, [file.id]: statusData.status }))
        } catch {
          setStatuses((prev) => ({ ...prev, [file.id]: "NOT_UPLOADED" }))
        }
      })
    } catch (err) {
      toast.error("Failed to load SharePoint files")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await sharePointApi.uploadFile(file)
      toast.success("File uploaded to SharePoint")
      loadFiles()
    } catch (err) {
      console.error(err)
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const renderTreeItem = (item: SharePointItem) => {
    if (item.isFolder) {
      return (
        <Folder key={item.id} element={item.name} value={item.id} className="pr-2">
          {item.children?.map((child) => renderTreeItem(child))}
          {(!item.children || item.children.length === 0) && (
            <div className="pl-6 py-1 text-xs text-muted-foreground italic">
              Empty folder
            </div>
          )}
        </Folder>
      )
    }

    return (
      <TreeFile key={item.id} value={item.id} className="w-full">
        <div className="flex items-center justify-between w-full pr-2 gap-2">
          <span className="truncate max-w-[150px]" title={item.name}>
            {item.name}
          </span>
          <FileStatusBadge status={statuses[item.id] || "NOT_UPLOADED"} />
        </div>
      </TreeFile>
    )
  }

  // Calculate summary counts
  const summary = {
    total: Object.keys(statuses).length,
    ingested: Object.values(statuses).filter(s => s === "COMPLETED").length,
    processing: Object.values(statuses).filter(s => s === "PROCESSING").length,
    failed: Object.values(statuses).filter(s => s === "FAILED").length,
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Status Highlights */}
      <div className="grid grid-cols-2 gap-2 px-1">
        <div className="bg-brand-sidebar-bg/40 border border-purple-500/10 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:border-purple-500/30">
          <span className="text-xl font-bold text-accent-purple">{summary.ingested}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Ingested</span>
        </div>
        <div className="bg-brand-sidebar-bg/40 border border-purple-500/10 rounded-lg p-2 flex flex-col items-center justify-center transition-all hover:border-purple-500/30">
          <span className="text-xl font-bold text-amber-500">{summary.processing}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Processing</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[10px] font-medium border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:text-accent-purple"
              disabled={uploading}
              asChild
            >
              <span>
                {uploading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Upload className="size-3" />
                )}
                Ingest New
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </span>
            </Button>
          </label>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-accent-purple"
          onClick={() => loadFiles()}
          disabled={loading}
        >
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="size-5 animate-spin text-accent-purple/60" />
            <span className="text-[10px] text-muted-foreground animate-pulse">Scanning SharePoint...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
            <File className="size-8 mb-2 text-muted-foreground/30" />
            <p className="text-[10px] text-muted-foreground tracking-tight">No documents in root</p>
          </div>
        ) : (
          <Tree elements={items} className="w-full">
            {items.map((item) => renderTreeItem(item))}
          </Tree>
        )}
      </div>
    </div>
  )
}
