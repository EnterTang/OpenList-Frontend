import {
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  HStack,
  Input,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
} from "@hope-ui/solid"
import { AiOutlineReload } from "solid-icons/ai"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { useFetch, useT, useTitle } from "~/hooks"
import { getSetting } from "~/store"
import {
  Subscription,
  SubscriptionRun,
  SubscriptionSourceType,
  SubscriptionStatus,
} from "~/types"
import { handleResp, subscriptionList, subscriptionRuns } from "~/utils"

const statusColor: Record<
  SubscriptionStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  idle: "neutral",
  running: "info",
  success: "success",
  failed: "danger",
}

const statusAccent: Record<SubscriptionStatus, string> = {
  idle: "$neutral9",
  running: "$info9",
  success: "$success9",
  failed: "$danger9",
}

const statuses: SubscriptionStatus[] = ["running", "failed", "success", "idle"]
const sources: SubscriptionSourceType[] = ["manual", "telegram", "pansou"]
type StatusFilter = "all" | SubscriptionStatus
type SourceFilter = "all" | SubscriptionSourceType

const TransferTasks = (props: {
  titleKey?: string
  titleMode?: "manage" | "site"
}) => {
  const t = useT()
  const border = useColorModeValue("$neutral5", "$neutral7")
  const panelBg = useColorModeValue("white", "$neutral3")
  const mutedBg = useColorModeValue("$neutral2", "$neutral4")
  const chartBg = useColorModeValue("$neutral4", "$neutral6")
  const failureBg = useColorModeValue("$danger2", "$neutral3")
  const [subscriptions, setSubscriptions] = createSignal<Subscription[]>([])
  const [runs, setRuns] = createSignal<SubscriptionRun[]>([])
  const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("all")
  const [sourceFilter, setSourceFilter] = createSignal<SourceFilter>("all")
  const [keyword, setKeyword] = createSignal("")
  const [subsLoading, loadSubscriptions] = useFetch(() =>
    subscriptionList({ page: 1, per_page: 0 }),
  )
  const [runsLoading, loadRuns] = useFetch(() =>
    subscriptionRuns({ page: 1, per_page: 30 }),
  )
  useTitle(
    () =>
      `${t(props.titleKey || "manage.sidemenu.transfer_tasks")} | ${
        props.titleMode === "site"
          ? getSetting("site_title")
          : t("manage.title")
      }`,
  )

  const refresh = async () => {
    const subsResp = await loadSubscriptions()
    handleResp(subsResp, (data) => setSubscriptions(data.content || []))
    const runsResp = await loadRuns()
    handleResp(runsResp, (data) => setRuns(data.content || []))
  }

  const subscriptionName = (id: number) =>
    subscriptions().find((item) => item.id === id)?.name || `#${id}`
  const subscriptionByID = createMemo(() => {
    const map: Record<number, Subscription> = {}
    subscriptions().forEach((item) => {
      map[item.id] = item
    })
    return map
  })

  const keywordMatched = (subscription?: Subscription) => {
    const value = keyword().trim().toLowerCase()
    if (!value) return true
    return [
      subscription?.name,
      subscription?.tmdb_name,
      subscription?.target_root,
      subscription?.category,
      subscription?.source_type,
    ]
      .filter(Boolean)
      .some((item) => String(item).toLowerCase().includes(value))
  }

  const sourceMatched = (subscription?: Subscription) =>
    sourceFilter() === "all" || subscription?.source_type === sourceFilter()

  const statusMatched = (status?: SubscriptionStatus) =>
    statusFilter() === "all" || status === statusFilter()

  const filteredSubscriptions = createMemo(() =>
    subscriptions().filter(
      (item) =>
        keywordMatched(item) &&
        sourceMatched(item) &&
        statusMatched(item.last_status || "idle"),
    ),
  )

  const filteredRuns = createMemo(() =>
    runs().filter((run) => {
      const subscription = subscriptionByID()[run.subscription_id]
      return (
        keywordMatched(subscription) &&
        sourceMatched(subscription) &&
        statusMatched(run.status)
      )
    }),
  )

  const failedRuns = createMemo(() =>
    filteredRuns()
      .filter((run) => run.status === "failed" || run.error)
      .slice(0, 6),
  )

  const statusStats = createMemo(() =>
    statuses.map((status) => ({
      status,
      subscriptions: filteredSubscriptions().filter(
        (item) => (item.last_status || "idle") === status,
      ).length,
      runs: filteredRuns().filter((run) => run.status === status).length,
    })),
  )

  const sourceStats = createMemo(() =>
    sources.map((source) => ({
      source,
      count: filteredSubscriptions().filter(
        (item) => item.source_type === source,
      ).length,
    })),
  )

  const runTotals = createMemo(() =>
    filteredRuns().reduce(
      (acc, run) => ({
        added: acc.added + run.added_count,
        changed: acc.changed + run.changed_count,
        transferred: acc.transferred + run.transferred_count,
      }),
      { added: 0, changed: 0, transferred: 0 },
    ),
  )

  const statusTotal = createMemo(
    () =>
      statusStats().reduce(
        (acc, item) => acc + item.subscriptions + item.runs,
        0,
      ) || 1,
  )

  const formatDate = (value?: string) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  const durationLabel = (run: SubscriptionRun) => {
    if (!run.finished_at) return "-"
    const started = new Date(run.started_at).getTime()
    const finished = new Date(run.finished_at).getTime()
    if (Number.isNaN(started) || Number.isNaN(finished) || finished < started) {
      return "-"
    }
    const seconds = Math.round((finished - started) / 1000)
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const StatusBadge = (props: { status: SubscriptionStatus }) => (
    <Badge colorScheme={statusColor[props.status]}>
      {t(`subscription.statuses.${props.status}`)}
    </Badge>
  )

  const FilterButton = (props: {
    active: boolean
    onClick: () => void
    children: any
  }) => (
    <Button
      size="sm"
      variant={props.active ? "solid" : "subtle"}
      colorScheme={props.active ? "accent" : "neutral"}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  )

  const hasActiveWork = createMemo(
    () =>
      subscriptions().some((item) => item.last_status === "running") ||
      runs().some((run) => run.status === "running"),
  )

  onMount(refresh)

  createEffect(() => {
    if (!hasActiveWork()) return
    const interval = setInterval(refresh, 5000)
    onCleanup(() => clearInterval(interval))
  })

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4">
      <Box
        w="$full"
        bgColor={panelBg()}
        border="1px solid"
        borderColor={border()}
        rounded="$lg"
        p={{ "@initial": "$3", "@md": "$4" }}
      >
        <VStack spacing="$5" alignItems="stretch">
          <HStack justifyContent="space-between" gap="$2" flexWrap="wrap">
            <Box>
              <Text fontWeight="$semibold" fontSize="$xl">
                {t("subscription.transfer_tasks_overview")}
              </Text>
              <Text color="$neutral11" fontSize="$sm">
                {t("subscription.task_board_description")}
              </Text>
            </Box>
            <Button
              leftIcon={<AiOutlineReload />}
              loading={subsLoading() || runsLoading()}
              onClick={refresh}
            >
              {t("global.refresh")}
            </Button>
          </HStack>

          <SimpleGrid columns={{ "@initial": 1, "@md": 2, "@xl": 4 }} gap="$3">
            <MetricCard
              label={t("subscription.board_total_subscriptions")}
              value={filteredSubscriptions().length}
              detail={`${subscriptions().length} ${t(
                "subscription.board_total_loaded",
              )}`}
              bgColor={mutedBg()}
            />
            <MetricCard
              label={t("subscription.board_recent_runs")}
              value={filteredRuns().length}
              detail={`${runs().length} ${t("subscription.board_recent_loaded")}`}
              bgColor={mutedBg()}
            />
            <MetricCard
              label={t("subscription.board_failed_runs")}
              value={failedRuns().length}
              detail={t("subscription.board_failed_runs_hint")}
              tone="danger"
              bgColor={mutedBg()}
              onClick={() =>
                setStatusFilter((current) =>
                  current === "failed" ? "all" : "failed",
                )
              }
              active={statusFilter() === "failed"}
            />
            <MetricCard
              label={t("subscription.board_transferred")}
              value={runTotals().transferred}
              detail={`${t("subscription.run_added")}: ${
                runTotals().added
              } · ${t("subscription.run_changed")}: ${runTotals().changed}`}
              bgColor={mutedBg()}
            />
          </SimpleGrid>

          <VStack
            alignItems="stretch"
            spacing="$3"
            bgColor={mutedBg()}
            rounded="$md"
            p="$3"
          >
            <HStack gap="$2" flexWrap="wrap">
              <Text fontWeight="$semibold" minW="5rem">
                {t("subscription.board_status_filter")}
              </Text>
              <FilterButton
                active={statusFilter() === "all"}
                onClick={() => setStatusFilter("all")}
              >
                {t("subscription.all")}
              </FilterButton>
              <For each={statuses}>
                {(status) => (
                  <FilterButton
                    active={statusFilter() === status}
                    onClick={() => setStatusFilter(status)}
                  >
                    {t(`subscription.statuses.${status}`)}
                  </FilterButton>
                )}
              </For>
            </HStack>
            <HStack gap="$2" flexWrap="wrap">
              <Text fontWeight="$semibold" minW="5rem">
                {t("subscription.board_source_filter")}
              </Text>
              <FilterButton
                active={sourceFilter() === "all"}
                onClick={() => setSourceFilter("all")}
              >
                {t("subscription.all")}
              </FilterButton>
              <For each={sources}>
                {(source) => (
                  <FilterButton
                    active={sourceFilter() === source}
                    onClick={() => setSourceFilter(source)}
                  >
                    {t(`subscription.source_types.${source}`)}
                  </FilterButton>
                )}
              </For>
              <Input
                maxW={{ "@initial": "$full", "@md": "18rem" }}
                placeholder={t("subscription.board_keyword_placeholder")}
                value={keyword()}
                onInput={(e: any) => setKeyword(e.currentTarget.value)}
              />
            </HStack>
          </VStack>

          <Grid
            gap="$3"
            templateColumns={{ "@initial": "1fr", "@xl": "1.15fr 0.85fr" }}
          >
            <VStack
              alignItems="stretch"
              spacing="$3"
              border="1px solid"
              borderColor={border()}
              rounded="$md"
              p="$3"
            >
              <HStack justifyContent="space-between" gap="$2" flexWrap="wrap">
                <Text fontWeight="$semibold">
                  {t("subscription.board_status_distribution")}
                </Text>
                <Text color="$neutral11" fontSize="$sm">
                  {t("subscription.board_status_legend")}
                </Text>
              </HStack>
              <For each={statusStats()}>
                {(item) => (
                  <StatusBar
                    label={t(`subscription.statuses.${item.status}`)}
                    color={statusAccent[item.status]}
                    subscriptions={item.subscriptions}
                    runs={item.runs}
                    total={statusTotal()}
                    bgColor={chartBg()}
                    active={statusFilter() === item.status}
                    onClick={() =>
                      setStatusFilter((current) =>
                        current === item.status ? "all" : item.status,
                      )
                    }
                  />
                )}
              </For>
            </VStack>
            <VStack
              alignItems="stretch"
              spacing="$3"
              border="1px solid"
              borderColor={border()}
              rounded="$md"
              p="$3"
            >
              <Text fontWeight="$semibold">
                {t("subscription.board_source_distribution")}
              </Text>
              <For each={sourceStats()}>
                {(item) => (
                  <StatusBar
                    label={t(`subscription.source_types.${item.source}`)}
                    color="$accent9"
                    subscriptions={item.count}
                    runs={0}
                    total={filteredSubscriptions().length || 1}
                    bgColor={chartBg()}
                    compact
                    active={sourceFilter() === item.source}
                    onClick={() =>
                      setSourceFilter((current) =>
                        current === item.source ? "all" : item.source,
                      )
                    }
                  />
                )}
              </For>
            </VStack>
          </Grid>

          <Show when={failedRuns().length > 0}>
            <VStack
              alignItems="stretch"
              spacing="$2"
              border="1px solid"
              borderColor="$danger6"
              bgColor={failureBg()}
              rounded="$md"
              p="$3"
            >
              <Text fontWeight="$semibold" color="$danger11">
                {t("subscription.board_failure_queue")}
              </Text>
              <For each={failedRuns()}>
                {(run) => (
                  <HStack
                    justifyContent="space-between"
                    alignItems="start"
                    gap="$3"
                    flexWrap="wrap"
                  >
                    <Box minW="12rem">
                      <Text fontWeight="$medium">
                        {subscriptionName(run.subscription_id)}
                      </Text>
                      <Text color="$neutral11" fontSize="$sm">
                        {formatDate(run.started_at)}
                      </Text>
                    </Box>
                    <Text
                      flex="1"
                      color="$danger11"
                      fontSize="$sm"
                      css={{ wordBreak: "break-word" }}
                    >
                      {run.error || "-"}
                    </Text>
                  </HStack>
                )}
              </For>
            </VStack>
          </Show>

          <Divider />

          <Text fontWeight="$semibold">
            {t("subscription.board_subscriptions_table")}
          </Text>
          <Box w="$full" overflowX="auto">
            <Table dense highlightOnHover>
              <Thead>
                <Tr>
                  <Th>{t("subscription.name")}</Th>
                  <Th>{t("subscription.source_type")}</Th>
                  <Th>{t("subscription.target_root")}</Th>
                  <Th>{t("subscription.last_status")}</Th>
                  <Th>{t("subscription.updated_at")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Show
                  when={filteredSubscriptions().length > 0}
                  fallback={
                    <Tr>
                      <Td colSpan={5}>
                        <Text color="$neutral11" textAlign="center" py="$4">
                          {t("subscription.board_empty_subscriptions")}
                        </Text>
                      </Td>
                    </Tr>
                  }
                >
                  <For each={filteredSubscriptions()}>
                    {(record) => (
                      <Tr>
                        <Td maxW="20rem">
                          <Text
                            fontWeight="$medium"
                            css={{ wordBreak: "break-all" }}
                          >
                            {record.name}
                          </Text>
                          <Text color="$neutral11" fontSize="$sm">
                            #{record.id}
                          </Text>
                        </Td>
                        <Td>
                          {t(`subscription.source_types.${record.source_type}`)}
                        </Td>
                        <Td maxW="20rem">
                          <Text css={{ wordBreak: "break-all" }}>
                            {record.target_root || "-"}
                          </Text>
                        </Td>
                        <Td>
                          <StatusBadge status={record.last_status || "idle"} />
                          <Show when={record.last_error}>
                            <Text
                              color="$danger11"
                              fontSize="$sm"
                              css={{ wordBreak: "break-all" }}
                            >
                              {record.last_error}
                            </Text>
                          </Show>
                        </Td>
                        <Td>{formatDate(record.updated_at)}</Td>
                      </Tr>
                    )}
                  </For>
                </Show>
              </Tbody>
            </Table>
          </Box>

          <Text fontWeight="$semibold">
            {t("subscription.board_runs_table")}
          </Text>
          <Box w="$full" overflowX="auto">
            <Table dense highlightOnHover>
              <Thead>
                <Tr>
                  <Th>{t("subscription.run_subscription")}</Th>
                  <Th>{t("subscription.last_status")}</Th>
                  <Th>{t("subscription.run_counts")}</Th>
                  <Th>{t("subscription.run_time")}</Th>
                  <Th>{t("subscription.board_duration")}</Th>
                  <Th>{t("tasks.attr.err")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Show
                  when={filteredRuns().length > 0}
                  fallback={
                    <Tr>
                      <Td colSpan={6}>
                        <Text color="$neutral11" textAlign="center" py="$4">
                          {t("subscription.board_empty_runs")}
                        </Text>
                      </Td>
                    </Tr>
                  }
                >
                  <For each={filteredRuns()}>
                    {(run) => (
                      <Tr>
                        <Td>{subscriptionName(run.subscription_id)}</Td>
                        <Td>
                          <StatusBadge status={run.status} />
                        </Td>
                        <Td>
                          {[
                            `${t("subscription.run_added")}: ${run.added_count}`,
                            `${t("subscription.run_changed")}: ${run.changed_count}`,
                            `${t("subscription.run_transferred")}: ${run.transferred_count}`,
                          ].join(" · ")}
                        </Td>
                        <Td>
                          <Text>{formatDate(run.started_at)}</Text>
                          <Text color="$neutral11" fontSize="$sm">
                            {formatDate(run.finished_at)}
                          </Text>
                        </Td>
                        <Td>{durationLabel(run)}</Td>
                        <Td maxW="24rem">
                          <Text
                            color="$danger11"
                            css={{ wordBreak: "break-all" }}
                          >
                            {run.error || "-"}
                          </Text>
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Show>
              </Tbody>
            </Table>
          </Box>
        </VStack>
      </Box>
    </VStack>
  )
}

const MetricCard = (props: {
  label: string
  value: number
  detail: string
  bgColor: string
  tone?: "danger"
  onClick?: () => void
  active?: boolean
}) => (
  <Box
    as={props.onClick ? "button" : undefined}
    type={props.onClick ? "button" : undefined}
    bgColor={props.bgColor}
    rounded="$md"
    p="$3"
    onClick={props.onClick}
    border={props.active ? "2px solid" : "1px solid transparent"}
    borderColor={props.active ? "$accent8" : "transparent"}
    css={
      props.onClick
        ? {
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }
        : undefined
    }
  >
    <Text color="$neutral11" fontSize="$sm">
      {props.label}
    </Text>
    <Text
      fontSize="$3xl"
      fontWeight="$semibold"
      color={props.tone === "danger" ? "$danger11" : undefined}
      css={{ fontVariantNumeric: "tabular-nums" }}
    >
      {props.value}
    </Text>
    <Text color="$neutral11" fontSize="$sm">
      {props.detail}
    </Text>
  </Box>
)

const StatusBar = (props: {
  label: string
  color: string
  subscriptions: number
  runs: number
  total: number
  bgColor: string
  compact?: boolean
  active?: boolean
  onClick?: () => void
}) => {
  const count = () => props.subscriptions + props.runs
  const width = () =>
    `${Math.max(4, Math.round((count() / props.total) * 100))}%`
  return (
    <Box
      as={props.onClick ? "button" : undefined}
      type={props.onClick ? "button" : undefined}
      onClick={props.onClick}
      w="$full"
      textAlign="left"
      rounded="$sm"
      p="$1"
      border={props.active ? "1px solid" : "1px solid transparent"}
      borderColor={props.active ? "$accent8" : "transparent"}
      bgColor={props.active ? "$accent3" : "transparent"}
      css={props.onClick ? { cursor: "pointer" } : undefined}
    >
      <HStack justifyContent="space-between" mb="$1" gap="$2">
        <Text fontSize="$sm" fontWeight="$medium">
          {props.label}
        </Text>
        <Text
          color="$neutral11"
          fontSize="$sm"
          css={{ fontVariantNumeric: "tabular-nums" }}
        >
          <Show when={!props.compact} fallback={`${props.subscriptions}`}>
            {`${props.subscriptions} / ${props.runs}`}
          </Show>
        </Text>
      </HStack>
      <Box h="$2" bgColor={props.bgColor} rounded="$full" overflow="hidden">
        <Box h="$full" w={width()} bgColor={props.color} rounded="$full" />
      </Box>
    </Box>
  )
}

export default TransferTasks
