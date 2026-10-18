import { ECOSYSTEM_NODES, type EcosystemNodeId } from '@/content/ecosystem';

/**
 * M2 schematic of the IWMS ecosystem — a static, CSS-styled SVG that holds the slot the M3 3D
 * miniature city will replace (`data-slot="ecosystem-3d"`), and that remains the static fallback.
 * No animation loop: selection only flips data attributes; transitions are CSS (none under
 * reduced motion). Purely presentational (aria-hidden): the module tabs are the accessible control.
 */
export function EcosystemMap({
  selected,
  onSelect,
}: {
  selected: EcosystemNodeId | null;
  onSelect?: (id: EcosystemNodeId) => void;
}) {
  const active = ECOSYSTEM_NODES.find((n) => n.id === selected);
  const linked = new Set(active?.connects ?? []);
  // Each undirected link once (a < b by list order).
  const order = ECOSYSTEM_NODES.map((n) => n.id);
  const links = ECOSYSTEM_NODES.flatMap((a) =>
    a.connects
      .filter((b) => order.indexOf(b) > order.indexOf(a.id))
      .map((b) => [a, ECOSYSTEM_NODES[order.indexOf(b)]] as const),
  );
  return (
    <div className="eco__map" data-slot="ecosystem-3d" aria-hidden="true">
      <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet" focusable="false">
        <rect className="eco__map-ground" x="2" y="4" width="96" height="54" rx="6" />
        <path className="eco__map-road" d="M4 44 C 26 44, 32 34, 50 38 S 76 46, 96 46" />
        <path className="eco__map-road" d="M24 8 C 28 24, 36 30, 36 54" />
        {links.map(([a, b]) => {
          const on = selected !== null && (a.id === selected || b.id === selected);
          const mx = (a.map.x + b.map.x) / 2;
          const my = (a.map.y + b.map.y) / 2 - 4;
          return (
            <path
              key={`${a.id}-${b.id}`}
              className="eco__map-link"
              data-on={on ? 'true' : 'false'}
              d={`M${a.map.x} ${a.map.y} Q ${mx} ${my} ${b.map.x} ${b.map.y}`}
            />
          );
        })}
        {ECOSYSTEM_NODES.map((n) => (
          <g
            key={n.id}
            className="eco__map-node"
            data-kind={n.kind}
            data-state={n.id === selected ? 'selected' : linked.has(n.id) ? 'linked' : 'idle'}
            transform={`translate(${n.map.x} ${n.map.y})`}
            onClick={onSelect ? () => onSelect(n.id) : undefined}
          >
            <circle className="eco__map-hit" r="5" />
            <circle className="eco__map-ring" r={n.kind === 'integration' ? 3 : 2.2} />
            <circle className="eco__map-dot" r={n.kind === 'integration' ? 1.4 : 1} />
            <text className="eco__map-label" y={n.map.y < 14 ? 6.4 : -4}>
              {n.number ? `${n.number} · ${n.label}` : n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
