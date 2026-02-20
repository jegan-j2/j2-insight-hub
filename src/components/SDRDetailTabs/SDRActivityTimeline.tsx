import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { startOfWeek, endOfWeek, subWeeks, format, isAfter, isSameDay, addDays } from "date-fns";

interface SDRActivityTimelineProps {
  sdrName: string;
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getColorIntensity = (value: number, isFuture: boolean) => {
  if (isFuture) return "bg-muted/20 border border-dashed border-border";
  if (value === 0) return "bg-muted/30";
  if (value < 45) return "bg-blue-500/20";
  if (value < 50) return "bg-blue-500/40";
  if (value < 55) return "bg-blue-500/60";
  if (value < 60) return "bg-blue-500/80";
  return "bg-blue-500";
};

export const SDRActivityTimeline = ({ sdrName }: SDRActivityTimelineProps) => {
  const [dialsByDate, setDialsByDate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Melbourne-aware "now"
  const melbourneNow = useMemo(() => {
    const str = new Date().toLocaleString("en-US", { timeZone: "Australia/Melbourne" });
    return new Date(str);
  }, []);

  // Build 4 weeks of date info (most recent week last)
  const weeks = useMemo(() => {
    const result: { label: string; dates: Date[] }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(melbourneNow, i), { weekStartsOn: 1 });
      const dates = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d));
      const label = `${format(dates[0], "MMM d")}`;
      result.push({ label, dates });
    }
    return result;
  }, [melbourneNow]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const earliest = weeks[0].dates[0];
      const latest = weeks[weeks.length - 1].dates[6];

      const { data } = await supabase
        .from("daily_snapshots")
        .select("snapshot_date, dials")
        .eq("sdr_name", sdrName)
        .gte("snapshot_date", format(earliest, "yyyy-MM-dd"))
        .lte("snapshot_date", format(latest, "yyyy-MM-dd"));

      const map: Record<string, number> = {};
      if (data) {
        for (const row of data) {
          const key = row.snapshot_date;
          map[key] = (map[key] || 0) + (row.dials ?? 0);
        }
      }
      setDialsByDate(map);
      setLoading(false);
    };
    fetchData();
  }, [sdrName, weeks]);

  // Compute insights
  const insights = useMemo(() => {
    const dayTotals = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);
    let totalDials = 0;
    let totalDays = 0;
    let bestWeekIdx = 0;
    let bestWeekTotal = 0;

    weeks.forEach((week, wi) => {
      let weekTotal = 0;
      week.dates.forEach((date, di) => {
        const key = format(date, "yyyy-MM-dd");
        const val = dialsByDate[key] || 0;
        if (!isAfter(date, melbourneNow) && di < 5) {
          dayTotals[di] += val;
          dayCounts[di] += 1;
          totalDials += val;
          totalDays += 1;
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

    return {
      mostActiveDay: dayLabels[mostActiveDay],
      mostActiveDayAvg: mostActiveDayAvg.toFixed(1),
      avgDailyDials: totalDays > 0 ? (totalDials / totalDays).toFixed(1) : "0",
      bestWeekLabel: weeks[bestWeekIdx]?.label || "—",
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
          <div className="space-y-4">
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

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "flex-1 aspect-square rounded flex items-center justify-center text-xs font-medium transition-all cursor-pointer",
                          getColorIntensity(value, isFuture),
                          isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                          !isFuture && value > 0 && "text-white hover:scale-110 hover:shadow-lg",
                          !isFuture && value === 0 && "text-muted-foreground",
                          isFuture && "text-muted-foreground/50"
                        )}
                        title={isFuture ? "Future" : value === 0 ? "No activity" : `${value} dials`}
                      >
                        {isFuture ? "—" : value > 0 ? value : ""}
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
                <div className="w-4 h-4 rounded bg-muted/30" />
                <div className="w-4 h-4 rounded bg-blue-500/20" />
                <div className="w-4 h-4 rounded bg-blue-500/40" />
                <div className="w-4 h-4 rounded bg-blue-500/60" />
                <div className="w-4 h-4 rounded bg-blue-500/80" />
                <div className="w-4 h-4 rounded bg-blue-500" />
              </div>
              <span>More</span>
              <div className="ml-2 w-4 h-4 rounded border border-dashed border-border bg-muted/20" />
              <span>Future</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
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

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
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
          </div>
        </CardContent>
      </Card>
    </>
  );
};
