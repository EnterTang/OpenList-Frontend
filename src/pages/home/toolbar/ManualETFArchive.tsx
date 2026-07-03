import {
  Box,
  Button,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
import { createSignal, For, onCleanup, Show } from "solid-js"
import { selectedObjs } from "~/store"
import {
  bus,
  etfArchiveTMDBSearch,
  etfManualArchiveApply,
  etfManualArchivePreview,
  handleResp,
  handleRespWithNotifySuccess,
  notify,
  pathJoin,
} from "~/utils"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import {
  ETFArchiveTMDBCandidate,
  ETFManualArchiveMetadata,
  ETFManualArchivePreview,
} from "~/types"

const emptyMetadata = (): ETFManualArchiveMetadata => ({
  tmdb_id: 0,
  name: "",
  original_name: "",
  year: 0,
  media_type: "tv",
  category: "",
  season: 1,
  start_episode: 1,
})

export const ManualETFArchive = () => {
  const { isOpen, onOpen, onClose } = createDisclosure()
  const t = useT()
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [targetPath, setTargetPath] = createSignal("")
  const [query, setQuery] = createSignal("")
  const [candidates, setCandidates] = createSignal<ETFArchiveTMDBCandidate[]>(
    [],
  )
  const [metadata, setMetadata] =
    createSignal<ETFManualArchiveMetadata>(emptyMetadata())
  const [preview, setPreview] = createSignal<ETFManualArchivePreview>()
  const [searchLoading, searchTMDB] = useFetch(etfArchiveTMDBSearch)
  const [previewLoading, requestPreview] = useFetch(etfManualArchivePreview)
  const [applyLoading, requestApply] = useFetch(etfManualArchiveApply)

  const reset = () => {
    setCandidates([])
    setPreview(undefined)
    setMetadata(emptyMetadata())
  }

  const handler = (name: string) => {
    if (name !== "manual_etf_archive") return
    const obj = selectedObjs()[0]
    if (!obj?.is_dir) {
      notify.warning(t("home.toolbar.manual_etf_archive_folder_required"))
      return
    }
    reset()
    setTargetPath(pathJoin(pathname(), obj.name))
    setQuery(obj.name)
    onOpen()
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const selectCandidate = async (candidate: ETFArchiveTMDBCandidate) => {
    setMetadata({
      tmdb_id: candidate.tmdb_id,
      name: candidate.name,
      original_name: candidate.original_name,
      year: candidate.year,
      media_type: candidate.media_type || "tv",
      category: candidate.category,
      season: candidate.media_type === "tv" ? metadata().season || 1 : 0,
      start_episode: metadata().start_episode || 1,
    })
    setPreview(undefined)
  }

  const search = async () => {
    const value = query().trim()
    if (!value) {
      notify.warning(t("global.empty_input"))
      return
    }
    const resp = await searchTMDB(value)
    handleResp(resp, setCandidates)
  }

  const previewArchive = async () => {
    if (!metadata().tmdb_id || !metadata().name) {
      notify.warning(t("home.toolbar.manual_etf_archive_select_required"))
      return
    }
    const resp = await requestPreview(targetPath(), metadata())
    handleResp(resp, setPreview)
  }

  const applyArchive = async () => {
    const current = preview()
    if (!current || current.items.length === 0) {
      notify.warning(t("home.toolbar.manual_etf_archive_preview_required"))
      return
    }
    const resp = await requestApply(targetPath(), metadata(), current.items)
    handleRespWithNotifySuccess(resp, () => {
      refresh()
      onClose()
    })
  }

  return (
    <Modal
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={onClose}
      size={{ "@initial": "xs", "@md": "4xl" }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.manual_etf_archive")}</ModalHeader>
        <ModalBody>
          <VStack spacing="$4" alignItems="stretch">
            <Box>
              <Text size="sm" color="$neutral11" mb="$1">
                {targetPath()}
              </Text>
              <HStack spacing="$2">
                <Input
                  value={query()}
                  placeholder={t("home.toolbar.manual_etf_archive_search")}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") search()
                  }}
                />
                <Button loading={searchLoading()} onClick={search}>
                  {t("home.toolbar.manual_etf_archive_search_button")}
                </Button>
              </HStack>
            </Box>

            <Show when={candidates().length > 0}>
              <VStack spacing="$2" alignItems="stretch">
                <For each={candidates()}>
                  {(candidate) => (
                    <Button
                      variant={
                        metadata().tmdb_id === candidate.tmdb_id
                          ? "solid"
                          : "outline"
                      }
                      colorScheme="accent"
                      justifyContent="space-between"
                      onClick={() => selectCandidate(candidate)}
                    >
                      <Text>
                        {candidate.name}
                        <Show when={candidate.year}> ({candidate.year})</Show>
                      </Text>
                      <Text size="sm">
                        {candidate.media_type}
                        <Show when={candidate.category}>
                          {" / "}
                          {candidate.category}
                        </Show>
                      </Text>
                    </Button>
                  )}
                </For>
              </VStack>
            </Show>

            <Show when={metadata().tmdb_id}>
              <HStack spacing="$2" alignItems="end" flexWrap="wrap">
                <Input
                  w="8rem"
                  type="number"
                  value={metadata().season}
                  placeholder={t("etf_archive.season")}
                  onInput={(e) =>
                    setMetadata({
                      ...metadata(),
                      season: parseInt(e.currentTarget.value) || 0,
                    })
                  }
                />
                <Input
                  w="8rem"
                  type="number"
                  value={metadata().start_episode}
                  placeholder={t("home.toolbar.manual_etf_archive_start")}
                  onInput={(e) =>
                    setMetadata({
                      ...metadata(),
                      start_episode: parseInt(e.currentTarget.value) || 1,
                    })
                  }
                />
                <Input
                  w="10rem"
                  value={metadata().category}
                  placeholder={t("etf_archive.category")}
                  onInput={(e) =>
                    setMetadata({
                      ...metadata(),
                      category: e.currentTarget.value,
                    })
                  }
                />
                <Button loading={previewLoading()} onClick={previewArchive}>
                  {t("home.toolbar.manual_etf_archive_preview")}
                </Button>
              </HStack>
            </Show>

            <Show when={preview()}>
              {(p) => (
                <VStack spacing="$2" alignItems="stretch">
                  <Text size="sm" color="$neutral11">
                    {t("home.toolbar.manual_etf_archive_target")}:{" "}
                    {p().archive_dir_path}
                  </Text>
                  <Box overflowX="auto" maxH="22rem">
                    <Table dense highlightOnHover>
                      <Thead>
                        <Tr>
                          <Th>{t("home.toolbar.manual_etf_archive_old")}</Th>
                          <Th>{t("home.toolbar.manual_etf_archive_new")}</Th>
                          <Th>
                            {t("home.toolbar.manual_etf_archive_archive")}
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <For each={p().items}>
                          {(item) => (
                            <Tr>
                              <Td>{item.original_name}</Td>
                              <Td>{item.new_name}</Td>
                              <Td>{item.archive_path}</Td>
                            </Tr>
                          )}
                        </For>
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              )}
            </Show>
          </VStack>
        </ModalBody>
        <ModalFooter display="flex" gap="$2">
          <Button colorScheme="neutral" onClick={onClose}>
            {t("global.cancel")}
          </Button>
          <Button
            colorScheme="primary"
            loading={applyLoading()}
            disabled={!preview() || preview()?.items.length === 0}
            onClick={applyArchive}
          >
            {t("global.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
