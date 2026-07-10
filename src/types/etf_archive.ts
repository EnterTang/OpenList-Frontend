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
  episode: number
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
  episode: number
}

export interface ETFArchiveTMDBCandidate {
  tmdb_id: number
  name: string
  original_name: string
  year: number
  media_type: string
  category: string
  poster_path: string
  poster_url: string
  genre_ids: number[]
  origin_country: string[]
  original_language: string
  seasons?: ETFArchiveTMDBSeason[]
  season_map?: Record<number, number>
}

export interface ETFArchiveTMDBSeason {
  season_number: number
  episode_count: number
  name: string
}

export interface ETFManualArchiveMetadata {
  tmdb_id: number
  name: string
  original_name: string
  year: number
  media_type: string
  category: string
  season: number
  start_episode: number
}

export interface ETFManualArchiveItem {
  original_name: string
  new_name: string
  original_path: string
  new_path: string
  archive_path: string
  source_name: string
  source_size: number
  source_sha256: string
  season: number
  episode: number
}

export interface ETFManualArchivePreview {
  source_path: string
  target_folder_name: string
  archive_root: string
  archive_dir_path: string
  items: ETFManualArchiveItem[]
}
