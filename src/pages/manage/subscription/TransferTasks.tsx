import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
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
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  createDisclosure,
  useColorModeValue,
} from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import {
  AiOutlineDelete,
  AiOutlineReload,
  AiOutlineWarning,
} from "solid-icons/ai"
import { useFetch, useListFetch, useT, useTitle } from "~/hooks"
import { getSetting } from "~/store"
import {
  Subscription,
  SubscriptionBoard,
  SubscriptionRun,
  SubscriptionRunQuery,
  SubscriptionSourceType,
  SubscriptionStatus,
} from "~/types"
import {
  handleResp,
  notify,
  subscriptionBoard,
  subscriptionList,
  subscriptionRunDelete,
  subscriptionRuns,
  subscriptionRunsClearFailed,
} from "~/utils"

const statusColor: Record<
  SubscriptionStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  idle: "neutral",
  running: "info",
  success: "success",
  failed: "danger",
}

const statuses: SubscriptionStatus[] = ["running", "failed", "success", "idle"]
const sources: SubscriptionSourceType[] = ["manual", "telegram", "pansou"]

type StatusFilter = "all" | SubscriptionStatus
type SourceFilter = "all" | SubscriptionSourceType

const emptyBoard = (): SubscriptionBoard => ({
  subscription_count: 0,
  changed_run_count: 0,
  added_count: 0,
  changed_count: 0,
  failure_count: 0,
})

const TransferTasksTitle = (props: {
  titleKey?: string
  titleMode?: "manage" | "site"
}) => {
  const t = useT()
  useTitle(
    () =>
      `${t(props.titleKey || "manage.sidemenu.transfer_tasks")} | ${
        props.titleMode === "site"
          ? getSetting("site_title")
          : t("manage.title")
      }`,
  )
  return null
}

