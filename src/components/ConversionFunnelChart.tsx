import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConversionFunnelChartProps {
  dials: number;
  answered: number;
  dmConversations: number;
  sqls: number;
}

const TIERS = [
  { key: "dials", label: "Dials", color: "#f59e0b", widthPx: 440 },
  { key: "answered", label: "Answered", color: "#10b981", widthPx: 361 },
  { key: "dmConversations", label: "DM Conversations", color: "#6366f1", widthPx: 255 },
  { key: "sqls", label: "SQLs", color: "#f43f5e", widthPx: 167 },
] as const;

const SVG_WIDTH = 520;
const TIER_HEIGHT = 72;
const GAP = 4;

export const ConversionFunnelChart = ({
  dials,
  answered,
  dmConversations,
  sqls,
}: ConversionFunnelChartProps) => {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
    pct?: string;
  }>({ visible: false, x: 0, y: 0, label: "", value: 0 });

  const values = useMemo(() => [dials, answered, dmConversations, sqls], [dials, answered, dmConversations, sqls]);

  const conversionLabels = useMemo(() => {
    const safe = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) : "0.0");
    return [
      null,
      `${safe(answered, dials)}% answered`,
      `${safe(dmConversations, answered)}% of answered`,
      `${safe(sqls, dmConversations)}% of DM conv`,
    ];
  }, [dials, answered, dmConversations, sqls]);

  const tiers = useMemo(() => {
    return TIERS.map((tier, i) => {
      const topWidth = tier.widthPx;
      const bottomWidth = TIERS[i + 1]?.widthPx ?? tier.widthPx * 0.75;
      const topLeft = (SVG_WIDTH - topWidth) / 2;
      const topRight = topLeft + topWidth;
      const y = i * (TIER_HEIGHT + GAP);
      const bottomLeft = (SVG_WIDTH - bottomWidth) / 2;
      const bottomRight = bottomLeft + bottomWidth;
      const points = `${topLeft},${y} ${topRight},${y} ${bottomRight},${y + TIER_HEIGHT} ${bottomLeft},${y + TIER_HEIGHT}`;
      const textY = y + TIER_HEIGHT / 2;
      return { ...tier, points, y, textY, topLeft, topRight, bottomLeft, bottomRight };
    });
  }, []);

  const svgHeight = TIERS.length * TIER_HEIGHT + (TIERS.length - 1) * GAP;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Funnel Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
            className="w-full h-auto"
            role="img"
            aria-label="Conversion funnel chart"
          >
            {tiers.map((tier, i) => (
              <g
                key={tier.key}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.closest("svg") as SVGSVGElement)?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    visible: true,
                    x: SVG_WIDTH / 2,
                    y: tier.y + TIER_HEIGHT / 2,
                    label: tier.label,
                    value: values[i],
                    pct: conversionLabels[i] ?? undefined,
                  });
                }}
                onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                className="cursor-pointer"
              >
                <polygon
                  points={tier.points}
                  fill={tier.color}
                  className="transition-opacity hover:opacity-90"
                />
                {/* Label */}
                <text
                  x={SVG_WIDTH / 2}
                  y={tier.textY - 10}
                  textAnchor="middle"
                  fill="white"
                  fontSize={13}
                  fontWeight={400}
                  opacity={0.85}
                >
                  {tier.label}
                </text>
                {/* Value */}
                <text
                  x={SVG_WIDTH / 2}
                  y={tier.textY + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize={22}
                  fontWeight={700}
                >
                  {values[i].toLocaleString()}
                </text>
              </g>
            ))}

            {/* Conversion % labels on right */}
            {tiers.map((tier, i) => {
              if (i === 0 || !conversionLabels[i]) return null;
              return (
                <text
                  key={`pct-${tier.key}`}
                  x={SVG_WIDTH - 15}
                  y={tier.textY + 4}
                  textAnchor="end"
                  fontSize={11}
                  className="fill-muted-foreground"
                >
                  {conversionLabels[i]}
                </text>
              );
            })}

            {/* Tooltip */}
            {tooltip.visible && (
              <foreignObject
                x={tooltip.x - 90}
                y={tooltip.y - 45}
                width={180}
                height={70}
                style={{ pointerEvents: "none" }}
              >
                <div className="bg-[#0f172a] text-white rounded-lg px-3 py-2 text-center shadow-lg">
                  <div className="font-bold text-sm">{tooltip.label}</div>
                  <div className="text-base">{tooltip.value.toLocaleString()}</div>
                  {tooltip.pct && (
                    <div className="text-xs opacity-75">{tooltip.pct}</div>
                  )}
                </div>
              </foreignObject>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
