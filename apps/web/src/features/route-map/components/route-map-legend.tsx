import type { RoadCategory } from '../model/route-map.constants';
import {
  ROAD_CATEGORIES,
  ROAD_CATEGORY_STYLE,
} from '../model/route-map.constants';

export function RouteMapLegend({
  representedCategories,
}: {
  readonly representedCategories: ReadonlySet<RoadCategory>;
}) {
  return (
    <div
      className="grid gap-2 rounded-md border border-slate-200 bg-white/95 p-3 text-xs shadow-sm"
      aria-label="Road category legend"
    >
      <p className="font-semibold text-slate-950">Road categories</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROAD_CATEGORIES.map((category) => {
          const style = ROAD_CATEGORY_STYLE[category];
          const isRepresented = representedCategories.has(category);

          return (
            <li
              key={category}
              className={`flex min-w-0 items-center gap-2 ${
                isRepresented ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              <span
                className="h-2.5 w-6 shrink-0 rounded-full"
                style={{ backgroundColor: style.lineColor }}
                aria-hidden="true"
              />
              <span className="truncate">
                {style.label}
                {isRepresented ? '' : ' not present'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
