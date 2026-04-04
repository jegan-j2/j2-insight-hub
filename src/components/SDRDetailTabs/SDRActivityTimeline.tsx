import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { startOfWeek, subWeeks, format, isAfter, isSameDay, addDays } from "date-fns";

interface SDRActivityTimelineProps {
  sdrName: string;
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const getHeatmapStyle = (value: number, isFuture: boolean): { bg: string; text: string } => {
  if (isFuture) return { bg: "transparent", text: "" };
  if (value === 0) return { bg: "#FFFFFF", text: "#94a3b8" };
  if (value <= 50) return { bg: "#E2E8F0", text: "#0F172A" };
  if (value <= 100) return { bg: "#64748B", text: "#FFFFFF" };
  return { bg: "#0F172A", text: "#FFFFFF" };
};

export const SDRActivityTimeline = ({ sdrName }: SDRActivityTimelineProps) => {
  const [dialsByDate, setDialsByDate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const melbourneNow = useMemo(() => {
    const str = new Date().toLocaleString("en-US", { timeZone: "Australia/Melbourne" });
    return new Date(str);
  }, []);

  // Build 4 weeks (Mon-Fri only)
  const weeks = useMemo(() => {
    const result: { label: string; dates: Date[] }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(melbourneNow, i), { weekStartsOn: 1 });
      const dates = Array.from({ length: 5 }, (_, d) => addDays(weekStart, d)); // Mon-Fri
      const label = format(dates[0], "MMM d");
      result.push({ label, dates });
    }
    return result;
  }, [melbourneNow]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const earliest = weeks[0].dates[0];
      const latest = weeks[weeks.length - 1].dates[4];

      const { data } = await supabase
        .from("daily_snapshots")
        .select("snapshot_date, dials")
        .eq("sdr_name", sdrName)
        .gte("snapshot_date", format(earliest, "yyyy-MM-dd"))
        .lte("snapshot_date", format(latest, "yyyy-MM-dd"));

      const map: Record<string, number> = {};
      if (data) {
        for (const row of data) {
          map[row.snapshot_date] = (map[row.snapshot_date] || 0) + (row.dials ?? 0);
        }
      }
      setDialsByDate(map);
      setLoading(false);
    };
    fetchData();
  }, [sdrName, weeks]);

  const insights = useMemo(() => {
    const dayTotals = Array(5).fill(0);
    const dayCounts = Array(5).fill(0);
    let totalDials = 0;
    let totalWorkingDays = 0;
    let daysWithMin50 = 0;
    let bestWeekIdx = 0;
    let bestWeekTotal = 0;

    weeks.forEach((week, wi) => {
      let weekTotal = 0;
      week.dates.forEach((date, di) => {
        const key = format(date, "yyyy-MM-dd");
        const val = dialsByDate[key] || 0;
        const isPastOrToday = !isAfter(date, melbourneNow) || isSameDay(date, melbourneNow);
        if (isPastOrToday) {
          dayTotals[di] += val;
          dayCounts[di] += 1;
          totalDials += val;
          totalWorkingDays += 1;
          if (val >= 50) daysWithMin50 += 1;
        }
        weekTotal += val;
      });
      if (weekTotal > bestWeekTotal) {
        bestWeekTotal = weekTotal;
        bestWeekIdx = wi;
      }
    });

    let mostActiveDay = 0;
    let mostActiveDayAvg = 0;
    for (let i = 0; i < 5; i++) {
      const avg = dayCounts[i] > 0 ? dayTotals[i] / dayCounts[i] : 0;
      if (avg > mostActiveDayAvg) {
        mostActiveDayAvg = avg;
        mostActiveDay = i;
      }
    }

    const consistencyScore = totalWorkingDays > 0 ? (daysWithMin50 / totalWorkingDays) * 100 : 0;

    return {
      mostActiveDay: dayLabels[mostActiveDay],
      mostActiveDayAvg: mostActiveDayAvg.toFixed(1),
      avgDailyDials: totalWorkingDays > 0 ? (totalDials / totalWorkingDays).toFixed(1) : "0",
      bestWeekLabel: weeks[bestWeekIdx]?.label || "—",
      consistencyScore,
    };
  }, [dialsByDate, weeks, melbourneNow]);

  return (
    <>
      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Activity Heatmap (Last 4 Weeks)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 overflow-visible">
            {/* Day labels */}
            <div className="flex gap-2">
              <div className="w-20" />
              {dayLabels.map((day) => (
                <div key={day} className="flex-1 text-center text-xs text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
            ) : (
              weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex gap-2 items-center">
                  <div className="w-20 text-xs text-muted-foreground font-medium">
                    {week.label}
                  </div>
                  {week.dates.map((date, dayIndex) => {
                    const key = format(date, "yyyy-MM-dd");
                    const value = dialsByDate[key] || 0;
                    const isFuture = isAfter(date, melbourneNow) && !isSameDay(date, melbourneNow);
                    const isToday = isSameDay(date, melbourneNow);
                    const style = getHeatmapStyle(value, isFuture);

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "rounded flex items-center justify-center text-[12px] font-semibold transition-all relative group",
                          isFuture && "border border-dashed border-border bg-muted/20",
                          isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                          !isFuture && value > 0 && "hover:scale-105 hover:shadow-md cursor-pointer",
                          !isFuture && value === 0 && "border border-border/50"
                        )}
                        style={{
                          width: 60, height: 60, minWidth: 60, minHeight: 60,
                          ...(!isFuture ? { backgroundColor: style.bg, color: style.text } : {}),
                        }}
                      >
                        {isFuture ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          value.toString()
                        )}
                        {/* Tooltip */}
                        {!isFuture && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                            {value === 0 ? "No activity" : `${value} dials`}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-4">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: "#FFFFFF" }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#E2E8F0" }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#64748B" }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#0F172A" }} />
              </div>
              <span>More</span>
              <div className="ml-2 w-4 h-4 rounded border border-dashed border-border bg-muted/20" />
              <span>Future</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-sm rounded-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Most Active Day</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground mb-1">{insights.mostActiveDay}s</p>
            <p className="text-sm text-muted-foreground">Average: {insights.mostActiveDayAvg} dials</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 shadow-sm rounded-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Best Week</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground mb-1">{insights.bestWeekLabel}</p>
            <p className="text-sm text-muted-foreground">Highest total dials</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 shadow-sm rounded-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Consistency Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {/* Circular progress */}
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3"
                    strokeDasharray={`${insights.consistencyScore} ${100 - insights.consistencyScore}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{Math.round(insights.consistencyScore)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Working days with 50+ dials</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Daily Dials</span>
              <span className="text-lg font-bold text-foreground">{insights.avgDailyDials}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Most Active Day</span>
              <span className="text-lg font-bold text-foreground">{insights.mostActiveDay}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Peak Performance Week</span>
              <span className="text-lg font-bold text-foreground">{insights.bestWeekLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Consistency (50+ dials days)</span>
              <span className="text-lg font-bold text-foreground">{Math.round(insights.consistencyScore)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
