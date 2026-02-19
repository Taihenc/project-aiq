"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type IngestionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "NOT_UPLOADED"

const statusConfig: Record<IngestionStatus, { label: string, className: string }> = {
  PENDING: { label: "Pending", className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" },
  PROCESSING: { label: "Processing", className: "bg-blue-500/20 text-blue-500 border-blue-500/50 animate-pulse" },
  COMPLETED: { label: "Ingested", className: "bg-green-500/20 text-green-500 border-green-500/50" },
  FAILED: { label: "Failed", className: "bg-red-500/20 text-red-500 border-red-500/50" },
  NOT_UPLOADED: { label: "Not Uploaded", className: "bg-slate-500/20 text-slate-400 border-slate-500/50" },
}

export function FileStatusBadge({ status }: { status: IngestionStatus }) {
  const config = statusConfig[status] || statusConfig.NOT_UPLOADED
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-medium whitespace-nowrap", config.className)}>
      {config.label}
    </Badge>
  )
}
