import { Markdown } from "~/components"
import { useTitle } from "~/hooks"
import { getSetting } from "~/store"
import { notify } from "~/utils"
import { Body } from "./Body"
import { Footer } from "./Footer"
import { HomeAppSidebar, HomePageKey } from "./HomeAppSidebar"
import { Header } from "./header/Header"
import { MobileShareManagement } from "./mobile_share/MobileShareManagement"
import { SubscriptionManagement } from "./SubscriptionManagement"
import { Toolbar } from "./toolbar/Toolbar"
import { Box, HStack } from "@hope-ui/solid"
import { createSignal, Match, Switch } from "solid-js"

const initialHomePage = (): HomePageKey => {
  const stored = localStorage.getItem("home_app_page")
  if (
    stored === "netdisk" ||
    stored === "subscriptions" ||
    stored === "mobile_share"
  ) {
    return stored
  }
  return "netdisk"
}

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
          </Switch>
        </Box>
      </HStack>
      <Footer />
    </>
  )
}

export default Index
