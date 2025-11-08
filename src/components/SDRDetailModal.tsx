import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Download, Share2, Loader2, Mail, Link2, Download as DownloadIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
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
  const [isExporting, setIsExporting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { toast } = useToast();
  const conversionRate = ((sdr.sqls / sdr.dials) * 100).toFixed(2);

  const handleExportPDF = () => {
    setIsExporting(true);
    
    // Simulate PDF generation
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: "PDF report generated!",
        description: "PDF generation will be available once backend is connected",
        className: "border-primary/30",
      });
    }, 2000);
  };

  const handleShareOption = (option: string) => {
    toast({
      title: "Coming soon",
      description: `${option} sharing will be enabled after backend integration`,
      className: "border-primary/30",
    });
    setIsShareModalOpen(false);
  };

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
          {/* Mobile Date Picker */}
          <div className="md:hidden mt-3 w-full">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>
        </DialogHeader>

        {/* Tabs Content */}
        <div className="p-4 sm:p-6">
          <Tabs defaultValue="overview" className="w-full">
            <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-4 sm:px-0">
              <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 min-w-[500px] sm:min-w-0">
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
                <TabsTrigger value="notes" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Notes & Coaching</span>
                  <span className="sm:hidden">Notes</span>
                </TabsTrigger>
              </TabsList>
            </div>

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
        <div className="border-t border-border p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 sticky bottom-0 bg-card">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Last updated: {format(new Date(), "MMM dd, yyyy h:mm a")}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="min-h-[44px] w-full sm:w-auto hover:border-primary/50 transition-colors"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export PDF Report</span>
                  <span className="sm:hidden">Export PDF</span>
                </>
              )}
            </Button>
            
            <Popover open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="min-h-[44px] w-full sm:w-auto hover:border-primary/50 transition-colors"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Share Report</span>
                  <span className="sm:hidden">Share</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground mb-3">Share via:</h4>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start hover:bg-accent"
                    onClick={() => handleShareOption("Email")}
                  >
                    <Mail className="h-4 w-4 mr-3 text-primary" />
                    <span>Email</span>
                    <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start hover:bg-accent"
                    onClick={() => handleShareOption("Link")}
                  >
                    <Link2 className="h-4 w-4 mr-3 text-primary" />
                    <span>Copy Link</span>
                    <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start hover:bg-accent"
                    onClick={() => handleShareOption("Download")}
                  >
                    <DownloadIcon className="h-4 w-4 mr-3 text-primary" />
                    <span>Download</span>
                    <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                  </Button>

                  <Separator className="my-2" />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsShareModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
