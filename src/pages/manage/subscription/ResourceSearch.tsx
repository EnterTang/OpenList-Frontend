import {
  Badge,
  Box,
  Button,
  Checkbox,
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
import { AiOutlineSearch } from "solid-icons/ai"
import { createSignal, For, Show } from "solid-js"
import { useFetch, useManageTitle, useT } from "~/hooks"
import {
  SubscriptionResourceSearchResult,
  SubscriptionSourceType,
} from "~/types"
import { handleResp, notify, subscriptionResourceSearch } from "~/utils"

const searchSources: SubscriptionSourceType[] = ["telegram", "pansou"]

const providerColor: Record<
  string,
  "neutral" | "info" | "success" | "warning"
> = {
  quark: "info",
  aliyun_drive: "success",
  pan123: "warning",
  pan115: "neutral",
}

const sourceColor: Record<SubscriptionSourceType, "info" | "accent"> = {
  telegram: "info",
  pansou: "accent",
  manual: "info",
}

const ResourceSearch = () => {
  const t = useT()
  const border = useColorModeValue("$neutral5", "$neutral7")
  const panelBg = useColorModeValue("white", "$neutral3")
  const [query, setQuery] = createSignal("")
  const [limit, setLimit] = createSignal("40")
  const [sources, setSources] =
    createSignal<SubscriptionSourceType[]>(searchSources)
  const [results, setResults] = createSignal<
    SubscriptionResourceSearchResult[]
  >([])
  const [sourceErrors, setSourceErrors] = createSignal<Record<string, string>>(
    {},
  )
  const [loading, search] = useFetch(() =>
    subscriptionResourceSearch(
      query().trim(),
      sources(),
      Number(limit()) || 40,
    ),
  )
  useManageTitle("manage.sidemenu.resource_search")

  const toggleSource = (source: SubscriptionSourceType, checked: boolean) => {
    setSources((prev) => {
      if (checked) return Array.from(new Set([...prev, source]))
      return prev.filter((item) => item !== source)
    })
  }

  const runSearch = async () => {
    if (!query().trim()) {
      notify.warning(t("global.empty_input"))
      return
    }
    if (sources().length === 0) {
      notify.warning(t("subscription.resource_search_source_required"))
      return
    }
    const resp = await search()
    handleResp(resp, (data) => {
      setResults(data.results || [])
      setSourceErrors(data.source_errors || {})
    })
  }

  const providerLabel = (provider?: string) => {
    if (!provider) return ""
    const key = `subscription.telegram_pan_names.${provider}`
    const label = t(key)
    return label === key ? provider : label
  }

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4">
      <Box
        w="$full"
        bgColor={panelBg()}
        border="1px solid"
        borderColor={border()}
        rounded="$md"
        p="$3"
      >
        <VStack spacing="$3" alignItems="stretch">
          <HStack spacing="$2" gap="$2" flexWrap="wrap">
            <Input
              w={{ "@initial": "$full", "@md": "24rem" }}
              value={query()}
              placeholder={t("subscription.resource_search_placeholder")}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch()
              }}
            />
            <Select
              value={limit()}
              onChange={(value) => setLimit(value || "40")}
            >
              <SelectTrigger w={{ "@initial": "$full", "@md": "9rem" }}>
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectContent>
                <SelectListbox>
                  <For each={["20", "40", "80"]}>
                    {(value) => (
                      <SelectOption value={value}>
                        <SelectOptionText>
                          {value}
                          {t("subscription.resource_search_limit_suffix")}
                        </SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                    )}
                  </For>
                </SelectListbox>
              </SelectContent>
            </Select>
            <For each={searchSources}>
              {(source) => (
                <Checkbox
                  checked={sources().includes(source)}
                  onChange={(e: { currentTarget: HTMLInputElement }) =>
                    toggleSource(source, e.currentTarget.checked)
                  }
                >
                  {t(`subscription.source_types.${source}`)}
                </Checkbox>
              )}
            </For>
            <Button
              colorScheme="accent"
              leftIcon={<AiOutlineSearch />}
              loading={loading()}
              onClick={runSearch}
            >
              {t("subscription.search")}
            </Button>
          </HStack>

          <Show when={Object.keys(sourceErrors()).length > 0}>
            <VStack spacing="$1" alignItems="stretch">
              <For each={Object.entries(sourceErrors())}>
                {([source, message]) => (
                  <Text color="$danger11" fontSize="$sm">
                    {t(`subscription.source_types.${source}`)}: {message}
                  </Text>
                )}
              </For>
            </VStack>
          </Show>
        </VStack>
      </Box>

      <Box w="$full" overflowX="auto">
        <Table dense highlightOnHover>
          <Thead>
            <Tr>
              <Th>{t("subscription.source_type")}</Th>
              <Th>{t("subscription.resource_title")}</Th>
              <Th>{t("subscription.resource_links")}</Th>
              <Th>{t("subscription.resource_date")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={results()}>
              {(record) => (
                <Tr>
                  <Td>
                    <VStack spacing="$1" alignItems="start">
                      <Badge colorScheme={sourceColor[record.source_type]}>
                        {t(`subscription.source_types.${record.source_type}`)}
                      </Badge>
                      <Show when={record.provider}>
                        {(provider) => (
                          <Badge
                            colorScheme={providerColor[provider()] || "neutral"}
                          >
                            {providerLabel(provider())}
                          </Badge>
                        )}
                      </Show>
                    </VStack>
                  </Td>
                  <Td maxW="34rem">
                    <Text fontWeight="$medium" css={{ wordBreak: "break-all" }}>
                      {record.title || "-"}
                    </Text>
                    <Show
                      when={record.content && record.content !== record.title}
                    >
                      <Text
                        color="$neutral11"
                        fontSize="$sm"
                        css={{
                          wordBreak: "break-all",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {record.content}
                      </Text>
                    </Show>
                    <Show when={record.channel || record.message_url}>
                      <Text color="$neutral10" fontSize="$sm">
                        {[record.channel, record.message_url]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </Show>
                  </Td>
                  <Td minW="20rem">
                    <VStack spacing="$1" alignItems="start">
                      <For each={record.links || []}>
                        {(link) => (
                          <HStack spacing="$2" alignItems="center">
                            <Show when={link.provider}>
                              {(provider) => (
                                <Badge
                                  colorScheme={
                                    providerColor[provider()] || "neutral"
                                  }
                                >
                                  {providerLabel(provider())}
                                </Badge>
                              )}
                            </Show>
                            <Text
                              as="a"
                              href={link.url.split(",")[0]}
                              target="_blank"
                              color="$info11"
                              fontSize="$sm"
                              css={{ wordBreak: "break-all" }}
                            >
                              {link.url}
                            </Text>
                          </HStack>
                        )}
                      </For>
                      <Show when={!record.links?.length}>
                        <Text color="$neutral10">-</Text>
                      </Show>
                    </VStack>
                  </Td>
                  <Td>{record.date || "-"}</Td>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default ResourceSearch
