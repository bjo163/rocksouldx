import { type ComponentProps } from "solid-js"

export function Wordmark(
  props: Pick<ComponentProps<"svg">, "class"> & { fade?: boolean; muted?: boolean; outline?: boolean },
) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 129" fill="none" classList={{ [props.class ?? ""]: !!props.class, "overflow-visible": !!props.outline }} aria-hidden="true">
      <text data-slot="wordmark-text" x="360" y="96" text-anchor="middle" fill={props.outline ? "none" : "currentColor"} stroke={props.outline ? "currentColor" : "none"} stroke-width={props.outline ? 1.4 : 0} opacity={props.muted === false ? 1 : 0.72} font-size="100" font-weight="900" letter-spacing="5" style={{ "font-family": "var(--font-family-sans)" }}>ROCKSOUL</text>
      <path d="M72 116H648" stroke="#E17A3D" stroke-width="5" opacity={props.fade === false ? 1 : 0.55}/>
    </svg>
  )
}
