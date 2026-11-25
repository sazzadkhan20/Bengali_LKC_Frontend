import "server-only";
import { backendFetch } from "@/lib/backend";
import { backendAuthedFetch } from "@/lib/backend-auth";
import type { POS } from "@/lib/types";

/**
 * Server-side reads of the live lexicon (imported XML + every validated
 * contribution) from the Spring API. Nothing is cached, so an entry promoted
 * by the review pipeline is visible on the very next request.
 */

export type LexiconResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export type WordRef = { id: string; lemma: string; crowdsourced: boolean };

/** One synset definition; a synset has at most one per language. */
export type Definition = { language: string; text: string };

export type EntryCardData = {
  id: string;
  lemma: string;
  pos: POS;
  origin: "XML" | "USER";
  matchType?: "exact" | "prefix" | "contains";
  senseCount: number;
  crowdsourced: boolean;
  validatedAt: string | null;
  synsetId: string | null;
  /** Primary definition preview (Bengali first). */
  definition: string | null;
  defLang: string | null;
  /** Every definition of the entry's first sense, Bengali first. */
  definitions: Definition[];
};

export type PageInfo = { page: number; size: number; total: number; totalPages: number };

export type BrowseResult = PageInfo & {
  letter: string;
  letters: { letter: string; count: number }[];
  pos: POS[];
  items: EntryCardData[];
};

export type WordSearchResult = PageInfo & {
  q: string;
  pos: POS[];
  items: EntryCardData[];
  counts: { exact: number; prefix: number; contains: number };
};

export type SynsetRelationRef = {
  relType: string;
  target: string;
  definition: string | null;
  words: WordRef[];
};

export type SenseRelationRef = {
  relType: string;
  target: string;
  targetEntryId: string | null;
  targetLemma: string | null;
};

export type SynsetHitData = {
  synsetId: string;
  ili: string;
  pos: POS;
  lexicalized: boolean;
  defLang: string | null;
  defText: string | null;
  definitions: Definition[];
  crowdsourced: boolean;
  entries: WordRef[];
  entryCount: number;
  relations?: { relType: string; target: string }[];
};

export type GlossSearchResult = PageInfo & {
  q: string;
  pos: POS[];
  items: SynsetHitData[];
  tooShort?: boolean;
};

export type SynsetSearchResult = GlossSearchResult & { mode: "id" | "ili" | "gloss" };

export type SenseDetail = {
  senseId: string;
  synsetId: string;
  entryId: string;
  lemma: string;
  pos: POS;
  ili: string | null;
  synsetPos: POS | null;
  defLang: string | null;
  defText: string | null;
  definitions: Definition[];
  crowdsourced: boolean;
  validatedAt: string | null;
  relations: SenseRelationRef[];
};

export type PathStep = { synsetId: string; definition: string | null; words: WordRef[] };

export type GraphNode = {
  synsetId: string;
  definition: string | null;
  relation: string;
  direction: "self" | "out" | "in";
  words: WordRef[];
};

export type WordSense = {
  id: string;
  synsetId: string;
  ili: string;
  synsetPos: POS;
  lexicalized: boolean;
  definition: { language: string; text: string } | null;
  definitions: Definition[];
  crowdsourced: boolean;
  newSynset: boolean;
  submissionId: string | null;
  validatedAt: string | null;
  synonyms: WordRef[];
  synonymCount: number;
  senseRelations: SenseRelationRef[];
  synsetRelations: SynsetRelationRef[];
};

export type WordDetail = {
  id: string;
  lemma: string;
  pos: POS;
  origin: "XML" | "USER";
  submissionId: string | null;
  validatedAt: string | null;
  crowdsourced: boolean;
  senses: WordSense[];
  primarySynsetId: string | null;
  hypernymPath: PathStep[];
  graph: GraphNode[];
};

