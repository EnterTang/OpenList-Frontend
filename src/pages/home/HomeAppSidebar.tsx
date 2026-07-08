import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Text,
  Tooltip,
  VStack,
  useColorModeValue,
} from "@hope-ui/solid"
import { Accessor, For, Setter, Show, createSignal } from "solid-js"
import { CgFolderAdd, CgMoreO, CgShare } from "solid-icons/cg"
import { AiOutlineSetting } from "solid-icons/ai"
import { BsArrowLeftRight, BsSearch } from "solid-icons/bs"
import { useT } from "~/hooks"

export type HomePageKey =
  | "netdisk"
  | "subscriptions"
  | "mobile_share"
  | "resource_search"
  | "task_board"

const pageItems = [
  { key: "netdisk", icon: CgFolderAdd },
  { key: "subscriptions", icon: AiOutlineSetting },
  { key: "mobile_share", icon: CgShare },
  { key: "resource_search", icon: BsSearch },
  { key: "task_board", icon: BsArrowLeftRight },
] as const

export const HomeAppSidebar = (props: {
  activePage: Accessor<HomePageKey>
  setActivePage: Setter<HomePageKey>
}) => {
  const t = useT()
  const [collapsed, setCollapsed] = createSignal(
    localStorage.getItem("home_app_sidebar_collapsed") === "true",
  )
  const bg = useColorModeValue("white", "$neutral3")
  const border = useColorModeValue("$neutral5", "$neutral7")

  const toggleCollapsed = () => {
    const next = !collapsed()
    setCollapsed(next)
    localStorage.setItem("home_app_sidebar_collapsed", String(next))
  }

  const selectPage = (page: HomePageKey) => {
    props.setActivePage(page)
    localStorage.setItem("home_app_page", page)
  }

  return (
    <Box
      as="aside"
      w={collapsed() ? "4rem" : "12rem"}
      flexShrink={0}
      minH="calc(100vh - 4rem)"
      p="$2"
      display={{ "@initial": "none", "@md": "block" }}
      transition="width 160ms ease"
    >
      <VStack
        alignItems="stretch"
        spacing="$2"
        pos="sticky"
        top="$2"
        bgColor={bg()}
        border="1px solid"
        borderColor={border()}
        rounded="$lg"
        p="$2"
      >
        <HStack justifyContent={collapsed() ? "center" : "space-between"}>
          <Show when={!collapsed()}>
            <Text fontWeight="$semibold">{t("home.sidebar.title")}</Text>
          </Show>
          <Tooltip label={t("home.sidebar.collapse")}>
            <IconButton
              aria-label={t("home.sidebar.collapse")}
              size="sm"
              compact
              icon={<CgMoreO />}
              onClick={toggleCollapsed}
            />
          </Tooltip>
        </HStack>
        <VStack alignItems="stretch" spacing="$1">
          <For each={pageItems}>
            {(item) => {
              const active = () => props.activePage() === item.key
              const label = () => t(`home.sidebar.${item.key}`)
              return (
                <Tooltip label={collapsed() ? label() : ""}>
                  <Button
                    variant={active() ? "solid" : "subtle"}
                    colorScheme={active() ? "accent" : "neutral"}
                    justifyContent={collapsed() ? "center" : "flex-start"}
                    px={collapsed() ? "$2" : "$3"}
                    onClick={() => selectPage(item.key)}
                  >
                    <HStack spacing="$2" minW={0}>
                      <Icon as={item.icon} />
                      <Show when={!collapsed()}>
                        <Text noOfLines={1}>{label()}</Text>
                      </Show>
                    </HStack>
                  </Button>
                </Tooltip>
              )
            }}
          </For>
        </VStack>
      </VStack>
    </Box>
  )
}
