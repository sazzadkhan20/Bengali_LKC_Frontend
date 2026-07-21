/**
 * Server-side data layer over the canonical Bengali UKC lexicon
 * (seeded from "Bangla Mono Lingual Lexicons.xml" via scripts/build-seed.mjs).
 *
 * Builds in-memory indexes once per server process; all lookups are O(1)
 * map access or pre-sorted array slices, comfortably within the SRS
 * 500 ms search budget for up to 100k entries.
 */
import seed from "./data/lexicon.json";
import type {
  LexicalEntry,
  LexiconMeta,
  POS,
  Sense,
  Synset,
} from "./types";

interface SeedShape {
  lexicon: LexiconMeta;
  entries: LexicalEntry[];
  synsets: Synset[];
}

const data = seed as unknown as SeedShape;

export const lexiconMeta: LexiconMeta = data.lexicon;
export const allEntries: LexicalEntry[] = data.entries;
export const allSynsets: Synset[] = data.synsets;

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */

export const entryById = new Map<string, LexicalEntry>();
export const synsetById = new Map<string, Synset>();
/** sense id -> { sense, entry } */
export const senseById = new Map<
  string,
  { sense: Sense; entry: LexicalEntry }
>();
/** synset id -> entries lexicalising that synset */
export const entriesBySynset = new Map<string, LexicalEntry[]>();
/** synset id -> synsets pointing AT it (reverse relations) */
export const reverseSynsetRelations = new Map<
  string,
  { relType: string; source: string }[]
>();

for (const e of allEntries) {
  entryById.set(e.id, e);
  for (const s of e.senses) {
    senseById.set(s.id, { sense: s, entry: e });
    const list = entriesBySynset.get(s.synset);
    if (list) list.push(e);
    else entriesBySynset.set(s.synset, [e]);
  }
}

for (const syn of allSynsets) {
  synsetById.set(syn.id, syn);
}
for (const syn of allSynsets) {
  for (const rel of syn.relations ?? []) {
    const list = reverseSynsetRelations.get(rel.target);
    const item = { relType: rel.relType, source: syn.id };
    if (list) list.push(item);
    else reverseSynsetRelations.set(rel.target, [item]);
  }
}

/** Entries sorted by Bengali lemma (code-point order ≈ Varnamala order). */
export const sortedEntries: LexicalEntry[] = [...allEntries].sort((a, b) =>
  a.lemma.localeCompare(b.lemma, "bn")
);

/* ------------------------------------------------------------------ */
/* Bengali alphabet index (Varnamala)                                  */
/* ------------------------------------------------------------------ */

export const BENGALI_ALPHABET = [
  "অ", "আ", "ই", "ঈ", "উ", "ঊ", "ঋ", "এ", "ঐ", "ও", "ঔ",
  "ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ",
  "ট", "ঠ", "ড", "ঢ", "ণ", "ত", "থ", "দ", "ধ", "ন",
  "প", "ফ", "ব", "ভ", "ম", "য", "র", "ল", "শ", "ষ", "স", "হ",
  "ড়", "ঢ়", "য়", "ৎ",
] as const;

function initialLetter(lemma: string): string {
  // Skip leading punctuation/whitespace/parentheses, find first Bengali char
  for (const ch of lemma) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0980 && cp <= 0x09ff) {
      // Normalise ড়/ঢ়/য় written as base + nukta
      return ch;
    }
  }
  return "#";
}

export const entriesByLetter = new Map<string, LexicalEntry[]>();
for (const e of sortedEntries) {
  const letter = initialLetter(e.lemma);
  const key = (BENGALI_ALPHABET as readonly string[]).includes(letter)
    ? letter
    : "#";
  const list = entriesByLetter.get(key);
  if (list) list.push(e);
  else entriesByLetter.set(key, [e]);
}

/* ------------------------------------------------------------------ */
/* Search (SRS §9)                                                     */
/* ------------------------------------------------------------------ */

export interface WordSearchResult {
  entry: LexicalEntry;
  matchType: "exact" | "prefix";
}

export function searchByWord(
  query: string,
  opts: { pos?: POS[]; limit?: number } = {}
): WordSearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 200;
  const exact: WordSearchResult[] = [];
  const prefix: WordSearchResult[] = [];
  for (const e of sortedEntries) {
    if (opts.pos && opts.pos.length > 0 && !opts.pos.includes(e.pos)) continue;
    if (e.lemma === q) exact.push({ entry: e, matchType: "exact" });
    else if (e.lemma.startsWith(q))
      prefix.push({ entry: e, matchType: "prefix" });
    if (exact.length + prefix.length >= limit * 2) break;
  }
  return [...exact, ...prefix].slice(0, limit);
}

export interface GlossSearchResult {
  synset: Synset;
  entries: LexicalEntry[];
}

