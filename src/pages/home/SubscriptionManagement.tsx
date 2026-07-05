import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
} from "@hope-ui/solid"
import {
  AiOutlineDelete,
  AiOutlinePlayCircle,
  AiOutlinePlus,
  AiOutlineReload,
  AiOutlineSave,
} from "solid-icons/ai"
import {
  JSXElement,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT } from "~/hooks"
import {
  Subscription,
  SubscriptionConfig,
  SubscriptionMediaType,
  SubscriptionSourceType,
} from "~/types"
import {
  handleResp,
  notify,
  subscriptionCheck,
  subscriptionConfigGet,
  subscriptionConfigSave,
  subscriptionCreate,
  subscriptionDelete,
  subscriptionList,
} from "~/utils"
import { Container } from "./Container"

type SubscriptionTab = "list" | "add" | "config"
type ActiveFilter = "all" | "true" | "false"
type SourceFilter = "all" | SubscriptionSourceType

const pageSize = 30

const tabItems: { key: SubscriptionTab; icon: typeof AiOutlineReload }[] = [
  { key: "list", icon: AiOutlineReload },
  { key: "add", icon: AiOutlinePlus },
  { key: "config", icon: AiOutlineSave },
]

const sourceTypes: SubscriptionSourceType[] = ["manual", "telegram", "pansou"]
const mediaTypes: SubscriptionMediaType[] = ["tv", "movie"]

const sourceColor: Record<
  SubscriptionSourceType,
  "neutral" | "info" | "accent"
> = {
  manual: "neutral",
  telegram: "info",
  pansou: "accent",
}

const statusColor: Record<string, "neutral" | "info" | "success" | "danger"> = {
  idle: "neutral",
  running: "info",
  success: "success",
  failed: "danger",
}

const emptyTelegramConfig = {
  api_id: 0,
  api_hash: "",
  session_file: "",
  channels: [],
  search_command: [],
  auth_command: [],
  command_env: [],
  command_timeout_seconds: 30,
  limit: 40,
  query: "",
}

const emptyPanSouConfig = {
  base_url: "",
  search_command: [],
  command_env: [],
  command_timeout_seconds: 30,
  limit: 40,
  query: "",
}

const defaultConfig = (): SubscriptionConfig => ({
  default_target_root: "",
  default_check_interval_minutes: 60,
  default_transfer_enabled: false,
  default_media_type: "tv",
  default_category: "",
  telegram: { ...emptyTelegramConfig },
  pansou: { ...emptyPanSouConfig },
})

const defaultSourceConfigText = (sourceType: SubscriptionSourceType) => {
  switch (sourceType) {
    case "telegram":
      return JSON.stringify(
        {
          channels: ["@channel"],
          query: "",
        },
        null,
        2,
      )
    case "pansou":
      return JSON.stringify(
        {
          query: "",
        },
        null,
        2,
      )
    default:
      return JSON.stringify(
        {
          paths: ["/"],
          links: [],
        },
        null,
        2,
      )
  }
}

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)

const joinLines = (values?: string[]) => (values || []).join("\n")

const numberValue = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const FormField = (props: {
  label: string
  children: JSXElement
  full?: boolean
}) => (
  <FormControl
    display="flex"
    flexDirection="column"
    gridColumn={props.full ? "1 / -1" : undefined}
  >
    <FormLabel>{props.label}</FormLabel>
    {props.children}
  </FormControl>
)

