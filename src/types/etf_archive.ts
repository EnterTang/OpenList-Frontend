export type ETFArchiveStatus = "skipped" | "archived" | "failed" | "corrected"

export interface ETFArchiveRecord {
  id: number
  created_at: string
  updated_at: string
  storage_id: number
  storage_mount_path: string
  source_name: string
  source_path: string
  local_etf_path: string
  archive_etf_path: string
  archive_root: string
  archive_enabled: boolean
  tmdb_matched: boolean
  tmdb_id: number
  tmdb_name: string
  tmdb_year: number
  media_type: string
  category: string
  season: number
  source_size: number
  source_sha256: string
  status: ETFArchiveStatus
  error: string
}

export interface ETFArchiveCorrection {
  tmdb_id: number
  tmdb_name: string
  tmdb_year: number
  media_type: string
  category: string
  season: number
}
