export type MobileShareSourceType = "file" | "folder"

export interface MobileShareRecord {
  id: number
  created_at: string
  updated_at: string
  storage_id: number
  storage_mount_path: string
  drive_id: string
  source_file_id: string
  source_path: string
  source_name: string
  source_type: MobileShareSourceType
  period_unit: number
  link_id: string
  share_url: string
  extract_code: string
  is_valid: boolean
  last_error: string
}

export interface MobileShareCreateResult {
  record?: MobileShareRecord
  created: boolean
  existing: boolean
  requires_confirm: boolean
}
