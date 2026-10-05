"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LocalizedPosBadge } from "@/components/LocalizedPosBadge";
import type { POS } from "@/lib/types";

type Suggestion = {
  id: string;
  lemma: string;
  pos: POS;
  matchType?: "exact" | "prefix" | "contains";
  crowdsourced: boolean;
  definition: string | null;
};

const DEBOUNCE_MS = 160;

/**
 * Search form with live word suggestions from the lexicon (imported XML plus
 * every validated contribution). Suggestions are only offered for word-form
 * searches; ID and gloss searches pass `suggest={false}`.
 */
export function SearchBox({
  initialQuery = "",
  target = "/search",
  large = false,
  suggest = true,
}: {
  initialQuery?: string;
  target?: string;
  large?: boolean;
  suggest?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const [fetchedFor, setFetchedFor] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!suggest || !term) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/lexicon/suggest?q=${encodeURIComponent(term)}&limit=8`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items?: Suggestion[] };
        setItems(Array.isArray(data.items) ? data.items : []);
        setFailed(false);
        setFetchedFor(term);
        setActive(-1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setItems([]);
        setFailed(true);
        setFetchedFor(term);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q, suggest]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    if (process.env.NODE_ENV === "production" && href.startsWith("/word/")) {
      window.location.assign(href);
    } else {
      router.push(href);
    }
  };

  const submitSearch = () => {
    const term = q.trim();
    if (term) go(`${target}?q=${encodeURIComponent(term)}`);
  };

  const term = q.trim();
  const showPanel = suggest && open && term.length > 0 && (loading || fetchedFor === term);
  // Options: each suggestion, then "see all results".
  const optionCount = items.length + 1;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (!suggest || !term) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    } else if (
      e.key === "Enter" &&
      showPanel &&
      fetchedFor === term &&
      active >= 0 &&
      active < items.length
    ) {
      e.preventDefault();
      go(`/word/${items[active].id}`);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        className={`flex w-full gap-2 ${large ? "flex-col sm:flex-row" : "flex-row"}`}
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        role="search"
      >
        <div className="relative min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t("searchPlaceholder")}
            className={`font-bengali w-full min-w-0 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 ${
              large
                ? "px-4 py-3.5 text-base sm:px-5 sm:py-4 sm:text-lg"
                : "px-3.5 py-2.5 text-sm sm:px-4"
            }`}
            lang="bn"
            aria-label={t("wordSearch")}
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            {...(suggest
              ? {
                  role: "combobox",
                  "aria-autocomplete": "list" as const,
                  "aria-expanded": showPanel,
                  "aria-controls": listId,
                  "aria-activedescendant":
                    showPanel && active >= 0 ? optionId(active) : undefined,
                }
              : {})}
          />
          {suggest && loading && term ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"
            />
          ) : null}
          {renderPanel()}
        </div>
        <button
          type="submit"
          className={`shrink-0 rounded-xl bg-emerald-700 font-semibold text-white shadow-sm transition hover:bg-emerald-800 ${
            large
              ? "min-h-12 px-6 py-3.5 text-base sm:px-7 sm:py-4"
              : "min-h-10 px-4 py-2.5 text-sm sm:px-5"
          }`}
        >
          {t("search")}
        </button>
      </form>
    </div>
  );

  function renderPanel() {
    if (!showPanel) return null;
    return (
        <div className="absolute top-full left-0 z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl">
          <ul id={listId} role="listbox" aria-label={t("suggestionsLabel")} className="max-h-80 overflow-y-auto py-1">
            {loading && fetchedFor !== term ? (
              <li className="px-4 py-3 text-sm text-slate-400" aria-live="polite">
                {t("searching")}
              </li>
            ) : failed ? (
              <li className="px-4 py-3 text-sm text-red-700" role="alert">
                {t("lexiconUnavailable")}
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">{t("noSuggestions")}</li>
            ) : (
              items.map((s, i) => (
                <li
                  key={s.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={active === i}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => go(`/word/${s.id}`)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${
                    active === i ? "bg-emerald-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bengali text-base font-semibold text-slate-900">
                        {s.lemma}
                      </span>
                      <LocalizedPosBadge pos={s.pos} />
                      {s.crowdsourced ? (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                          {t("crowdsourced")}
                        </span>
                      ) : null}
                    </div>
                    {s.definition ? (
                      <p className="font-bengali mt-0.5 truncate text-xs text-slate-500">
                        {s.definition}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))
            )}
            <li
              id={optionId(items.length)}
              role="option"
              aria-selected={active === items.length}
              onPointerDown={(e) => e.preventDefault()}
              onClick={submitSearch}
              onMouseEnter={() => setActive(items.length)}
              className={`cursor-pointer border-t border-slate-100 px-4 py-2.5 text-sm font-semibold text-emerald-700 ${
                active === items.length ? "bg-emerald-50" : "hover:bg-slate-50"
              }`}
            >
              {t("seeAllResults")} <span className="font-bengali">“{term}”</span> →
            </li>
          </ul>
        </div>
    );
  }
}
