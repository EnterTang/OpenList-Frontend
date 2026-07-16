export type SubscriptionSourceType = "manual" | "telegram" | "pansou"
export type SubscriptionStatus = "idle" | "running" | "success" | "failed"
export type SubscriptionMediaType = "tv" | "movie"
export type SubscriptionArchiveStatus = "ongoing" | "completed" | "stalled"

export interface SubscriptionProgress {
  archive_status: SubscriptionArchiveStatus
  latest_season?: number
  latest_episode?: number
  missing_episodes: number[]
  completed_episodes: number
  expected_episodes?: number
  last_episode_added_at?: string
}

export type SubscriptionStorageProvider =
  | "pan123"
  | "pan115"
  | "yidong139"
  | "quark"
  | "aliyun_drive"

export interface SubscriptionStorageTarget {
  provider?: SubscriptionStorageProvider
  folder?: string
}

export interface Subscription {
  id: number
  created_at: string
  updated_at: string
  name: string
  source_type: SubscriptionSourceType
  source_config: string
  active: boolean
  check_interval_minutes: number
  target_root?: string
  temp_target?: SubscriptionStorageTarget
  delivery_target?: SubscriptionStorageTarget
  preferred_worker_node_id?: string
  transfer_enabled: boolean
  tmdb_id: number
  tmdb_name: string
  tmdb_year: number
  media_type: SubscriptionMediaType
  category: string
  season: number
  seasons?: number[]
  latest_season_episode_start: number
  latest_season_episode_end: number
  last_checked_at?: string
  last_cursor: string
  last_tree_hash: string
  last_status: SubscriptionStatus
  last_error: string
  progress?: SubscriptionProgress
}

export interface SubscriptionItem {
  id: number
  created_at: string
  updated_at: string
  subscription_id: number
  source_key: string
  source_provider: string
  source_url: string
  source_path: string
  file_name: string
  file_size: number
  season: number
  episode: number
  target_dir: string
  target_name: string
  target_path: string
  status: string
  last_seen_at: string
  last_error: string
}

export interface SubscriptionDetail {
  subscription: Subscription
  items: SubscriptionItem[]
}

export interface SubscriptionRun {
  id: number
  subscription_id: number
  started_at: string
  finished_at?: string
  status: SubscriptionStatus
  added_count: number
  changed_count: number
  transferred_count: number
  error: string
  subscription_name?: string
  subscription_source_type?: SubscriptionSourceType
}

export type SubscriptionRunView = "changes" | "failures"

export interface SubscriptionRunQuery {
  subscription_id?: number
  view?: SubscriptionRunView
  status?: SubscriptionStatus
  source_type?: SubscriptionSourceType
  keyword?: string
  page?: number
  per_page?: number
}

export interface SubscriptionBoard {
  subscription_count: number
  changed_run_count: number
  added_count: number
  changed_count: number
  failure_count: number
}

export interface SubscriptionEpisodeSource {
  id: number
  created_at: string
  updated_at: string
  subscription_id: number
  season: number
  episode: number
  source_item_id: number
  source_type: SubscriptionSourceType
  source_provider: string
  share_url: string
  file_name: string
  cluster_job_id: string
  selected_at: string
  status: string
  worker_name: string
}

export interface SubscriptionRunResult {
  subscription: Subscription
  run: SubscriptionRun
  items: SubscriptionItem[]
}

export interface SubscriptionResourceSearchLink {
  url: string
  provider?: string
}

export interface SubscriptionResourceSearchResult {
  source_type: SubscriptionSourceType
  provider?: string
  title: string
  content?: string
  channel?: string
  message_url?: string
  date?: string
  links?: SubscriptionResourceSearchLink[]
}

export interface SubscriptionResourceSearchResp {
  query: string
  sources: SubscriptionSourceType[]
  results: SubscriptionResourceSearchResult[]
  source_errors?: Partial<Record<SubscriptionSourceType, string>>
}

export interface SubscriptionTelegramSourceConfig {
  api_id: number
  api_hash: string
  session_file: string
  channels: string[]
  quark_channels?: string[]
  aliyun_drive_channels?: string[]
  pan123_channels?: string[]
  pan115_channels?: string[]
  quark: SubscriptionTelegramPanConfig
  aliyun_drive: SubscriptionTelegramPanConfig
  pan123: SubscriptionTelegramPanConfig
  pan115: SubscriptionTelegramPanConfig
  search_command: string[]
  auth_command: string[]
  command_env: string[]
  command_timeout_seconds: number
  limit: number
}

export interface SubscriptionTelegramPanConfig {
  channels: string[]
  temp_transfer_root: string
  temp_transfer_target?: SubscriptionStorageTarget
  delete_source_after: boolean
  cookie?: string
  refresh_token?: string
  access_token?: string
  drive_id?: string
  drive_type?: string
}

export interface SubscriptionTelegramAuthResp {
  ok?: boolean
  authorized: boolean
  user?: {
    id?: number | string
    username?: string
    phone?: string
    firstName?: string
    first_name?: string
    lastName?: string
    last_name?: string
  }
  phone_code_hash?: string
  error?: string
}

export interface SubscriptionPanSouSourceConfig {
  base_url: string
  search_command: string[]
  command_env: string[]
  command_timeout_seconds: number
  limit: number
  query: string
}

export interface SubscriptionConfig {
  default_target_root?: string
  default_target?: SubscriptionStorageTarget
  default_check_interval_minutes?: number
  default_transfer_enabled?: boolean
  default_media_type?: SubscriptionMediaType
  default_category?: string
  telegram: SubscriptionTelegramSourceConfig
  pansou: SubscriptionPanSouSourceConfig
}
