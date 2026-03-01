import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const ClientDrillDownModal = ({ open, onOpenChange, title, records }: ClientDrillDownModalProps) => {
  const sorted = [...records].sort((a, b) => b.activity_date.localeCompare(a.activity_date));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{sorted.length} record{sorted.length !== 1 ? "s" : ""}</p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No records in this period
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-[#f1f5f9] dark:bg-[#1e293b]">
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Date</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Contact Person</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Company</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((record, index) => (
                  <TableRow key={record.id} className={`border-border/50 hover:bg-muted/20 ${index % 2 === 0 ? "bg-muted/5" : ""}`}>
                    <TableCell className="px-4 py-2 text-foreground whitespace-nowrap">
                      {format(new Date(record.activity_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-foreground">{record.contact_name || "—"}</TableCell>
                    <TableCell className="px-4 py-2 text-foreground">{record.company_name || "—"}</TableCell>
                    <TableCell className="px-4 py-2 text-foreground">{formatDuration(record.call_duration)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
