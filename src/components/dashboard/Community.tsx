"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ROLE_LABEL, timeAgo } from "@/lib/format";
import { TIER_ICON, TIER_LABEL, TIER_STYLE } from "@/lib/tiers";
import type { LeaderboardTier, ReactionType, Role } from "@/lib/types";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

/* ------------------------------------------------------------------ */
/* View models (as returned by GET /api/community)                     */
/* ------------------------------------------------------------------ */

export interface PostReplyView {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  text: string;
  createdAt: string;
  isMine: boolean;
}

export interface PostReportView {
  reporterId: string;
  reporterName: string;
  reason: string | null;
  reportedAt: string;
}

export interface PostView {
  id: string;
  text: string;
  auto: boolean;
  createdAt: string;
  hidden: boolean;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorTier: LeaderboardTier | null;
  reactionCounts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
  replyCount: number;
  replies: PostReplyView[];
  reportCount: number;
  reportedByMe: boolean;
  isMine: boolean;
  /** Present for System Moderators only (SRS §14.5). */
  reports?: PostReportView[];
}

export interface FeedPage {
  items: PostView[];
  page: number;
  size: number;
  totalElements: number;
  hasMore: boolean;
  canModerate: boolean;
  reportedCount?: number;
}

export const POST_MAX = 500;
export const REPLY_MAX = 200;
const REASON_MAX = 300;

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Network error — check your connection and try again." } };
  }
}

function errorText(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.error === "string") return data.error;
  const errors = data.errors as Record<string, string> | undefined;
  if (errors) return Object.values(errors)[0] ?? fallback;
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Feed: composer + paged list with in-place updates                   */
/* ------------------------------------------------------------------ */