const TransferTasks = (props: {
  titleKey?: string
  titleMode?: "manage" | "site"
  embedded?: boolean
}) => {
  const t = useT()
  const failureDrawer = createDisclosure()
  const border = useColorModeValue("$neutral5", "$neutral7")
  const panelBg = useColorModeValue("white", "$neutral3")
  const mutedBg = useColorModeValue("$neutral2", "$neutral4")
  const failureBg = useColorModeValue("$danger1", "$neutral3")
  const [subscriptions, setSubscriptions] = createSignal<Subscription[]>([])
  const [board, setBoard] = createSignal<SubscriptionBoard>(emptyBoard())
  const [changeRuns, setChangeRuns] = createSignal<SubscriptionRun[]>([])
  const [failureRuns, setFailureRuns] = createSignal<SubscriptionRun[]>([])
  const [selectedSubscriptionID, setSelectedSubscriptionID] =
    createSignal("all")
  const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("all")
  const [sourceFilter, setSourceFilter] = createSignal<SourceFilter>("all")
  const [keyword, setKeyword] = createSignal("")
  const [isMobile, setIsMobile] = createSignal(false)
  const [subscriptionsLoading, loadSubscriptions] = useFetch(subscriptionList)
  const [boardLoading, loadBoard] = useFetch(subscriptionBoard)
  const [changesLoading, loadChanges] = useFetch(subscriptionRuns)
  const [failuresLoading, loadFailures] = useFetch(subscriptionRuns)
  const [deletingRunID, deleteRun] = useListFetch(subscriptionRunDelete)
  const [clearFailedLoading, clearFailedRuns] = useFetch(
    subscriptionRunsClearFailed,
  )
  let requestID = 0

  const query = createMemo<SubscriptionRunQuery>(() => {
    const next: SubscriptionRunQuery = {}
    const trimmedKeyword = keyword().trim()
    const subscriptionID = Number(selectedSubscriptionID())
    const source = sourceFilter()
    const status = statusFilter()
    if (selectedSubscriptionID() !== "all" && subscriptionID > 0) {
      next.subscription_id = subscriptionID
    }
    if (source !== "all") {
      next.source_type = source
    }
    if (status !== "all") {
      next.status = status
    }
    if (trimmedKeyword) {
      next.keyword = trimmedKeyword
    }
    return next
  })

  const refresh = async (currentQuery: SubscriptionRunQuery = query()) => {
    const currentRequestID = ++requestID
    const [subscriptionsResp, boardResp, changesResp, failuresResp] =
      await Promise.all([
        loadSubscriptions({
          source_type: currentQuery.source_type,
          page: 1,
          per_page: 0,
        }),
        loadBoard(currentQuery),
        loadChanges({
          ...currentQuery,
          view: "changes",
          page: 1,
          per_page: 30,
        }),
        loadFailures({
          ...currentQuery,
          view: "failures",
          page: 1,
          per_page: 8,
        }),
      ])

    if (currentRequestID !== requestID) return

    handleResp(subscriptionsResp, (data) =>
      setSubscriptions(data.content || []),
    )
    handleResp(boardResp, (data) => setBoard(data || emptyBoard()))
    handleResp(changesResp, (data) => setChangeRuns(data.content || []))
    handleResp(failuresResp, (data) => setFailureRuns(data.content || []))
  }

  const isRefreshing = createMemo(
    () =>
      subscriptionsLoading() ||
      boardLoading() ||
      changesLoading() ||
      failuresLoading(),
  )

  const hasActiveWork = createMemo(() =>
    subscriptions().some((item) => item.last_status === "running"),
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

  const deleteFailure = async (runID: number, onClose?: () => void) => {
    const resp = await deleteRun(runID)
    handleResp(resp, () => {
      notify.success(t("subscription.board_failure_cleared"))
      onClose?.()
      void refresh(query())
    })
  }

  const clearFailures = async (onClose?: () => void) => {
    const resp = await clearFailedRuns()
    handleResp(resp, () => {
      notify.success(t("subscription.board_failure_queue_cleared"))
      onClose?.()
      failureDrawer.onClose()
      void refresh(query())
    })
  }

  createEffect(() => {
    void refresh(query())
  })

  createEffect(() => {
    if (board().failure_count > 0) return
    failureDrawer.onClose()
  })

  createEffect(() => {
    if (!hasActiveWork()) return
    const interval = setInterval(() => {
      void refresh(query())
    }, 5000)
    onCleanup(() => clearInterval(interval))
  })

  onMount(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(media.matches)
    sync()
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync)
      onCleanup(() => media.removeEventListener("change", sync))
      return
    }
    media.addListener(sync)
    onCleanup(() => media.removeListener(sync))
  })

  return (
    <VStack
      w="$full"
      alignItems="stretch"
      spacing="$4"
      pb={board().failure_count > 0 ? "$20" : "$0"}
    >
      <Show when={!props.embedded}>
        <TransferTasksTitle
          titleKey={props.titleKey}
          titleMode={props.titleMode}
        />
      </Show>
      <Box
        w="$full"
        bgColor={panelBg()}
        border="1px solid"
        borderColor={border()}
        rounded="$lg"
        p={{ "@initial": "$3", "@md": "$4" }}
      >
        <VStack spacing="$4" alignItems="stretch">
          <HStack justifyContent="space-between" gap="$3" flexWrap="wrap">
            <Box>
              <Text fontWeight="$semibold" fontSize="$xl">
                {t("subscription.transfer_tasks_overview")}
              </Text>
            </Box>
            <Button
              leftIcon={<AiOutlineReload />}
              loading={isRefreshing()}
              onClick={() => void refresh(query())}
            >
              {t("global.refresh")}
            </Button>
          </HStack>

          <SimpleGrid columns={{ "@initial": 1, "@md": 2, "@xl": 4 }} gap="$3">
            <MetricCard
              label={t("subscription.board_total_subscriptions")}
              value={board().subscription_count}
              bgColor={mutedBg()}
            />
            <MetricCard
              label={t("subscription.board_changed_runs")}
              value={board().changed_run_count}
              bgColor={mutedBg()}
            />
            <MetricCard
              label={t("subscription.board_changed_files")}
              value={board().changed_count}
              bgColor={mutedBg()}
            />
            <MetricCard
              label={t("subscription.board_added_files")}
              value={board().added_count}
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
            <SimpleGrid
              columns={{ "@initial": 1, "@md": 2, "@xl": 4 }}
              gap="$3"
            >
              <FilterField label={t("subscription.board_subscription_filter")}>
                <Select
                  value={selectedSubscriptionID()}
                  onChange={(value) => setSelectedSubscriptionID(String(value))}
                >
                  <SelectTrigger borderRadius="$sm">
                    <SelectPlaceholder>
                      {t("subscription.board_subscription_filter")}
                    </SelectPlaceholder>
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <SelectOption value="all">
                        <SelectOptionText>
                          {t("subscription.all")}
                        </SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                      <For each={subscriptions()}>
                        {(subscription) => (
                          <SelectOption value={String(subscription.id)}>
                            <SelectOptionText>
                              {subscription.name}
                            </SelectOptionText>
                            <SelectOptionIndicator />
                          </SelectOption>
                        )}
                      </For>
                    </SelectListbox>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label={t("subscription.board_source_filter")}>
                <Select
                  value={sourceFilter()}
                  onChange={(value) => setSourceFilter(value as SourceFilter)}
                >
                  <SelectTrigger borderRadius="$sm">
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <SelectOption value="all">
                        <SelectOptionText>
                          {t("subscription.all")}
                        </SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                      <For each={sources}>
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
              </FilterField>

              <FilterField label={t("subscription.board_status_filter")}>
                <Select
                  value={statusFilter()}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger borderRadius="$sm">
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <SelectOption value="all">
                        <SelectOptionText>
                          {t("subscription.all")}
                        </SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                      <For each={statuses}>
                        {(status) => (
                          <SelectOption value={status}>
                            <SelectOptionText>
                              {t(`subscription.statuses.${status}`)}
                            </SelectOptionText>
                            <SelectOptionIndicator />
                          </SelectOption>
                        )}
                      </For>
                    </SelectListbox>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label={t("subscription.filter")}>
                <Input
                  borderRadius="$sm"
                  placeholder={t("subscription.board_keyword_placeholder")}
                  value={keyword()}
                  onInput={(event: any) =>
                    setKeyword(event.currentTarget.value)
                  }
                />
              </FilterField>
            </SimpleGrid>
          </VStack>

          <VStack alignItems="stretch" spacing="$3">
            <HStack justifyContent="space-between" gap="$2" flexWrap="wrap">
              <Text fontWeight="$semibold">
                {t("subscription.board_change_records")}
              </Text>
              <Text color="$neutral11" fontSize="$sm">
                {board().changed_run_count}
              </Text>
            </HStack>

            <Box w="$full" overflowX="auto">
              <Table dense highlightOnHover>
                <Thead>
                  <Tr>
                    <Th>{t("subscription.run_subscription")}</Th>
                    <Th>{t("subscription.source_type")}</Th>
                    <Th>{t("subscription.run_counts")}</Th>
                    <Th>{t("subscription.run_time")}</Th>
                    <Th>{t("subscription.board_duration")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Show
                    when={changeRuns().length > 0}
                    fallback={
                      <Tr>
                        <Td colSpan={5}>
                          <Text color="$neutral11" textAlign="center" py="$4">
                            {t("subscription.board_empty_runs")}
                          </Text>
                        </Td>
                      </Tr>
                    }
                  >
                    <For each={changeRuns()}>
                      {(run) => (
                        <Tr>
                          <Td maxW="20rem">
                            <Text
                              fontWeight="$medium"
                              css={{ wordBreak: "break-word" }}
                            >
                              {run.subscription_name ||
                                `#${run.subscription_id}`}
                            </Text>
                          </Td>
                          <Td>
                            {run.subscription_source_type ? (
                              <Badge colorScheme="neutral">
                                {t(
                                  `subscription.source_types.${run.subscription_source_type}`,
                                )}
                              </Badge>
                            ) : (
                              "-"
                            )}
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
                        </Tr>
                      )}
                    </For>
                  </Show>
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </VStack>
      </Box>

      <Show when={board().failure_count > 0}>
        <FailurePill
          count={board().failure_count}
          isMobile={isMobile()}
          drawerOpen={failureDrawer.isOpen()}
          onOpenDrawer={failureDrawer.onOpen}
          onCloseDrawer={failureDrawer.onClose}
          clearLoading={!!clearFailedLoading()}
          deletingRunID={deletingRunID()}
          failures={failureRuns()}
          failureBg={failureBg()}
          borderColor={border()}
          formatDate={formatDate}
          onDeleteFailure={deleteFailure}
          onClearFailures={clearFailures}
        />
      </Show>
    </VStack>
  )
}