export type SynsetDetail = {
  id: string;
  ili: string;
  pos: POS;
  lexicalized: boolean;
  definition: { language: string; text: string } | null;
  definitions: Definition[];
  crowdsourced: boolean;
  submissionId: string | null;
  validatedAt: string | null;
  words: WordRef[];
  wordCount: number;
  relations: SynsetRelationRef[];
  incoming: { relType: string; source: string; definition: string | null; words: WordRef[] }[];
  incomingTotal: number;
  hypernymPath: PathStep[];
  graph: GraphNode[];
};

export type LexiconStats = {
  entries: number;
  crowdsourcedEntries: number;
  senses: number;
  crowdsourcedSenses: number;
  synsets: number;
  crowdsourcedSynsets: number;
  polysemousEntries: number;
  synsetRelations: number;
  senseRelations: number;
  relations: number;
  generatedAt: string;
  posDistribution: Partial<Record<POS, number>>;
  lexicon: {
    id: string;
    label: string;
    language: string;
    email: string | null;
    license: string | null;
    version: string;
    publisher: string | null;
    source: string | null;
    description: string | null;
  } | null;
};

function query(params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function errorOf(status: number, data: unknown): string {
  const msg = (data as { error?: unknown } | null)?.error;
  if (typeof msg === "string" && msg && status < 500) return msg;
  return "The lexicon service is temporarily unavailable.";
}

async function publicGet<T>(path: string): Promise<LexiconResult<T>> {
  try {
    const res = await backendFetch<T>(`/api/public${path}`);
    return res.ok ? { ok: true, data: res.data } : { ok: false, status: res.status, error: errorOf(res.status, res.data) };
  } catch {
    return { ok: false, status: 503, error: errorOf(503, null) };
  }
}

async function authedGet<T>(path: string): Promise<LexiconResult<T>> {
  try {
    const res = await backendAuthedFetch<T>(`/api/public${path}`);
    return res.ok ? { ok: true, data: res.data } : { ok: false, status: res.status, error: errorOf(res.status, res.data) };
  } catch {
    return { ok: false, status: 503, error: errorOf(503, null) };
  }
}

export const posParam = (pos: POS[]) => (pos.length ? pos.join(",") : undefined);

export function fetchLexiconStats() {
  return publicGet<LexiconStats>("/stats");
}

export function fetchBrowse(letter: string | undefined, pos: POS[], page: number, size = 50) {
  return publicGet<BrowseResult>(`/browse${query({ letter, pos: posParam(pos), page, size })}`);
}

export function fetchWordSearch(q: string, pos: POS[], page: number, size = 50) {
  return publicGet<WordSearchResult>(`/search/words${query({ q, pos: posParam(pos), page, size })}`);
}

export function fetchGlossSearch(q: string, pos: POS[], page: number, size = 25) {
  return publicGet<GlossSearchResult>(`/search/gloss${query({ q, pos: posParam(pos), page, size })}`);
}

export function fetchSuggestions(q: string, limit = 8) {
  return publicGet<{ q: string; items: EntryCardData[] }>(`/suggest${query({ q, limit })}`);
}

export function fetchWord(id: string) {
  return publicGet<WordDetail>(`/words/${encodeURIComponent(id)}`);
}

export function fetchSynsetSearch(q: string, page: number, size = 25) {
  return authedGet<SynsetSearchResult>(`/search/synsets${query({ q, page, size })}`);
}

export function fetchSynset(id: string) {
  return authedGet<SynsetDetail>(`/synsets/${encodeURIComponent(id)}`);
}

export function fetchSense(id: string) {
  return authedGet<SenseDetail>(`/senses/${encodeURIComponent(id)}`);
}

const ALL_POS: POS[] = ["n", "v", "a", "r"];

export function parsePosFilter(raw: string | undefined): POS[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((p) => p.trim()))].filter((p): p is POS =>
    ALL_POS.includes(p as POS)
  );
}

export function parsePage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
}
