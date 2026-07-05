import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
  createDisclosure,
} from "@hope-ui/solid"
import { createEffect, createSignal, For, Show } from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useManageTitle, useT } from "~/hooks"
import {
  ETFArchiveCorrection,
  ETFArchiveRecord,
  ETFArchiveStatus,
  ETFArchiveTMDBCandidate,
  PPageResp,
  PResp,
} from "~/types"
import { etfArchiveTMDBSearch, handleResp, notify, r } from "~/utils"

type MatchedFilter = "all" | "true" | "false"

const pageSize = 30

const statusColor: Record<ETFArchiveStatus, any> = {
  skipped: "neutral",
  archived: "success",
  failed: "danger",
  corrected: "accent",
}

const StatusBadge = (props: { status: ETFArchiveStatus }) => (
  <Badge colorScheme={statusColor[props.status] ?? "neutral"}>
    {props.status}
  </Badge>
)

const parseNumberToken = (value?: string): number => {
  const token = (value || "").trim()
  if (!token) return 0
  if (/^\d+$/.test(token)) return parseInt(token)
  const digits: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  const units: Record<string, number> = { 十: 10, 百: 100 }
  let total = 0
  let current = 0
  for (const char of token) {
    if (char in digits) {
      current = digits[char]
      continue
    }
    if (char in units) {
      total += (current || 1) * units[char]
      current = 0
      continue
    }
    return 0
  }
  return total + current
}

const parseSeasonEpisode = (
  value: string,
): { season: number; episode: number } => {
  const probe = value || ""
  const sxxEyy = /S0*(\d{1,2})\s*E0*(\d{1,4})/i.exec(probe)
  if (sxxEyy) {
    return {
      season: parseNumberToken(sxxEyy[1]),
      episode: parseNumberToken(sxxEyy[2]),
    }
  }
  const season =
    /Season\s*0*([1-9]\d?)/i.exec(probe)?.[1] ||
    /第\s*([一二三四五六七八九十百零〇两\d]{1,4})\s*季/.exec(probe)?.[1] ||
    /(?:^|[\s/._-])S0*([1-9]\d?)(?:$|[\s/._-])/i.exec(probe)?.[1]
  const episode =
    /第\s*([一二三四五六七八九十百零〇两\d]{1,4})\s*[集话章回]/.exec(
      probe,
    )?.[1] ||
    /\b(?:EP|Episode)\s*0*([1-9]\d{0,3})\b/i.exec(probe)?.[1] ||
    /(?:^|[\s._/-])E0*([1-9]\d{0,3})(?:$|[\s._/-])/i.exec(probe)?.[1]
  return {
    season: parseNumberToken(season) || (episode ? 1 : 0),
    episode: parseNumberToken(episode),
  }
}

