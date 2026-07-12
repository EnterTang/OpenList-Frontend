export type ClusterRole = "standalone" | "coordinator" | "worker" | "hybrid"

export interface ClusterRedisConfig {
  address: string
  username: string
  db: number
  require_aof: boolean
  password_configured: boolean
}

export interface ClusterRuntimeConfig {
  active_role: ClusterRole
  role: ClusterRole
  node_id: string
  worker_key_file: string
  coordinator_url: string
  enrollment_token_configured: boolean
  websocket_path: string
  etf_root_path: string
  target_base_url: string
  target_api_token_configured: boolean
  target_supports_idempotency: boolean
  redis: ClusterRedisConfig
}

export interface ClusterRedisConfigWriteInput {
  address: string
  username: string
  password?: string
  clear_password?: boolean
  db: number
  require_aof: boolean
}

export interface ClusterRuntimeConfigWriteInput {
  role: ClusterRole
  node_id: string
  worker_key_file: string
  coordinator_url: string
  enrollment_token?: string
  clear_enrollment_token?: boolean
  websocket_path: string
  etf_root_path: string
  target_base_url: string
  target_api_token?: string
  clear_target_api_token?: boolean
  target_supports_idempotency: boolean
  redis: ClusterRedisConfigWriteInput
}

export type ClusterNodeStatus =
  | "pending"
  | "online"
  | "offline"
  | "draining"
  | "disabled"
  | "revoked"

export type ClusterNodeMutableState =
  | "online"
  | "draining"
  | "disabled"
  | "revoked"

export type ClusterJobType = "share.inspect" | "share.batch" | "media.transfer"

export type ClusterJobStatus =
  | "queued"
  | "planning"
  | "leased"
  | "running"
  | "retry_wait"
  | "partial_failed"
  | "cancel_requested"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead_letter"

export type ClusterNotificationStatus =
  | "pending"
  | "sending"
  | "succeeded"
  | "unknown"
  | "failed"
  | "not_required"

export type ClusterCleanupStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"

export type ClusterResultDeliveryStatus =
  | "queued"
  | "sending"
  | "consumed"
  | "dead_letter"

export type ClusterUploadManifestStatus =
  | "received"
  | "accepted"
  | "duplicate"
  | "adopted"
  | "conflict"
  | "context_mismatch"
  | "consumed"

export type ClusterDesiredStatus =
  | "pending"
  | "sending"
  | "applied"
  | "rejected"
  | "failed"

export interface ClusterNode {
  id: string
  created_at: string
  updated_at: string
  name: string
  role: ClusterRole
  status: ClusterNodeStatus
  protocol_version: string
  agent_version: string
  labels_json: string
  weight: number
  drain: boolean
  disabled: boolean
  last_session_id: string
  last_heartbeat_at?: string | null
  last_inventory_hash: string
  key_algorithm?: string
  key_id?: string
  last_error: string
}

export interface ClusterResultQueueStats {
  queued: number
  pending: number
  dlq: number
  cleanup_queued: number
  cleanup_pending: number
  cleanup_dlq: number
}

export interface ClusterHeartbeatResultQueueStats {
  pending_count: number
  pending_bytes: number
  in_flight_count: number
  dead_letter_count: number
  oldest_age_seconds: number
  durability_ready: boolean
  aof_status?: string
}

export interface ClusterNodeCapabilities {
  download_tools?: string[]
  supported_providers?: string[]
  supported_operations?: string[]
  download_concurrency: number
  upload_concurrency: number
  local_scratch_root?: string
  free_local_bytes: number
  redis_durability_ready: boolean
}

export interface ClusterMountInventory {
  node_mount_id: string
  driver: string
  provider: string
  mount_path: string
  account_alias?: string
  account_fingerprint?: string
  status: string
  read_only: boolean
  can_upload: boolean
  can_share: boolean
  supports_etf: boolean
  total_bytes?: number
  free_bytes?: number
  driver_version?: string
  config_schema_hash?: string
}

export interface ClusterSourceObject {
  provider: string
  source_file_id: string
  source_relative_path: string
  size?: number
  hash?: string
  modified_at?: string
}

export interface ClusterSubscriptionTaskContext {
  subscription_id: number
  subscription_item_id: number
  subscription_name: string
  source_key: string
  source_message_id?: string
  source_message_channel?: string
  source_message_url?: string
  source_message_text?: string
  share_ref_fingerprint: string
}

export interface ClusterShareTaskContext {
  provider: string
  url: string
  passcode?: string
}

export interface ClusterMediaTaskContext {
  media_type: string
  tmdb_id: number
  season: number
  episode: number
  logical_media_root: string
  logical_target_path: string
}

export interface ClusterTaskContext {
  parent_batch_id: string
  media_item_id: string
  workflow_version: string
  sealed_manifest_version: string
  subscription: ClusterSubscriptionTaskContext
  share: ClusterShareTaskContext
  media: ClusterMediaTaskContext
  source_objects: ClusterSourceObject[]
  target_profile: string
}