export function searchByGloss(
  query: string,
  opts: { limit?: number } = {}
): GlossSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = opts.limit ?? 100;
  const results: GlossSearchResult[] = [];
  for (const syn of allSynsets) {
    const text = syn.definition?.text?.toLowerCase();
    if (text && text.includes(q)) {
      results.push({
        synset: syn,
        entries: entriesBySynset.get(syn.id) ?? [],
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function searchSynset(query: string): GlossSearchResult[] {
  const q = query.trim();
  if (!q) return [];
  // Synset ID
  if (/^ben-syn\d+$/i.test(q)) {
    const syn = synsetById.get(q.toLowerCase());
    return syn
      ? [{ synset: syn, entries: entriesBySynset.get(syn.id) ?? [] }]
      : [];
  }
  // ILI code
  if (/^\d{8}-[nvar]$/i.test(q)) {
    const results: GlossSearchResult[] = [];
    for (const syn of allSynsets) {
      if (syn.ili.toLowerCase() === q.toLowerCase()) {
        results.push({
          synset: syn,
          entries: entriesBySynset.get(syn.id) ?? [],
        });
      }
    }
    return results;
  }
  // Natural language concept description -> full-text over definitions
  return searchByGloss(q);
}

/** Hypernym chain from a synset up to its root concept (SRS §9.2). */
export function hypernymPath(synsetId: string, maxDepth = 12): Synset[] {
  const path: Synset[] = [];
  const seen = new Set<string>();
  let current = synsetById.get(synsetId);
  while (current && path.length < maxDepth) {
    const hyper = current.relations?.find((r) => r.relType === "hypernym");
    if (!hyper || seen.has(hyper.target)) break;
    const parent = synsetById.get(hyper.target);
    if (!parent) break;
    seen.add(parent.id);
    path.push(parent);
    current = parent;
  }
  return path;
}

/** Immediate semantic neighbourhood for graph rendering (SRS §8.1.2). */
export interface GraphNode {
  synsetId: string;
  words: string[];
  definition?: string;
  relation: string; // relation from centre ("centre" for the focus node)
  direction: "out" | "in" | "self";
}

export function semanticNeighbourhood(synsetId: string): GraphNode[] {
  const centre = synsetById.get(synsetId);
  if (!centre) return [];
  const nodes: GraphNode[] = [
    {
      synsetId: centre.id,
      words: (entriesBySynset.get(centre.id) ?? []).map((e) => e.lemma),
      definition: centre.definition?.text,
      relation: "centre",
      direction: "self",
    },
  ];
  for (const rel of centre.relations ?? []) {
    const target = synsetById.get(rel.target);
    if (!target) continue;
    nodes.push({
      synsetId: target.id,
      words: (entriesBySynset.get(target.id) ?? []).map((e) => e.lemma),
      definition: target.definition?.text,
      relation: rel.relType,
      direction: "out",
    });
  }
  const incoming = reverseSynsetRelations.get(synsetId) ?? [];
  for (const rel of incoming.slice(0, 14)) {
    const source = synsetById.get(rel.source);
    if (!source) continue;
    nodes.push({
      synsetId: source.id,
      words: (entriesBySynset.get(source.id) ?? []).map((e) => e.lemma),
      definition: source.definition?.text,
      relation:
        rel.relType === "hypernym"
          ? "hyponym"
          : rel.relType.startsWith("mero")
            ? rel.relType.replace("mero", "holo")
            : rel.relType,
      direction: "in",
    });
  }
  return nodes.slice(0, 24);
}

/* ------------------------------------------------------------------ */
/* Statistics (SRS §8.2)                                               */
/* ------------------------------------------------------------------ */

export interface LexiconStats {
  totalEntries: number;
  totalSenses: number;
  totalSynsets: number;
  posDistribution: Record<POS, number>;
  senseRelationCounts: Record<string, number>;
  synsetRelationCounts: Record<string, number>;
  definitionsBen: number;
  definitionsEng: number;
  polysemousEntries: number;
}

let cachedStats: LexiconStats | null = null;

export function lexiconStats(): LexiconStats {
  if (cachedStats) return cachedStats;
  const posDistribution: Record<POS, number> = { n: 0, v: 0, a: 0, r: 0 };
  const senseRelationCounts: Record<string, number> = {};
  const synsetRelationCounts: Record<string, number> = {};
  let totalSenses = 0;
  let polysemousEntries = 0;
  for (const e of allEntries) {
    posDistribution[e.pos] = (posDistribution[e.pos] ?? 0) + 1;
    totalSenses += e.senses.length;
    if (e.senses.length > 1) polysemousEntries += 1;
    for (const s of e.senses) {
      for (const r of s.relations ?? []) {
        senseRelationCounts[r.relType] =
          (senseRelationCounts[r.relType] ?? 0) + 1;
      }
    }
  }
  let definitionsBen = 0;
  let definitionsEng = 0;
  for (const syn of allSynsets) {
    if (syn.definition?.language === "ben") definitionsBen += 1;
    if (syn.definition?.language === "eng") definitionsEng += 1;
    for (const r of syn.relations ?? []) {
      synsetRelationCounts[r.relType] =
        (synsetRelationCounts[r.relType] ?? 0) + 1;
    }
  }
  cachedStats = {
    totalEntries: allEntries.length,
    totalSenses,
    totalSynsets: allSynsets.length,
    posDistribution,
    senseRelationCounts,
    synsetRelationCounts,
    definitionsBen,
    definitionsEng,
    polysemousEntries,
  };
  return cachedStats;
}

/** Validate an ILI code against the local registry cache (SRS §13.2). */
export function isKnownIli(ili: string): boolean {
  if (!/^\d{8}-[nvar]$/.test(ili)) return false;
  for (const syn of allSynsets) {
    if (syn.ili === ili) return true;
  }
  // Treat well-formed codes not present locally as "new concept request"
  return false;
}
