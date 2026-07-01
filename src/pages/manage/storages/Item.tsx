import {
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Select,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { For, Match, Show, Switch } from "solid-js"
import type { Accessor } from "solid-js"
import { useT } from "~/hooks"
import { DriverItem, Type } from "~/types"
import { SelectOptions } from "~/components"

export type ItemProps = DriverItem & {
  readonly?: boolean
  full_name_path?: string
  options_prefix?: string
  driver?: string
  searchable?: boolean
  onChange?: (value: any) => void
  value: boolean | number | string | Accessor<boolean | number | string>
}

const Item = (props: ItemProps) => {
  const t = useT()
  const getVal = <T,>(v: T | Accessor<T>) =>
    (typeof v === "function" ? (v as Accessor<T>)() : v) as T
  const labelKey = () =>
    (props.full_name_path ?? props.driver === "common")
      ? `storages.common.${props.name}`
      : `drivers.${props.driver}.${props.name}`
  const tipsKey = () =>
    props.driver === "common"
      ? `storages.common.${props.name}-tips`
      : `drivers.${props.driver}.${props.name}-tips`
  const optionLabel = (key: string) =>
    t(
      (props.options_prefix ??
        (props.driver === "common"
          ? `storages.common.${props.name}s`
          : `drivers.${props.driver}.${props.name}s`)) + `.${key}`,
    )
  return (
    <FormControl
      w="$full"
      display="flex"
      flexDirection="column"
      required={props.required}
    >
      <FormLabel for={props.name} display="flex" alignItems="center">
        {t(labelKey(), undefined, props.label)}
      </FormLabel>
      <Switch fallback={<Center>{t("settings.unknown_type")}</Center>}>
        <Match when={props.type === Type.String}>
          <Input
            id={props.name}
            type={props.name == "password" ? "password" : "text"}
            readOnly={props.readonly}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.String
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Number}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as number | Accessor<number>)}
            onInput={
              props.type === Type.Number
                ? (e) => props.onChange?.(parseInt(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Float}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as number | Accessor<number>)}
            onInput={
              props.type === Type.Float
                ? (e) => props.onChange?.(parseFloat(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <HopeSwitch
            id={props.name}
            readOnly={props.readonly}
            checked={getVal(props.value as boolean | Accessor<boolean>)}
            onChange={
              props.type === Type.Bool
                ? (e: any) => props.onChange?.(e.currentTarget.checked)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Text}>
          <Textarea
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.Text
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.name}
            readOnly={props.readonly}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.Select
                ? (e) => props.onChange?.(e)
                : undefined
            }
          >
            <SelectOptions
              readonly={props.readonly}
              searchable={props.type === Type.Select && props.searchable}
              options={props.options.split(",").map((key) => ({
                key,
                label: optionLabel(key),
              }))}
            />
          </Select>
        </Match>
        <Match when={props.type === Type.Radio}>
          <RadioGroup
            id={props.name}
            value={getVal(props.value as string | Accessor<string>)}
            onChange={
              props.type === Type.Radio
                ? (value: string) => props.onChange?.(value)
                : undefined
            }
          >
            <HStack spacing="$4" wrap="wrap">
              <For each={props.options.split(",")}>
                {(key) => (
                  <Radio value={key} disabled={props.readonly}>
                    {optionLabel(key)}
                  </Radio>
                )}
              </For>
            </HStack>
          </RadioGroup>
        </Match>
      </Switch>
      <Show when={props.help}>
        <FormHelperText>{t(tipsKey(), undefined, props.help)}</FormHelperText>
      </Show>
    </FormControl>
  )
}

export { Item }
