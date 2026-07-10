import {
  Badge,
  Box,
  Button,
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
import { createSignal, For, onMount, Show } from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT, useUtil } from "~/hooks"
import { MobileShareRecord } from "~/types"
import { handleResp, mobileShareDelete, mobileShareList, notify } from "~/utils"
import { Container } from "../Container"

type ValidFilter = "all" | "true" | "false"
type TypeFilter = "all" | "file" | "folder"

const pageSize = 30

const sourceTypeColor: Record<string, "info" | "accent"> = {
  file: "info",
  folder: "accent",
}

export const MobileShareManagement = () => {
  const t = useT()
  const { copy } = useUtil()
  const bg = useColorModeValue("white", "$neutral3")
  const [keyword, setKeyword] = createSignal("")
  const [valid, setValid] = createSignal<ValidFilter>("all")
  const [sourceType, setSourceType] = createSignal<TypeFilter>("all")
  const [page, setPage] = createSignal(1)
  const [total, setTotal] = createSignal(0)
  const [records, setRecords] = createSignal<MobileShareRecord[]>([])
  let resetPaginator: (() => void) | undefined
  const [listLoading, listRecords] = useFetch(() =>
    mobileShareList({
      keyword: keyword().trim() || undefined,
      source_type: sourceType() === "all" ? undefined : sourceType(),
      is_valid: valid() === "all" ? undefined : valid(),
      page: page(),
      per_page: pageSize,
    }),
  )
  const [deleteLoading, deleteShare] = useFetch(mobileShareDelete)

  const refresh = async () => {
    const resp = await listRecords()
    handleResp(resp, (data) => {
      setRecords(data.content)
      setTotal(data.total)
    })
  }

  const applyFilters = () => {
    setPage(1)
    resetPaginator?.()
    refresh()
  }

  const removeShare = async (record: MobileShareRecord) => {
    if (
      !confirm(t("mobile_share.delete_confirm", { name: record.source_name }))
    )
      return
    const resp = await deleteShare(record.id)
    handleResp(resp, () => {
      notify.success(t("mobile_share.delete_success"))
      refresh()
    })
  }

  onMount(refresh)

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
            <HStack spacing="$2" gap="$2" w="$full" flexWrap="wrap">
              <Input
                w={{ "@initial": "$full", "@md": "18rem" }}
                placeholder={t("mobile_share.keyword")}
                value={keyword()}
                onInput={(e) => setKeyword(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters()
                }}
              />
              <Select
                value={sourceType()}
                onChange={(value) => setSourceType(value as TypeFilter)}
              >
                <SelectTrigger w={{ "@initial": "$full", "@md": "10rem" }}>
                  <SelectPlaceholder>
                    {t("mobile_share.source_type")}
                  </SelectPlaceholder>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <SelectOption value="all">
                      <SelectOptionText>
                        {t("mobile_share.all")}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                    <SelectOption value="file">
                      <SelectOptionText>
                        {t("mobile_share.file")}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                    <SelectOption value="folder">
                      <SelectOptionText>
                        {t("mobile_share.folder")}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  </SelectListbox>
                </SelectContent>
              </Select>
              <Select
                value={valid()}
                onChange={(value) => setValid(value as ValidFilter)}
              >
                <SelectTrigger w={{ "@initial": "$full", "@md": "10rem" }}>
                  <SelectPlaceholder>
                    {t("mobile_share.valid_status")}
                  </SelectPlaceholder>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <SelectOption value="all">
                      <SelectOptionText>
                        {t("mobile_share.all")}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                    <SelectOption value="true">
                      <SelectOptionText>
                        {t("mobile_share.valid")}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                    <SelectOption value="false">
                      <SelectOptionText>
                        {t("mobile_share.invalid")}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  </SelectListbox>
                </SelectContent>
              </Select>
              <Button
                colorScheme="accent"
                loading={listLoading()}
                onClick={applyFilters}
              >
                {t("mobile_share.filter")}
              </Button>
              <Button loading={listLoading()} onClick={refresh}>
                {t("global.refresh")}
              </Button>
            </HStack>
            <Box w="$full" overflowX="auto">
              <Table highlightOnHover dense>
                <Thead>
                  <Tr>
                    <For
                      each={[
                        "source_name",
                        "source_type",
                        "share_url",
                        "extract_code",
                        "valid_status",
                        "updated_at",
                      ]}
                    >
                      {(title) => <Th>{t(`mobile_share.${title}`)}</Th>}
                    </For>
                    <Th>{t("global.operations")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={records()}>
                    {(record) => (
                      <Tr>
                        <Td maxW="18rem">
                          <Text css={{ wordBreak: "break-all" }}>
                            {record.source_name}
                          </Text>
                          <Text color="$neutral11" fontSize="$sm">
                            {record.source_path}
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={sourceTypeColor[record.source_type]}
                          >
                            {t(`mobile_share.${record.source_type}`)}
                          </Badge>
                        </Td>
                        <Td maxW="20rem">
                          <Text css={{ wordBreak: "break-all" }}>
                            {record.share_url}
                          </Text>
                          <Text color="$neutral11" fontSize="$sm">
                            {record.link_id || "-"}
                          </Text>
                        </Td>
                        <Td>{record.extract_code || "-"}</Td>
                        <Td>
                          <VStack spacing="$1" alignItems="start">
                            <Badge
                              colorScheme={
                                record.is_valid ? "success" : "danger"
                              }
                            >
                              {t(
                                record.is_valid
                                  ? "mobile_share.valid"
                                  : "mobile_share.invalid",
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
                              onClick={() =>
                                copy(
                                  `${record.share_url}${
                                    record.extract_code
                                      ? `\n${record.extract_code}`
                                      : ""
                                  }`,
                                )
                              }
                            >
                              {t("mobile_share.copy")}
                            </Button>
                            <Button
                              as="a"
                              size="sm"
                              href={record.share_url}
                              target="_blank"
                            >
                              {t("mobile_share.open")}
                            </Button>
                            <Show when={record.is_valid}>
                              <Button
                                size="sm"
                                colorScheme="danger"
                                loading={deleteLoading()}
                                onClick={() => removeShare(record)}
                              >
                                {t("mobile_share.delete")}
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
            <Paginator
              total={total()}
              defaultPageSize={pageSize}
              setResetCallback={(callback) => {
                resetPaginator = callback
              }}
              onChange={(current) => {
                setPage(current)
                refresh()
              }}
            />
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
