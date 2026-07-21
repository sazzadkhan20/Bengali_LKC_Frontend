"use client";

import { useSyncExternalStore } from "react";

/**
 * Hugging Face Spaces render apps inside an iframe on huggingface.co.
 * Browsers block session cookies in that cross-site context, so login and
 * some client navigations fail unless the app is opened in its own tab.
 */
function readEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function readDirectUrl(spaceHost?: string): string | null {
  try {
    if (window.self === window.top) return null;
    const host = spaceHost || window.location.host;
    return `https://${host}${window.location.pathname}${window.location.search}`;
  } catch {
    return null;
  }
}

export function IframeNotice({ spaceHost }: { spaceHost?: string }) {
  const embedded = useSyncExternalStore(
    () => () => {},
    readEmbedded,
    () => false
  );
  const directUrl = useSyncExternalStore(
    () => () => {},
    () => readDirectUrl(spaceHost),
    () => null
  );

  if (!embedded || !directUrl) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950">
      <span>
        This Space is embedded on huggingface.co — login and some links may not
        work here because browsers block cookies in iframes.{" "}
      </span>
      <a
        href={directUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
      >
        Open in full tab
      </a>
    </div>
  );
}
