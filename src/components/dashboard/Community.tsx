"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { timeAgo } from "@/lib/format";
import type { ReactionType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Serializable view models passed from the server components          */
/* ------------------------------------------------------------------ */

export interface PostReplyView {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface PostReportView {
  reporterName: string;
  reason?: string;
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
  authorRoleLabel: string;
  authorTierLabel?: string;
  reactionCounts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
  replies: PostReplyView[];
  reportCount: number;
  reportedByMe: boolean;
  isMine: boolean;
  /** Moderator-only report details (SRS §14.5). */
  reports?: PostReportView[];
}

/* ------------------------------------------------------------------ */
/* Post composer (SRS §14.2) — text only, max 500 characters           */
/* ------------------------------------------------------------------ */

export function PostComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to publish the post.");
        return;
      }
      setText("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Share an update, a blocker, a milestone… (text only, max 500 characters)"
        className="font-bengali w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs tabular-nums ${text.length > 450 ? "font-bold text-amber-600" : "text-slate-400"}`}
        >
          {text.length} / 500
        </span>
        <button
          onClick={publish}
          disabled={busy || !text.trim()}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Publish Post"}
        </button>
      </div>
    </div>
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

export function PostCard({
  post,
  canModerate,
}: {
  post: PostView;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/${post.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    const ok = await act({ action: "reply", text: replyText });
    if (ok) {
      setReplyText("");
      setReplyOpen(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        post.hidden
          ? "border-rose-200 bg-rose-50/40"
          : post.reportCount > 0 && canModerate
            ? "border-amber-300"
            : "border-slate-200"
      }`}
    >
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/community/profile/${post.authorId}`}
          className="text-sm font-bold text-slate-800 hover:text-emerald-700"
        >
          {post.authorName}
        </Link>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
          {post.authorRoleLabel}
        </span>
        {post.authorTierLabel ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
            {post.authorTierLabel}
          </span>
        ) : null}
        {post.auto ? (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700 ring-1 ring-inset ring-teal-200">
            auto-announcement
          </span>
        ) : null}
        <span className="ml-auto text-xs text-slate-400">
          {timeAgo(post.createdAt)}
        </span>
      </div>

      {post.hidden ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
          Hidden by a System Moderator after report review.
        </p>
      ) : null}

      {/* body — visible to moderators even when hidden */}
      {!post.hidden || canModerate ? (
        <p className="font-bengali mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
          {post.text}
        </p>
      ) : null}

      {/* moderator report details */}
      {canModerate && post.reports && post.reports.length > 0 ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-inset ring-amber-200">
          <p className="text-xs font-bold text-amber-800">
            ⚠ Reported {post.reports.length} time{post.reports.length === 1 ? "" : "s"} — moderator review required
          </p>
          <ul className="mt-1 space-y-0.5">
            {post.reports.map((r, i) => (
              <li key={i} className="text-xs text-amber-700">
                <strong>{r.reporterName}</strong>
                {r.reason ? ` — ${r.reason}` : ""} · {timeAgo(r.reportedAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      {/* actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {REACTIONS.map((r) => {
          const count = post.reactionCounts[r.type];
          const mine = post.myReaction === r.type;
          return (
            <button
              key={r.type}
              onClick={() => act({ action: "react", type: r.type })}
              disabled={busy || post.hidden}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-50 ${
                mine
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-300"
                  : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {r.icon} {r.label}
              {count > 0 ? (
                <span className="tabular-nums">{count}</span>
              ) : null}
            </button>
          );
        })}
        <button
          onClick={() => setReplyOpen((v) => !v)}
          disabled={busy || post.hidden}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
        >
          💬 Reply
          {post.replies.length > 0 ? (
            <span className="tabular-nums">{post.replies.length}</span>
          ) : null}
        </button>
        {!post.isMine ? (
          <button
            onClick={() => {
              const reason = window.prompt(
                "Report this post for moderator review. Reason (optional):"
              );
              if (reason !== null) act({ action: "report", reason });
            }}
            disabled={busy || post.reportedByMe}
            className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-rose-500 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50"
          >
            🚩 {post.reportedByMe ? "Reported" : "Report"}
          </button>
        ) : null}
      </div>

      {/* moderator toolbar (SRS §14.5) */}
      {canModerate ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => act({ action: post.hidden ? "unhide" : "hide" })}
            disabled={busy}
            className="min-h-9 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {post.hidden ? "Unhide" : "Hide"}
          </button>
          <button
            onClick={() =>
              act(
                { action: "delete" },
                "Permanently delete this post? This cannot be undone."
              )
            }
            disabled={busy}
            className="min-h-9 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50"
          >
            Delete
          </button>
          {!post.isMine ? (
            <>
              <button
                onClick={() =>
                  act(
                    { action: "warn" },
                    "Issue a formal warning to the poster? The warning is recorded in the audit trail."
                  )
                }
                disabled={busy}
                className="min-h-9 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
              >
                Warn Poster
              </button>
              <button
                onClick={() =>
                  act(
                    { action: "suspend" },
                    "Suspend the poster's account? Their credential is frozen and all sessions are invalidated."
                  )
                }
                disabled={busy}
                className="min-h-9 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-800 disabled:opacity-50"
              >
                Suspend Poster
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* replies — single flat level (SRS §14.2) */}
      {post.replies.length > 0 && (!post.hidden || canModerate) ? (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {post.replies.map((r) => (
            <li key={r.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <div className="flex items-baseline gap-2">
                <Link
                  href={`/dashboard/community/profile/${r.authorId}`}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700"
                >
                  {r.authorName}
                </Link>
                <span className="text-[10px] text-slate-400">
                  {timeAgo(r.createdAt)}
                </span>
              </div>
              <p className="font-bengali mt-0.5 text-sm text-slate-600">
                {r.text}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {/* reply form */}
      {replyOpen && !post.hidden ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Write a reply… (max 200 characters, no nested threads)"
            className="font-bengali w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-slate-400">
              {replyText.length} / 200
            </span>
            <button
              onClick={sendReply}
              disabled={busy || !replyText.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Milestone auto-announcement opt-out (SRS §14.2)                     */
/* ------------------------------------------------------------------ */

export function AutoAnnounceToggle({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoAnnounce: !enabled }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex h-7 w-13 items-center rounded-full px-0.5 transition disabled:opacity-50 ${
        enabled ? "bg-emerald-600" : "bg-slate-300"
      }`}
      aria-pressed={enabled}
      title={
        enabled
          ? "Milestone auto-announcements are on"
          : "Milestone auto-announcements are off"
      }
    >
      <span
        className={`h-6 w-6 transform rounded-full bg-white shadow transition ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
