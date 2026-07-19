import { Box, Button, HStack, Icon, VStack } from "@hope-ui/solid"
import {
  BsArrowLeftRight,
  BsGearFill,
  BsHddNetwork,
  BsWindow,
} from "solid-icons/bs"
import {
  createMemo,
  createSignal,
  For,
  lazy,
  Match,
  onCleanup,
  onMount,
  Show,
  Suspense,
  Switch,
} from "solid-js"
import { useT } from "~/hooks"
import { ClusterRole } from "~/types"
import { clusterGetConfig, handleResp } from "~/utils"
import { LoadingBlock } from "../manage/cluster/components"

const Overview = lazy(() => import("../manage/cluster/Overview"))
const Nodes = lazy(() => import("../manage/cluster/Nodes"))
const Jobs = lazy(() => import("../manage/cluster/Jobs"))
const Settings = lazy(() => import("../manage/cluster/Settings"))

type ClusterControlTab = "overview" | "nodes" | "tasks" | "settings"

const tabItems = {
  overview: { icon: BsWindow },
  nodes: { icon: BsHddNetwork },
  tasks: { icon: BsArrowLeftRight },
  settings: { icon: BsGearFill },
} satisfies Record<ClusterControlTab, { icon: typeof BsWindow }>

export const tabsForRole = (role: ClusterRole): ClusterControlTab[] =>
  role === "hybrid" || role === "coordinator"
    ? ["overview", "nodes", "tasks", "settings"]
    : ["tasks", "settings"]

const initialTab = (tabs: ClusterControlTab[]) => {
  const stored = localStorage.getItem(
    "home_cluster_control_tab",
  ) as ClusterControlTab | null
  return stored && tabs.includes(stored) ? stored : tabs[0]
}

const tabID = (tab: ClusterControlTab) => `cluster-control-tab-${tab}`
const panelID = (tab: ClusterControlTab) => `cluster-control-panel-${tab}`

export const ClusterControl = () => {
  const t = useT()
  const [role, setRole] = createSignal<ClusterRole>("standalone")
  const [activeTab, setActiveTab] = createSignal<ClusterControlTab>("tasks")
  const [loading, setLoading] = createSignal(true)
  const visibleTabs = createMemo(() => tabsForRole(role()))
  let mounted = true

  onCleanup(() => {
    mounted = false
  })

  const applyRole = (nextRole: ClusterRole) => {
    const tabs = tabsForRole(nextRole)
    const nextTab = initialTab(tabs)
    setRole(nextRole)
    setActiveTab(nextTab)
    localStorage.setItem("home_cluster_control_tab", nextTab)
  }

  onMount(async () => {
    let redirecting = false
    try {
      const response = await clusterGetConfig()
      if (!mounted) return
      if (response.code === 401) {
        redirecting = true
        handleResp(response)
        return
      }
      if (response.code === 200) {
        handleResp(response, (config) => applyRole(config.active_role))
      } else {
        handleResp(response)
        applyRole("standalone")
      }
    } catch {
      if (mounted) applyRole("standalone")
    } finally {
      if (mounted && !redirecting) setLoading(false)
    }
  })

  const selectTab = (tab: ClusterControlTab) => {
    setActiveTab(tab)
    localStorage.setItem("home_cluster_control_tab", tab)
  }

  const focusTab = (tab: ClusterControlTab) => {
    selectTab(tab)
    queueMicrotask(() => document.getElementById(tabID(tab))?.focus())
  }

  const handleTabKeyDown = (
    event: KeyboardEvent,
    currentTab: ClusterControlTab,
  ) => {
    const tabs = visibleTabs()
    const currentIndex = tabs.indexOf(currentTab)
    let nextTab: ClusterControlTab | undefined
    if (event.key === "ArrowRight") {
      nextTab = tabs[(currentIndex + 1) % tabs.length]
    } else if (event.key === "ArrowLeft") {
      nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
    } else if (event.key === "Home") {
      nextTab = tabs[0]
    } else if (event.key === "End") {
      nextTab = tabs[tabs.length - 1]
    }
    if (!nextTab) return
    event.preventDefault()
    focusTab(nextTab)
  }

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4">
      <Show
        when={!loading()}
        fallback={
          <Box w="$full" py="$3">
            <LoadingBlock />
          </Box>
        }
      >
        <Box w="$full" overflowX="auto">
          <HStack
            role="tablist"
            aria-label={t("home.sidebar.cluster_control")}
            spacing="$2"
            minW="max-content"
          >
            <For each={visibleTabs()}>
              {(tab) => (
                <Button
                  id={tabID(tab)}
                  role="tab"
                  aria-selected={activeTab() === tab}
                  aria-controls={panelID(tab)}
                  tabIndex={activeTab() === tab ? 0 : -1}
                  variant={activeTab() === tab ? "solid" : "subtle"}
                  colorScheme={activeTab() === tab ? "accent" : "neutral"}
                  flexShrink={0}
                  onClick={() => selectTab(tab)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab)}
                >
                  <HStack spacing="$2">
                    <Icon as={tabItems[tab].icon} />
                    <span>{t(`home.cluster_control.tabs.${tab}`)}</span>
                  </HStack>
                </Button>
              )}
            </For>
          </HStack>
        </Box>

        <Box
          id={panelID(activeTab())}
          role="tabpanel"
          aria-labelledby={tabID(activeTab())}
          tabIndex={0}
        >
          <Suspense
            fallback={
              <Box w="$full" py="$3">
                <LoadingBlock />
              </Box>
            }
          >
            <Switch>
              <Match when={activeTab() === "overview"}>
                <Overview embedded />
              </Match>
              <Match when={activeTab() === "nodes"}>
                <Nodes embedded />
              </Match>
              <Match when={activeTab() === "tasks"}>
                <Jobs embedded />
              </Match>
              <Match when={activeTab() === "settings"}>
                <Settings embedded />
              </Match>
            </Switch>
          </Suspense>
        </Box>
      </Show>
    </VStack>
  )
}
