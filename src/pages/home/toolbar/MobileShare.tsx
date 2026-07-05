import {
  Box,
  Button,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
  createDisclosure,
} from "@hope-ui/solid"
import { createSignal, onCleanup, Show } from "solid-js"
import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import { me, oneChecked, selectedObjs } from "~/store"
import { MobileShareRecord } from "~/types"
import { bus, handleResp, mobileShareCreate, notify } from "~/utils"

type MobileShareMode = "confirm" | "result"

const shareText = (record?: MobileShareRecord) => {
  if (!record) return ""
  const code = record.extract_code ? `\n${record.extract_code}` : ""
  return `${record.share_url}${code}`
}

export const MobileShare = () => {
  const t = useT()
  const { copy } = useUtil()
  const { pathname } = useRouter()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [mode, setMode] = createSignal<MobileShareMode>("result")
  const [targetPath, setTargetPath] = createSignal("")
  const [record, setRecord] = createSignal<MobileShareRecord>()
  const [loading, createShare] = useFetch(mobileShareCreate)

  const runCreate = async (force = false) => {
    const path = targetPath()
    if (!path) return
    const resp = await createShare(path, force)
    handleResp(resp, (data) => {
      if (data.requires_confirm) {
        setRecord(data.record)
        setMode("confirm")
        onOpen()
        return
      }
      if (!data.record) {
        notify.error(t("mobile_share.empty_result"))
        return
      }
      setRecord(data.record)
      setMode("result")
      onOpen()
      notify.success(t("mobile_share.created_success"))
    })
  }

  const handler = (name: string) => {
    if (name !== "mobile_share") return
    if (!oneChecked()) {
      notify.warning(t("mobile_share.select_one"))
      return
    }
    const obj = selectedObjs()[0]
    if (!obj) return
    const split =
      pathname().endsWith("/") || obj.name.startsWith("/") ? "" : "/"
    const path = `${me().base_path}${pathname()}${split}${obj.name}`
    setTargetPath(path)
    setRecord(undefined)
    setMode("result")
    void runCreate(false)
  }

  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const copyCurrent = () => {
    copy(shareText(record()))
  }

  return (
    <Modal
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={onClose}
      size={{
        "@initial": "xs",
        "@md": "md",
        "@lg": "lg",
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalHeader>
          {mode() === "confirm"
            ? t("mobile_share.confirm_title")
            : t("mobile_share.result_title")}
        </ModalHeader>
        <ModalBody>
          <VStack spacing="$3" alignItems="stretch">
            <Show when={record()}>
              {(item) => (
                <>
                  <Box>
                    <Text fontWeight="$semibold">{item().source_name}</Text>
                    <Text color="$neutral11" css={{ wordBreak: "break-all" }}>
                      {item().source_path}
                    </Text>
                  </Box>
                  <Show when={mode() === "confirm"}>
                    <Text color="$warning11">
                      {t("mobile_share.confirm_desc")}
                    </Text>
                  </Show>
                  <Box>
                    <Text size="sm" color="$neutral11">
                      {t("mobile_share.share_url")}
                    </Text>
                    <Textarea value={item().share_url} readonly rows={3} />
                  </Box>
                  <Box>
                    <Text size="sm" color="$neutral11">
                      {t("mobile_share.extract_code")}
                    </Text>
                    <Input value={item().extract_code} readonly />
                  </Box>
                </>
              )}
            </Show>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing="$2">
            <Show when={mode() === "result"}>
              <Button colorScheme="primary" onClick={copyCurrent}>
                {t("mobile_share.copy_share")}
              </Button>
            </Show>
            <Show when={mode() === "confirm"}>
              <Button onClick={onClose}>{t("global.cancel")}</Button>
              <Button
                colorScheme="warning"
                loading={loading()}
                onClick={() => runCreate(true)}
              >
                {t("mobile_share.create_again")}
              </Button>
            </Show>
            <Show when={mode() === "result"}>
              <Button colorScheme="info" onClick={onClose}>
                {t("global.confirm")}
              </Button>
            </Show>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
