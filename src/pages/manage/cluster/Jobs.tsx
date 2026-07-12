import {
  Box,
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
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
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  createDisclosure,
} from "@hope-ui/solid"
import { AiOutlineDelete, AiOutlineReload } from "solid-icons/ai"
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { useFetch, useListFetch, useManageTitle, useT } from "~/hooks"
import { ClusterJob, ClusterJobStatus, ClusterUploadManifest } from "~/types"
import {
  clusterClearFailedJobs,
  clusterListJobs,
  clusterListResults,
  clusterRetryJob,
  handleResp,
  notify,
} from "~/utils"
import {
  EmptyBlock,
  JobStatusBadge,
  LoadingBlock,
  Metric,
  PageHeader,
  Panel,
  ResultStatusBadge,
} from "./components"
import {
  activeJobStatuses,
  childrenByParent,
  failedJobStatuses,
  formatBytes,
  formatDate,
  jobSearchText,
  parseTaskContext,
  retryableJobStatuses,
  shortID,
} from "./helpers"

type StatusFilter = "all" | ClusterJobStatus

const pollInterval = 5000
const statuses: ClusterJobStatus[] = [
  "queued",
  "planning",
  "leased",
  "running",
  "retry_wait",
  "partial_failed",
  "cancel_requested",
  "succeeded",
  "failed",
  "cancelled",
  "dead_letter",
]

