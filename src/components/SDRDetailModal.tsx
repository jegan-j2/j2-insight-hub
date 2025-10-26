import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { SDRPerformanceOverview } from "@/components/SDRDetailTabs/SDRPerformanceOverview";
import { SDRActivityTimeline } from "@/components/SDRDetailTabs/SDRActivityTimeline";
import { SDRMeetingsResults } from "@/components/SDRDetailTabs/SDRMeetingsResults";
import { SDRNotesCoaching } from "@/components/SDRDetailTabs/SDRNotesCoaching";

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
  const conversionRate = ((sdr.sqls / sdr.dials) * 100).toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/20 text-primary">
                  {sdr.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{sdr.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Rank: #{sdr.rank}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                    {sdr.sqls} SQLs
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                    {conversionRate}% Conversion
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs Content */}
        <div className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Performance Overview</TabsTrigger>
              <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
              <TabsTrigger value="meetings">Meetings & Results</TabsTrigger>
              <TabsTrigger value="notes">Notes & Coaching</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <SDRPerformanceOverview sdr={sdr} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <SDRActivityTimeline sdrName={sdr.name} />
            </TabsContent>

            <TabsContent value="meetings" className="space-y-6">
              <SDRMeetingsResults sdrName={sdr.name} />
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <SDRNotesCoaching sdrName={sdr.name} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between sticky bottom-0 bg-card">
          <p className="text-sm text-muted-foreground">
            Last updated: {format(new Date(), "MMM dd, yyyy h:mm a")}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export PDF Report
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Share2 className="h-4 w-4 mr-2" />
              Share Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
