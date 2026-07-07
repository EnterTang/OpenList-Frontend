export type SubscriptionSourceType = "manual" | "telegram" | "pansou"
export type SubscriptionStatus = "idle" | "running" | "success" | "failed"
export type SubscriptionMediaType = "tv" | "movie"

export interface Subscription {
  id: number
  created_at: string
  updated_at: string
  name: string
  source_type: SubscriptionSourceType
  source_config: string
  active: boolean
  check_interval_minutes: number
  target_root: string
  transfer_enabled: boolean
  tmdb_id: number
  tmdb_name: string
  tmdb_year: number
  media_type: SubscriptionMediaType
  category: string
  season: number
  last_checked_at?: string
  last_cursor: string
  last_tree_hash: string
  last_status: SubscriptionStatus
  last_error: string
}

export interface SubscriptionItem {
  id: number
  created_at: string
  updated_at: string
  subscription_id: number
  source_key: string
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
}

export interface SubscriptionRunResult {
  subscription: Subscription
  run: SubscriptionRun
  items: SubscriptionItem[]
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
  delete_source_after: boolean
  cookie?: string
  refresh_token?: string
  access_token?: string
  drive_id?: string
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
  default_check_interval_minutes?: number
  default_transfer_enabled?: boolean
  default_media_type?: SubscriptionMediaType
  default_category?: string
  telegram: SubscriptionTelegramSourceConfig
  pansou: SubscriptionPanSouSourceConfig
}
