import { useNavigate } from "@solidjs/router"
import { Icon } from "@opencode/ui/icon"
import { useLanguage } from "@/runtime/i18n/language"
import { useServers } from "@/runtime/server/registry"
import { useTabs } from "@/shell/tabs/tabs"

export function Cockpit() {
  const language = useLanguage()
  const navigate = useNavigate()
  const servers = useServers()
  const tabs = useTabs()

  const sessionTabs = () => tabs.store.filter((tab) => tab.type === "session").length
  const draftTabs = () => tabs.store.filter((tab) => tab.type === "draft").length

  return (
    <main data-page="rocksoul-cockpit" class="mx-[var(--shell-inline-inset,8px)] mb-[var(--shell-bottom-inset,8px)] mt-[var(--shell-top-inset,8px)] min-h-0 flex-1 overflow-y-auto rounded-[10px] bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]">
      <div class="mx-auto flex w-full max-w-[1120px] flex-col gap-7 p-4 sm:p-6 lg:p-8">
        <header class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-v2-text-text-muted">
            <span class="inline-flex size-2 rounded-full bg-v2-state-fg-success" />
            <span class="text-11-medium uppercase tracking-[0.16em]">{language.t("cockpit.eyebrow")}</span>
          </div>
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div class="max-w-2xl">
              <h1 class="text-2xl font-semibold tracking-tight text-v2-text-text-base sm:text-3xl">{language.t("cockpit.title")}</h1>
              <p class="mt-2 max-w-xl text-sm text-v2-text-text-muted">{language.t("cockpit.description")}</p>
            </div>
            <button type="button" onClick={() => navigate("/")} class="inline-flex h-10 items-center gap-2 rounded-[6px] bg-v2-background-bg-contrast px-4 text-sm font-medium text-v2-text-text-contrast hover:opacity-90">
              <Icon name="outline-arrow-left" size="small" />
              {language.t("cockpit.backToWorkspace")}
            </button>
          </div>
        </header>

        <section aria-label={language.t("cockpit.metrics")} class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article data-component="card" class="rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4">
            <div class="flex items-center justify-between gap-3"><span class="text-xs text-v2-text-text-muted">{language.t("cockpit.metric.connections")}</span><Icon name="monitor" size="small" class="text-v2-icon-icon-muted" /></div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-v2-text-text-base">{servers.list.length}</div>
            <p class="mt-1 text-xs text-v2-text-text-muted">{language.t("cockpit.metric.connectionsHint")}</p>
          </article>
          <article data-component="card" class="rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4">
            <div class="flex items-center justify-between gap-3"><span class="text-xs text-v2-text-text-muted">{language.t("cockpit.metric.sessions")}</span><Icon name="comment" size="small" class="text-v2-icon-icon-muted" /></div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-v2-text-text-base">{sessionTabs()}</div>
            <p class="mt-1 text-xs text-v2-text-text-muted">{language.t("cockpit.metric.sessionsHint")}</p>
          </article>
          <article data-component="card" class="rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4">
            <div class="flex items-center justify-between gap-3"><span class="text-xs text-v2-text-text-muted">{language.t("cockpit.metric.drafts")}</span><Icon name="file-document" size="small" class="text-v2-icon-icon-muted" /></div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-v2-text-text-base">{draftTabs()}</div>
            <p class="mt-1 text-xs text-v2-text-text-muted">{language.t("cockpit.metric.draftsHint")}</p>
          </article>
          <article data-component="card" class="rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4">
            <div class="flex items-center justify-between gap-3"><span class="text-xs text-v2-text-text-muted">{language.t("cockpit.metric.tabs")}</span><Icon name="window-analytics" size="small" class="text-v2-icon-icon-muted" /></div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-v2-text-text-base">{tabs.store.length}</div>
            <p class="mt-1 text-xs text-v2-text-text-muted">{language.t("cockpit.metric.tabsHint")}</p>
          </article>
        </section>

        <section class="flex flex-col gap-3">
          <div><h2 class="text-base font-semibold text-v2-text-text-base">{language.t("cockpit.quick.title")}</h2><p class="mt-1 text-sm text-v2-text-text-muted">{language.t("cockpit.quick.description")}</p></div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <button type="button" onClick={() => navigate("/")} class="group flex min-h-36 flex-col items-start justify-between rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4 text-start transition-colors hover:bg-v2-background-bg-layer-01">
              <span class="flex size-9 items-center justify-center rounded-[6px] bg-v2-background-bg-layer-02 text-v2-icon-icon-base"><Icon name="folder" size="small" /></span>
              <span class="mt-4"><span class="block text-sm font-semibold text-v2-text-text-base">{language.t("cockpit.quick.workspace")}</span><span class="mt-1 block text-xs text-v2-text-text-muted">{language.t("cockpit.quick.workspaceHint")}</span></span>
              <span class="mt-3 text-xs font-medium text-v2-text-text-accent">{language.t("cockpit.quick.open")} <Icon name="arrow-up-right" size="small" /></span>
            </button>
            <button type="button" onClick={() => navigate("/new-session")} class="group flex min-h-36 flex-col items-start justify-between rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4 text-start transition-colors hover:bg-v2-background-bg-layer-01">
              <span class="flex size-9 items-center justify-center rounded-[6px] bg-v2-background-bg-layer-02 text-v2-icon-icon-base"><Icon name="plus" size="small" /></span>
              <span class="mt-4"><span class="block text-sm font-semibold text-v2-text-text-base">{language.t("cockpit.quick.newSession")}</span><span class="mt-1 block text-xs text-v2-text-text-muted">{language.t("cockpit.quick.newSessionHint")}</span></span>
              <span class="mt-3 text-xs font-medium text-v2-text-text-accent">{language.t("cockpit.quick.open")} <Icon name="arrow-up-right" size="small" /></span>
            </button>
            <button type="button" onClick={() => navigate("/settings")} class="group flex min-h-36 flex-col items-start justify-between rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-4 text-start transition-colors hover:bg-v2-background-bg-layer-01">
              <span class="flex size-9 items-center justify-center rounded-[6px] bg-v2-background-bg-layer-02 text-v2-icon-icon-base"><Icon name="settings-gear" size="small" /></span>
              <span class="mt-4"><span class="block text-sm font-semibold text-v2-text-text-base">{language.t("cockpit.quick.settings")}</span><span class="mt-1 block text-xs text-v2-text-text-muted">{language.t("cockpit.quick.settingsHint")}</span></span>
              <span class="mt-3 text-xs font-medium text-v2-text-text-accent">{language.t("cockpit.quick.open")} <Icon name="arrow-up-right" size="small" /></span>
            </button>
          </div>
        </section>

        <p class="border-t border-v2-border-border-base pt-4 text-xs leading-relaxed text-v2-text-text-muted">{language.t("cockpit.disclaimer")}</p>
      </div>
    </main>
  )
}