const cleanSearchQuery = (value: string) =>
  value
    .replace(/\.[a-z0-9]{2,5}(\.etf)?$/i, "")
    .replace(/S\d{1,2}E\d{1,4}.*/i, "")
    .replace(/第\s*[一二三四五六七八九十百零〇两\d]{1,4}\s*[季集话章回].*/i, "")
    .replace(
      /\b(4320p|2160p|1440p|1080p|720p|web-?dl|webrip|bluray|remux|hevc|h\.?264|h\.?265|aac|ddp?|nf)\b.*/i,
      "",
    )
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const CorrectionModal = (props: {
  record?: ETFArchiveRecord
  opened: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (correction: ETFArchiveCorrection) => void
}) => {
  const t = useT()
  const [tmdbID, setTMDBID] = createSignal(0)
  const [tmdbName, setTMDBName] = createSignal("")
  const [tmdbYear, setTMDBYear] = createSignal(0)
  const [mediaType, setMediaType] = createSignal("tv")
  const [category, setCategory] = createSignal("")
  const [season, setSeason] = createSignal(0)
  const [episode, setEpisode] = createSignal(0)
  const [query, setQuery] = createSignal("")
  const [candidates, setCandidates] = createSignal<ETFArchiveTMDBCandidate[]>(
    [],
  )
  const [searchLoading, searchTMDB] = useFetch(etfArchiveTMDBSearch)

  const hydrate = () => {
    const record = props.record
    const parsed = parseSeasonEpisode(
      `${record?.source_name || ""} ${record?.local_etf_path || ""}`,
    )
    setTMDBID(record?.tmdb_id || 0)
    setTMDBName(record?.tmdb_name || "")
    setTMDBYear(record?.tmdb_year || 0)
    setMediaType(
      record?.media_type || (record?.season || parsed.season ? "tv" : "movie"),
    )
    setCategory(record?.category || "")
    setSeason(record?.season || parsed.season || 0)
    setEpisode(record?.episode || parsed.episode || 0)
    setQuery(
      record?.tmdb_id
        ? String(record.tmdb_id)
        : cleanSearchQuery(record?.source_name || ""),
    )
    setCandidates([])
  }

  createEffect(() => {
    if (props.opened) {
      hydrate()
    }
  })

  const search = async () => {
    const value = query().trim()
    if (!value) {
      notify.warning(t("global.empty_input"))
      return
    }
    const resp = await searchTMDB(value)
    handleResp(resp, setCandidates)
  }

  const selectCandidate = (candidate: ETFArchiveTMDBCandidate) => {
    setTMDBID(candidate.tmdb_id)
    setTMDBName(candidate.name)
    setTMDBYear(candidate.year || 0)
    setMediaType(candidate.media_type || "tv")
    setCategory(candidate.category || "")
    if (candidate.media_type === "tv" && season() <= 0) {
      const parsed = parseSeasonEpisode(
        `${props.record?.source_name || ""} ${props.record?.local_etf_path || ""}`,
      )
      setSeason(parsed.season || 1)
      setEpisode(parsed.episode || episode())
    }
  }

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>{t("etf_archive.correct")}</ModalHeader>
        <ModalBody>
          <VStack spacing="$3" alignItems="start">
            <Show when={props.record}>
              {(record) => (
                <Box w="$full">
                  <Text fontWeight="$semibold">{record().source_name}</Text>
                  <Text color="$neutral11" css={{ wordBreak: "break-all" }}>
                    {record().local_etf_path}
                  </Text>
                </Box>
              )}
            </Show>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.tmdb_search")}</FormLabel>
              <HStack spacing="$2" alignItems="stretch">
                <Input
                  value={query()}
                  placeholder={t("etf_archive.tmdb_search_placeholder")}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") search()
                  }}
                />
                <Button loading={searchLoading()} onClick={search}>
                  {t("etf_archive.search")}
                </Button>
              </HStack>
            </FormControl>
            <Show when={candidates().length > 0}>
              <VStack spacing="$2" alignItems="stretch" w="$full">
                <For each={candidates()}>
                  {(candidate) => (
                    <Box
                      as="button"
                      type="button"
                      w="$full"
                      p="$2"
                      border="1px solid $neutral6"
                      rounded="$md"
                      bg={
                        tmdbID() === candidate.tmdb_id
                          ? "$accent3"
                          : "$neutral2"
                      }
                      cursor="pointer"
                      textAlign="left"
                      onClick={() => selectCandidate(candidate)}
                    >
                      <HStack spacing="$3" alignItems="center">
                        <Show
                          when={candidate.poster_url}
                          fallback={
                            <Box
                              w="3.25rem"
                              h="4.75rem"
                              rounded="$sm"
                              bg="$neutral5"
                              flexShrink={0}
                            />
                          }
                        >
                          <Image
                            src={candidate.poster_url}
                            alt={candidate.name}
                            w="3.25rem"
                            h="4.75rem"
                            objectFit="cover"
                            rounded="$sm"
                            flexShrink={0}
                          />
                        </Show>
                        <VStack spacing="$1" alignItems="start" minW={0}>
                          <Text fontWeight="$semibold">
                            {candidate.name}
                            <Show when={candidate.year}>
                              {(year) => ` (${year()})`}
                            </Show>
                          </Text>
                          <Text color="$neutral11" fontSize="$sm">
                            TMDB {candidate.tmdb_id} · {candidate.media_type}
                            <Show when={candidate.category}>
                              {" · "}
                              {candidate.category}
                            </Show>
                          </Text>
                          <Show when={candidate.original_name}>
                            <Text color="$neutral10" fontSize="$sm">
                              {candidate.original_name}
                            </Text>
                          </Show>
                        </VStack>
                      </HStack>
                    </Box>
                  )}
                </For>
              </VStack>
            </Show>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.tmdb_id")}</FormLabel>
              <Input
                type="number"
                value={tmdbID()}
                onInput={(e) =>
                  setTMDBID(parseInt(e.currentTarget.value || "0"))
                }
              />
            </FormControl>
            <FormControl
              w="$full"
              display="flex"
              flexDirection="column"
              required
            >
              <FormLabel>{t("etf_archive.tmdb_name")}</FormLabel>
              <Input
                value={tmdbName()}
                onInput={(e) => setTMDBName(e.currentTarget.value)}
              />
            </FormControl>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.tmdb_year")}</FormLabel>
              <Input
                type="number"
                value={tmdbYear()}
                onInput={(e) =>
                  setTMDBYear(parseInt(e.currentTarget.value || "0"))
                }
              />
            </FormControl>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.media_type")}</FormLabel>
              <Select
                value={mediaType()}
                onChange={(value) => setMediaType(value)}
              >
                <SelectTrigger>
                  <SelectPlaceholder>{t("global.choose")}</SelectPlaceholder>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <SelectOption value="tv">
                      <SelectOptionText>tv</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                    <SelectOption value="movie">
                      <SelectOptionText>movie</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  </SelectListbox>
                </SelectContent>
              </Select>
            </FormControl>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.category")}</FormLabel>
              <Input
                value={category()}
                onInput={(e) => setCategory(e.currentTarget.value)}
              />
            </FormControl>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.season")}</FormLabel>
              <Input
                type="number"
                value={season()}
                onInput={(e) =>
                  setSeason(parseInt(e.currentTarget.value || "0"))
                }
              />
            </FormControl>
            <FormControl w="$full" display="flex" flexDirection="column">
              <FormLabel>{t("etf_archive.episode")}</FormLabel>
              <Input
                type="number"
                value={episode()}
                onInput={(e) =>
                  setEpisode(parseInt(e.currentTarget.value || "0"))
                }
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="accent"
            loading={props.loading}
            onClick={() =>
              props.onSubmit({
                tmdb_id: tmdbID(),
                tmdb_name: tmdbName(),
                tmdb_year: tmdbYear(),
                media_type: mediaType(),
                category: category(),
                season: season(),
                episode: episode(),
              })
            }
          >
            {t("global.save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

const ETFArchive = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.etf_archive")
  const [keyword, setKeyword] = createSignal("")
  const [tmdbID, setTMDBID] = createSignal("")
  const [matched, setMatched] = createSignal<MatchedFilter>("all")
  const [page, setPage] = createSignal(1)
  const [total, setTotal] = createSignal(0)
  const [records, setRecords] = createSignal<ETFArchiveRecord[]>([])
  const [editing, setEditing] = createSignal<ETFArchiveRecord>()
  let resetPaginator: (() => void) | undefined
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [listLoading, listRecords] = useFetch(
    (): PPageResp<ETFArchiveRecord> => {
      const params = new URLSearchParams({
        page: String(page()),
        per_page: String(pageSize),
      })
      if (keyword().trim()) params.set("keyword", keyword().trim())
      const id = parseInt(tmdbID())
      if (id > 0) params.set("tmdb_id", String(id))
      if (matched() !== "all") params.set("tmdb_matched", matched())
      return r.get(`/admin/etf_archive/list?${params.toString()}`)
    },
  )
  const [correctLoading, correctRecord] = useFetch(
    (id: number, correction: ETFArchiveCorrection): PResp<ETFArchiveRecord> =>
      r.post("/admin/etf_archive/correct", { id, ...correction }),
  )

  const refresh = async () => {
    const resp = await listRecords()
    handleResp(resp, (data) => {
      setRecords(data.content)
      setTotal(data.total)
    })
  }
  refresh()

  const applyFilters = () => {
    setPage(1)
    resetPaginator?.()
    refresh()
  }

  const openCorrection = (record: ETFArchiveRecord) => {
    setEditing(record)
    onOpen()
  }

  const submitCorrection = async (correction: ETFArchiveCorrection) => {
    const record = editing()
    if (!record) return
    const resp = await correctRecord(record.id, correction)
    handleResp(resp, () => {
      notify.success(t("global.update_success"))
      onClose()
      refresh()
    })
  }

  return (
    <VStack spacing="$3" alignItems="start" w="$full">
      <HStack spacing="$2" gap="$2" w="$full" flexWrap="wrap">
        <Input
          w={{ "@initial": "$full", "@md": "18rem" }}
          placeholder={t("etf_archive.keyword")}
          value={keyword()}
          onInput={(e) => setKeyword(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters()
          }}
        />
        <Input
          w={{ "@initial": "$full", "@md": "10rem" }}
          type="number"
          placeholder={t("etf_archive.tmdb_id")}
          value={tmdbID()}
          onInput={(e) => setTMDBID(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters()
          }}
        />
        <Select
          value={matched()}
          onChange={(value) => setMatched(value as MatchedFilter)}
        >
          <SelectTrigger w={{ "@initial": "$full", "@md": "12rem" }}>
            <SelectPlaceholder>
              {t("etf_archive.tmdb_matched")}
            </SelectPlaceholder>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <SelectOption value="all">
                <SelectOptionText>{t("etf_archive.all")}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <SelectOption value="true">
                <SelectOptionText>{t("etf_archive.matched")}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
              <SelectOption value="false">
                <SelectOptionText>
                  {t("etf_archive.unmatched")}
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
          {t("etf_archive.filter")}
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
                  "tmdb",
                  "tmdb_matched",
                  "status",
                  "local_etf_path",
                  "archive_etf_path",
                  "updated_at",
                ]}
              >
                {(title) => <Th>{t(`etf_archive.${title}`)}</Th>}
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
                      {record.storage_mount_path}
                    </Text>
                  </Td>
                  <Td>
                    <Show
                      when={record.tmdb_id || record.tmdb_name}
                      fallback={<Text color="$neutral11">-</Text>}
                    >
                      <VStack spacing="$0_5" alignItems="start">
                        <Text>{record.tmdb_name || "-"}</Text>
                        <Text color="$neutral11" fontSize="$sm">
                          {record.tmdb_id || "-"}
                          <Show when={record.tmdb_year}>
                            {(year) => ` (${year()})`}
                          </Show>
                        </Text>
                      </VStack>
                    </Show>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={record.tmdb_matched ? "success" : "danger"}
                    >
                      {t(
                        record.tmdb_matched
                          ? "etf_archive.matched"
                          : "etf_archive.unmatched",
                      )}
                    </Badge>
                  </Td>
                  <Td>
                    <VStack spacing="$1" alignItems="start">
                      <StatusBadge status={record.status} />
                      <Show when={record.error}>
                        <Text
                          color="$danger11"
                          fontSize="$sm"
                          css={{ wordBreak: "break-all" }}
                        >
                          {record.error}
                        </Text>
                      </Show>
                    </VStack>
                  </Td>
                  <Td maxW="18rem">
                    <Text css={{ wordBreak: "break-all" }}>
                      {record.local_etf_path}
                    </Text>
                  </Td>
                  <Td maxW="20rem">
                    <Text css={{ wordBreak: "break-all" }}>
                      {record.archive_etf_path || "-"}
                    </Text>
                  </Td>
                  <Td>{record.updated_at}</Td>
                  <Td>
                    <Button onClick={() => openCorrection(record)}>
                      {t("global.edit")}
                    </Button>
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
      <CorrectionModal
        record={editing()}
        opened={isOpen()}
        loading={!!correctLoading()}
        onClose={onClose}
        onSubmit={submitCorrection}
      />
    </VStack>
  )
}

export default ETFArchive