const FilterField = (props: { label: string; children: any }) => (
  <VStack alignItems="stretch" spacing="$1">
    <Text color="$neutral11" fontSize="$sm">
      {props.label}
    </Text>
    {props.children}
  </VStack>
)

const MetricCard = (props: {
  label: string
  value: number
  bgColor: string
}) => (
  <Box bgColor={props.bgColor} rounded="$md" p="$3">
    <Text color="$neutral11" fontSize="$sm">
      {props.label}
    </Text>
    <Text
      fontSize="$3xl"
      fontWeight="$semibold"
      css={{ fontVariantNumeric: "tabular-nums" }}
    >
      {props.value}
    </Text>
  </Box>
)

const FailurePill = (props: {
  count: number
  isMobile: boolean
  drawerOpen: boolean
  onOpenDrawer: () => void
  onCloseDrawer: () => void
  clearLoading: boolean
  deletingRunID: number | undefined
  failures: SubscriptionRun[]
  failureBg: string
  borderColor: string
  formatDate: (value?: string) => string
  onDeleteFailure: (runID: number, onClose?: () => void) => Promise<void>
  onClearFailures: (onClose?: () => void) => Promise<void>
}) => {
  const t = useT()
  if (props.isMobile) {
    return (
      <>
        <Button
          size="sm"
          colorScheme="danger"
          leftIcon={<AiOutlineWarning />}
          pos="fixed"
          right="$4"
          bottom="$4"
          zIndex="$docked"
          rounded="$full"
          aria-label={t("subscription.board_open_failures_aria", {
            count: props.count,
          })}
          onClick={props.onOpenDrawer}
        >
          {props.count}
        </Button>
        <Drawer
          opened={props.drawerOpen}
          placement="bottom"
          onClose={props.onCloseDrawer}
        >
          <DrawerOverlay />
          <DrawerContent maxH="75vh">
            <DrawerCloseButton />
            <DrawerHeader>{t("subscription.board_failure_queue")}</DrawerHeader>
            <DrawerBody pb="$6">
              <FailureList
                count={props.count}
                clearLoading={props.clearLoading}
                deletingRunID={props.deletingRunID}
                failures={props.failures}
                failureBg={props.failureBg}
                borderColor={props.borderColor}
                formatDate={props.formatDate}
                onDeleteFailure={(runID) => props.onDeleteFailure(runID)}
                onClearFailures={() =>
                  props.onClearFailures(props.onCloseDrawer)
                }
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <Popover placement="top-end">
      {({ onClose }) => (
        <>
          <PopoverTrigger
            as={Button}
            size="sm"
            colorScheme="danger"
            leftIcon={<AiOutlineWarning />}
            pos="fixed"
            right="$6"
            bottom="$6"
            zIndex="$docked"
            rounded="$full"
            aria-label={t("subscription.board_open_failures_aria", {
              count: props.count,
            })}
          >
            {props.count}
          </PopoverTrigger>
          <PopoverContent
            w="min(24rem, calc(100vw - 2rem))"
            maxH="24rem"
            overflow="hidden"
          >
            <PopoverArrow />
            <PopoverBody p="$0">
              <FailureList
                count={props.count}
                clearLoading={props.clearLoading}
                deletingRunID={props.deletingRunID}
                failures={props.failures}
                failureBg={props.failureBg}
                borderColor={props.borderColor}
                formatDate={props.formatDate}
                onDeleteFailure={(runID) => props.onDeleteFailure(runID)}
                onClearFailures={() => props.onClearFailures(onClose)}
              />
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}

const FailureList = (props: {
  count: number
  clearLoading: boolean
  deletingRunID: number | undefined
  failures: SubscriptionRun[]
  failureBg: string
  borderColor: string
  formatDate: (value?: string) => string
  onDeleteFailure: (runID: number) => Promise<void>
  onClearFailures: () => Promise<void>
}) => {
  const t = useT()

  return (
    <VStack alignItems="stretch" spacing="$0" bgColor={props.failureBg}>
      <HStack
        justifyContent="space-between"
        alignItems="start"
        gap="$3"
        p="$3"
        borderBottom="1px solid"
        borderColor={props.borderColor}
      >
        <Box>
          <Text fontWeight="$semibold">
            {t("subscription.board_failure_queue")}
          </Text>
          <Text color="$neutral11" fontSize="$sm">
            {t("subscription.board_failure_count", { count: props.count })}
          </Text>
        </Box>
        <Button
          size="sm"
          variant="subtle"
          colorScheme="danger"
          leftIcon={<AiOutlineDelete />}
          loading={props.clearLoading}
          onClick={() => void props.onClearFailures()}
        >
          {t("subscription.board_clear_failures")}
        </Button>
      </HStack>

      <Show
        when={props.failures.length > 0}
        fallback={
          <Text color="$neutral11" fontSize="$sm" p="$3">
            {t("subscription.board_empty_failures")}
          </Text>
        }
      >
        <VStack alignItems="stretch" spacing="$0" maxH="20rem" overflowY="auto">
          <For each={props.failures}>
            {(run, index) => (
              <VStack
                alignItems="stretch"
                spacing="$2"
                p="$3"
                bgColor={props.failureBg}
                borderTop={index() > 0 ? "1px solid" : undefined}
                borderColor={index() > 0 ? props.borderColor : undefined}
              >
                <HStack
                  justifyContent="space-between"
                  alignItems="start"
                  gap="$3"
                >
                  <Box minW="0">
                    <Text
                      fontWeight="$medium"
                      css={{ wordBreak: "break-word" }}
                    >
                      {run.subscription_name || `#${run.subscription_id}`}
                    </Text>
                    <Text color="$neutral11" fontSize="$sm">
                      {props.formatDate(run.started_at)}
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="subtle"
                    colorScheme="danger"
                    loading={props.deletingRunID === run.id}
                    onClick={() => void props.onDeleteFailure(run.id)}
                  >
                    {t("subscription.board_clear_failure")}
                  </Button>
                </HStack>
                <HStack gap="$2" flexWrap="wrap">
                  <StatusBadge status={run.status} />
                  {run.subscription_source_type ? (
                    <Badge colorScheme="neutral">
                      {t(
                        `subscription.source_types.${run.subscription_source_type}`,
                      )}
                    </Badge>
                  ) : null}
                </HStack>
                <Text
                  color="$danger11"
                  fontSize="$sm"
                  css={{ wordBreak: "break-word" }}
                >
                  {run.error || "-"}
                </Text>
              </VStack>
            )}
          </For>
        </VStack>
      </Show>
    </VStack>
  )
}

const StatusBadge = (props: { status: SubscriptionStatus }) => {
  const t = useT()
  return (
    <Badge colorScheme={statusColor[props.status]}>
      {t(`subscription.statuses.${props.status}`)}
    </Badge>
  )
}

export default TransferTasks
