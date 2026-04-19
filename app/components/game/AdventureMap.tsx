import { missionsAssets } from "../../lib/missionsAssets";
import type { AdventureMapState, MissionNode, MissionNodeType } from "../../lib/adventureMap";

type AdventureMapProps = {
  map: AdventureMapState;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

const MAP_WIDTH = 960;
const MAP_HEIGHT = 560;
const ROW_GAP = 110;

function panelBackground(src: string) {
  return {
    backgroundImage: `url(${src})`,
    backgroundRepeat: "repeat",
    backgroundSize: "32px 32px",
    imageRendering: "pixelated" as const,
  };
}

function iconForNode(type: MissionNodeType) {
  if (type === "combat") return "⚔";
  if (type === "elite") return "☠";
  if (type === "boss") return "♛";
  if (type === "treasure") return "▣";
  if (type === "rest") return "✚";
  return "?";
}

function nodeLabel(type: MissionNodeType) {
  if (type === "combat") return "Combat";
  if (type === "elite") return "Elite";
  if (type === "boss") return "Boss";
  if (type === "treasure") return "Treasure";
  if (type === "rest") return "Rest";
  return "Event";
}

export function AdventureMap({ map, selectedNodeId, onSelectNode }: AdventureMapProps) {
  const maxColumns = Math.max(...map.rowSizes, 1);
  const columnGap = MAP_WIDTH / (maxColumns + 1);

  function getNodePosition(node: MissionNode) {
    const rowCount = map.rowSizes[node.row] ?? 1;
    const rowWidth = (rowCount - 1) * columnGap;
    const startX = (MAP_WIDTH - rowWidth) / 2;
    const x = startX + node.column * columnGap;
    const y = 62 + node.row * ROW_GAP;
    return { x, y };
  }

  const byId = new Map(map.nodes.map((node) => [node.id, node]));

  return (
    <div className="overflow-x-auto">
      <div
        className="ui-panel relative min-w-[980px] overflow-hidden border border-amber-700/50 p-4"
        style={{
          backgroundImage: `
            linear-gradient(rgba(15,10,8,0.52), rgba(12,9,8,0.72)),
            url(${missionsAssets.background.tilesetField}),
            url(${missionsAssets.background.tilesetRelief})
          `,
          backgroundRepeat: "no-repeat, repeat, repeat",
          backgroundSize: "100% 100%, 320px 240px, 320px 240px",
          backgroundPosition: "center, center, center",
          imageRendering: "pixelated",
        }}
      >
        <div
          className="relative mx-auto border border-amber-700/55 bg-black/35"
          style={{ ...panelBackground(missionsAssets.ui.theme.panel3), width: MAP_WIDTH, height: MAP_HEIGHT }}
        >
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            fill="none"
            aria-hidden
          >
            {map.nodes.map((node) => {
              const from = getNodePosition(node);
              return node.connections.map((targetId) => {
                const target = byId.get(targetId);
                if (!target) return null;
                const to = getNodePosition(target);
                const activePath =
                  node.state === "completed" && (target.state === "available" || target.state === "completed");

                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={activePath ? "#fbbf24" : "#71717a"}
                    strokeDasharray={activePath ? "0" : "4 3"}
                    strokeOpacity={activePath ? 0.9 : 0.45}
                    strokeWidth={activePath ? 2.2 : 1.6}
                  />
                );
              });
            })}
          </svg>

          {map.nodes.map((node) => {
            const { x, y } = getNodePosition(node);
            const selected = selectedNodeId === node.id;

            return (
              <button
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                disabled={node.state === "locked"}
                className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center border text-lg font-black transition ${
                  node.state === "completed"
                    ? "border-emerald-300 bg-emerald-500/20 text-emerald-100"
                    : node.state === "available"
                      ? selected
                        ? "border-amber-200 bg-amber-500/25 text-amber-100 ring-1 ring-amber-100/50"
                        : "border-cyan-300 bg-cyan-500/18 text-cyan-100 hover:bg-cyan-500/28"
                      : "cursor-not-allowed border-zinc-700 bg-zinc-900/75 text-zinc-500"
                }`}
                style={{ left: x, top: y, ...panelBackground(missionsAssets.ui.theme.panelInterior) }}
                title={`${nodeLabel(node.type)} • ${node.state}`}
              >
                {iconForNode(node.type)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-300">
          {(["combat", "elite", "boss", "treasure", "rest", "event"] as MissionNodeType[]).map((type) => (
            <span key={`legend-${type}`} className="ui-btn border border-white/20 bg-black/25 px-2 py-1">
              {iconForNode(type)} {nodeLabel(type)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
