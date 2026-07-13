import {
  Box,
  Button,
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
import { AiOutlineReload } from "solid-icons/ai"
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { useFetch, useListFetch, useManageTitle, useT } from "~/hooks"
import { ClusterNode, ClusterNodeMutableState } from "~/types"
import {
  clusterListNodes,
  clusterQueryNodeInventory,
  clusterSetNodeState,
  handleResp,
  notify,
} from "~/utils"
import {
  EmptyBlock,
  LoadingBlock,
  Metric,
  NodeStatusBadge,
  PageHeader,
  Panel,
} from "./components"
import { formatDate, shortID } from "./helpers"

const pollInterval = 10000

const formatBytes = (value?: number) => {
  if (!value || value <= 0) return "-"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size >= 100 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`
}

const Nodes = () => {
  const t = useT()
  useManageTitle("cluster.nodes.title")
  const [nodes, setNodes] = createSignal<ClusterNode[]>([])
  const [loading, loadNodes] = useFetch(clusterListNodes, true)
  const [queryingID, queryInventory] = useListFetch(clusterQueryNodeInventory)
  const [changingID, changeState] = useListFetch(
    (nodeID: string, state: ClusterNodeMutableState) =>
      clusterSetNodeState(nodeID, state),
  )

  const refresh = async () => {
    const resp = await loadNodes()
    handleResp(resp, setNodes)
  }

  onMount(() => {
    void refresh()
    const interval = window.setInterval(refresh, pollInterval)
    onCleanup(() => window.clearInterval(interval))
  })

  const requestInventory = async (nodeID: string) => {
    const resp = await queryInventory(nodeID)
    handleResp(resp, () =>
      notify.success(t("cluster.notifications.inventory_requested")),
    )
  }

  const setState = async (
    node: ClusterNode,
    state: ClusterNodeMutableState,
  ) => {
    if (
      state === "revoked" &&
      !window.confirm(t("cluster.confirm.revoke_node"))
    )
      return
    const resp = await changeState(node.id, state)
    handleResp(resp, () => {
      notify.success(t("cluster.notifications.node_state_updated"))
      void refresh()
    })
  }

  const statusCount = (status: ClusterNode["status"]) =>
    nodes().filter((node) => node.status === status).length
  const schedulable = createMemo(
    () =>
      nodes().filter(
        (node) => node.status === "online" && !node.drain && !node.disabled,
      ).length,
  )

  const NodeInventorySummary = (props: { node: ClusterNode }) => {
    const inventory = () => props.node.latest_inventory
    const accounts = () => inventory()?.provider_accounts || []
    const capabilities = () => inventory()?.capabilities
    return (
      <VStack alignItems="stretch" spacing="$1" minW="0">
        <Text size="xs" color="$neutral11">
          {capabilities()
            ? `${t("cluster.control.download_concurrency")}: ${
                capabilities()?.download_concurrency || 0
              } · ${t("cluster.control.upload_concurrency")}: ${
                capabilities()?.upload_concurrency || 0
              }`
            : "-"}
        </Text>
        <Show
          when={accounts().length > 0}
          fallback={
            <Text size="xs" color="$neutral11">
              {inventory()?.inventory_hash || "-"}
            </Text>
          }
        >
          <For each={accounts()}>
            {(account) => (
              <Box
                px="$2"
                py="$1"
                rounded="$sm"
                bgColor="$neutral3"
                css={{ wordBreak: "break-word" }}
              >
                <Text size="xs" fontWeight="$medium">
                  {[
                    account.provider,
                    account.account_alias || account.mount_path,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text size="xs" color="$neutral11">
                  {[
                    account.membership_tier || account.status,
                    account.supports_upload ? "upload" : "",
                    account.supports_share_save ? "save" : "",
                    account.supports_etf ? "ETF" : "",
                    account.max_single_upload_bytes
                      ? formatBytes(account.max_single_upload_bytes)
                      : "",
                    account.free_bytes ? formatBytes(account.free_bytes) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Box>
            )}
          </For>
        </Show>
      </VStack>
    )
  }

  const NodeActions = (props: { node: ClusterNode }) => (
    <HStack
      spacing="$2"
      flexWrap="wrap"
      justifyContent={{ "@initial": "flex-start", "@lg": "flex-end" }}
    >
      <Button
        size="sm"
        variant="outline"
        loading={queryingID() === props.node.id}
        onClick={() => requestInventory(props.node.id)}
      >
        {t("cluster.actions.query_inventory")}
      </Button>
      <Show
        when={props.node.status !== "online" && props.node.status !== "revoked"}
      >
        <Button
          size="sm"
          variant="outline"
          loading={changingID() === props.node.id}
          onClick={() => setState(props.node, "online")}
        >
          {t("cluster.actions.enable_node")}
        </Button>
      </Show>
      <Show when={props.node.status === "online"}>
        <Button
          size="sm"
          variant="outline"
          loading={changingID() === props.node.id}
          onClick={() => setState(props.node, "draining")}
        >
          {t("cluster.actions.drain_node")}
        </Button>
      </Show>
      <Show
        when={
          props.node.status !== "disabled" && props.node.status !== "revoked"
        }
      >
        <Button
          size="sm"
          colorScheme="warning"
          variant="outline"
          loading={changingID() === props.node.id}
          onClick={() => setState(props.node, "disabled")}
        >
          {t("cluster.actions.disable_node")}
        </Button>
      </Show>
      <Show when={props.node.status !== "revoked"}>
        <Button
          size="sm"
          colorScheme="danger"
          variant="outline"
          loading={changingID() === props.node.id}
          onClick={() => setState(props.node, "revoked")}
        >
          {t("cluster.actions.revoke_node")}
        </Button>
      </Show>
    </HStack>
  )

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4" pb="$6">
      <PageHeader
        titleKey="cluster.nodes.title"
        descriptionKey="cluster.nodes.description"
        actions={
          <Button
            leftIcon={<AiOutlineReload />}
            variant="outline"
            loading={loading()}
            onClick={refresh}
          >
            {t("cluster.actions.refresh")}
          </Button>
        }
      />

      <SimpleGrid columns={{ "@initial": 2, "@lg": 4 }} gap="$3">
        <Metric labelKey="cluster.metrics.total_nodes" value={nodes().length} />
        <Metric
          labelKey="cluster.metrics.schedulable_nodes"
          value={schedulable()}
          tone="success"
        />
        <Metric
          labelKey="cluster.metrics.draining_nodes"
          value={statusCount("draining")}
          tone="warning"
        />
        <Metric
          labelKey="cluster.metrics.offline_nodes"
          value={statusCount("offline")}
          tone="neutral"
        />
      </SimpleGrid>

      <Panel>
        <Show when={!loading()} fallback={<LoadingBlock />}>
          <Show
            when={nodes().length > 0}
            fallback={
              <EmptyBlock
                titleKey="cluster.empty.nodes"
                descriptionKey="cluster.empty.nodes_description"
              />
            }
          >
            <Box
              display={{ "@initial": "none", "@lg": "block" }}
              overflowX="auto"
            >
              <Table minW="64rem" dense>
                <Thead>
                  <Tr>
                    <Th>{t("cluster.fields.node")}</Th>
                    <Th>{t("cluster.fields.role")}</Th>
                    <Th>{t("cluster.fields.status")}</Th>
                    <Th>{t("cluster.fields.version")}</Th>
                    <Th>{t("cluster.fields.weight")}</Th>
                    <Th>{t("cluster.fields.last_heartbeat")}</Th>
                    <Th>{t("cluster.nodes.inventory")}</Th>
                    <Th textAlign="right">{t("cluster.fields.actions")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={nodes()}>
                    {(node) => (
                      <Tr>
                        <Td>
                          <Text fontWeight="$medium">
                            {node.name || shortID(node.id)}
                          </Text>
                          <Text
                            size="xs"
                            color="$neutral11"
                            fontFamily="$mono"
                            title={node.id}
                          >
                            {shortID(node.id)}
                          </Text>
                          <Show when={node.last_error}>
                            <Text
                              mt="$1"
                              size="xs"
                              color="$danger11"
                              noOfLines={1}
                            >
                              {node.last_error}
                            </Text>
                          </Show>
                        </Td>
                        <Td>{t(`cluster.role.${node.role}`)}</Td>
                        <Td>
                          <NodeStatusBadge status={node.status} />
                        </Td>
                        <Td>
                          <Text size="sm">{node.agent_version || "-"}</Text>
                          <Text size="xs" color="$neutral11">
                            {node.protocol_version || "-"}
                          </Text>
                        </Td>
                        <Td>{node.weight}</Td>
                        <Td css={{ whiteSpace: "nowrap" }}>
                          {formatDate(node.last_heartbeat_at)}
                        </Td>
                        <Td minW="20rem">
                          <NodeInventorySummary node={node} />
                        </Td>
                        <Td>
                          <NodeActions node={node} />
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>

            <VStack
              display={{ "@initial": "flex", "@lg": "none" }}
              alignItems="stretch"
              spacing="$0"
            >
              <For each={nodes()}>
                {(node) => (
                  <Box
                    px="$4"
                    py="$4"
                    borderBottomWidth="1px"
                    borderColor="$neutral5"
                  >
                    <HStack
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb="$3"
                    >
                      <Box minW="0">
                        <Text fontWeight="$semibold" noOfLines={1}>
                          {node.name || shortID(node.id)}
                        </Text>
                        <Text size="xs" color="$neutral11" fontFamily="$mono">
                          {shortID(node.id)}
                        </Text>
                      </Box>
                      <NodeStatusBadge status={node.status} />
                    </HStack>
                    <SimpleGrid columns={2} gap="$2" mb="$3">
                      <Box>
                        <Text size="xs" color="$neutral11">
                          {t("cluster.fields.role")}
                        </Text>
                        <Text size="sm">{t(`cluster.role.${node.role}`)}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" color="$neutral11">
                          {t("cluster.fields.last_heartbeat")}
                        </Text>
                        <Text size="sm">
                          {formatDate(node.last_heartbeat_at)}
                        </Text>
                      </Box>
                    </SimpleGrid>
                    <Box mb="$3">
                      <Text size="xs" color="$neutral11" mb="$1">
                        {t("cluster.nodes.inventory")}
                      </Text>
                      <NodeInventorySummary node={node} />
                    </Box>
                    <Show when={node.last_error}>
                      <Text mb="$3" size="sm" color="$danger11">
                        {node.last_error}
                      </Text>
                    </Show>
                    <NodeActions node={node} />
                  </Box>
                )}
              </For>
            </VStack>
          </Show>
        </Show>
      </Panel>
    </VStack>
  )
}

export default Nodes
