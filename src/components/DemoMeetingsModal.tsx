import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  metric?: "demoBooked" | "demoAttended";
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  demo_booked: { label: "Demo Booked", color: "#3b82f6" },
  demo_attended: { label: "Demo Attended", color: "#10b981" },
  cancelled: { label: "Cancelled", color: "#94a3b8" },
  no_show: { label: "No Show", color: "#ef4444" },
};

export const DemoMeetingsModal = ({
  isOpen,
  onClose,
  sdrName,
  clientId,
  dateRange,
  metric = "demoBooked",
}: DemoMeetingsModalProps) => {
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

  // Matches SQL drill-down: "29 Apr 2026 · 4:45 PM"
  const formatBookedAt = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dateLabel = d.toLocaleDateString("en-AU", {
        timeZone: "Australia/Melbourne",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeLabel = d
        .toLocaleTimeString("en-AU", {
          timeZone: "Australia/Melbourne",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(" am", " AM")
        .replace(" pm", " PM");
      return `${dateLabel} · ${timeLabel}`;
    } catch {
      return dateStr;
    }
  };

  // Matches formatScheduledMeetingDateTime used in SQL drill-down
  const formatMeetingDate = (date: string | null, time: string | null) => {
    if (!date) return "-";
    const dateLabel = format(new Date(date + "T00:00:00"), "d MMM yyyy");
    if (!time) return dateLabel;
    const attempt = new Date(`${date}T${time}`);
    if (!isNaN(attempt.getTime())) return format(attempt, "d MMM yyyy, h:mm a");
    return `${dateLabel}, ${time}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "bg-card border-border overflow-hidden flex flex-col",
          isMobile ? "w-full h-full max-w-full max-h-full rounded-none" : "sm:max-w-[900px] max-h-[80vh]",
        )}
      >
        {/* Header — identical structure to SQL drill-down */}
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {sdrName} – {metric === "demoAttended" ? "Demo Attended" : "Demo Booked"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {demos.length} record{demos.length !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#0f172a] border-t-transparent animate-spin dark:border-white dark:border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : demos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No demo bookings found for this SDR in the selected time range.
          </p>
        ) : (
          <div className="overflow-y-auto overflow-x-hidden flex-1 max-w-full">
            {/* Table — identical structure to SQL drill-down, Status replaces Recording */}
            <Table className="table-fixed w-full">
              <TableHeader className="table-header-navy sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-left w-[22%]">Booked At</TableHead>
                  <TableHead className="text-left w-[20%]">Contact Person</TableHead>
                  <TableHead className="text-left w-[20%]">Company</TableHead>
                  <TableHead className="text-center w-[22%]">Meeting Date</TableHead>
                  <TableHead className="text-center w-[16%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-striped">
                {demos.map((demo) => {
                  const config = STATUS_CONFIG[demo.demo_status] || STATUS_CONFIG.demo_booked;
                  return (
                    <TableRow key={demo.id} className="border-border/50">
                      <TableCell className="text-left text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatBookedAt(demo.created_at)}
                      </TableCell>
                      <TableCell className="text-left font-medium">{demo.contact_person || "-"}</TableCell>
                      <TableCell className="text-left">{demo.company_name || "-"}</TableCell>
                      <TableCell className="text-center whitespace-nowrap tabular-nums">
                        {formatMeetingDate(demo.meeting_date, demo.meeting_time)}
                      </TableCell>
                      <TableCell className="text-center">
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
      </DialogContent>
    </Dialog>
  );
};