export function CommunityFeed({
  initial,
  view,
  authorId,
  showComposer,
  emptyTitle,
  emptyMessage,
}: {
  initial: FeedPage;
  view?: "reported";
  authorId?: string;
  showComposer: boolean;
  emptyTitle: string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<PostView[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [total, setTotal] = useState(initial.totalElements);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canModerate = initial.canModerate;

  async function loadMore() {
    setLoading(true);
    setLoadError(null);
    const qs = new URLSearchParams({ page: String(page + 1), size: String(initial.size) });
    if (view) qs.set("view", view);
    if (authorId) qs.set("authorId", authorId);
    try {
      const res = await fetch(`/api/community?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as FeedPage & { error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load more posts.");
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))];
      });
      setPage(data.page);
      setHasMore(data.hasMore);
      setTotal(data.totalElements);
    } catch {
      setLoadError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const onChange = useCallback(
    (id: string, next: PostView | null) => {
      setItems((prev) => {
        if (next === null || (view === "reported" && next.reportCount === 0)) {
          setTotal((t) => Math.max(0, t - 1));
          return prev.filter((p) => p.id !== id);
        }
        return prev.map((p) => (p.id === id ? next : p));
      });
    },
    [view]
  );

  return (
    <div className="space-y-4">
      {showComposer ? (
        <PostComposer
          onPublished={(post) => {
            setItems((prev) => [post, ...prev]);
            setTotal((t) => t + 1);
          }}
        />
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl" aria-hidden>
            🗨
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-700">{emptyTitle}</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        items.map((p) => <PostCard key={p.id} post={p} canModerate={canModerate} onChange={onChange} />)
      )}

      {loadError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {loadError}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          {hasMore ? (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Load more posts"}
            </button>
          ) : null}
          <p className="text-xs text-slate-400">
            Showing {items.length} of {total} post{total === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post composer (SRS §14.2) — text only, max 500 characters           */
/* ------------------------------------------------------------------ */

export function PostComposer({ onPublished }: { onPublished: (post: PostView) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trimmed = text.trim();

  async function publish() {
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson("/api/community", { text: trimmed });
    setBusy(false);
    if (!ok) {
      setError(errorText(data, "The post could not be published."));
      return;
    }
    setText("");
    if (data.post) onPublished(data.post as PostView);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="composer-title">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h2 id="composer-title" className="text-sm font-semibold text-slate-800">
          Share with the community
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">Text only, up to {POST_MAX} characters</p>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <label htmlFor="community-post" className="sr-only">
          New post
        </label>
        <textarea
          id="community-post"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) publish();
          }}
          rows={3}
          maxLength={POST_MAX}
          placeholder="Share an update, a question, a blocker or a milestone…"
          className="font-bengali w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`text-xs tabular-nums ${text.length > POST_MAX - 50 ? "font-bold text-amber-700" : "text-slate-400"}`}
            aria-live="polite"
          >
            {text.length} / {POST_MAX}
          </span>
          <button
            type="button"
            onClick={publish}
            disabled={busy || !trimmed}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish post"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Post card with reactions, replies, report and moderation            */
/* ------------------------------------------------------------------ */

const REACTIONS: { type: ReactionType; icon: string; label: string }[] = [
  { type: "LIKE", icon: "👍", label: "Like" },
  { type: "UNLIKE", icon: "👎", label: "Unlike" },
  { type: "CELEBRATE", icon: "🎉", label: "Celebrate" },
];

type ModAction = "hide" | "unhide" | "dismiss_reports" | "delete" | "warn" | "suspend";

const MOD_CONFIRM: Record<
  ModAction,
  { title: string; description: string; confirmLabel: string; tone: "danger" | "warning" | "primary" }
> = {
  hide: {
    title: "Hide this post?",
    description: "Authors will no longer see the post. You can unhide it later.",
    confirmLabel: "Hide post",
    tone: "warning",
  },
  unhide: {
    title: "Make this post visible again?",
    description: "All authors will be able to see and react to the post again.",
    confirmLabel: "Unhide post",
    tone: "primary",
  },
  dismiss_reports: {
    title: "Dismiss all reports?",
    description: "The post stays visible and leaves the reported queue. The dismissal is recorded in the audit trail.",
    confirmLabel: "Dismiss reports",
    tone: "primary",
  },
  delete: {
    title: "Delete this post permanently?",
    description: "The post, its replies, reactions and reports are removed. This cannot be undone.",
    confirmLabel: "Delete post",
    tone: "danger",
  },
  warn: {
    title: "Issue a formal warning?",
    description: "The warning to the author is recorded in the audit trail.",
    confirmLabel: "Issue warning",
    tone: "warning",
  },
  suspend: {
    title: "Suspend the author's account?",
    description:
      "The author is signed out everywhere and cannot sign in until the Platform Architect reviews and reinstates the account.",
    confirmLabel: "Suspend account",
    tone: "danger",
  },
};

const VISIBLE_REPLIES = 3;

function RoleChip({ role }: { role: Role }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export function PostCard({
  post,
  canModerate,
  onChange,
}: {
  post: PostView;
  canModerate: boolean;
  onChange: (id: string, next: PostView | null) => void;
}) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ModAction | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function act(payload: Record<string, unknown>, success?: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { ok, data } = await postJson(`/api/community/${post.id}`, payload);
    setBusy(false);
    if (!ok) {
      setError(errorText(data, "The action could not be completed."));
      if (data && (data as { error?: string }).error === "This post no longer exists.") router.refresh();
      return false;
    }
    if (data.deleted) {
      onChange(post.id, null);
    } else if (data.post) {
      onChange(post.id, data.post as PostView);
    }
    if (success) setNotice(success);
    // The moderator's "Reported (n)" tab count is server-rendered.
    if (canModerate && (payload.action === "dismiss_reports" || payload.action === "delete")) router.refresh();
    return true;
  }

  async function sendReply() {
    const text = replyText.trim();
    if (!text) return;
    if (await act({ action: "reply", text })) {
      setReplyText("");
      setReplyOpen(false);
      setShowAllReplies(true);
    }
  }

  async function confirmModeration() {
    if (!pending) return;
    const action = pending;
    const ok = await act(
      { action },
      action === "warn" ? "Warning recorded." : action === "suspend" ? "The author's account is suspended." : undefined
    );
    if (ok || action !== "delete") setPending(null);
  }

  async function submitReport() {
    if (await act({ action: "report", reason: reason.trim() }, "Thanks — a System Moderator will review this post.")) {
      setReportOpen(false);
      setReason("");
    }
  }

  const replies = showAllReplies ? post.replies : post.replies.slice(-VISIBLE_REPLIES);
  const hiddenReplies = post.replies.length - replies.length;
  const showBody = !post.hidden || canModerate;
  const config = pending ? MOD_CONFIRM[pending] : null;

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
        post.hidden ? "border-red-200 bg-red-50/40" : post.reportCount > 0 && canModerate ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Link
          href={`/dashboard/community/profile/${post.authorId}`}
          className="min-w-0 text-sm font-bold text-slate-800 hover:text-emerald-700"
        >
          {post.authorName}
        </Link>
        <RoleChip role={post.authorRole} />
        {post.authorTier ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${TIER_STYLE[post.authorTier]}`}
          >
            <span aria-hidden>{TIER_ICON[post.authorTier]}</span> {TIER_LABEL[post.authorTier]}
          </span>
        ) : null}
        {post.auto ? (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700 ring-1 ring-inset ring-teal-200">
            Auto-announcement
          </span>
        ) : null}
        <time
          dateTime={post.createdAt}
          title={new Date(post.createdAt).toLocaleString("en-GB")}
          className="ml-auto text-xs text-slate-400"
        >
          {timeAgo(post.createdAt)}
        </time>
      </header>

      {post.hidden ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
          Hidden by a System Moderator — only moderators can see this post.
        </p>
      ) : null}

      {showBody ? (
        <p className="font-bengali mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{post.text}</p>
      ) : null}

      {canModerate && post.reports && post.reports.length > 0 ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-inset ring-amber-200">
          <p className="text-xs font-bold text-amber-800">
            ⚠ Reported {post.reports.length} time{post.reports.length === 1 ? "" : "s"} — review required
          </p>
          <ul className="mt-1 space-y-0.5">
            {post.reports.map((r) => (
              <li key={r.reporterId} className="break-words text-xs text-amber-800">
                <strong>{r.reporterName}</strong>
                {r.reason ? ` — ${r.reason}` : " — no reason given"} · {timeAgo(r.reportedAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {REACTIONS.map((r) => {
          const count = post.reactionCounts[r.type] ?? 0;
          const mine = post.myReaction === r.type;
          return (
            <button
              key={r.type}
              type="button"
              onClick={() => act({ action: "react", type: r.type })}
              disabled={busy || post.hidden}
              aria-pressed={mine}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-50 ${
                mine ? "bg-emerald-50 text-emerald-700 ring-emerald-300" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span aria-hidden>{r.icon}</span> {r.label}
              {count > 0 ? <span className="tabular-nums">{count}</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setReplyOpen((v) => !v)}
          disabled={busy || post.hidden}
          aria-expanded={replyOpen}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <span aria-hidden>💬</span> Reply
          {post.replyCount > 0 ? <span className="tabular-nums">{post.replyCount}</span> : null}
        </button>
        {!post.isMine && !post.hidden ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            disabled={busy || post.reportedByMe}
            className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
          >
            <span aria-hidden>🚩</span> {post.reportedByMe ? "Reported" : "Report"}
          </button>
        ) : null}
      </div>

      {canModerate ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setPending(post.hidden ? "unhide" : "hide")}
            disabled={busy}
            className="min-h-9 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {post.hidden ? "Unhide" : "Hide"}
          </button>
          {post.reportCount > 0 ? (
            <button
              type="button"
              onClick={() => setPending("dismiss_reports")}
              disabled={busy}
              className="min-h-9 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              Dismiss reports
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPending("delete")}
            disabled={busy}
            className="min-h-9 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200 transition hover:bg-red-100 disabled:opacity-50"
          >
            Delete
          </button>
          {!post.isMine && !post.auto ? (
            <>
              <button
                type="button"
                onClick={() => setPending("warn")}
                disabled={busy}
                className="min-h-9 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
              >
                Warn author
              </button>
              {post.authorRole !== "PLATFORM_ARCHITECT" && post.authorRole !== "SYSTEM_MODERATOR" ? (
                <button
                  type="button"
                  onClick={() => setPending("suspend")}
                  disabled={busy}
                  className="min-h-9 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                  Suspend author
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {post.replies.length > 0 && showBody ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {hiddenReplies > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllReplies(true)}
              className="mb-2 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Show {hiddenReplies} earlier repl{hiddenReplies === 1 ? "y" : "ies"}
            </button>
          ) : null}
          <ul className="space-y-2">
            {replies.map((r) => (
              <li key={r.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <Link
                    href={`/dashboard/community/profile/${r.authorId}`}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-700"
                  >
                    {r.authorName}
                  </Link>
                  <span className="text-[10px] text-slate-400">{ROLE_LABEL[r.authorRole] ?? r.authorRole}</span>
                  <time dateTime={r.createdAt} className="text-[10px] text-slate-400">
                    · {timeAgo(r.createdAt)}
                  </time>
                </div>
                <p className="font-bengali mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-600">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {replyOpen && !post.hidden ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={`reply-${post.id}`} className="sr-only">
            Reply to {post.authorName}
          </label>
          <textarea
            id={`reply-${post.id}`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply();
            }}
            rows={2}
            maxLength={REPLY_MAX}
            autoFocus
            placeholder={`Reply to ${post.authorName}…`}
            className="font-bengali w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-slate-400">
              {replyText.length} / {REPLY_MAX}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyText("");
                }}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendReply}
                disabled={busy || !replyText.trim()}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={pending !== null}
        title={config?.title ?? ""}
        description={
          config ? (
            <>
              {config.description}
              {pending === "suspend" || pending === "warn" ? (
                <span className="mt-2 block font-semibold text-slate-700">Author: {post.authorName}</span>
              ) : null}
            </>
          ) : null
        }
        confirmLabel={config?.confirmLabel}
        tone={config?.tone}
        busy={busy}
        onConfirm={confirmModeration}
        onCancel={() => setPending(null)}
      />

      <ConfirmModal
        open={reportOpen}
        title="Report this post"
        description="A System Moderator will review the post. Reports are confidential."
        confirmLabel="Submit report"
        tone="warning"
        busy={busy}
        onConfirm={submitReport}
        onCancel={() => {
          setReportOpen(false);
          setReason("");
        }}
      >
        <label htmlFor={`report-${post.id}`} className="text-xs font-semibold text-slate-600">
          Reason <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id={`report-${post.id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={REASON_MAX}
          placeholder="e.g. off-topic, offensive language, personal information"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
        <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">
          {reason.length} / {REASON_MAX}
        </p>
      </ConfirmModal>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Milestone auto-announcement opt-out (SRS §14.2)                     */
/* ------------------------------------------------------------------ */

export function AutoAnnounceToggle({ userId, enabled: initial }: { userId: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setBusy(true);
    setError(null);
    setEnabled(next);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoAnnounce: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        setEnabled(!next);
        setError(errorText(data, "Your preference could not be saved."));
      }
    } catch {
      setEnabled(!next);
      setError("Network error — your preference was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        onClick={toggle}
        disabled={busy}
        aria-checked={enabled}
        aria-label="Milestone auto-announcements"
        className={`inline-flex h-7 w-13 shrink-0 items-center rounded-full px-0.5 transition disabled:opacity-50 ${
          enabled ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`h-6 w-6 transform rounded-full bg-white shadow transition ${enabled ? "translate-x-6" : "translate-x-0"}`}
        />
      </button>
      <span className="text-[11px] text-slate-500">{enabled ? "On" : "Off"}</span>
      {error ? (
        <p role="alert" className="text-[11px] font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