export const SubscriptionManagement = () => {
  const t = useT()
  const bg = useColorModeValue("white", "$neutral3")
  const border = useColorModeValue("$neutral5", "$neutral7")
  const mutedBg = useColorModeValue("$neutral2", "$neutral4")
  const [tab, setTab] = createSignal<SubscriptionTab>("list")
  const [keyword, setKeyword] = createSignal("")
  const [active, setActive] = createSignal<ActiveFilter>("all")
  const [sourceType, setSourceType] = createSignal<SourceFilter>("all")
  const [page, setPage] = createSignal(1)
  const [total, setTotal] = createSignal(0)
  const [records, setRecords] = createSignal<Subscription[]>([])
  const [formSourceType, setFormSourceType] =
    createSignal<SubscriptionSourceType>("manual")
  const [sourceConfigText, setSourceConfigText] = createSignal(
    defaultSourceConfigText("manual"),
  )
  const [form, setForm] = createSignal<Partial<Subscription>>({
    active: true,
    check_interval_minutes: 60,
    transfer_enabled: true,
    media_type: "tv",
    season: 1,
  })
  const [config, setConfig] = createSignal<SubscriptionConfig>(defaultConfig())
  let resetPaginator: (() => void) | undefined

  const [listLoading, listSubs] = useFetch(() =>
    subscriptionList({
      keyword: keyword().trim() || undefined,
      source_type: sourceType() === "all" ? undefined : sourceType(),
      active: active() === "all" ? undefined : active(),
      page: page(),
      per_page: pageSize,
    }),
  )
  const [createLoading, createSub] = useFetch(subscriptionCreate)
  const [deleteLoading, deleteSub] = useFetch(subscriptionDelete)
  const [checkLoading, checkSub] = useFetch(subscriptionCheck)
  const [configLoading, loadConfig] = useFetch(subscriptionConfigGet)
  const [saveConfigLoading, saveConfig] = useFetch(subscriptionConfigSave)

  const refresh = async () => {
    const resp = await listSubs()
    handleResp(resp, (data) => {
      setRecords(data.content)
      setTotal(data.total)
    })
  }

  const refreshConfig = async () => {
    const resp = await loadConfig()
    handleResp(resp, (data) => setConfig(fillConfig(data)))
  }

  const applyFilters = () => {
    setPage(1)
    resetPaginator?.()
    refresh()
  }

  const selectSourceType = (value: SubscriptionSourceType) => {
    setFormSourceType(value)
    setForm((prev) => ({ ...prev, source_type: value }))
    setSourceConfigText(defaultSourceConfigText(value))
  }

  const updateForm = <K extends keyof Subscription>(
    key: K,
    value: Subscription[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submitSubscription = async () => {
    const rawSourceConfig = sourceConfigText().trim()
    if (rawSourceConfig) {
      try {
        JSON.parse(rawSourceConfig)
      } catch {
        notify.error(t("subscription.invalid_source_config"))
        return
      }
    }
    const payload: Partial<Subscription> = {
      ...form(),
      source_type: formSourceType(),
      source_config: rawSourceConfig,
      name: form().name?.trim(),
      target_root: form().target_root?.trim(),
      tmdb_name: form().tmdb_name?.trim(),
      category: form().category?.trim(),
    }
    const resp = await createSub(payload)
    handleResp(resp, () => {
      notify.success(t("global.save_success"))
      setTab("list")
      refresh()
    })
  }

  const runCheck = async (id: number, transfer: boolean) => {
    const resp = await checkSub(id, transfer)
    handleResp(resp, () => {
      notify.success(t("subscription.check_finished"))
      refresh()
    })
  }

  const removeSubscription = async (record: Subscription) => {
    if (!confirm(t("global.delete_confirm", { name: record.name }))) return
    const resp = await deleteSub(record.id)
    handleResp(resp, () => {
      notify.success(t("global.delete_success"))
      refresh()
    })
  }

  const updateConfig = <K extends keyof SubscriptionConfig>(
    key: K,
    value: SubscriptionConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const updateTelegramConfig = <K extends keyof SubscriptionConfig["telegram"]>(
    key: K,
    value: SubscriptionConfig["telegram"][K],
  ) => {
    setConfig((prev) => ({
      ...prev,
      telegram: { ...prev.telegram, [key]: value },
    }))
  }

  const updatePanSouConfig = <K extends keyof SubscriptionConfig["pansou"]>(
    key: K,
    value: SubscriptionConfig["pansou"][K],
  ) => {
    setConfig((prev) => ({
      ...prev,
      pansou: { ...prev.pansou, [key]: value },
    }))
  }

  const submitConfig = async () => {
    const resp = await saveConfig(config())
    handleResp(resp, (data) => {
      setConfig(fillConfig(data))
      notify.success(t("global.save_success"))
    })
  }

  onMount(() => {
    refresh()
    refreshConfig()
  })

  return (
    <Container>
      <VStack
        w="$full"
        minH="80vh"
        py="$4"
        px="2%"
        spacing="$3"
        alignItems="stretch"
      >
        <Box w="$full" rounded="$xl" bgColor={bg()} p="$3">
          <VStack spacing="$3" alignItems="stretch">
            <HStack
              spacing="$2"
              gap="$2"
              w="$full"
              flexWrap="wrap"
              pb="$3"
              borderBottom="1px solid"
              borderColor={border()}
            >
              <For each={tabItems}>
                {(item) => (
                  <Button
                    leftIcon={<item.icon />}
                    variant={tab() === item.key ? "solid" : "subtle"}
                    colorScheme={tab() === item.key ? "accent" : "neutral"}
                    onClick={() => setTab(item.key)}
                  >
                    {t(`subscription.tabs.${item.key}`)}
                  </Button>
                )}
              </For>
            </HStack>

            <Switch>
              <Match when={tab() === "list"}>
                <SubscriptionList
                  active={active()}
                  sourceType={sourceType()}
                  keyword={keyword()}
                  records={records()}
                  total={total()}
                  listLoading={listLoading()}
                  checkLoading={checkLoading()}
                  deleteLoading={deleteLoading()}
                  setKeyword={setKeyword}
                  setActive={setActive}
                  setSourceType={setSourceType}
                  setPage={setPage}
                  setResetPaginator={(callback) => {
                    resetPaginator = callback
                  }}
                  applyFilters={applyFilters}
                  refresh={refresh}
                  runCheck={runCheck}
                  removeSubscription={removeSubscription}
                />
              </Match>

              <Match when={tab() === "add"}>
                <VStack spacing="$4" alignItems="stretch">
                  <Box
                    display="grid"
                    gap="$3"
                    gridTemplateColumns={{
                      "@initial": "1fr",
                      "@md": "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <FormField label={t("subscription.name")}>
                      <Input
                        value={form().name || ""}
                        onInput={(e) =>
                          updateForm("name", e.currentTarget.value)
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.source_type")}>
                      <SourceSelect
                        value={formSourceType()}
                        onChange={selectSourceType}
                      />
                    </FormField>
                    <FormField label={t("subscription.tmdb_name")}>
                      <Input
                        value={form().tmdb_name || ""}
                        onInput={(e) =>
                          updateForm("tmdb_name", e.currentTarget.value)
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.tmdb_id")}>
                      <Input
                        type="number"
                        value={form().tmdb_id || 0}
                        onInput={(e) =>
                          updateForm(
                            "tmdb_id",
                            numberValue(e.currentTarget.value),
                          )
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.tmdb_year")}>
                      <Input
                        type="number"
                        value={form().tmdb_year || 0}
                        onInput={(e) =>
                          updateForm(
                            "tmdb_year",
                            numberValue(e.currentTarget.value),
                          )
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.media_type")}>
                      <MediaTypeSelect
                        value={form().media_type || "tv"}
                        onChange={(value) => updateForm("media_type", value)}
                      />
                    </FormField>
                    <FormField label={t("subscription.category")}>
                      <Input
                        value={form().category || ""}
                        onInput={(e) =>
                          updateForm("category", e.currentTarget.value)
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.season")}>
                      <Input
                        type="number"
                        value={form().season || 1}
                        onInput={(e) =>
                          updateForm(
                            "season",
                            numberValue(e.currentTarget.value),
                          )
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.target_root")}>
                      <Input
                        value={form().target_root || ""}
                        onInput={(e) =>
                          updateForm("target_root", e.currentTarget.value)
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.check_interval_minutes")}>
                      <Input
                        type="number"
                        value={form().check_interval_minutes || 60}
                        onInput={(e) =>
                          updateForm(
                            "check_interval_minutes",
                            numberValue(e.currentTarget.value),
                          )
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.active")}>
                      <HopeSwitch
                        checked={form().active ?? true}
                        onChange={(e: { currentTarget: HTMLInputElement }) =>
                          updateForm("active", e.currentTarget.checked)
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.transfer_enabled")}>
                      <HopeSwitch
                        checked={form().transfer_enabled ?? true}
                        onChange={(e: { currentTarget: HTMLInputElement }) =>
                          updateForm(
                            "transfer_enabled",
                            e.currentTarget.checked,
                          )
                        }
                      />
                    </FormField>
                    <FormField label={t("subscription.source_config")} full>
                      <Textarea
                        rows={8}
                        fontFamily="monospace"
                        value={sourceConfigText()}
                        onInput={(e) =>
                          setSourceConfigText(e.currentTarget.value)
                        }
                      />
                    </FormField>
                  </Box>
                  <HStack justifyContent="flex-end">
                    <Button
                      colorScheme="accent"
                      leftIcon={<AiOutlineSave />}
                      loading={createLoading()}
                      onClick={submitSubscription}
                    >
                      {t("subscription.create_subscription")}
                    </Button>
                  </HStack>
                </VStack>
              </Match>

              <Match when={tab() === "config"}>
                <VStack spacing="$5" alignItems="stretch">
                  <ConfigSection title={t("subscription.config_default")}>
                    <Box
                      display="grid"
                      gap="$3"
                      gridTemplateColumns={{
                        "@initial": "1fr",
                        "@md": "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      <FormField label={t("subscription.default_target_root")}>
                        <Input
                          value={config().default_target_root}
                          onInput={(e) =>
                            updateConfig(
                              "default_target_root",
                              e.currentTarget.value,
                            )
                          }
                        />
                      </FormField>
                      <FormField
                        label={t("subscription.default_check_interval_minutes")}
                      >
                        <Input
                          type="number"
                          value={config().default_check_interval_minutes}
                          onInput={(e) =>
                            updateConfig(
                              "default_check_interval_minutes",
                              numberValue(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.default_media_type")}>
                        <MediaTypeSelect
                          value={config().default_media_type}
                          onChange={(value) =>
                            updateConfig("default_media_type", value)
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.default_category")}>
                        <Input
                          value={config().default_category}
                          onInput={(e) =>
                            updateConfig(
                              "default_category",
                              e.currentTarget.value,
                            )
                          }
                        />
                      </FormField>
                      <FormField
                        label={t("subscription.default_transfer_enabled")}
                      >
                        <HopeSwitch
                          checked={config().default_transfer_enabled}
                          onChange={(e: { currentTarget: HTMLInputElement }) =>
                            updateConfig(
                              "default_transfer_enabled",
                              e.currentTarget.checked,
                            )
                          }
                        />
                      </FormField>
                    </Box>
                  </ConfigSection>

                  <ConfigSection title={t("subscription.config_telegram")}>
                    <Box
                      display="grid"
                      gap="$3"
                      gridTemplateColumns={{
                        "@initial": "1fr",
                        "@md": "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      <FormField label={t("subscription.api_id")}>
                        <Input
                          type="number"
                          value={config().telegram.api_id}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "api_id",
                              numberValue(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.api_hash")}>
                        <Input
                          value={config().telegram.api_hash}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "api_hash",
                              e.currentTarget.value,
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.session_file")}>
                        <Input
                          value={config().telegram.session_file}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "session_file",
                              e.currentTarget.value,
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.limit")}>
                        <Input
                          type="number"
                          value={config().telegram.limit}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "limit",
                              numberValue(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField
                        label={t("subscription.command_timeout_seconds")}
                      >
                        <Input
                          type="number"
                          value={config().telegram.command_timeout_seconds}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "command_timeout_seconds",
                              numberValue(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.query")}>
                        <Input
                          value={config().telegram.query}
                          onInput={(e) =>
                            updateTelegramConfig("query", e.currentTarget.value)
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.channels")} full>
                        <Textarea
                          rows={3}
                          value={joinLines(config().telegram.channels)}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "channels",
                              splitLines(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.search_command")} full>
                        <Textarea
                          rows={3}
                          value={joinLines(config().telegram.search_command)}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "search_command",
                              splitLines(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.auth_command")} full>
                        <Textarea
                          rows={3}
                          value={joinLines(config().telegram.auth_command)}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "auth_command",
                              splitLines(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.command_env")} full>
                        <Textarea
                          rows={3}
                          value={joinLines(config().telegram.command_env)}
                          onInput={(e) =>
                            updateTelegramConfig(
                              "command_env",
                              splitLines(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                    </Box>
                  </ConfigSection>

                  <ConfigSection title={t("subscription.config_pansou")}>
                    <Box
                      display="grid"
                      gap="$3"
                      gridTemplateColumns={{
                        "@initial": "1fr",
                        "@md": "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      <FormField label={t("subscription.base_url")}>
                        <Input
                          value={config().pansou.base_url}
                          onInput={(e) =>
                            updatePanSouConfig(
                              "base_url",
                              e.currentTarget.value,
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.limit")}>
                        <Input
                          type="number"
                          value={config().pansou.limit}
                          onInput={(e) =>
                            updatePanSouConfig(
                              "limit",
                              numberValue(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField
                        label={t("subscription.command_timeout_seconds")}
                      >
                        <Input
                          type="number"
                          value={config().pansou.command_timeout_seconds}
                          onInput={(e) =>
                            updatePanSouConfig(
                              "command_timeout_seconds",
                              numberValue(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.query")}>
                        <Input
                          value={config().pansou.query}
                          onInput={(e) =>
                            updatePanSouConfig("query", e.currentTarget.value)
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.search_command")} full>
                        <Textarea
                          rows={3}
                          value={joinLines(config().pansou.search_command)}
                          onInput={(e) =>
                            updatePanSouConfig(
                              "search_command",
                              splitLines(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                      <FormField label={t("subscription.command_env")} full>
                        <Textarea
                          rows={3}
                          value={joinLines(config().pansou.command_env)}
                          onInput={(e) =>
                            updatePanSouConfig(
                              "command_env",
                              splitLines(e.currentTarget.value),
                            )
                          }
                        />
                      </FormField>
                    </Box>
                  </ConfigSection>

                  <HStack
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap="$2"
                  >
                    <Text color="$neutral11" fontSize="$sm">
                      {t("subscription.config_saved_in_subscription")}
                    </Text>
                    <HStack spacing="$2">
                      <Button
                        leftIcon={<AiOutlineReload />}
                        loading={configLoading()}
                        onClick={refreshConfig}
                      >
                        {t("global.refresh")}
                      </Button>
                      <Button
                        colorScheme="accent"
                        leftIcon={<AiOutlineSave />}
                        loading={saveConfigLoading()}
                        onClick={submitConfig}
                      >
                        {t("global.save")}
                      </Button>
                    </HStack>
                  </HStack>
                </VStack>
              </Match>
            </Switch>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}

const SubscriptionList = (props: {
  active: ActiveFilter
  sourceType: SourceFilter
  keyword: string
  records: Subscription[]
  total: number
  listLoading: boolean | undefined
  checkLoading: boolean | undefined
  deleteLoading: boolean | undefined
  setKeyword: (value: string) => void
  setActive: (value: ActiveFilter) => void
  setSourceType: (value: SourceFilter) => void
  setPage: (value: number) => void
  setResetPaginator: (callback: () => void) => void
  applyFilters: () => void
  refresh: () => void
  runCheck: (id: number, transfer: boolean) => void
  removeSubscription: (record: Subscription) => void
}) => {
  const t = useT()
  return (
    <VStack spacing="$3" alignItems="stretch">
      <HStack spacing="$2" gap="$2" w="$full" flexWrap="wrap">
        <Input
          w={{ "@initial": "$full", "@md": "18rem" }}
          placeholder={t("subscription.keyword")}
          value={props.keyword}
          onInput={(e) => props.setKeyword(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") props.applyFilters()
          }}
        />
        <Select
          value={props.sourceType}
          onChange={(value) => props.setSourceType(value as SourceFilter)}
        >
          <SelectTrigger w={{ "@initial": "$full", "@md": "10rem" }}>
            <SelectPlaceholder>
              {t("subscription.source_type")}
            </SelectPlaceholder>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <SelectOption value="all">
                <SelectOptionText>{t("subscription.all")}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <For each={sourceTypes}>
                {(source) => (
                  <SelectOption value={source}>
                    <SelectOptionText>
                      {t(`subscription.source_types.${source}`)}
                    </SelectOptionText>
                    <SelectOptionIndicator />
                  </SelectOption>
                )}
              </For>
            </SelectListbox>
          </SelectContent>
        </Select>
        <Select
          value={props.active}
          onChange={(value) => props.setActive(value as ActiveFilter)}
        >
          <SelectTrigger w={{ "@initial": "$full", "@md": "10rem" }}>
            <SelectPlaceholder>{t("subscription.active")}</SelectPlaceholder>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <SelectOption value="all">
                <SelectOptionText>{t("subscription.all")}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <SelectOption value="true">
                <SelectOptionText>{t("global.enable")}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <SelectOption value="false">
                <SelectOptionText>{t("global.disable")}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
            </SelectListbox>
          </SelectContent>
        </Select>
        <Button
          colorScheme="accent"
          leftIcon={<AiOutlineReload />}
          loading={props.listLoading}
          onClick={props.applyFilters}
        >
          {t("subscription.filter")}
        </Button>
        <Button
          leftIcon={<AiOutlineReload />}
          loading={props.listLoading}
          onClick={props.refresh}
        >
          {t("global.refresh")}
        </Button>
      </HStack>

      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <For
                each={[
                  "name",
                  "source_type",
                  "tmdb",
                  "target_root",
                  "schedule",
                  "last_status",
                  "updated_at",
                ]}
              >
                {(title) => <Th>{t(`subscription.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={props.records}>
              {(record) => (
                <Tr>
                  <Td maxW="18rem">
                    <Text fontWeight="$medium" css={{ wordBreak: "break-all" }}>
                      {record.name}
                    </Text>
                    <Text color="$neutral11" fontSize="$sm">
                      #{record.id}
                    </Text>
                  </Td>
                  <Td>
                    <VStack spacing="$1" alignItems="start">
                      <Badge colorScheme={sourceColor[record.source_type]}>
                        {t(`subscription.source_types.${record.source_type}`)}
                      </Badge>
                      <Badge
                        colorScheme={record.active ? "success" : "neutral"}
                      >
                        {t(record.active ? "global.enable" : "global.disable")}
                      </Badge>
                    </VStack>
                  </Td>
                  <Td maxW="18rem">
                    <Text css={{ wordBreak: "break-all" }}>
                      {record.tmdb_name || "-"}
                    </Text>
                    <Text color="$neutral11" fontSize="$sm">
                      {[
                        record.tmdb_year ? String(record.tmdb_year) : "",
                        record.tmdb_id ? `tmdb-${record.tmdb_id}` : "",
                        record.media_type,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </Text>
                  </Td>
                  <Td maxW="20rem">
                    <Text css={{ wordBreak: "break-all" }}>
                      {record.target_root || "-"}
                    </Text>
                    <Text color="$neutral11" fontSize="$sm">
                      {record.category || "-"}
                    </Text>
                  </Td>
                  <Td>
                    <Text>
                      {record.check_interval_minutes}
                      {t("subscription.minutes")}
                    </Text>
                    <Text color="$neutral11" fontSize="$sm">
                      {t(
                        record.transfer_enabled
                          ? "subscription.transfer_on"
                          : "subscription.transfer_off",
                      )}
                    </Text>
                  </Td>
                  <Td maxW="16rem">
                    <VStack spacing="$1" alignItems="start">
                      <Badge
                        colorScheme={
                          statusColor[record.last_status] || "neutral"
                        }
                      >
                        {t(
                          `subscription.statuses.${record.last_status || "idle"}`,
                        )}
                      </Badge>
                      <Show when={record.last_error}>
                        <Text
                          color="$danger11"
                          fontSize="$sm"
                          css={{ wordBreak: "break-all" }}
                        >
                          {record.last_error}
                        </Text>
                      </Show>
                    </VStack>
                  </Td>
                  <Td>{record.updated_at}</Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        size="sm"
                        leftIcon={<AiOutlinePlayCircle />}
                        loading={props.checkLoading}
                        onClick={() => props.runCheck(record.id, false)}
                      >
                        {t("subscription.check")}
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<AiOutlinePlayCircle />}
                        loading={props.checkLoading}
                        onClick={() => props.runCheck(record.id, true)}
                      >
                        {t("subscription.check_transfer")}
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="danger"
                        leftIcon={<AiOutlineDelete />}
                        loading={props.deleteLoading}
                        onClick={() => props.removeSubscription(record)}
                      >
                        {t("global.delete")}
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
      <Paginator
        total={props.total}
        defaultPageSize={pageSize}
        setResetCallback={props.setResetPaginator}
        onChange={(current) => {
          props.setPage(current)
          props.refresh()
        }}
      />
    </VStack>
  )
}

const SourceSelect = (props: {
  value: SubscriptionSourceType
  onChange: (value: SubscriptionSourceType) => void
}) => {
  const t = useT()
  return (
    <Select
      value={props.value}
      onChange={(value) => props.onChange(value as SubscriptionSourceType)}
    >
      <SelectTrigger>
        <SelectPlaceholder>{t("subscription.source_type")}</SelectPlaceholder>
        <SelectValue />
        <SelectIcon />
      </SelectTrigger>
      <SelectContent>
        <SelectListbox>
          <For each={sourceTypes}>
            {(source) => (
              <SelectOption value={source}>
                <SelectOptionText>
                  {t(`subscription.source_types.${source}`)}
                </SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
            )}
          </For>
        </SelectListbox>
      </SelectContent>
    </Select>
  )
}

const MediaTypeSelect = (props: {
  value: SubscriptionMediaType
  onChange: (value: SubscriptionMediaType) => void
}) => {
  const t = useT()
  return (
    <Select
      value={props.value}
      onChange={(value) => props.onChange(value as SubscriptionMediaType)}
    >
      <SelectTrigger>
        <SelectPlaceholder>{t("subscription.media_type")}</SelectPlaceholder>
        <SelectValue />
        <SelectIcon />
      </SelectTrigger>
      <SelectContent>
        <SelectListbox>
          <For each={mediaTypes}>
            {(mediaType) => (
              <SelectOption value={mediaType}>
                <SelectOptionText>
                  {t(`subscription.media_types.${mediaType}`)}
                </SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
            )}
          </For>
        </SelectListbox>
      </SelectContent>
    </Select>
  )
}

const ConfigSection = (props: { title: string; children: JSXElement }) => {
  const border = useColorModeValue("$neutral5", "$neutral7")
  return (
    <VStack
      spacing="$3"
      alignItems="stretch"
      pt="$4"
      borderTop="1px solid"
      borderColor={border()}
    >
      <Text fontWeight="$semibold">{props.title}</Text>
      {props.children}
    </VStack>
  )
}

const fillConfig = (config: SubscriptionConfig): SubscriptionConfig => ({
  ...defaultConfig(),
  ...config,
  telegram: {
    ...emptyTelegramConfig,
    ...(config.telegram || {}),
  },
  pansou: {
    ...emptyPanSouConfig,
    ...(config.pansou || {}),
  },
})
