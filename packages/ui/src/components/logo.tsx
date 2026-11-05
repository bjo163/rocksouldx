import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => (
  <svg data-component="logo-mark" aria-hidden="true" classList={{ [props.class ?? ""]: !!props.class }} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3.5H18.5C25.1 3.5 28.5 7.2 28.5 13.1C28.5 17.3 26.4 20.1 22.4 21.6L29.5 29H21.1L15.2 22.8H11.5V29H5V3.5ZM11.5 9.7V16.8H18.1C21 16.8 22.2 15.7 22.2 13.2C22.2 10.8 21 9.7 18.1 9.7H11.5Z" fill="currentColor"/>
    <path d="M3 3H7V29H3V3Z" fill="#E17A3D"/>
  </svg>
)

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => (
  <svg ref={props.ref} data-component="logo-splash" aria-hidden="true" classList={{ [props.class ?? ""]: !!props.class }} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 8H46.2C62.4 8 70.5 17.1 70.5 31.5C70.5 41.8 65.3 48.7 55.6 52.4L73 72H52.5L38.2 55.6H27V72H12.5V8ZM27 22.5V41.8H45.5C52.5 41.8 56 38.5 56 32.1C56 25.8 52.5 22.5 45.5 22.5H27Z" fill="currentColor"/>
    <path d="M7 8H16V72H7V8Z" fill="#E17A3D"/>
  </svg>
)

export const Logo = (props: { class?: string }) => (
  <svg data-component="rocksoul-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 48" fill="none" classList={{ [props.class ?? ""]: !!props.class }}>
    <g transform="translate(1 3) scale(1.25)">
      <path d="M5 3.5H18.5C25.1 3.5 28.5 7.2 28.5 13.1C28.5 17.3 26.4 20.1 22.4 21.6L29.5 29H21.1L15.2 22.8H11.5V29H5V3.5ZM11.5 9.7V16.8H18.1C21 16.8 22.2 15.7 22.2 13.2C22.2 10.8 21 9.7 18.1 9.7H11.5Z" fill="currentColor"/>
      <path d="M3 3H7V29H3V3Z" fill="#E17A3D"/>
    </g>
    <text x="52" y="34" fill="currentColor" font-size="30" font-weight="850" letter-spacing="2" style={{ "font-family": "var(--font-family-sans)" }}>ROCKSOUL</text>
    <path d="M54 42H272" stroke="#E17A3D" stroke-width="3"/>
  </svg>
)
