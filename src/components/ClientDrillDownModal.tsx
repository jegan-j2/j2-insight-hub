import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ActivityRecord {
  id: string;
  activity_date: string;
  contact_name: string | null;
  company_name: string | null;
  call_duration: number | null;
}

interface ClientDrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  records: ActivityRecord[];
}

const formatDuration = (seconds: number | null): { text: string; colorClass: string } => {
  if (!seconds || seconds <= 0) return { text: "—", colorClass: "text-muted-foreground" };
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const text = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  let colorClass = "text-muted-foreground";
  if (seconds > 120) colorClass = "text-[#10b981]";
  else if (seconds >= 30) colorClass = "text-[#f97316]";
  return { text, colorClass };
};

export const ClientDrillDownModal = ({ open, onOpenChange, title, records }: ClientDrillDownModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Sort by date DESC, then duration DESC within each date
  const sorted = useMemo(() => [...records].sort((a, b) => {
    const dateA = new Date(a.activity_date).setHours(0, 0, 0, 0);
    const dateB = new Date(b.activity_date).setHours(0, 0, 0, 0);
    if (dateB !== dateA) return dateB - dateA;
    return (b.call_duration || 0) - (a.call_duration || 0);
  }), [records]);

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage + 1;
  const endIdx = Math.min(currentPage * rowsPerPage, sorted.length);

  // Reset page when modal opens with new data
  useMemo(() => { setCurrentPage(1); }, [records]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{sorted.length} record{sorted.length !== 1 ? "s" : ""}</p>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No records in this period
            </div>
          ) : (
            <Table>
              <TableHeader>
              <TableRow className="bg-[#f1f5f9] dark:bg-[#1e293b]">
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Date</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Contact Person</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Company</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((record, index) => {
                  const dur = formatDuration(record.call_duration);
                  return (
                    <TableRow key={record.id} className={`border-border/50 hover:bg-muted/20 ${index % 2 === 0 ? "bg-muted/5" : ""}`}>
                      <TableCell className="px-4 py-2 text-foreground whitespace-nowrap">
                        {format(new Date(record.activity_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-foreground">{record.contact_name || "—"}</TableCell>
                      <TableCell className="px-4 py-2 text-foreground">{record.company_name || "—"}</TableCell>
                      <TableCell className={`px-4 py-2 ${dur.colorClass}`}>{dur.text}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
            <p className="text-sm text-muted-foreground">Showing {startIdx}–{endIdx} of {sorted.length} records</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-border">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-border">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
