import { Markdown } from "~/components"
import { useTitle } from "~/hooks"
import { getSetting } from "~/store"
import { notify } from "~/utils"
import { Body } from "./Body"
import { Footer } from "./Footer"
import { HomeAppSidebar, HomePageKey } from "./HomeAppSidebar"
import { Header } from "./header/Header"
import { MobileShareManagement } from "./mobile_share/MobileShareManagement"
import ResourceSearch from "../manage/subscription/ResourceSearch"
import { SubscriptionManagement } from "./SubscriptionManagement"
import { ClusterControl } from "./ClusterControl"
import { Toolbar } from "./toolbar/Toolbar"
import { Box, HStack, VStack } from "@hope-ui/solid"
import { createSignal, JSXElement, Match, Switch } from "solid-js"
import { Container } from "./Container"

const initialHomePage = (): HomePageKey => {
  const stored = localStorage.getItem("home_app_page")
  if (stored === "task_board") return "cluster_control"
  if (
    stored === "netdisk" ||
    stored === "subscriptions" ||
    stored === "mobile_share" ||
    stored === "resource_search" ||
    stored === "cluster_control"
  ) {
    return stored
  }
  return "netdisk"
}

const HomeContentPanel = (props: { children: JSXElement }) => (
  <Container>
    <VStack
      w="$full"
      minH="80vh"
      py="$4"
      px="2%"
      spacing="$3"
      alignItems="stretch"
    >
      {props.children}
    </VStack>
  </Container>
)

const Index = () => {
  useTitle(getSetting("site_title"))
  const [activePage, setActivePage] =
    createSignal<HomePageKey>(initialHomePage())
  const announcement = getSetting("announcement")
  if (announcement) {
    notify.render(<Markdown children={announcement} />)
  }
  return (
    <>
      <Header />
      <HStack w="$full" alignItems="stretch" spacing="$0">
        <HomeAppSidebar activePage={activePage} setActivePage={setActivePage} />
        <Box flex="1" minW={0}>
          <Switch>
            <Match when={activePage() === "netdisk"}>
              <Toolbar />
              <Body />
            </Match>
            <Match when={activePage() === "subscriptions"}>
              <SubscriptionManagement />
            </Match>
            <Match when={activePage() === "mobile_share"}>
              <MobileShareManagement />
            </Match>
            <Match when={activePage() === "resource_search"}>
              <HomeContentPanel>
                <ResourceSearch
                  titleKey="home.sidebar.resource_search"
                  titleMode="site"
                />
              </HomeContentPanel>
            </Match>
            <Match when={activePage() === "cluster_control"}>
              <HomeContentPanel>
                <ClusterControl />
              </HomeContentPanel>
            </Match>
          </Switch>
        </Box>
      </HStack>
      <Footer />
    </>
  )
}

export default Index
