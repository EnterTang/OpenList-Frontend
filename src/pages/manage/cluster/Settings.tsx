import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  SimpleGrid,
  Switch,
  Text,
  VStack,
} from "@hope-ui/solid"
import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useFetch, useManageTitle, useT } from "~/hooks"
import {
  ClusterRole,
  ClusterRuntimeConfig,
  ClusterRuntimeConfigWriteInput,
} from "~/types"
import {
  clusterGetConfig,
  clusterSaveConfig,
  handleResp,
  notify,
} from "~/utils"
import { LoadingBlock, PageHeader, Panel } from "./components"

const emptyConfig = (): ClusterRuntimeConfig => ({
  active_role: "standalone",
  role: "standalone",
  node_id: "",
  worker_key_file: "",
  coordinator_url: "",
  enrollment_token_configured: false,
  websocket_path: "/api/cluster/ws",
  etf_root_path: "",
  target_base_url: "",
  target_api_token_configured: false,
  target_supports_idempotency: false,
  redis: {
    address: "",
    username: "",
    db: 0,
    require_aof: true,
    password_configured: false,
  },
})

const ClusterPageTitle = () => {
  useManageTitle("cluster.settings.title")
  return null
}

const Settings = (props: { embedded?: boolean } = {}) => {
  const t = useT()
  const [config, setConfig] = createSignal<ClusterRuntimeConfig>(emptyConfig())
  const [enrollmentToken, setEnrollmentToken] = createSignal("")
  const [targetToken, setTargetToken] = createSignal("")
  const [redisPassword, setRedisPassword] = createSignal("")
  const [clearEnrollmentToken, setClearEnrollmentToken] = createSignal(false)
  const [clearTargetToken, setClearTargetToken] = createSignal(false)
  const [clearRedisPassword, setClearRedisPassword] = createSignal(false)
  const [loading, loadConfig] = useFetch(clusterGetConfig, true)
  const [saving, saveConfig] = useFetch(clusterSaveConfig)

  const isCoordinator = createMemo(() =>
    ["coordinator", "hybrid"].includes(config().role),
  )
  const isWorker = createMemo(() =>
    ["worker", "hybrid"].includes(config().role),
  )

  const load = async () => {
    const resp = await loadConfig()
    handleResp(resp, (value) => {
      setConfig(value)
      setEnrollmentToken("")
      setTargetToken("")
      setRedisPassword("")
      setClearEnrollmentToken(false)
      setClearTargetToken(false)
      setClearRedisPassword(false)
    })
  }

  onMount(() => void load())

  const update = <K extends keyof ClusterRuntimeConfig>(
    key: K,
    value: ClusterRuntimeConfig[K],
  ) => setConfig((current) => ({ ...current, [key]: value }))

  const updateRedis = <K extends keyof ClusterRuntimeConfig["redis"]>(
    key: K,
    value: ClusterRuntimeConfig["redis"][K],
  ) =>
    setConfig((current) => ({
      ...current,
      redis: { ...current.redis, [key]: value },
    }))

  const save = async () => {
    const current = config()
    const input: ClusterRuntimeConfigWriteInput = {
      role: current.role,
      node_id: current.node_id.trim(),
      worker_key_file: current.worker_key_file.trim(),
      coordinator_url: current.coordinator_url.trim(),
      enrollment_token: enrollmentToken().trim() || undefined,
      clear_enrollment_token: clearEnrollmentToken() || undefined,
      websocket_path: current.websocket_path.trim(),
      etf_root_path: current.etf_root_path.trim(),
      target_base_url: current.target_base_url.trim(),
      target_api_token: targetToken().trim() || undefined,
      clear_target_api_token: clearTargetToken() || undefined,
      target_supports_idempotency: current.target_supports_idempotency,
      redis: {
        address: current.redis.address.trim(),
        username: current.redis.username.trim(),
        password: redisPassword() || undefined,
        clear_password: clearRedisPassword() || undefined,
        db: current.redis.db,
        require_aof: current.redis.require_aof,
      },
    }
    const resp = await saveConfig(input)
    handleResp(resp, (value) => {
      setConfig(value)
      setEnrollmentToken("")
      setTargetToken("")
      setRedisPassword("")
      setClearEnrollmentToken(false)
      setClearTargetToken(false)
      setClearRedisPassword(false)
      notify.success(t("cluster.settings.saved_restart_required"))
    })
  }

  const SecretField = (props: {
    id: string
    labelKey: string
    helpKey: string
    configured: boolean
    value: string
    onInput: (value: string) => void
    clear: boolean
    onClear: (value: boolean) => void
  }) => (
    <FormControl>
      <FormLabel for={props.id}>{t(props.labelKey)}</FormLabel>
      <Input
        id={props.id}
        type="password"
        value={props.value}
        disabled={props.clear}
        placeholder={
          props.configured
            ? t("cluster.settings.secret_configured")
            : t("cluster.settings.secret_not_configured")
        }
        autocomplete="new-password"
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
      <FormHelperText>{t(props.helpKey)}</FormHelperText>
      <Box mt="$2">
        <Switch
          checked={props.clear}
          onChange={(event: { currentTarget: HTMLInputElement }) =>
            props.onClear(event.currentTarget.checked)
          }
        >
          {t("cluster.settings.clear_secret")}
        </Switch>
      </Box>
    </FormControl>
  )

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4" pb="$6">
      <Show when={!props.embedded}>
        <ClusterPageTitle />
        <PageHeader
          titleKey="cluster.settings.title"
          descriptionKey="cluster.settings.description"
        />
      </Show>

      <Show when={!loading()} fallback={<LoadingBlock />}>
        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            {t("cluster.settings.restart_warning")}
          </AlertDescription>
        </Alert>

        <Alert status="info">
          <AlertIcon />
          <AlertDescription>
            {t("cluster.settings.environment_override_warning")}
          </AlertDescription>
        </Alert>

        <Panel titleKey="cluster.settings.identity_title">
          <SimpleGrid columns={{ "@initial": 1, "@md": 2 }} gap="$4" p="$4">
            <FormControl>
              <FormLabel for="cluster-role">
                {t("cluster.settings.role")}
              </FormLabel>
              <Select
                id="cluster-role"
                value={config().role}
                onChange={(value) => update("role", value as ClusterRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    {(
                      ["standalone", "coordinator", "worker", "hybrid"] as const
                    ).map((role) => (
                      <SelectOption value={role}>
                        <SelectOptionText>
                          {t(`cluster.role.${role}`)}
                        </SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                    ))}
                  </SelectListbox>
                </SelectContent>
              </Select>
              <FormHelperText>
                {t(`cluster.settings.role_help.${config().role}`)}
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel for="cluster-node-id">
                {t("cluster.settings.node_id")}
              </FormLabel>
              <Input
                id="cluster-node-id"
                value={config().node_id}
                placeholder={t("cluster.settings.node_id_placeholder")}
                onInput={(event) =>
                  update("node_id", event.currentTarget.value)
                }
              />
              <FormHelperText>
                {t("cluster.settings.node_id_help")}
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel>{t("cluster.settings.active_role")}</FormLabel>
              <Text py="$2" fontWeight="$medium">
                {t(`cluster.role.${config().active_role}`)}
              </Text>
              <FormHelperText>
                {t("cluster.settings.active_role_help")}
              </FormHelperText>
            </FormControl>
            <Show when={isWorker()}>
              <FormControl>
                <FormLabel for="cluster-worker-key-file">
                  {t("cluster.settings.worker_key_file")}
                </FormLabel>
                <Input
                  id="cluster-worker-key-file"
                  value={config().worker_key_file}
                  placeholder="/data/openlist/cluster/worker-1.x25519.key"
                  onInput={(event) =>
                    update("worker_key_file", event.currentTarget.value)
                  }
                />
                <FormHelperText>
                  {t("cluster.settings.worker_key_file_help")}
                </FormHelperText>
              </FormControl>
            </Show>
            <Show when={config().role !== "standalone"}>
              <SecretField
                id="cluster-enrollment-token"
                labelKey="cluster.settings.enrollment_token"
                helpKey="cluster.settings.enrollment_token_help"
                configured={config().enrollment_token_configured}
                value={enrollmentToken()}
                onInput={setEnrollmentToken}
                clear={clearEnrollmentToken()}
                onClear={setClearEnrollmentToken}
              />
            </Show>
          </SimpleGrid>
        </Panel>

        <Show when={isWorker()}>
          <Panel titleKey="cluster.settings.worker_title">
            <SimpleGrid columns={{ "@initial": 1, "@md": 2 }} gap="$4" p="$4">
              <FormControl>
                <FormLabel for="cluster-coordinator-url">
                  {t("cluster.settings.coordinator_url")}
                </FormLabel>
                <Input
                  id="cluster-coordinator-url"
                  value={config().coordinator_url}
                  placeholder="wss://openlist.example.com/api/cluster/ws"
                  onInput={(event) =>
                    update("coordinator_url", event.currentTarget.value)
                  }
                />
                <FormHelperText>
                  {t("cluster.settings.coordinator_url_help")}
                </FormHelperText>
              </FormControl>
            </SimpleGrid>
          </Panel>

          <Panel titleKey="cluster.settings.redis_title">
            <Grid
              templateColumns={{ "@initial": "1fr", "@md": "1fr 1fr" }}
              gap="$4"
              p="$4"
            >
              <FormControl>
                <FormLabel for="cluster-redis-address">
                  {t("cluster.settings.redis_address")}
                </FormLabel>
                <Input
                  id="cluster-redis-address"
                  value={config().redis.address}
                  placeholder="redis:6379"
                  onInput={(event) =>
                    updateRedis("address", event.currentTarget.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel for="cluster-redis-db">
                  {t("cluster.settings.redis_db")}
                </FormLabel>
                <Input
                  id="cluster-redis-db"
                  type="number"
                  min="0"
                  value={config().redis.db}
                  onInput={(event) =>
                    updateRedis("db", Number(event.currentTarget.value) || 0)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel for="cluster-redis-username">
                  {t("cluster.settings.redis_username")}
                </FormLabel>
                <Input
                  id="cluster-redis-username"
                  value={config().redis.username}
                  onInput={(event) =>
                    updateRedis("username", event.currentTarget.value)
                  }
                />
              </FormControl>
              <SecretField
                id="cluster-redis-password"
                labelKey="cluster.settings.redis_password"
                helpKey="cluster.settings.redis_password_help"
                configured={config().redis.password_configured}
                value={redisPassword()}
                onInput={setRedisPassword}
                clear={clearRedisPassword()}
                onClear={setClearRedisPassword}
              />
              <FormControl gridColumn={{ "@md": "1 / -1" }}>
                <Switch
                  checked={config().redis.require_aof}
                  onChange={(event: { currentTarget: HTMLInputElement }) =>
                    updateRedis("require_aof", event.currentTarget.checked)
                  }
                >
                  {t("cluster.settings.redis_require_aof")}
                </Switch>
                <FormHelperText>
                  {t("cluster.settings.redis_require_aof_help")}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Panel>
        </Show>

        <Show when={isCoordinator()}>
          <Panel titleKey="cluster.settings.coordinator_title">
            <SimpleGrid columns={{ "@initial": 1, "@md": 2 }} gap="$4" p="$4">
              <FormControl>
                <FormLabel for="cluster-websocket-path">
                  {t("cluster.settings.websocket_path")}
                </FormLabel>
                <Input
                  id="cluster-websocket-path"
                  value={config().websocket_path}
                  onInput={(event) =>
                    update("websocket_path", event.currentTarget.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel for="cluster-target-url">
                  {t("cluster.settings.target_base_url")}
                </FormLabel>
                <Input
                  id="cluster-target-url"
                  value={config().target_base_url}
                  placeholder="http://target-service:3000/api/v1"
                  onInput={(event) =>
                    update("target_base_url", event.currentTarget.value)
                  }
                />
              </FormControl>
              <SecretField
                id="cluster-target-token"
                labelKey="cluster.settings.target_api_token"
                helpKey="cluster.settings.target_api_token_help"
                configured={config().target_api_token_configured}
                value={targetToken()}
                onInput={setTargetToken}
                clear={clearTargetToken()}
                onClear={setClearTargetToken}
              />
              <FormControl gridColumn={{ "@md": "1 / -1" }}>
                <Switch
                  checked={config().target_supports_idempotency}
                  onChange={(event: { currentTarget: HTMLInputElement }) =>
                    update(
                      "target_supports_idempotency",
                      event.currentTarget.checked,
                    )
                  }
                >
                  {t("cluster.settings.target_supports_idempotency")}
                </Switch>
                <FormHelperText>
                  {t("cluster.settings.target_supports_idempotency_help")}
                </FormHelperText>
              </FormControl>
            </SimpleGrid>
          </Panel>
        </Show>

        <Box display="flex" justifyContent="flex-end">
          <Button loading={saving()} onClick={save}>
            {t("cluster.settings.save")}
          </Button>
        </Box>
      </Show>
    </VStack>
  )
}

export default Settings
