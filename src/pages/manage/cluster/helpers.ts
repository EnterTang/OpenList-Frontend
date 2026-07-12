import {
  ClusterJob,
  ClusterJobStatus,
  ClusterNodeStatus,
  ClusterTaskContext,
  ClusterUploadManifestStatus,
} from "~/types"

export type StatusColor =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent"

export const nodeStatusColor: Record<ClusterNodeStatus, StatusColor> = {
  pending: "warning",
  online: "success",
  offline: "neutral",
  draining: "warning",
  disabled: "danger",
  revoked: "danger",
}

export const jobStatusColor: Record<ClusterJobStatus, StatusColor> = {
  queued: "neutral",
  planning: "info",
  leased: "info",
  running: "info",
  retry_wait: "warning",
  partial_failed: "warning",
  cancel_requested: "warning",
  succeeded: "success",
  failed: "danger",
  cancelled: "neutral",
  dead_letter: "danger",
}

export const resultStatusColor: Record<
  ClusterUploadManifestStatus,
  StatusColor
> = {
  received: "info",
  accepted: "success",
  duplicate: "neutral",
  adopted: "success",
  conflict: "danger",
  context_mismatch: "danger",
  consumed: "success",
}

export const activeJobStatuses: ClusterJobStatus[] = [
  "queued",
  "planning",
  "leased",
  "running",
  "retry_wait",
  "cancel_requested",
]

export const failedJobStatuses: ClusterJobStatus[] = [
  "partial_failed",
  "failed",
  "dead_letter",
]

export const retryableJobStatuses: ClusterJobStatus[] = [
  "partial_failed",
  "failed",
  "dead_letter",
  "cancelled",
]

export const formatBytes = (value?: number) => {
  if (!value || value < 0) return "0 B"
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
  const unit = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  )
  const amount = value / 1024 ** unit
  return `${amount >= 10 || unit === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`
}

export const formatDate = (value?: string | null) => {
  if (!value) return "-"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

export const shortID = (value?: string) => {
  if (!value) return "-"
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

export const parseTaskContext = (
  job?: ClusterJob,
): ClusterTaskContext | undefined => {
  if (!job?.task_context_json) return undefined
  try {
    return JSON.parse(job.task_context_json) as ClusterTaskContext
  } catch (_) {
    return undefined
  }
}

export const jobSearchText = (job: ClusterJob) =>
  [
    job.id,
    job.parent_job_id,
    job.media_item_id,
    job.assigned_node_id,
    job.source_provider,
    job.source_url,
    job.last_error,
    job.last_error_code,
    job.task_context_json,
  ]
    .join(" ")
    .toLowerCase()

export const childrenByParent = (jobs: ClusterJob[]) => {
  const grouped: Record<string, ClusterJob[]> = {}
  for (const job of jobs) {
    if (!job.parent_job_id) continue
    grouped[job.parent_job_id] ||= []
    grouped[job.parent_job_id].push(job)
  }
  return grouped
}
