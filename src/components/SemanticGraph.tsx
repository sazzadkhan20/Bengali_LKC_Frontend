import type { GraphNode } from "@/lib/lexicon-api";

const REL_COLOR: Record<string, string> = {
  hypernym: "#576139",
  hyponym: "#486830",
  mero_part: "#886620",
  mero_substance: "#a0733a",
  mero_member: "#b8864c",
  holo_part: "#7a667a",
  holo_substance: "#918091",
  holo_member: "#a89aa8",
  attribute: "#a85070",
};

/**
 * Mini force-directed-style semantic graph (SRS §7.7.2, §8.1.2, §9.2).
 * Renders the focus synset at the centre with immediate neighbours laid
 * out radially. Nodes are clickable for graph navigation. When
 * `showIds` is false (Visitor view) no synset IDs are rendered — nodes
 * are labelled by their Bengali words only.
 */
export function SemanticGraph({
  nodes,
  showIds,
  hrefFor,
  width = 640,
  height = 420,
}: {
  nodes: GraphNode[];
  showIds: boolean;
  /** Build the navigation URL for a node; return null for non-clickable. */
  hrefFor: (node: GraphNode) => string | null;
  width?: number;
  height?: number;
}) {
  if (nodes.length === 0) return null;
  const centre = nodes[0];
  const neighbours = nodes.slice(1);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 70;

  const placed = neighbours.map((node, i) => {
    // Distribute outgoing relations on top half, incoming on bottom
    const angle =
      (2 * Math.PI * i) / neighbours.length - Math.PI / 2 +
      (neighbours.length === 1 ? Math.PI / 4 : 0);
    const jitter = i % 2 === 0 ? 0 : 18;
    return {
      node,
      x: cx + (radius + jitter) * Math.cos(angle),
      y: cy + (radius + jitter) * Math.sin(angle),
    };
  });

  const label = (n: GraphNode, max = 16) => {
    const word = n.words[0]?.lemma ?? (showIds ? n.synsetId : "—");
    return word.length > max ? `${word.slice(0, max)}…` : word;
  };

  const usedRels = [...new Set(neighbours.map((n) => n.relation))];

  return (
    <figure className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-full select-none"
        role="img"
        aria-label="Semantic neighbourhood graph"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* edges */}
        {placed.map(({ node, x, y }) => (
          <g key={`edge-${node.synsetId}-${node.relation}`}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={REL_COLOR[node.relation] ?? "#c0be9e"}
              strokeWidth={1.5}
              strokeDasharray={node.direction === "in" ? "4 3" : undefined}
              opacity={0.55}
            />
            <text
              x={(cx + x) / 2}
              y={(cy + y) / 2 - 4}
              textAnchor="middle"
              fontSize={9}
              fill={REL_COLOR[node.relation] ?? "#848870"}
              className="font-medium"
            >
              {node.relation}
            </text>
          </g>
        ))}

        {/* neighbour nodes */}
        {placed.map(({ node, x, y }) => {
          const href = hrefFor(node);
          const circle = (
            <g
              className={href ? "cursor-pointer" : undefined}
              key={`node-${node.synsetId}-${node.relation}`}
            >
              <title>
                {[node.words.map((w) => w.lemma).join(", "), node.definition]
                  .filter(Boolean)
                  .join(" — ") || node.synsetId}
              </title>
              <circle
                cx={x}
                cy={y}
                r={26}
                fill="white"
                stroke={REL_COLOR[node.relation] ?? "#c0be9e"}
                strokeWidth={2}
              />
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                fontSize={11}
                className="font-bengali fill-slate-800 font-semibold"
              >
                {label(node, 8)}
              </text>
              {showIds ? (
                <text
                  x={x}
                  y={y + 40}
                  textAnchor="middle"
                  fontSize={8}
                  className="fill-slate-400 font-mono"
                >
                  {node.synsetId}
                </text>
              ) : null}
            </g>
          );
          return href ? (
            <a href={href} key={`link-${node.synsetId}-${node.relation}`}>
              {circle}
            </a>
          ) : (
            circle
          );
        })}

        {/* centre node */}
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={36}
            fill="#576139"
            stroke="#3e4828"
            strokeWidth={2}
          />
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            fontSize={13}
            className="font-bengali fill-white font-bold"
          >
            {label(centre, 10)}
          </text>
          {showIds ? (
            <text
              x={cx}
              y={cy + 52}
              textAnchor="middle"
              fontSize={9}
              className="fill-slate-500 font-mono"
            >
              {centre.synsetId}
            </text>
          ) : null}
        </g>
      </svg>
      <figcaption className="mt-2 flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {usedRels.map((rel) => (
            <span key={rel} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: REL_COLOR[rel] ?? "#c0be9e" }}
              />
              {rel}
            </span>
          ))}
        </span>
        <span className="italic sm:ml-auto">
          dashed = incoming relation · click a node to navigate
        </span>
      </figcaption>
    </figure>
  );
}