export interface ClusterJob {
  id: string
  created_at: string
  updated_at: string
  parent_job_id: string
  type: ClusterJobType
  status: ClusterJobStatus
  notification_status: ClusterNotificationStatus
  worker_cleanup_status: ClusterCleanupStatus
  result_delivery_status: ClusterResultDeliveryStatus
  idempotency_key: string
  workflow_version: string
  priority: number
  subscription_id: number
  subscription_item_id: number
  media_item_id: string
  source_provider: string
  source_url: string
  task_context_json: string
  task_context_hash: string
  required_capabilities_json: string
  expected_bytes: number
  expected_items: number
  assigned_node_id: string
  current_attempt_id: string
  current_generation: number
  available_at: string
  started_at?: string | null
  finished_at?: string | null
  archived_at?: string | null
  last_error_code: string
  last_error: string
}

export interface ClusterUploadManifest {
  id: string
  created_at: string
  updated_at: string
  job_id: string
  parent_batch_id: string
  media_item_id: string
  attempt_id: string
  node_id: string
  generation: number
  operation_key: string
  task_context_hash: string
  workflow_version: string
  subscription_id: number
  subscription_item_id: number
  media_type: string
  tmdb_id: number
  season: number
  episode: number
  logical_target_path: string
  mobile_account_binding: string
  remote_file_id: string
  remote_parent_id: string
  remote_path: string
  name: string
  size: number
  sha256: string
  hash_source: string
  upload_receipt: string
  source_objects_json: string
  payload_json: string
  payload_hash: string
  status: ClusterUploadManifestStatus
  ack_outcome: string
  received_at: string
  consumed_at?: string | null
  last_error: string
}

export interface ClusterTargetBinding {
  mount_path: string
  max_concurrency?: number
}

export interface ClusterWorkerDesiredConfig {
  provider_temp_roots?: Record<string, string>
  target_bindings?: Record<string, ClusterTargetBinding>
  download_concurrency?: number
  upload_concurrency?: number
}

export interface ClusterNodeDesiredConfig {
  node_id: string
  created_at: string
  updated_at: string
  revision: number
  desired_hash: string
  config_json: string
  status: ClusterDesiredStatus
  observed_revision: number
  observed_hash: string
  observed_at?: string | null
  last_error: string
}

export interface ClusterSecret {
  id: string
  created_at: string
  updated_at: string
  alias: string
  kind: string
  fingerprint: string
  version: number
  rotated_at: string
  revoked_at?: string | null
}

export interface ClusterSecretWriteInput {
  id?: string
  alias: string
  kind: string
  value: Record<string, unknown>
}

export interface ClusterStorageProfile {
  id: string
  created_at: string
  updated_at: string
  node_id: string
  node_mount_id: string
  revision: number
  desired_hash: string
  driver: string
  schema_version: string
  mount_path: string
  parameters_json: string
  credential_ref: string
  status: ClusterDesiredStatus
  observed_revision: number
  observed_hash: string
  observed_storage_id: number
  observed_at?: string | null
  last_error: string
}

export interface ClusterStorageProfileWriteInput {
  id?: string
  node_id: string
  node_mount_id: string
  driver: string
  schema_version: string
  mount_path: string
  parameters?: Record<string, unknown>
  credential_ref: string
  operation?: "upsert" | "create" | "update"
  remark?: string
  disabled?: boolean
}

export interface ClusterControlAudit {
  id: string
  created_at: string
  node_id: string
  actor: string
  remote_ip?: string
  request_id?: string
  action: string
  resource_type: string
  resource_id: string
  revision: number
  outcome: string
  detail: string
}

export interface ClusterDispatchMediaJobInput {
  node_id?: string
  idempotency_key: string
  priority: number
  expected_bytes: number
  task_context: ClusterTaskContext
  required_capabilities?: string[]
}

export interface ClusterDispatchMediaBatchInput {
  batch_id?: string
  items: ClusterDispatchMediaJobInput[]
}

export interface ClusterDispatchMediaBatchResult {
  batch_id: string
  parent?: ClusterJob
  jobs: ClusterJob[]
  errors?: string[]
}

export interface ClusterUploadETFManifestInput {
  job_id: string
  attempt_id: string
  generation: number
  lease_token?: string
  parent_batch_id: string
  media_item_id: string
  operation_key: string
  stage_permit_token: string
  task_context_hash: string
  workflow_version: string
  sealed_manifest_version: string
  target_profile: string
  worker_target_root?: string
  subscription: ClusterSubscriptionTaskContext
  share: ClusterShareTaskContext
  media: ClusterMediaTaskContext
  source_objects: ClusterSourceObject[]
  mobile_account_binding: string
  remote_file_id: string
  remote_parent_id?: string
  remote_path: string
  name: string
  size: number
  sha256: string
  hash_source: string
  upload_receipt?: string
}
