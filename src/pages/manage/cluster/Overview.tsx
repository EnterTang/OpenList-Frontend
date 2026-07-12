import {
  Box,
  Grid,
  HStack,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { ClusterJob, ClusterNode, ClusterUploadManifest } from "~/types"
import {
  clusterListJobs,
  clusterListNodes,
  clusterListResults,
  handleResp,
} from "~/utils"
import {
  EmptyBlock,
  JobStatusBadge,
  LoadingBlock,
  Metric,
  NodeStatusBadge,
  PageHeader,
  Panel,
  ResultStatusBadge,
} from "./components"
import {
  activeJobStatuses,
  failedJobStatuses,
  formatBytes,
  formatDate,
  shortID,
} from "./helpers"

const pollInterval = 10000

const Overview = () => {
  const t = useT()
  useManageTitle("cluster.overview.title")
  const [nodes, setNodes] = createSignal<ClusterNode[]>([])
  const [jobs, setJobs] = createSignal<ClusterJob[]>([])
  const [results, setResults] = createSignal<ClusterUploadManifest[]>([])
  const [nodesLoading, loadNodes] = useFetch(clusterListNodes, true)
  const [jobsLoading, loadJobs] = useFetch(
    () => clusterListJobs({ include_archived: false, limit: 200 }),
    true,
  )
  const [resultsLoading, loadResults] = useFetch(
    () => clusterListResults(12),
    true,
  )

  const refresh = async () => {
    const [nodeResp, jobResp, resultResp] = await Promise.all([
      loadNodes(),
      loadJobs(),
      loadResults(),
    ])
    handleResp(nodeResp, setNodes)
    handleResp(jobResp, setJobs)
    handleResp(resultResp, setResults)
  }

  onMount(() => {
    void refresh()
    const interval = window.setInterval(refresh, pollInterval)
    onCleanup(() => window.clearInterval(interval))
  })

  const onlineNodes = createMemo(
    () => nodes().filter((node) => node.status === "online").length,
  )
  const activeJobs = createMemo(
    () => jobs().filter((job) => activeJobStatuses.includes(job.status)).length,
  )
  const failedJobs = createMemo(
    () => jobs().filter((job) => failedJobStatuses.includes(job.status)).length,
  )
  const completedBytes = createMemo(() =>
    results().reduce((total, item) => total + item.size, 0),
  )
  const recentJobs = createMemo(() => jobs().slice(0, 8))

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4" pb="$6">
      <PageHeader
        titleKey="cluster.overview.title"
        descriptionKey="cluster.overview.description"
      />

      <SimpleGrid columns={{ "@initial": 2, "@lg": 4 }} gap="$3">
        <Metric
          labelKey="cluster.metrics.online_nodes"
          value={`${onlineNodes()}/${nodes().length}`}
          tone="success"
        />
        <Metric
          labelKey="cluster.metrics.active_jobs"
          value={activeJobs()}
          tone="info"
        />
        <Metric
          labelKey="cluster.metrics.failed_jobs"
          value={failedJobs()}
          tone={failedJobs() ? "danger" : "neutral"}
        />
        <Metric
          labelKey="cluster.metrics.result_bytes"
          value={formatBytes(completedBytes())}
        />
      </SimpleGrid>

      <Grid
        templateColumns={{
          "@initial": "1fr",
          "@xl": "minmax(0, 1.45fr) minmax(18rem, .55fr)",
        }}
        gap="$4"
      >
        <Panel titleKey="cluster.overview.recent_jobs">
          <Show when={!jobsLoading()} fallback={<LoadingBlock />}>
            <Show
              when={recentJobs().length > 0}
              fallback={
                <EmptyBlock
                  titleKey="cluster.empty.jobs"
                  descriptionKey="cluster.empty.jobs_description"
                />
              }
            >
              <Box overflowX="auto">
                <Table minW="44rem" dense>
                  <Thead>
                    <Tr>
                      <Th>{t("cluster.fields.job")}</Th>
                      <Th>{t("cluster.fields.type")}</Th>
                      <Th>{t("cluster.fields.worker")}</Th>
                      <Th>{t("cluster.fields.status")}</Th>
                      <Th>{t("cluster.fields.updated_at")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <For each={recentJobs()}>
                      {(job) => (
                        <Tr>
                          <Td>
                            <Text fontFamily="$mono" size="sm" title={job.id}>
                              {shortID(job.id)}
                            </Text>
                          </Td>
                          <Td>{t(`cluster.job_type.${job.type}`)}</Td>
                          <Td>
                            <Text fontFamily="$mono" size="sm">
                              {shortID(job.assigned_node_id)}
                            </Text>
                          </Td>
                          <Td>
                            <JobStatusBadge status={job.status} />
                          </Td>
                          <Td css={{ whiteSpace: "nowrap" }}>
                            {formatDate(job.updated_at)}
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

        <VStack alignItems="stretch" spacing="$4">
          <Panel titleKey="cluster.overview.nodes">
            <Show when={!nodesLoading()} fallback={<LoadingBlock />}>
              <Show
                when={nodes().length > 0}
                fallback={
                  <EmptyBlock
                    titleKey="cluster.empty.nodes"
                    descriptionKey="cluster.empty.nodes_description"
                  />
                }
              >
                <VStack alignItems="stretch" spacing="$0">
                  <For each={nodes().slice(0, 8)}>
                    {(node) => (
                      <HStack px="$4" py="$3" justifyContent="space-between">
                        <Box minW="0">
                          <Text fontWeight="$medium" noOfLines={1}>
                            {node.name || shortID(node.id)}
                          </Text>
                          <Text
                            size="xs"
                            color="$neutral11"
                            fontFamily="$mono"
                            noOfLines={1}
                          >
                            {shortID(node.id)}
                          </Text>
                        </Box>
                        <NodeStatusBadge status={node.status} />
                      </HStack>
                    )}
                  </For>
                </VStack>
              </Show>
            </Show>
          </Panel>

          <Panel titleKey="cluster.overview.latest_results">
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
                <VStack alignItems="stretch" spacing="$0">
                  <For each={results().slice(0, 5)}>
                    {(result) => (
                      <HStack
                        px="$4"
                        py="$3"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box minW="0">
                          <Text fontWeight="$medium" noOfLines={1}>
                            {result.name}
                          </Text>
                          <Text size="xs" color="$neutral11">
                            {formatBytes(result.size)} ·{" "}
                            {formatDate(result.received_at)}
                          </Text>
                        </Box>
                        <ResultStatusBadge status={result.status} />
                      </HStack>
                    )}
                  </For>
                </VStack>
              </Show>
            </Show>
          </Panel>
        </VStack>
      </Grid>
    </VStack>
  )
}

export default Overview
