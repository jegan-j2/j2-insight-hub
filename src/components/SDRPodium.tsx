import { useMemo } from "react";
import { Medal, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LeaderboardEntry {
  rank: number;
  name: string;
  clientId: string;
  initials: string;
  totalDials: number;
  totalAnswered: number;
  totalDMs: number;
  totalSQLs: number;
  answerRate: string;
  conversionRate: string;
  trend: number;
  avgDuration: number;
}

interface SDRPodiumProps {
  leaderboardData: LeaderboardEntry[];
  clientNameMap: Record<string, string>;
  previousPeriodData?: LeaderboardEntry[];
}

const medalColors: Record<number, { color: string; border: string; bg: string }> = {
  1: { color: "#FFD700", border: "border-t-[3px] border-t-[#FFD700]", bg: "bg-[#FFD700]" },
  2: { color: "#C0C0C0", border: "border-t-[3px] border-t-[#C0C0C0]", bg: "bg-[#C0C0C0]" },
  3: { color: "#CD7F32", border: "border-t-[3px] border-t-[#CD7F32]", bg: "bg-[#CD7F32]" },
};

export const SDRPodium = ({ leaderboardData, clientNameMap, previousPeriodData }: SDRPodiumProps) => {
  const top3 = leaderboardData.slice(0, 3);

  const mostImproved = useMemo(() => {
    if (!previousPeriodData || previousPeriodData.length === 0) return null;

    const prevMap = new Map<string, number>();
    for (const entry of previousPeriodData) {
      const key = `${entry.name}|||${entry.clientId}`;
      prevMap.set(key, parseFloat(entry.answerRate));
    }

    let best: { name: string; clientId: string; improvement: number } | null = null;

    for (const entry of leaderboardData) {
      const key = `${entry.name}|||${entry.clientId}`;
      const prevRate = prevMap.get(key);
      if (prevRate !== undefined && prevRate > 0) {
        const improvement = parseFloat(entry.answerRate) - prevRate;
        if (improvement > 0 && (!best || improvement > best.improvement)) {
          best = { name: entry.name, clientId: entry.clientId, improvement };
        }
      }
    }

    return best;
  }, [leaderboardData, previousPeriodData]);

  if (top3.length === 0) return null;

  // Reorder for podium display: #2 (left), #1 (center), #3 (right)
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [top3[1], top3[0]]
      : [top3[0]];

  const podiumRanks = top3.length >= 3
    ? [2, 1, 3]
    : top3.length === 2
      ? [2, 1]
      : [1];

  return (
    <div className="rounded-lg bg-[#F8FAFC] dark:bg-[#1a2236] p-6 space-y-6">
      {/* Podium Cards */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6">
        {podiumOrder.map((sdr, idx) => {
          const rank = podiumRanks[idx];
          const medal = medalColors[rank];
          const isFirst = rank === 1;
          const clientName = clientNameMap[sdr.clientId] || sdr.clientId;

          return (
            <div
              key={`${sdr.name}-${sdr.clientId}`}
              className={`
                w-full md:w-[220px] bg-white dark:bg-[#0f172a] rounded-lg shadow-sm
                ${medal.border}
                ${isFirst ? "md:pb-2 md:-mt-4" : ""}
                transition-all duration-200
              `}
            >
              <div className="flex flex-col items-center p-5 gap-3">
                {/* Medal */}
                <Medal className="h-6 w-6" style={{ color: medal.color }} />

                {/* Avatar */}
                <Avatar className="h-14 w-14">
                  <AvatarFallback
                    className="text-lg font-bold text-white"
                    style={{ backgroundColor: medal.color }}
                  >
                    {sdr.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Client */}
                <div className="text-center">
                  <p className="font-bold text-foreground text-sm">{sdr.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
                </div>

                {/* SQLs */}
                <p className="text-3xl font-extrabold text-foreground">{sdr.totalSQLs}</p>
                <p className="text-[11px] text-muted-foreground -mt-2 uppercase tracking-wide">SQLs</p>

                {/* Sub-stats */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{sdr.totalDials.toLocaleString()}</p>
                    <p>Dials</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{sdr.answerRate}%</p>
                    <p>Answer Rate</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Most Improved Badge */}
      {mostImproved && (
        <div className="flex items-center gap-3 bg-white dark:bg-[#0f172a] rounded-lg px-4 py-3 border-l-4 border-l-emerald-500 shadow-sm max-w-md mx-auto">
          <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Most Improved: {mostImproved.name}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              +{mostImproved.improvement.toFixed(1)}% answer rate improvement
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
