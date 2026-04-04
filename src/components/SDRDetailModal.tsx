import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { SDRPerformanceOverview } from "@/components/SDRDetailTabs/SDRPerformanceOverview";
import { SDRActivityTimeline } from "@/components/SDRDetailTabs/SDRActivityTimeline";
import { SDRMeetingsResults } from "@/components/SDRDetailTabs/SDRMeetingsResults";
import { SDRNotesCoaching } from "@/components/SDRDetailTabs/SDRNotesCoaching";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface SDRDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sdr: {
    name: string;
    initials: string;
    rank: number;
    dials: number;
    answered: number;
    dms: number;
    sqls: number;
    trend: number;
  };
  globalDateRange?: DateRange;
}

export const SDRDetailModal = ({ isOpen, onClose, sdr, globalDateRange }: SDRDetailModalProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(globalDateRange);
  const { isAdmin, isManager, isSdr } = useUserRole();
  const conversionRate = sdr.dials > 0 ? ((sdr.sqls / sdr.dials) * 100).toFixed(2) : "0.00";
  const [teamAverages, setTeamAverages] = useState<{ dials: number; answered: number; dms: number; sqls: number } | undefined>();

  const showNotesTab = isAdmin || isManager || isSdr;
  const isSdrViewingOwn = isSdr;

  // Fetch team averages for comparison
  useEffect(() => {
    const fetchTeamAvg = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const { data } = await supabase
        .from("daily_snapshots")
        .select("sdr_name, dials, answered, dms_reached, sqls")
        .gte("snapshot_date", startDate)
        .lte("snapshot_date", endDate);

      if (data && data.length > 0) {
        // Group by SDR to get per-SDR totals, then average across SDRs
        const sdrMap = new Map<string, { dials: number; answered: number; dms: number; sqls: number }>();
        for (const row of data) {
          const key = row.sdr_name || "";
          const entry = sdrMap.get(key) || { dials: 0, answered: 0, dms: 0, sqls: 0 };
          entry.dials += row.dials ?? 0;
          entry.answered += row.answered ?? 0;
          entry.dms += row.dms_reached ?? 0;
          entry.sqls += row.sqls ?? 0;
          sdrMap.set(key, entry);
        }
        const sdrCount = sdrMap.size;
        if (sdrCount > 0) {
          let totalDials = 0, totalAnswered = 0, totalDMs = 0, totalSQLs = 0;
          for (const v of sdrMap.values()) {
            totalDials += v.dials;
            totalAnswered += v.answered;
            totalDMs += v.dms;
            totalSQLs += v.sqls;
          }
          setTeamAverages({
            dials: Math.round(totalDials / sdrCount),
            answered: Math.round(totalAnswered / sdrCount),
            dms: Math.round(totalDMs / sdrCount),
            sqls: Math.round(totalSQLs / sdrCount),
          });
        }
      }
    };
    fetchTeamAvg();
  }, [dateRange]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full md:max-w-[90vw] h-screen md:h-auto md:max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
                <AvatarFallback className="text-base sm:text-lg bg-primary/20 text-primary">
                  {sdr.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">{sdr.name}</h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs sm:text-sm">
                    Rank: #{sdr.rank}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs sm:text-sm">
                    {sdr.sqls} SQLs
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs sm:text-sm hidden sm:inline-flex">
                    {conversionRate}% Conversion
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <div className="hidden md:block">
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px]">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="md:hidden mt-3 w-full">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>
        </DialogHeader>

        {/* Tabs Content */}
        <div className="p-4 sm:p-6">
          <Tabs defaultValue="overview" className="w-full">
            <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-4 sm:px-0">
              <TabsList className={`grid w-full mb-4 sm:mb-6 min-w-[500px] sm:min-w-0 ${showNotesTab ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Performance Overview</span>
                  <span className="sm:hidden">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Activity Timeline</span>
                  <span className="sm:hidden">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="meetings" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Meetings & Results</span>
                  <span className="sm:hidden">Meetings</span>
                </TabsTrigger>
                {showNotesTab && (
                  <TabsTrigger value="notes" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">{isSdrViewingOwn ? "My Goals" : "Notes & Coaching"}</span>
                    <span className="sm:hidden">{isSdrViewingOwn ? "Goals" : "Notes"}</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <SDRPerformanceOverview sdr={sdr} teamAverages={teamAverages} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <SDRActivityTimeline sdrName={sdr.name} />
            </TabsContent>

            <TabsContent value="meetings" className="space-y-6">
              <SDRMeetingsResults sdrName={sdr.name} />
            </TabsContent>

            {showNotesTab && (
              <TabsContent value="notes" className="space-y-6">
                <SDRNotesCoaching sdrName={sdr.name} isSdrView={isSdrViewingOwn} />
              </TabsContent>
            )}
          </Tabs>
        </div>

      </DialogContent>
    </Dialog>
  );
};
