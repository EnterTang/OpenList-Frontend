import {
  Badge,
  Box,
  HStack,
  Progress,
  Text,
  VStack,
  useColorModeValue,
} from "@hope-ui/solid"
import { JSXElement, Show } from "solid-js"
import { useT } from "~/hooks"
import {
  jobStatusColor,
  nodeStatusColor,
  resultStatusColor,
  StatusColor,
} from "./helpers"
import {
  ClusterJobStatus,
  ClusterNodeStatus,
  ClusterUploadManifestStatus,
} from "~/types"

export const PageHeader = (props: {
  titleKey: string
  descriptionKey: string
  actions?: JSXElement
}) => {
  const t = useT()
  return (
    <HStack
      w="$full"
      alignItems={{ "@initial": "stretch", "@md": "center" }}
      justifyContent="space-between"
      flexDirection={{ "@initial": "column", "@md": "row" }}
      gap="$3"
    >
      <Box>
        <Text size="xl" fontWeight="$semibold">
          {t(props.titleKey)}
        </Text>
        <Text size="sm" color="$neutral11" mt="$1">
          {t(props.descriptionKey)}
        </Text>
      </Box>
      {props.actions}
    </HStack>
  )
}

export const Panel = (props: {
  titleKey?: string
  action?: JSXElement
  children: JSXElement
}) => {
  const t = useT()
  const border = useColorModeValue("$neutral5", "$neutral7")
  const bg = useColorModeValue("white", "$neutral3")
  return (
    <Box
      borderWidth="1px"
      borderColor={border()}
      borderRadius="$lg"
      bg={bg()}
      overflow="hidden"
    >
      <Show when={props.titleKey}>
        <HStack
          px="$4"
          py="$3"
          justifyContent="space-between"
          borderBottomWidth="1px"
          borderColor={border()}
        >
          <Text fontWeight="$semibold">{t(props.titleKey!)}</Text>
          {props.action}
        </HStack>
      </Show>
      {props.children}
    </Box>
  )
}

export const Metric = (props: {
  labelKey: string
  value: string | number
  tone?: StatusColor
}) => {
  const t = useT()
  const muted = useColorModeValue("$neutral2", "$neutral4")
  const toneColor: Record<StatusColor, string> = {
    neutral: "$neutral12",
    info: "$info11",
    success: "$success11",
    warning: "$warning11",
    danger: "$danger11",
    accent: "$accent11",
  }
  return (
    <Box px="$4" py="$3" bg={muted()} borderRadius="$md" minW="0">
      <Text size="sm" color="$neutral11" noOfLines={1}>
        {t(props.labelKey)}
      </Text>
      <Text
        mt="$1"
        size="2xl"
        fontWeight="$semibold"
        color={toneColor[props.tone || "neutral"]}
      >
        {props.value}
      </Text>
    </Box>
  )
}

export const LoadingBlock = () => <Progress indeterminate size="xs" />

export const EmptyBlock = (props: {
  titleKey: string
  descriptionKey: string
}) => {
  const t = useT()
  return (
    <VStack py="$10" px="$4" spacing="$1" textAlign="center">
      <Text fontWeight="$medium">{t(props.titleKey)}</Text>
      <Text size="sm" color="$neutral11" maxW="32rem">
        {t(props.descriptionKey)}
      </Text>
    </VStack>
  )
}

const StateBadge = (props: {
  value: string
  color: StatusColor
  prefix: string
}) => {
  const t = useT()
  return (
    <Badge colorScheme={props.color}>
      {t(`${props.prefix}.${props.value}`)}
    </Badge>
  )
}

export const NodeStatusBadge = (props: { status: ClusterNodeStatus }) => (
  <StateBadge
    value={props.status}
    color={nodeStatusColor[props.status]}
    prefix="cluster.node_status"
  />
)

export const JobStatusBadge = (props: { status: ClusterJobStatus }) => (
  <StateBadge
    value={props.status}
    color={jobStatusColor[props.status]}
    prefix="cluster.job_status"
  />
)

export const ResultStatusBadge = (props: {
  status: ClusterUploadManifestStatus
}) => (
  <StateBadge
    value={props.status}
    color={resultStatusColor[props.status]}
    prefix="cluster.result_status"
  />
)