const Jobs = () => {
  const t = useT()
  useManageTitle("cluster.jobs.title")
  const details = createDisclosure()
  const [jobs, setJobs] = createSignal<ClusterJob[]>([])
  const [results, setResults] = createSignal<ClusterUploadManifest[]>([])
  const [selectedJob, setSelectedJob] = createSignal<ClusterJob>()
  const [status, setStatus] = createSignal<StatusFilter>("all")
  const [keyword, setKeyword] = createSignal("")
  const [autoRefresh, setAutoRefresh] = createSignal(true)
  const [includeArchived, setIncludeArchived] = createSignal(false)
  const selectedStatus = () => {
    const value = status()
    return value === "all" ? undefined : value
  }
  const [loading, loadJobs] = useFetch(
    () =>
      clusterListJobs({
        status: selectedStatus(),
        include_archived: includeArchived(),
        limit: 500,
      }),
    true,
  )
  const [resultsLoading, loadResults] = useFetch(
    () => clusterListResults(50),
    true,
  )
  const [retryingID, retryJob] = useListFetch(clusterRetryJob)
  const [clearing, clearFailed] = useFetch(clusterClearFailedJobs)

  const refresh = async () => {
    const [jobResp, resultResp] = await Promise.all([loadJobs(), loadResults()])
    handleResp(jobResp, setJobs)
    handleResp(resultResp, setResults)
  }

  onMount(() => {
    void refresh()
    const interval = window.setInterval(() => {
      if (autoRefresh()) void refresh()
    }, pollInterval)
    onCleanup(() => window.clearInterval(interval))
  })

  const retry = async (job: ClusterJob) => {
    const resp = await retryJob(job.id)
    handleResp(resp, () => {
      notify.success(t("cluster.notifications.job_requeued"))
      void refresh()
    })
  }

  const archiveFailed = async () => {
    if (!window.confirm(t("cluster.confirm.clear_failed_jobs"))) return
    const resp = await clearFailed()
    handleResp(resp, (data) => {
      notify.success(
        t("cluster.notifications.failed_jobs_cleared", {
          count: data.archived,
        }),
      )
      void refresh()
    })
  }

  const filteredJobs = createMemo(() => {
    const query = keyword().trim().toLowerCase()
    return jobs().filter((job) => !query || jobSearchText(job).includes(query))
  })

  const groupedChildren = createMemo(() => childrenByParent(filteredJobs()))
  const visibleJobs = createMemo(() => {
    const source = filteredJobs()
    const byID = new Set(source.map((job) => job.id))
    const output: Array<{ job: ClusterJob; depth: number }> = []
    for (const job of source) {
      if (job.parent_job_id && byID.has(job.parent_job_id)) continue
      output.push({ job, depth: 0 })
      for (const child of groupedChildren()[job.id] || []) {
        output.push({ job: child, depth: 1 })
      }
    }
    return output
  })

  const context = createMemo(() => parseTaskContext(selectedJob()))
  const activeCount = createMemo(
    () => jobs().filter((job) => activeJobStatuses.includes(job.status)).length,
  )
  const failureCount = createMemo(
    () => jobs().filter((job) => failedJobStatuses.includes(job.status)).length,
  )
  const successCount = createMemo(
    () => jobs().filter((job) => job.status === "succeeded").length,
  )
  const queuedBytes = createMemo(() =>
    jobs()
      .filter((job) => activeJobStatuses.includes(job.status))
      .reduce((total, job) => total + job.expected_bytes, 0),
  )

  const openDetails = (job: ClusterJob) => {
    setSelectedJob(job)
    details.onOpen()
  }

  const DetailField = (props: {
    labelKey: string
    value?: string | number | null
    mono?: boolean
  }) => (
    <Box minW="0">
      <Text size="xs" color="$neutral11">
        {t(props.labelKey)}
      </Text>
      <Text
        size="sm"
        mt="$1"
        fontFamily={props.mono ? "$mono" : undefined}
        css={{ overflowWrap: "anywhere" }}
      >
        {props.value === undefined || props.value === null || props.value === ""
          ? "-"
          : props.value}
      </Text>
    </Box>
  )

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4" pb="$6">
      <PageHeader
        titleKey="cluster.jobs.title"
        descriptionKey="cluster.jobs.description"
        actions={
          <HStack spacing="$2" flexWrap="wrap">
            <Button
              leftIcon={<AiOutlineReload />}
              variant="outline"
              loading={loading()}
              onClick={refresh}
            >
              {t("cluster.actions.refresh")}
            </Button>
            <Button
              leftIcon={<AiOutlineDelete />}
              colorScheme="danger"
              variant="outline"
              loading={clearing()}
              disabled={failureCount() === 0}
              onClick={archiveFailed}
            >
              {t("cluster.actions.clear_failed")}
            </Button>
          </HStack>
        }
      />

      <SimpleGrid columns={{ "@initial": 2, "@lg": 4 }} gap="$3">
        <Metric
          labelKey="cluster.metrics.active_jobs"
          value={activeCount()}
          tone="info"
        />
        <Metric
          labelKey="cluster.metrics.failed_jobs"
          value={failureCount()}
          tone={failureCount() ? "danger" : "neutral"}
        />
        <Metric
          labelKey="cluster.metrics.succeeded_jobs"
          value={successCount()}
          tone="success"
        />
        <Metric
          labelKey="cluster.metrics.queued_bytes"
          value={formatBytes(queuedBytes())}
        />
      </SimpleGrid>

      <HStack
        alignItems={{ "@initial": "stretch", "@md": "center" }}
        flexDirection={{ "@initial": "column", "@md": "row" }}
        spacing="$3"
      >
        <Input
          value={keyword()}
          onInput={(event) => setKeyword(event.currentTarget.value)}
          placeholder={t("cluster.filters.keyword")}
          maxW={{ "@initial": "$full", "@md": "24rem" }}
        />
        <Select
          value={status()}
          onChange={(value) => {
            setStatus(value as StatusFilter)
            void refresh()
          }}
        >
          <SelectTrigger w={{ "@initial": "$full", "@md": "12rem" }}>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <SelectOption value="all">
                <SelectOptionText>
                  {t("cluster.filters.all_statuses")}
                </SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <For each={statuses}>
                {(value) => (
                  <SelectOption value={value}>
                    <SelectOptionText>
                      {t(`cluster.job_status.${value}`)}
                    </SelectOptionText>
                    <SelectOptionIndicator />
                  </SelectOption>
                )}
              </For>
            </SelectListbox>
          </SelectContent>
        </Select>
        <Checkbox
          checked={includeArchived()}
          onChange={(event) => {
            setIncludeArchived(event.currentTarget.checked)
            void refresh()
          }}
        >
          {t("cluster.filters.include_archived")}
        </Checkbox>
        <Checkbox
          checked={autoRefresh()}
          onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
        >
          {t("cluster.filters.auto_refresh")}
        </Checkbox>
      </HStack>

      <Panel>
        <Show when={!loading()} fallback={<LoadingBlock />}>
          <Show
            when={visibleJobs().length > 0}
            fallback={
              <EmptyBlock
                titleKey="cluster.empty.jobs"
                descriptionKey="cluster.empty.jobs_description"
              />
            }
          >
            <Box overflowX="auto">
              <Table minW="72rem" dense>
                <Thead>
                  <Tr>
                    <Th>{t("cluster.fields.job")}</Th>
                    <Th>{t("cluster.fields.type")}</Th>
                    <Th>{t("cluster.fields.media")}</Th>
                    <Th>{t("cluster.fields.worker")}</Th>
                    <Th>{t("cluster.fields.size")}</Th>
                    <Th>{t("cluster.fields.status")}</Th>
                    <Th>{t("cluster.fields.updated_at")}</Th>
                    <Th textAlign="right">{t("cluster.fields.actions")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={visibleJobs()}>
                    {({ job, depth }) => (
                      <Tr>
                        <Td>
                          <HStack pl={depth ? "$5" : "$0"} spacing="$2">
                            <Show when={depth}>
                              <Text color="$neutral9">↳</Text>
                            </Show>
                            <Box minW="0">
                              <Text fontFamily="$mono" size="sm" title={job.id}>
                                {shortID(job.id)}
                              </Text>
                              <Show when={job.expected_items > 0}>
                                <Text size="xs" color="$neutral11">
                                  {t("cluster.jobs.child_count", {
                                    count: job.expected_items,
                                  })}
                                </Text>
                              </Show>
                            </Box>
                          </HStack>
                        </Td>
                        <Td>{t(`cluster.job_type.${job.type}`)}</Td>
                        <Td>
                          <Text size="sm" noOfLines={1}>
                            {job.media_item_id || "-"}
                          </Text>
                          <Text size="xs" color="$neutral11">
                            {job.source_provider || "-"}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontFamily="$mono" size="sm">
                            {shortID(job.assigned_node_id)}
                          </Text>
                        </Td>
                        <Td css={{ whiteSpace: "nowrap" }}>
                          {formatBytes(job.expected_bytes)}
                        </Td>
                        <Td>
                          <JobStatusBadge status={job.status} />
                        </Td>
                        <Td css={{ whiteSpace: "nowrap" }}>
                          {formatDate(job.updated_at)}
                        </Td>
                        <Td>
                          <HStack justifyContent="flex-end" spacing="$2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetails(job)}
                            >
                              {t("cluster.actions.view_details")}
                            </Button>
                            <Show
                              when={retryableJobStatuses.includes(job.status)}
                            >
                              <Button
                                size="sm"
                                colorScheme="info"
                                variant="outline"
                                loading={retryingID() === job.id}
                                onClick={() => retry(job)}
                              >
                                {t("cluster.actions.retry_job")}
                              </Button>
                            </Show>
                          </HStack>
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>
          </Show>
        </Show>
      </Panel>

      <Panel titleKey="cluster.results.title">
        <Show when={!resultsLoading()} fallback={<LoadingBlock />}>
          <Show
            when={results().length > 0}
            fallback={
              <EmptyBlock
                titleKey="cluster.empty.results"
                descriptionKey="cluster.empty.results_description"
              />
            }
          >
            <Box overflowX="auto">
              <Table minW="58rem" dense>
                <Thead>
                  <Tr>
                    <Th>{t("cluster.fields.file")}</Th>
                    <Th>{t("cluster.fields.worker")}</Th>
                    <Th>{t("cluster.fields.media")}</Th>
                    <Th>{t("cluster.fields.size")}</Th>
                    <Th>{t("cluster.fields.sha256")}</Th>
                    <Th>{t("cluster.fields.status")}</Th>
                    <Th>{t("cluster.fields.received_at")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={results()}>
                    {(result) => (
                      <Tr>
                        <Td>
                          <Text maxW="20rem" noOfLines={1} title={result.name}>
                            {result.name}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontFamily="$mono" size="sm">
                            {shortID(result.node_id)}
                          </Text>
                        </Td>
                        <Td>
                          {result.season > 0
                            ? `S${String(result.season).padStart(2, "0")}E${String(result.episode).padStart(2, "0")}`
                            : t(`cluster.media_type.${result.media_type}`)}
                        </Td>
                        <Td>{formatBytes(result.size)}</Td>
                        <Td>
                          <Text
                            fontFamily="$mono"
                            size="xs"
                            title={result.sha256}
                          >
                            {shortID(result.sha256)}
                          </Text>
                        </Td>
                        <Td>
                          <ResultStatusBadge status={result.status} />
                        </Td>
                        <Td css={{ whiteSpace: "nowrap" }}>
                          {formatDate(result.received_at)}
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>
          </Show>
        </Show>
      </Panel>

      <Drawer
        opened={details.isOpen()}
        placement="right"
        size="lg"
        onClose={details.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{t("cluster.job_details.title")}</DrawerHeader>
          <DrawerBody pb="$6">
            <Show when={selectedJob()} keyed>
              {(job) => (
                <VStack alignItems="stretch" spacing="$5">
                  <HStack justifyContent="space-between">
                    <Text fontFamily="$mono" size="sm">
                      {job.id}
                    </Text>
                    <JobStatusBadge status={job.status} />
                  </HStack>
                  <SimpleGrid columns={{ "@initial": 1, "@sm": 2 }} gap="$4">
                    <DetailField
                      labelKey="cluster.fields.type"
                      value={t(`cluster.job_type.${job.type}`)}
                    />
                    <DetailField
                      labelKey="cluster.fields.worker"
                      value={job.assigned_node_id}
                      mono
                    />
                    <DetailField
                      labelKey="cluster.fields.attempt"
                      value={job.current_attempt_id}
                      mono
                    />
                    <DetailField
                      labelKey="cluster.fields.generation"
                      value={job.current_generation}
                    />
                    <DetailField
                      labelKey="cluster.fields.parent_job"
                      value={job.parent_job_id}
                      mono
                    />
                    <DetailField
                      labelKey="cluster.fields.media_item"
                      value={job.media_item_id}
                      mono
                    />
                    <DetailField
                      labelKey="cluster.fields.expected_bytes"
                      value={formatBytes(job.expected_bytes)}
                    />
                    <DetailField
                      labelKey="cluster.fields.workflow_version"
                      value={job.workflow_version}
                    />
                    <DetailField
                      labelKey="cluster.fields.started_at"
                      value={formatDate(job.started_at)}
                    />
                    <DetailField
                      labelKey="cluster.fields.finished_at"
                      value={formatDate(job.finished_at)}
                    />
                    <DetailField
                      labelKey="cluster.fields.notification_status"
                      value={t(
                        `cluster.notification_status.${job.notification_status}`,
                      )}
                    />
                    <DetailField
                      labelKey="cluster.fields.cleanup_status"
                      value={t(
                        `cluster.cleanup_status.${job.worker_cleanup_status}`,
                      )}
                    />
                  </SimpleGrid>

                  <Show when={job.last_error || job.last_error_code}>
                    <Box bg="$danger2" borderRadius="$md" p="$4">
                      <Text fontWeight="$semibold" color="$danger11">
                        {t("cluster.job_details.error")}
                      </Text>
                      <Text
                        mt="$2"
                        size="sm"
                        fontFamily="$mono"
                        css={{ overflowWrap: "anywhere" }}
                      >
                        {job.last_error_code || "-"}
                      </Text>
                      <Text
                        mt="$2"
                        size="sm"
                        css={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {job.last_error || "-"}
                      </Text>
                    </Box>
                  </Show>

                  <Panel titleKey="cluster.job_details.task_context">
                    <Show
                      when={context()}
                      fallback={
                        <Box p="$4">
                          <Text size="sm" color="$neutral11">
                            {t("cluster.job_details.invalid_context")}
                          </Text>
                        </Box>
                      }
                    >
                      {(resolved) => (
                        <VStack p="$4" alignItems="stretch" spacing="$4">
                          <SimpleGrid
                            columns={{ "@initial": 1, "@sm": 2 }}
                            gap="$4"
                          >
                            <DetailField
                              labelKey="cluster.fields.subscription"
                              value={resolved().subscription.subscription_name}
                            />
                            <DetailField
                              labelKey="cluster.fields.source_message"
                              value={resolved().subscription.source_message_id}
                              mono
                            />
                            <DetailField
                              labelKey="cluster.fields.share_provider"
                              value={resolved().share.provider}
                            />
                            <DetailField
                              labelKey="cluster.fields.share_url"
                              value={resolved().share.url}
                              mono
                            />
                            <DetailField
                              labelKey="cluster.fields.media_type"
                              value={resolved().media.media_type}
                            />
                            <DetailField
                              labelKey="cluster.fields.season_episode"
                              value={
                                resolved().media.season > 0
                                  ? `S${resolved().media.season}E${resolved().media.episode}`
                                  : "-"
                              }
                            />
                            <DetailField
                              labelKey="cluster.fields.logical_target"
                              value={resolved().media.logical_target_path}
                              mono
                            />
                            <DetailField
                              labelKey="cluster.fields.target_profile"
                              value={resolved().target_profile}
                              mono
                            />
                          </SimpleGrid>
                          <Box>
                            <Text size="xs" color="$neutral11" mb="$2">
                              {t("cluster.fields.source_objects")}
                            </Text>
                            <For each={resolved().source_objects}>
                              {(object) => (
                                <HStack
                                  py="$2"
                                  justifyContent="space-between"
                                  alignItems="flex-start"
                                >
                                  <Box minW="0">
                                    <Text
                                      size="sm"
                                      fontFamily="$mono"
                                      css={{ overflowWrap: "anywhere" }}
                                    >
                                      {object.source_relative_path}
                                    </Text>
                                    <Text size="xs" color="$neutral11">
                                      {object.provider}
                                    </Text>
                                  </Box>
                                  <Text
                                    size="sm"
                                    css={{ whiteSpace: "nowrap" }}
                                  >
                                    {formatBytes(object.size)}
                                  </Text>
                                </HStack>
                              )}
                            </For>
                          </Box>
                        </VStack>
                      )}
                    </Show>
                  </Panel>
                </VStack>
              )}
            </Show>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </VStack>
  )
}

export default Jobs
