import type { Platform } from "@opencode/app/desktop"
import { onCleanup, onMount, Show } from "solid-js"
import "./splash.css"

function RocksoulMark(props: { class?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      class={props.class}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 2.5 34 10.2V27.8L20 35.5 6 27.8V10.2L20 2.5Z"
        pathLength="1"
        stroke="#F15A24"
        strokeWidth="2.4"
        strokeLinejoin="miter"
      />
      <path
        d="M13 27V12h8.2c5.2 0 6.8 6.3 2.5 8.8L30 27M13 20.5h9.5"
        pathLength="1"
        stroke="currentColor"
        strokeWidth="3.1"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M29.5 7.8 32.5 9.5"
        pathLength="1"
        stroke="#C4DE65"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
    </svg>
  )
}

function RocksoulWordmark(props: { compact?: boolean }) {
  return (
    <span
      class="flex items-baseline font-semibold uppercase"
      classList={{
        "gap-2 text-[30px] tracking-[-0.075em]": !props.compact,
        "gap-1.5 text-[17px] tracking-[-0.06em]": props.compact,
      }}
    >
      <span>ROCKSOUL</span>
      <span class="text-[#F15A24]">DX</span>
    </span>
  )
}

export function LoadingSplash(props: {
  deep: boolean
  firstLaunch: boolean
  platform: Platform
  drawingPaused: boolean
  onDrawStart: () => void
  onDrawEnd: () => void
}) {
  onMount(() => {
    if (!props.drawingPaused) return
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const start = () => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) return
      props.onDrawStart()

      if (motion.matches) props.onDrawEnd()
    }

    window.addEventListener("focus", start)
    document.addEventListener("visibilitychange", start)
    motion.addEventListener("change", start)
    start()
    onCleanup(() => {
      window.removeEventListener("focus", start)
      document.removeEventListener("visibilitychange", start)
      motion.removeEventListener("change", start)
    })
  })

  const titlebarHeight = () => {
    const zoom = props.platform.webviewZoom?.() ?? 1

    if (props.platform.os === "macos") return `max(36px, ${36 / zoom}px)`

    if (props.platform.os === "windows")
      return `max(36px, env(titlebar-area-height, ${44 / Math.min(Math.max(zoom, 0.25), 1)}px))`

    return "36px"
  }

  return (
    <Show
      when={props.firstLaunch}
      fallback={
        <div
          data-component="startup-splash"
          class="h-dvh w-screen flex flex-col items-center justify-center gap-4"
          classList={{
            "bg-v2-background-bg-deep": props.deep,
            "bg-v2-background-bg-base": !props.deep,
          }}
        >
          <RocksoulMark class="size-16" />
          <div class="flex flex-col items-center gap-1">
            <RocksoulWordmark compact />
            <span class="text-[9px] font-medium tracking-[0.28em] text-v2-text-text-muted">AGENT WORKBENCH</span>
          </div>
        </div>
      }
    >
      <div
        data-component="first-launch-splash"
        data-drawing={props.drawingPaused ? "pending" : "running"}
        aria-hidden="true"
        class="h-dvh w-screen bg-v2-background-bg-base"
        style={{
          "padding-block-start": `calc(${titlebarHeight()} + ${props.platform.os === "windows" ? 1 : 8}px)`,
          "padding-block-end": "8px",
          "padding-inline": "32px",
        }}
        onAnimationEnd={(event) => {
          if (event.animationName === "first-launch-wordmark-draw") props.onDrawEnd()
        }}
      >
        <div class="relative size-full">
          <div class="absolute inset-x-0 top-[25.375%]">
            <div class="mx-auto flex w-full max-w-[720px] flex-col items-center text-center">
              <RocksoulMark class="mb-6 size-20 text-v2-text-text-base" />
              <RocksoulWordmark />
              <span class="mt-3 text-[10px] font-medium tracking-[0.34em] text-v2-text-text-muted">
                AGENT WORKBENCH / BUILT FOR MOMENTUM
              </span>
              <span class="mt-8 h-[3px] w-16 bg-[#F15A24]" />
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}
