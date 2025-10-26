import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface SDRActivityTimelineProps {
  sdrName: string;
}

// Mock heatmap data: 4 weeks x 7 days
const heatmapData = [
  { week: "Week 1", days: [45, 52, 58, 48, 42, 0, 0] }, // Mon-Sun
  { week: "Week 2", days: [51, 55, 62, 54, 49, 0, 0] },
  { week: "Week 3", days: [48, 60, 65, 57, 52, 0, 0] },
  { week: "Week 4", days: [53, 58, 63, 55, 51, 0, 0] },
];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getColorIntensity = (value: number) => {
  if (value === 0) return "bg-muted/30";
  if (value < 45) return "bg-blue-500/20";
  if (value < 50) return "bg-blue-500/40";
  if (value < 55) return "bg-blue-500/60";
  if (value < 60) return "bg-blue-500/80";
  return "bg-blue-500";
};

export const SDRActivityTimeline = ({ sdrName }: SDRActivityTimelineProps) => {
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
              <div className="w-20" /> {/* Spacer for week labels */}
              {dayLabels.map((day) => (
                <div key={day} className="flex-1 text-center text-xs text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {heatmapData.map((weekData, weekIndex) => (
              <div key={weekIndex} className="flex gap-2 items-center">
                <div className="w-20 text-xs text-muted-foreground font-medium">
                  {weekData.week}
                </div>
                {weekData.days.map((value, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      "flex-1 aspect-square rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-110 hover:shadow-lg cursor-pointer",
                      getColorIntensity(value),
                      value === 0 ? "text-muted-foreground" : "text-white"
                    )}
                    title={value === 0 ? "No activity" : `${value} dials`}
                  >
                    {value > 0 ? value : ""}
                  </div>
                ))}
              </div>
            ))}

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
            <p className="text-2xl font-bold text-foreground mb-1">Wednesdays</p>
            <p className="text-sm text-muted-foreground">Average: 61.5 dials per Wednesday</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Highest Conversion Day</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground mb-1">Thursdays</p>
            <p className="text-sm text-muted-foreground">Conversion rate: 4.2%</p>
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
              <span className="text-sm text-muted-foreground">Consistency Score</span>
              <span className="text-lg font-bold text-green-600">92%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Daily Dials</span>
              <span className="text-lg font-bold text-foreground">54.7</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Most Productive Time</span>
              <span className="text-lg font-bold text-foreground">10 AM - 12 PM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Peak Performance Week</span>
              <span className="text-lg font-bold text-foreground">Week 3</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
