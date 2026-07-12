import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Image,
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
  Text,
  Textarea,
  VStack,
  useColorModeValue,
} from "@hope-ui/solid"
import {
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlineLogin,
  AiOutlineLogout,
  AiOutlinePlayCircle,
  AiOutlinePlus,
  AiOutlineReload,
  AiOutlineSave,
  AiOutlineSearch,
  AiOutlineSend,
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
  ETFArchiveTMDBCandidate,
  SubscriptionMediaType,
  SubscriptionSourceType,
  SubscriptionTelegramAuthResp,
} from "~/types"
import {
  etfArchiveTMDBSearch,
  handleResp,
  notify,
  subscriptionCheck,
  subscriptionConfigGet,
  subscriptionConfigSave,
  subscriptionCreate,
  subscriptionDelete,
  subscriptionList,
  subscriptionTelegramLogout,
  subscriptionTelegramSendCode,
  subscriptionTelegramSignIn,
  subscriptionTelegramStatus,
  subscriptionUpdate,
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
type TelegramPanKey = "quark" | "aliyun_drive" | "pan123" | "pan115"
type TelegramPanConfig = SubscriptionConfig["telegram"]["quark"]

const telegramPanItems: { key: TelegramPanKey }[] = [
  { key: "quark" },
  { key: "aliyun_drive" },
  { key: "pan123" },
  { key: "pan115" },
]

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

const emptyTelegramPanConfig = (): TelegramPanConfig => ({
  channels: [],
  temp_transfer_root: "",
  delete_source_after: false,
  cookie: "",
  refresh_token: "",
  access_token: "",
  drive_id: "",
})

const emptyTelegramConfig = (): SubscriptionConfig["telegram"] => ({
  api_id: 0,
  api_hash: "",
  session_file: "",
  channels: [],
  quark: emptyTelegramPanConfig(),
  aliyun_drive: emptyTelegramPanConfig(),
  pan123: emptyTelegramPanConfig(),
  pan115: emptyTelegramPanConfig(),
  search_command: [],
  auth_command: [],
  command_env: [],
  command_timeout_seconds: 30,
  limit: 40,
})

const emptyPanSouConfig = {
  base_url: "",
  search_command: [],
  command_env: [],
  command_timeout_seconds: 30,
  limit: 40,
  query: "",
}

const fillTelegramPanConfig = (
  config?: Partial<TelegramPanConfig>,
  legacyChannels?: string[],
): TelegramPanConfig => {
  const next = {
    ...emptyTelegramPanConfig(),
    ...(config || {}),
  }
  if (!Array.isArray(next.channels)) {
    next.channels = []
  }
  if (next.channels.length === 0 && legacyChannels?.length) {
    next.channels = legacyChannels
  }
  return next
}

const fillTelegramConfig = (
  telegram?: Partial<SubscriptionConfig["telegram"]>,
): SubscriptionConfig["telegram"] => {
  const source = (telegram || {}) as Partial<SubscriptionConfig["telegram"]> & {
    query?: string
  }
  const {
    quark_channels,
    aliyun_drive_channels,
    pan123_channels,
    pan115_channels,
    query,
    ...rest
  } = source
  return {
    ...emptyTelegramConfig(),
    ...rest,
    quark: fillTelegramPanConfig(source.quark, quark_channels),
    aliyun_drive: fillTelegramPanConfig(
      source.aliyun_drive,
      aliyun_drive_channels,
    ),
    pan123: fillTelegramPanConfig(source.pan123, pan123_channels),
    pan115: fillTelegramPanConfig(source.pan115, pan115_channels),
  }
}

const defaultConfig = (): SubscriptionConfig => ({
  default_target_root: "",
  telegram: emptyTelegramConfig(),
  pansou: { ...emptyPanSouConfig },
})

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

const manualLinksFromSourceConfig = (sourceConfig?: string) => {
  if (!sourceConfig) return []
  try {
    const parsed = JSON.parse(sourceConfig)
    return Array.isArray(parsed?.links)
      ? parsed.links.filter((item: unknown) => typeof item === "string")
      : []
  } catch {
    return []
  }
}

const sourceConfigWithManualLinks = (sourceConfig: string, links: string[]) => {
  try {
    const parsed = sourceConfig ? JSON.parse(sourceConfig) : {}
    return JSON.stringify({ ...parsed, links })
  } catch {
    return JSON.stringify({ links })
  }
}

const seasonNumbersFromCandidate = (candidate: ETFArchiveTMDBCandidate) => {
  const seasons = Array.isArray(candidate.seasons) ? candidate.seasons : []
  const fromSeasons = seasons.map((season) => Number(season.season_number))
  const fromMap = Object.keys(candidate.season_map || {}).map((season) =>
    Number(season),
  )
  return Array.from(new Set([...fromSeasons, ...fromMap]))
    .filter((season) => Number.isFinite(season) && season > 0)
    .sort((a, b) => a - b)
}

const telegramUserLabel = (status?: SubscriptionTelegramAuthResp) => {
  const user = status?.user
  if (!status?.authorized || !user) return ""
  if (user.username) return `@${user.username}`
  if (user.phone) return user.phone
  if (user.firstName || user.first_name || user.lastName || user.last_name) {
    return [user.firstName || user.first_name, user.lastName || user.last_name]
      .filter(Boolean)
      .join(" ")
  }
  return user.id ? `#${user.id}` : ""
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
    createSignal<SubscriptionSourceType>("telegram")
  const [manualLinksText, setManualLinksText] = createSignal("")
  const [editingID, setEditingID] = createSignal<number>()
  const [form, setForm] = createSignal<Partial<Subscription>>({
    active: true,
    check_interval_minutes: 60,
    transfer_enabled: true,
    media_type: "tv",
    season: 1,
    seasons: [],
    latest_season_episode_start: 0,
    latest_season_episode_end: 0,
  })
  const [seasonOptions, setSeasonOptions] = createSignal<number[]>([])
  const [tmdbQuery, setTMDBQuery] = createSignal("")
  const [tmdbCandidates, setTMDBCandidates] = createSignal<
    ETFArchiveTMDBCandidate[]
  >([])
  const [selectedTMDBCandidate, setSelectedTMDBCandidate] =
    createSignal<ETFArchiveTMDBCandidate>()
  const [config, setConfig] = createSignal<SubscriptionConfig>(defaultConfig())
  const [telegramAuth, setTelegramAuth] =
    createSignal<SubscriptionTelegramAuthResp>()
  const [telegramPhone, setTelegramPhone] = createSignal("")
  const [telegramCode, setTelegramCode] = createSignal("")
  const [telegramPhoneCodeHash, setTelegramPhoneCodeHash] = createSignal("")
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
  const [updateLoading, updateSub] = useFetch(subscriptionUpdate)
  const [deleteLoading, deleteSub] = useFetch(subscriptionDelete)
  const [checkLoading, checkSub] = useFetch(subscriptionCheck)
  const [tmdbSearchLoading, searchTMDB] = useFetch(etfArchiveTMDBSearch)
  const [configLoading, loadConfig] = useFetch(subscriptionConfigGet)
  const [saveConfigLoading, saveConfig] = useFetch(subscriptionConfigSave)
  const [telegramStatusLoading, loadTelegramStatus] = useFetch(
    subscriptionTelegramStatus,
  )
  const [telegramSendCodeLoading, sendTelegramCodeReq] = useFetch(
    subscriptionTelegramSendCode,
  )
  const [telegramSignInLoading, signInTelegramReq] = useFetch(
    subscriptionTelegramSignIn,
  )
  const [telegramLogoutLoading, logoutTelegramReq] = useFetch(
    subscriptionTelegramLogout,
  )

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
  }

  const searchTMDBCandidates = async () => {
    const query = tmdbQuery().trim()
    if (!query) {
      notify.warning(t("global.empty_input"))
      return
    }
    const resp = await searchTMDB(query)
    handleResp(resp, (data) => setTMDBCandidates(data))
  }

  const selectTMDBCandidate = (candidate: ETFArchiveTMDBCandidate) => {
    const mediaType: SubscriptionMediaType =
      candidate.media_type === "movie" ? "movie" : "tv"
    const seasons =
      mediaType === "tv" ? seasonNumbersFromCandidate(candidate) : []
    setSelectedTMDBCandidate(candidate)
    setTMDBQuery(candidate.name)
    setTMDBCandidates([])
    setSeasonOptions(seasons)
    setForm((prev) => ({
      ...prev,
      name: candidate.name,
      tmdb_id: candidate.tmdb_id,
      tmdb_name: candidate.name,
      tmdb_year: candidate.year || 0,
      media_type: mediaType,
      category: candidate.category || prev.category || "",
      season: mediaType === "tv" ? seasons[0] || prev.season || 1 : 0,
      seasons: mediaType === "tv" ? seasons : [],
    }))
  }

  const clearSelectedTMDBCandidate = () => {
    setSelectedTMDBCandidate(undefined)
    setTMDBCandidates([])
    setSeasonOptions([])
    setForm((prev) => ({
      ...prev,
      name: "",
      tmdb_id: 0,
      tmdb_name: "",
      tmdb_year: 0,
      category: "",
      season: 1,
      seasons: [],
    }))
  }

  const resetCreateForm = () => {
    setEditingID(undefined)
    setFormSourceType("telegram")
    setManualLinksText("")
    setForm({
      active: true,
      check_interval_minutes: 60,
      transfer_enabled: true,
      media_type: "tv",
      season: 1,
      seasons: [],
      latest_season_episode_start: 0,
      latest_season_episode_end: 0,
    })
    setSeasonOptions([])
    setTMDBQuery("")
    setTMDBCandidates([])
    setSelectedTMDBCandidate(undefined)
  }

  const editSubscription = (record: Subscription) => {
    setEditingID(record.id)
    setFormSourceType(record.source_type)
    setManualLinksText(
      joinLines(manualLinksFromSourceConfig(record.source_config)),
    )
    const seasons = record.seasons?.length
      ? record.seasons
      : [record.season].filter(Boolean)
    setForm({ ...record, seasons })
    setSeasonOptions(seasons)
    setTMDBQuery(record.tmdb_name || record.name)
    setTMDBCandidates([])
    setSelectedTMDBCandidate(undefined)
    setTab("add")
  }

  const updateForm = <K extends keyof Subscription>(
    key: K,
    value: Subscription[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const selectedSeasons = () => {
    const seasons = form().seasons
    if (Array.isArray(seasons)) return seasons
    return form().season ? [form().season || 1] : []
  }

  const toggleSeason = (season: number, checked: boolean) => {
    const next = new Set(selectedSeasons())
    if (checked) {
      next.add(season)
    } else if (next.size > 1) {
      next.delete(season)
    }
    const seasons = Array.from(next)
      .filter((item) => item > 0)
      .sort((a, b) => a - b)
    setForm((prev) => ({
      ...prev,
      seasons,
      season: seasons[0] || prev.season || 1,
    }))
  }

  const updateMediaType = (value: SubscriptionMediaType) => {
    if (value === "movie") {
      setForm((prev) => ({
        ...prev,
        media_type: value,
        season: 0,
        seasons: [],
        latest_season_episode_start: 0,
        latest_season_episode_end: 0,
      }))
      return
    }
    const seasons = selectedSeasons().length
      ? selectedSeasons()
      : seasonOptions().length
        ? seasonOptions()
        : [form().season || 1]
    setForm((prev) => ({
      ...prev,
      media_type: value,
      season: seasons[0] || 1,
      seasons,
    }))
  }

  const updateConfig = <K extends keyof SubscriptionConfig>(
    key: K,
    value: SubscriptionConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const submitSubscription = async () => {
    const manualLinks = splitLines(manualLinksText())
    if (formSourceType() === "manual" && manualLinks.length === 0) {
      notify.warning(t("subscription.manual_links_required"))
      return
    }
    const episodeStart = form().latest_season_episode_start || 0
    const episodeEnd = form().latest_season_episode_end || 0
    if (episodeStart > 0 && episodeEnd > 0 && episodeEnd < episodeStart) {
      notify.warning(t("subscription.episode_range_invalid"))
      return
    }
    const sourceConfig =
      formSourceType() === "manual"
        ? sourceConfigWithManualLinks(form().source_config || "", manualLinks)
        : form().source_config || ""
    const payload: Partial<Subscription> = {
      ...form(),
      source_type: formSourceType(),
      source_config: sourceConfig,
      name: form().name?.trim(),
      tmdb_name: form().tmdb_name?.trim(),
      category: form().category?.trim(),
    }
    const resp = editingID()
      ? await updateSub({ ...payload, id: editingID() })
      : await createSub(payload)
    handleResp(resp, () => {
      notify.success(t("global.save_success"))
      resetCreateForm()
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

  const updateTelegramConfig = <K extends keyof SubscriptionConfig["telegram"]>(
    key: K,
    value: SubscriptionConfig["telegram"][K],
  ) => {
    setConfig((prev) => ({
      ...prev,
      telegram: { ...prev.telegram, [key]: value },
    }))
  }

  const updateTelegramPanConfig = <K extends keyof TelegramPanConfig>(
    panKey: TelegramPanKey,
    key: K,
    value: TelegramPanConfig[K],
  ) => {
    setConfig((prev) => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        [panKey]: {
          ...prev.telegram[panKey],
          [key]: value,
        },
      },
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

  const saveCurrentConfig = async () => {
    const resp = await saveConfig(config())
    if (resp.code !== 200) {
      handleResp(resp)
      return false
    }
    setConfig(fillConfig(resp.data))
    return true
  }

  const refreshTelegramStatus = async () => {
    const resp = await loadTelegramStatus()
    handleResp(resp, (data) => setTelegramAuth(data))
  }

  const sendTelegramCode = async () => {
    if (!config().telegram.api_id || !config().telegram.api_hash.trim()) {
      notify.error(t("subscription.telegram_api_required"))
      return
    }
    if (!telegramPhone().trim()) {
      notify.error(t("subscription.telegram_phone_required"))
      return
    }
    if (!(await saveCurrentConfig())) return
    const resp = await sendTelegramCodeReq(telegramPhone().trim())
    handleResp(resp, (data) => {
      setTelegramAuth(data)
      setTelegramPhoneCodeHash(data.phone_code_hash || "")
      notify.success(t("subscription.telegram_code_sent"))
    })
  }

  const signInTelegram = async () => {
    if (
      !telegramPhone().trim() ||
      !telegramCode().trim() ||
      !telegramPhoneCodeHash().trim()
    ) {
      notify.error(t("subscription.telegram_code_required"))
      return
    }
    const resp = await signInTelegramReq(
      telegramPhone().trim(),
      telegramCode().trim(),
      telegramPhoneCodeHash().trim(),
    )
    handleResp(resp, (data) => {
      setTelegramAuth(data)
      setTelegramCode("")
      notify.success(t("subscription.telegram_login_success"))
    })
  }

  const logoutTelegram = async () => {
    const resp = await logoutTelegramReq()
    handleResp(resp, (data) => {
      setTelegramAuth(data)
      setTelegramPhoneCodeHash("")
      notify.success(t("subscription.telegram_logout_success"))
    })
  }

  onMount(() => {
    refresh()
    refreshConfig().then(() => refreshTelegramStatus())
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
                    onClick={() => {
                      if (item.key === "add" && tab() !== "add") {
                        resetCreateForm()
                      }
                      setTab(item.key)
                    }}
                  >
                    {item.key === "add" && editingID()
                      ? t("subscription.edit_subscription")
                      : t(`subscription.tabs.${item.key}`)}
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
                  editSubscription={editSubscription}
                />
              </Match>

              <Match when={tab() === "add"}>
                <VStack spacing="$4" alignItems="stretch">
                  <VStack spacing="$3" alignItems="stretch">
                    <FormField label={t("subscription.tmdb_search")}>
                      <HStack spacing="$2" alignItems="stretch">
                        <Input
                          value={tmdbQuery()}
                          placeholder={t(
                            "subscription.tmdb_search_placeholder",
                          )}
                          onInput={(e) => setTMDBQuery(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") searchTMDBCandidates()
                          }}
                        />
                        <Button
                          leftIcon={<AiOutlineSearch />}
                          loading={tmdbSearchLoading()}
                          onClick={searchTMDBCandidates}
                        >
                          {t("subscription.search")}
                        </Button>
                      </HStack>
                    </FormField>
                    <Show when={tmdbCandidates().length > 0}>
                      <Box
                        display="grid"
                        gap="$2"
                        gridTemplateColumns={{
                          "@initial": "1fr",
                          "@md": "repeat(2, minmax(0, 1fr))",
                        }}
                      >
                        <For each={tmdbCandidates()}>
                          {(candidate) => (
                            <TMDBCandidateButton
                              candidate={candidate}
                              selected={
                                selectedTMDBCandidate()?.tmdb_id ===
                                candidate.tmdb_id
                              }
                              onSelect={selectTMDBCandidate}
                            />
                          )}
                        </For>
                      </Box>
                    </Show>
                    <Show when={selectedTMDBCandidate()}>
                      {(candidate) => (
                        <HStack
                          spacing="$2"
                          flexWrap="wrap"
                          alignItems="center"
                          p="$2"
                          border="1px solid"
                          borderColor="$success7"
                          bgColor="$success3"
                          rounded="$md"
                        >
                          <Badge colorScheme="success">
                            {t("subscription.tmdb_selected")}
                          </Badge>
                          <Text fontWeight="$semibold">
                            {candidate().name}
                            <Show when={candidate().year}>
                              {(year) => ` (${year()})`}
                            </Show>
                          </Text>
                          <Text color="$neutral11" fontSize="$sm">
                            TMDB {candidate().tmdb_id} ·{" "}
                            {t(
                              `subscription.media_types.${
                                candidate().media_type === "movie"
                                  ? "movie"
                                  : "tv"
                              }`,
                            )}
                            <Show when={candidate().category}>
                              {" · "}
                              {candidate().category}
                            </Show>
                          </Text>
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={clearSelectedTMDBCandidate}
                          >
                            {t("subscription.tmdb_reselect")}
                          </Button>
                        </HStack>
                      )}
                    </Show>
                  </VStack>

                  <Show when={selectedTMDBCandidate() || editingID()}>
                    <VStack spacing="$4" alignItems="stretch">
                      <Show when={editingID()}>
                        <HStack justifyContent="space-between" flexWrap="wrap">
                          <Text fontWeight="$semibold" fontSize="$lg">
                            {t("subscription.edit_subscription")}
                          </Text>
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={resetCreateForm}
                          >
                            {t("subscription.cancel_edit")}
                          </Button>
                        </HStack>
                      </Show>
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
                            onChange={updateMediaType}
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
                          <Show
                            when={form().media_type !== "movie"}
                            fallback={
                              <Input type="number" value={0} disabled />
                            }
                          >
                            <HStack spacing="$2" gap="$2" flexWrap="wrap">
                              <For
                                each={
                                  seasonOptions().length
                                    ? seasonOptions()
                                    : [form().season || 1]
                                }
                              >
                                {(season) => {
                                  const checked = () =>
                                    selectedSeasons().includes(season)
                                  return (
                                    <Checkbox
                                      checked={checked()}
                                      disabled={
                                        checked() &&
                                        selectedSeasons().length === 1
                                      }
                                      onChange={(e) =>
                                        toggleSeason(
                                          season,
                                          e.currentTarget.checked,
                                        )
                                      }
                                    >
                                      S{String(season).padStart(2, "0")}
                                    </Checkbox>
                                  )
                                }}
                              </For>
                            </HStack>
                          </Show>
                        </FormField>
                        <Show when={form().media_type !== "movie"}>
                          <FormField
                            label={t(
                              "subscription.latest_season_episode_range",
                            )}
                            full
                          >
                            <VStack alignItems="stretch" spacing="$2">
                              <Box
                                display="grid"
                                gap="$2"
                                gridTemplateColumns={{
                                  "@initial": "1fr",
                                  "@sm": "repeat(2, minmax(0, 1fr))",
                                }}
                              >
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder={t(
                                    "subscription.episode_range_start",
                                  )}
                                  value={
                                    form().latest_season_episode_start || ""
                                  }
                                  onInput={(e) =>
                                    updateForm(
                                      "latest_season_episode_start",
                                      numberValue(e.currentTarget.value),
                                    )
                                  }
                                />
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder={t(
                                    "subscription.episode_range_end",
                                  )}
                                  value={form().latest_season_episode_end || ""}
                                  onInput={(e) =>
                                    updateForm(
                                      "latest_season_episode_end",
                                      numberValue(e.currentTarget.value),
                                    )
                                  }
                                />
                              </Box>
                              <Text color="$neutral11" fontSize="$sm">
                                {t("subscription.episode_range_hint")}
                              </Text>
                            </VStack>
                          </FormField>
                        </Show>
                        <FormField
                          label={t("subscription.check_interval_minutes")}
                        >
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
                            onChange={(e: {
                              currentTarget: HTMLInputElement
                            }) => updateForm("active", e.currentTarget.checked)}
                          />
                        </FormField>
                        <FormField label={t("subscription.transfer_enabled")}>
                          <HopeSwitch
                            checked={form().transfer_enabled ?? true}
                            onChange={(e: {
                              currentTarget: HTMLInputElement
                            }) =>
                              updateForm(
                                "transfer_enabled",
                                e.currentTarget.checked,
                              )
                            }
                          />
                        </FormField>
                        <Show when={formSourceType() === "manual"}>
                          <FormField
                            label={t("subscription.manual_links")}
                            full
                          >
                            <Textarea
                              rows={6}
                              value={manualLinksText()}
                              placeholder={t(
                                "subscription.manual_links_placeholder",
                              )}
                              onInput={(e) =>
                                setManualLinksText(e.currentTarget.value)
                              }
                            />
                          </FormField>
                        </Show>
                      </Box>
                      <HStack justifyContent="flex-end">
                        <Button
                          colorScheme="accent"
                          leftIcon={<AiOutlineSave />}
                          loading={createLoading() || updateLoading()}
                          onClick={submitSubscription}
                        >
                          {t(
                            editingID()
                              ? "subscription.save_subscription"
                              : "subscription.create_subscription",
                          )}
                        </Button>
                      </HStack>
                    </VStack>
                  </Show>
                </VStack>
              </Match>

              <Match when={tab() === "config"}>
                <VStack spacing="$5" alignItems="stretch">
                  <ConfigSection title={t("subscription.config_general")}>
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
                          value={config().default_target_root || ""}
                          onInput={(e) =>
                            updateConfig(
                              "default_target_root",
                              e.currentTarget.value,
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
                      <FormField label={t("subscription.telegram_status")}>
                        <HStack spacing="$2" flexWrap="wrap">
                          <Badge
                            colorScheme={
                              telegramAuth()?.authorized ? "success" : "neutral"
                            }
                          >
                            {t(
                              telegramAuth()?.authorized
                                ? "subscription.telegram_authorized"
                                : "subscription.telegram_unauthorized",
                            )}
                          </Badge>
                          <Show when={telegramUserLabel(telegramAuth())}>
                            <Text color="$neutral11" fontSize="$sm">
                              {telegramUserLabel(telegramAuth())}
                            </Text>
                          </Show>
                        </HStack>
                      </FormField>
                      <Show when={!telegramAuth()?.authorized}>
                        <FormField label={t("subscription.telegram_phone")}>
                          <Input
                            value={telegramPhone()}
                            onInput={(e) =>
                              setTelegramPhone(e.currentTarget.value)
                            }
                          />
                        </FormField>
                        <FormField label={t("subscription.telegram_code")}>
                          <Input
                            value={telegramCode()}
                            onInput={(e) =>
                              setTelegramCode(e.currentTarget.value)
                            }
                          />
                        </FormField>
                      </Show>
                      <HStack
                        gridColumn="1 / -1"
                        justifyContent="flex-start"
                        flexWrap="wrap"
                        gap="$2"
                      >
                        <Button
                          leftIcon={<AiOutlineReload />}
                          loading={telegramStatusLoading()}
                          onClick={refreshTelegramStatus}
                        >
                          {t("subscription.telegram_refresh_status")}
                        </Button>
                        <Show when={!telegramAuth()?.authorized}>
                          <Button
                            leftIcon={<AiOutlineSend />}
                            loading={
                              telegramSendCodeLoading() || saveConfigLoading()
                            }
                            disabled={
                              !config().telegram.api_id ||
                              !config().telegram.api_hash.trim() ||
                              !telegramPhone().trim()
                            }
                            onClick={sendTelegramCode}
                          >
                            {t("subscription.telegram_send_code")}
                          </Button>
                          <Button
                            colorScheme="accent"
                            leftIcon={<AiOutlineLogin />}
                            loading={telegramSignInLoading()}
                            disabled={
                              !telegramPhone().trim() ||
                              !telegramCode().trim() ||
                              !telegramPhoneCodeHash().trim()
                            }
                            onClick={signInTelegram}
                          >
                            {t("subscription.telegram_signin")}
                          </Button>
                        </Show>
                        <Show when={telegramAuth()?.authorized}>
                          <Button
                            colorScheme="danger"
                            leftIcon={<AiOutlineLogout />}
                            loading={telegramLogoutLoading()}
                            onClick={logoutTelegram}
                          >
                            {t("subscription.telegram_logout")}
                          </Button>
                        </Show>
                      </HStack>
                      <For each={telegramPanItems}>
                        {(item) => (
                          <TelegramPanConfigFields
                            panKey={item.key}
                            value={config().telegram[item.key]}
                            onChange={(key, value) =>
                              updateTelegramPanConfig(item.key, key, value)
                            }
                          />
                        )}
                      </For>
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
  editSubscription: (record: Subscription) => void
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

      <Box
        w="$full"
        display="grid"
        gap="$3"
        gridTemplateColumns={{
          "@initial": "minmax(0, 1fr)",
          "@xl": "repeat(2, minmax(0, 1fr))",
        }}
      >
        <For each={props.records}>
          {(record) => {
            const seasons = () =>
              (record.seasons?.length ? record.seasons : [record.season])
                .filter((season) => season > 0)
                .sort((a, b) => a - b)
            const episodeRange = () => {
              if (record.media_type === "movie") return "-"
              const latestSeason = seasons().at(-1) || record.season
              const start = record.latest_season_episode_start || 0
              const end = record.latest_season_episode_end || 0
              const range = start || end ? `E${start || 1}–E${end || "∞"}` : "∞"
              return `S${String(latestSeason).padStart(2, "0")} · ${range}`
            }
            return (
              <VStack
                alignItems="stretch"
                spacing="$3"
                minW="0"
                p="$4"
                border="1px solid"
                borderColor="$neutral6"
                rounded="$lg"
              >
                <HStack
                  justifyContent="space-between"
                  alignItems="start"
                  gap="$3"
                >
                  <Box minW="0">
                    <HStack gap="$2" flexWrap="wrap">
                      <Text
                        fontWeight="$semibold"
                        fontSize="$lg"
                        css={{ wordBreak: "break-word" }}
                      >
                        {record.name}
                      </Text>
                      <Badge
                        colorScheme={
                          statusColor[record.last_status] || "neutral"
                        }
                      >
                        {t(
                          `subscription.statuses.${record.last_status || "idle"}`,
                        )}
                      </Badge>
                    </HStack>
                    <Text color="$neutral11" fontSize="$sm">
                      #{record.id} · {record.tmdb_name || "-"}
                      {record.tmdb_year ? ` (${record.tmdb_year})` : ""}
                    </Text>
                  </Box>
                  <VStack spacing="$1" alignItems="end">
                    <Badge colorScheme={sourceColor[record.source_type]}>
                      {t(`subscription.source_types.${record.source_type}`)}
                    </Badge>
                    <Badge colorScheme={record.active ? "success" : "neutral"}>
                      {t(record.active ? "global.enable" : "global.disable")}
                    </Badge>
                  </VStack>
                </HStack>

                <Box
                  display="grid"
                  gap="$3"
                  gridTemplateColumns={{
                    "@initial": "1fr",
                    "@sm": "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  <Box minW="0">
                    <Text color="$neutral11" fontSize="$sm">
                      {t("subscription.target_root")}
                    </Text>
                    <Text css={{ wordBreak: "break-all" }}>
                      {record.target_root || "-"}
                    </Text>
                    <Text color="$neutral11" fontSize="$sm">
                      {record.category || "-"}
                    </Text>
                  </Box>
                  <Box>
                    <Text color="$neutral11" fontSize="$sm">
                      {t("subscription.latest_season_episode_range")}
                    </Text>
                    <Text>{episodeRange()}</Text>
                    <Text color="$neutral11" fontSize="$sm">
                      {record.check_interval_minutes}
                      {t("subscription.minutes")} ·{" "}
                      {t(
                        record.transfer_enabled
                          ? "subscription.transfer_on"
                          : "subscription.transfer_off",
                      )}
                    </Text>
                  </Box>
                </Box>

                <Show when={record.last_error}>
                  <Text
                    color="$danger11"
                    fontSize="$sm"
                    css={{ wordBreak: "break-word" }}
                  >
                    {record.last_error}
                  </Text>
                </Show>

                <HStack
                  justifyContent="space-between"
                  alignItems="end"
                  gap="$2"
                  flexWrap="wrap"
                >
                  <Text color="$neutral11" fontSize="$sm">
                    {record.updated_at}
                  </Text>
                  <HStack spacing="$2" gap="$2" flexWrap="wrap">
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
                      variant="subtle"
                      leftIcon={<AiOutlineEdit />}
                      onClick={() => props.editSubscription(record)}
                    >
                      {t("global.edit")}
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="danger"
                      variant="subtle"
                      leftIcon={<AiOutlineDelete />}
                      loading={props.deleteLoading}
                      onClick={() => props.removeSubscription(record)}
                    >
                      {t("global.delete")}
                    </Button>
                  </HStack>
                </HStack>
              </VStack>
            )
          }}
        </For>
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

const TMDBCandidateButton = (props: {
  candidate: ETFArchiveTMDBCandidate
  selected: boolean
  onSelect: (candidate: ETFArchiveTMDBCandidate) => void
}) => {
  const t = useT()
  const mediaType = props.candidate.media_type === "movie" ? "movie" : "tv"
  return (
    <Box
      as="button"
      type="button"
      w="$full"
      p="$2"
      border="1px solid"
      borderColor={props.selected ? "$accent8" : "$neutral6"}
      rounded="$md"
      bgColor={props.selected ? "$accent3" : "$neutral2"}
      cursor="pointer"
      textAlign="left"
      onClick={() => props.onSelect(props.candidate)}
    >
      <HStack spacing="$3" alignItems="center">
        <Show
          when={props.candidate.poster_url}
          fallback={
            <Box
              w="3.25rem"
              h="4.75rem"
              rounded="$sm"
              bgColor="$neutral5"
              flexShrink={0}
            />
          }
        >
          <Image
            src={props.candidate.poster_url}
            alt={props.candidate.name}
            w="3.25rem"
            h="4.75rem"
            objectFit="cover"
            rounded="$sm"
            flexShrink={0}
          />
        </Show>
        <VStack spacing="$1" alignItems="start" minW={0}>
          <Text fontWeight="$semibold">
            {props.candidate.name}
            <Show when={props.candidate.year}>{(year) => ` (${year()})`}</Show>
          </Text>
          <Text color="$neutral11" fontSize="$sm">
            TMDB {props.candidate.tmdb_id} ·{" "}
            {t(`subscription.media_types.${mediaType}`)}
            <Show when={props.candidate.category}>
              {" · "}
              {props.candidate.category}
            </Show>
          </Text>
          <Show when={props.candidate.original_name}>
            <Text color="$neutral10" fontSize="$sm">
              {props.candidate.original_name}
            </Text>
          </Show>
        </VStack>
      </HStack>
    </Box>
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

const TelegramPanConfigFields = (props: {
  panKey: TelegramPanKey
  value: TelegramPanConfig
  onChange: <K extends keyof TelegramPanConfig>(
    key: K,
    value: TelegramPanConfig[K],
  ) => void
}) => {
  const t = useT()
  const border = useColorModeValue("$neutral5", "$neutral7")
  const panelBg = useColorModeValue("$neutral1", "$neutral3")
  return (
    <Box
      gridColumn="1 / -1"
      border="1px solid"
      borderColor={border()}
      rounded="$md"
      bgColor={panelBg()}
      p="$3"
    >
      <VStack spacing="$3" alignItems="stretch">
        <Text fontWeight="$semibold">
          {t(`subscription.telegram_pan_names.${props.panKey}`)}
        </Text>
        <FormField label={t("subscription.channels")}>
          <Textarea
            rows={3}
            value={joinLines(props.value.channels)}
            onInput={(e) =>
              props.onChange("channels", splitLines(e.currentTarget.value))
            }
          />
        </FormField>
        <Show when={props.panKey === "aliyun_drive"}>
          <Box
            display="grid"
            gap="$3"
            gridTemplateColumns={{
              "@initial": "1fr",
              "@md": "minmax(0, 2fr) minmax(0, 1fr)",
            }}
          >
            <FormField label={t("subscription.aliyun_web_refresh_token")}>
              <Textarea
                rows={3}
                value={props.value.refresh_token || ""}
                onInput={(e) =>
                  props.onChange("refresh_token", e.currentTarget.value)
                }
              />
            </FormField>
            <FormField label={t("subscription.aliyun_drive_id")}>
              <Input
                value={props.value.drive_id || ""}
                onInput={(e) =>
                  props.onChange("drive_id", e.currentTarget.value)
                }
              />
            </FormField>
          </Box>
        </Show>
        <Box
          display="grid"
          gap="$3"
          gridTemplateColumns={{
            "@initial": "1fr",
            "@md": "minmax(0, 1fr) auto",
          }}
          alignItems="end"
        >
          <FormField label={t("subscription.temp_transfer_root")}>
            <Input
              value={props.value.temp_transfer_root}
              onInput={(e) =>
                props.onChange("temp_transfer_root", e.currentTarget.value)
              }
            />
          </FormField>
          <FormControl display="flex" flexDirection="column">
            <FormLabel>{t("subscription.source_cleanup")}</FormLabel>
            <HopeSwitch
              checked={props.value.delete_source_after}
              onChange={(e: { currentTarget: HTMLInputElement }) =>
                props.onChange("delete_source_after", e.currentTarget.checked)
              }
            >
              {t("subscription.delete_source_after")}
            </HopeSwitch>
          </FormControl>
        </Box>
      </VStack>
    </Box>
  )
}

const fillConfig = (config: SubscriptionConfig): SubscriptionConfig => {
  const {
    default_check_interval_minutes,
    default_transfer_enabled,
    default_media_type,
    default_category,
    ...rest
  } = config
  return {
    ...defaultConfig(),
    ...rest,
    telegram: fillTelegramConfig(config.telegram),
    pansou: {
      ...emptyPanSouConfig,
      ...(config.pansou || {}),
    },
  }
}
