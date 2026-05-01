import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Loader2, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DemoRecord {
  id: string;
  contact_person: string | null;
  company_name: string | null;
  booking_date: string;
  meeting_date: string | null;
  meeting_time: string | null;
  demo_status: string;
  created_at: string;
}

interface DemoMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sdrName: string;
  clientId: string;
  dateRange: DateRange | undefined;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  demo_booked: { label: "Demo Booked", color: "#3b82f6" },
  demo_attended: { label: "Demo Attended", color: "#10b981" },
  cancelled: { label: "Cancelled", color: "#94a3b8" },
  no_show: { label: "No Show", color: "#ef4444" },
};

export const DemoMeetingsModal = ({ isOpen, onClose, sdrName, clientId, dateRange }: DemoMeetingsModalProps) => {
  const isMobile = useIsMobile();
  const [demos, setDemos] = useState<DemoRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !dateRange?.from || !dateRange?.to) return;
    const fetchDemos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_sdr_demos", {
          p_sdr_name: sdrName,
          p_client_id: clientId,
          p_start_date: format(dateRange.from!, "yyyy-MM-dd"),
          p_end_date: format(dateRange.to!, "yyyy-MM-dd"),
        });
        if (!error && data) setDemos(data as DemoRecord[]);
      } catch (err) {
        console.error("Error fetching demos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDemos();
  }, [isOpen, sdrName, clientId, dateRange]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr + "T00:00:00"), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    return timeStr;
  };

  const demoBooked = demos.filter((d) => d.demo_status === "demo_booked").length;
  const demoAttended = demos.filter((d) => d.demo_status === "demo_attended").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "overflow-y-auto p-0 gap-0",
          isMobile ? "w-full h-full max-w-full max-h-full rounded-none" : "w-[90vw] max-w-[900px] max-h-[80vh]",
        )}
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">{sdrName} - Demo Meetings</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30 text-xs">
                  🎬 {demoBooked} Demo Booked
                </Badge>
                <Badge className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30 text-xs">
                  ✅ {demoAttended} Demo Attended
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px] shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
          {dateRange?.from && dateRange?.to && (
            <p className="text-xs text-muted-foreground mt-2">
              {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
            </p>
          )}
        </DialogHeader>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : demos.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No demo meetings found"
              description="No demos recorded for this SDR in the selected period"
            />
          ) : isMobile ? (
            /* Mobile: card layout */
            <div className="space-y-2">
              {demos.map((demo) => {
                const config = STATUS_CONFIG[demo.demo_status] || STATUS_CONFIG.demo_booked;
                return (
                  <div key={demo.id} className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">{demo.contact_person || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{demo.company_name || "—"}</p>
                      </div>
                      <Badge className="text-white text-xs shrink-0" style={{ backgroundColor: config.color }}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Booked: {formatDate(demo.booking_date)}</span>
                      {demo.meeting_date && (
                        <span>
                          Meeting: {formatDate(demo.meeting_date)}
                          {demo.meeting_time ? ` ${formatTime(demo.meeting_time)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop: table layout */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="table-header-navy">
                  <TableRow>
                    <TableHead className="px-4 py-3 text-left">Contact Person</TableHead>
                    <TableHead className="px-4 py-3 text-left">Company</TableHead>
                    <TableHead className="px-4 py-3 text-center">Booking Date</TableHead>
                    <TableHead className="px-4 py-3 text-center">Meeting Date</TableHead>
                    <TableHead className="px-4 py-3 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="table-striped">
                  {demos.map((demo) => {
                    const config = STATUS_CONFIG[demo.demo_status] || STATUS_CONFIG.demo_booked;
                    return (
                      <TableRow key={demo.id} className="border-border/50">
                        <TableCell className="px-4 py-3 font-medium text-foreground">
                          {demo.contact_person || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-foreground">{demo.company_name || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                          {formatDate(demo.booking_date)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                          {demo.meeting_date
                            ? `${formatDate(demo.meeting_date)}${demo.meeting_time ? ` ${formatTime(demo.meeting_time)}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge className="text-white text-xs" style={{ backgroundColor: config.color }}>
                            {config.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
