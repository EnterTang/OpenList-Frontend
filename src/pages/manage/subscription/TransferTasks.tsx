import {
  Badge,
  Box,
  Button,
  HStack,
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
import { createSignal, For, onMount, Show } from "solid-js"
import { useFetch, useT, useTitle } from "~/hooks"
import { getSetting } from "~/store"
import { Subscription, SubscriptionRun, SubscriptionStatus } from "~/types"
import { handleResp, subscriptionList, subscriptionRuns } from "~/utils"
import { TypeTasks } from "../tasks/Tasks"
import {
  getDecompressUploadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
  getPath,
} from "../tasks/helper"

const statusColor: Record<
  SubscriptionStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  idle: "neutral",
  running: "info",
  success: "success",
  failed: "danger",
}

const TransferTasks = (props: {
  titleKey?: string
  titleMode?: "manage" | "site"
}) => {
  const t = useT()
  const border = useColorModeValue("$neutral5", "$neutral7")
  const panelBg = useColorModeValue("white", "$neutral3")
  const [subscriptions, setSubscriptions] = createSignal<Subscription[]>([])
  const [runs, setRuns] = createSignal<SubscriptionRun[]>([])
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

  onMount(refresh)

  return (
    <VStack w="$full" alignItems="stretch" spacing="$5">
      <Box
        w="$full"
        bgColor={panelBg()}
        border="1px solid"
        borderColor={border()}
        rounded="$md"
        p="$3"
      >
        <VStack spacing="$4" alignItems="stretch">
          <HStack justifyContent="space-between" gap="$2" flexWrap="wrap">
            <Text fontWeight="$semibold">
              {t("subscription.transfer_tasks_overview")}
            </Text>
            <Button
              leftIcon={<AiOutlineReload />}
              loading={subsLoading() || runsLoading()}
              onClick={refresh}
            >
              {t("global.refresh")}
            </Button>
          </HStack>
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
                <For each={subscriptions()}>
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
                        <Badge
                          colorScheme={
                            statusColor[record.last_status || "idle"]
                          }
                        >
                          {t(
                            `subscription.statuses.${
                              record.last_status || "idle"
                            }`,
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
                      </Td>
                      <Td>{record.updated_at}</Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>

          <Box w="$full" overflowX="auto">
            <Table dense highlightOnHover>
              <Thead>
                <Tr>
                  <Th>{t("subscription.run_subscription")}</Th>
                  <Th>{t("subscription.last_status")}</Th>
                  <Th>{t("subscription.run_counts")}</Th>
                  <Th>{t("subscription.run_time")}</Th>
                  <Th>{t("tasks.attr.err")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={runs()}>
                  {(run) => (
                    <Tr>
                      <Td>{subscriptionName(run.subscription_id)}</Td>
                      <Td>
                        <Badge colorScheme={statusColor[run.status]}>
                          {t(`subscription.statuses.${run.status}`)}
                        </Badge>
                      </Td>
                      <Td>
                        {[
                          `${t("subscription.run_added")}: ${run.added_count}`,
                          `${t("subscription.run_changed")}: ${run.changed_count}`,
                          `${t("subscription.run_transferred")}: ${run.transferred_count}`,
                        ].join(" · ")}
                      </Td>
                      <Td>
                        <Text>{run.started_at}</Text>
                        <Text color="$neutral11" fontSize="$sm">
                          {run.finished_at || "-"}
                        </Text>
                      </Td>
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
              </Tbody>
            </Table>
          </Box>
        </VStack>
      </Box>

      <TypeTasks
        type="offline_download_transfer"
        canRetry
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
      <TypeTasks
        type="copy"
        canRetry
        nameAnalyzer={{
          regex:
            /^(?:copy|merge) \[(.*\/([^\/]*))]\((.*\/([^\/]*))\) to \[(.+)]\((.+)\)$/,
          title: (matches) => {
            if (matches[4] !== "") return matches[4]
            return matches[2] === "" ? "/" : matches[2]
          },
          attrs: {
            [t(`tasks.attr.copy.src`)]: (matches) =>
              getPath(matches[1], matches[3]),
            [t(`tasks.attr.copy.dst`)]: (matches) =>
              getPath(matches[5], matches[6]),
          },
        }}
      />
      <TypeTasks
        type="upload"
        nameAnalyzer={{
          regex: /^upload (.+) to \[(.+)]\((.+)\)$/,
          title: (matches) => matches[1],
          attrs: {
            [t(`tasks.attr.upload.path`)]: (matches) =>
              getPath(matches[2], matches[3]),
          },
        }}
      />
      <TypeTasks
        type="decompress_upload"
        canRetry
        nameAnalyzer={getDecompressUploadNameAnalyzer()}
      />
    </VStack>
  )
}

export default TransferTasks
