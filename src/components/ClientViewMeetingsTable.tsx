import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, ChevronDown, CalendarX, Check, Search, CalendarIcon, X } from "lucide-react";
import { useMeetingUpdate } from "@/hooks/useMeetingUpdate";
import { usePermissions } from "@/hooks/useUserRole";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { SQLMeeting } from "@/lib/supabase-types";
import { EmptyState } from "@/components/EmptyState";
import { toCSV, downloadCSV } from "@/lib/csvExport";

interface MeetingData {
  id: string;
  bookingDate: Date;
  contactPerson: string;
  companyName: string;
  sdr: string;
  meetingDate: Date | null;
  meetingStatus: string;
  clientNotes: string;
  clientId: string;
}

const STATUS_OPTIONS: { value: string; label: string; color: string; hasIcon?: boolean }[] = [
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "held", label: "Held", color: "#10b981", hasIcon: true },
  { value: "no_show", label: "No Show", color: "#f43f5e" },
  { value: "reschedule", label: "Reschedule", color: "#3b82f6" },
];

const getStatusConfig = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

type SortField = "bookingDate" | "contactPerson" | "companyName" | "meetingDate" | "meetingStatus";

interface ClientViewMeetingsTableProps {
  clientSlug: string;
  meetings: SQLMeeting[];
}

const mapMeetings = (meetings: SQLMeeting[]): MeetingData[] =>
  meetings.map(m => ({
    id: m.id,
    bookingDate: parseISO(m.booking_date),
    contactPerson: m.contact_person,
    companyName: m.company_name || "",
    sdr: m.sdr_name || "",
    meetingDate: m.meeting_date ? parseISO(m.meeting_date) : null,
    meetingStatus: m.meeting_status ?? "pending",
    clientNotes: m.client_notes ?? "",
    clientId: m.client_id || "",
  }));

export const ClientViewMeetingsTable = ({ clientSlug, meetings }: ClientViewMeetingsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("bookingDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingDateRange, setBookingDateRange] = useState<DateRange | undefined>(undefined);
  const [meetingDateRange, setMeetingDateRange] = useState<DateRange | undefined>(undefined);
  const [bookingPopoverOpen, setBookingPopoverOpen] = useState(false);
  const [meetingPopoverOpen, setMeetingPopoverOpen] = useState(false);
  const { canEditSQL, isSdr } = usePermissions();
  const { updateMeetingStatus, updateClientNotes, createRescheduleRow, updating } = useMeetingUpdate();

  const rowsPerPage = 15;
  const displayMeetings = useMemo(() => mapMeetings(meetings), [meetings]);
  const [localMeetings, setLocalMeetings] = useState<MeetingData[]>(displayMeetings);
  useEffect(() => { setLocalMeetings(displayMeetings); }, [displayMeetings]);

  const handleStatusChange = useCallback(async (meeting: MeetingData, newStatus: string) => {
    const oldStatus = meeting.meetingStatus;
    setLocalMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, meetingStatus: newStatus } : m));
    const success = await updateMeetingStatus(meeting.id, newStatus);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, meetingStatus: oldStatus } : m));
      return;
    }
    if (newStatus === "reschedule") {
      const newRow = await createRescheduleRow({
        client_id: meeting.clientId,
        contact_person: meeting.contactPerson,
        company_name: meeting.companyName,
        sdr_name: meeting.sdr,
      });
      if (newRow) {
        setLocalMeetings(prev => [{
          id: newRow.id,
          bookingDate: parseISO(newRow.booking_date),
          contactPerson: newRow.contact_person,
          companyName: newRow.company_name || "",
          sdr: newRow.sdr_name || "",
          meetingDate: newRow.meeting_date ? parseISO(newRow.meeting_date) : null,
          meetingStatus: newRow.meeting_status ?? "pending",
          clientNotes: newRow.client_notes ?? "",
          clientId: newRow.client_id || "",
        }, ...prev]);
      }
    }
  }, [updateMeetingStatus, createRescheduleRow]);

  const handleNotesChange = useCallback(async (meetingId: string, newNotes: string) => {
    const original = localMeetings.find(m => m.id === meetingId)?.clientNotes || "";
    if (newNotes === original) return;
    setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, clientNotes: newNotes } : m));
    const success = await updateClientNotes(meetingId, newNotes);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, clientNotes: original } : m));
    }
  }, [updateClientNotes, localMeetings]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const filteredMeetings = useMemo(() => {
    let result = [...localMeetings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.contactPerson.toLowerCase().includes(q) ||
        m.companyName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter(m => m.meetingStatus === statusFilter);
    }
    if (bookingDateRange?.from) {
      result = result.filter(m => m.bookingDate >= bookingDateRange.from!);
      if (bookingDateRange.to) {
        const endOfDay = new Date(bookingDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        result = result.filter(m => m.bookingDate <= endOfDay);
      }
    }
    if (meetingDateRange?.from) {
      result = result.filter(m => m.meetingDate && m.meetingDate >= meetingDateRange.from!);
      if (meetingDateRange.to) {
        const endOfDay = new Date(meetingDateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        result = result.filter(m => m.meetingDate && m.meetingDate <= endOfDay);
      }
    }
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "bookingDate" || sortField === "meetingDate") {
        aVal = aVal ? (aVal as Date).getTime() : 0;
        bVal = bVal ? (bVal as Date).getTime() : 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === "string") return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [localMeetings, search, statusFilter, bookingDateRange, meetingDateRange, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredMeetings.length / rowsPerPage);
  const paginatedMeetings = filteredMeetings.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, bookingDateRange, meetingDateRange]);

  const handleExportCSV = () => {
    const headers = ["Booking Date", "Contact Person", "Company", "SDR", "Meeting Date", "Status", "Notes"];
    const rows = filteredMeetings.map(m => [
      format(m.bookingDate, "MMM dd, yyyy"),
      m.contactPerson,
      m.companyName,
      m.sdr,
      m.meetingDate ? format(m.meetingDate, "MMM dd, yyyy") : "TBC",
      getStatusConfig(m.meetingStatus).label,
      m.clientNotes,
    ]);
    const csv = toCSV(headers, rows);
    downloadCSV(csv, `${clientSlug}-sql-meetings-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx-js-style");
    const headers = ["Booking Date", "Contact Person", "Company", "SDR", "Meeting Date", "Status", "Notes"];
    const rows = filteredMeetings.map(m => [
      format(m.bookingDate, "MMM dd, yyyy"),
      m.contactPerson,
      m.companyName,
      m.sdr,
      m.meetingDate ? format(m.meetingDate, "MMM dd, yyyy") : "TBC",
      getStatusConfig(m.meetingStatus).label,
      m.clientNotes || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Column widths
    ws["!cols"] = [
      { wch: 15 }, // Booking Date
      { wch: 25 }, // Contact Person
      { wch: 25 }, // Company
      { wch: 20 }, // SDR
      { wch: 15 }, // Meeting Date
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
    ];

    // Apply header styling
    const headerStyle = {
      fill: { fgColor: { rgb: "0F172A" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial" },
      alignment: { horizontal: "center" as const },
    };
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    // Apply alternating row styling
    const evenRowStyle = { fill: { fgColor: { rgb: "F1F5F9" } }, font: { name: "Arial" } };
    const oddRowStyle = { fill: { fgColor: { rgb: "FFFFFF" } }, font: { name: "Arial" } };
    for (let r = 0; r < rows.length; r++) {
      const style = r % 2 === 0 ? evenRowStyle : oddRowStyle;
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: r + 1, c });
        if (ws[cellRef]) ws[cellRef].s = style;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SQL Meetings");
    XLSX.writeFile(wb, `${clientSlug}-sql-meetings-${format(new Date(), "yyyy-MM-dd")}.xlsx`, { cellStyles: true });
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const StatusBadge = ({ meeting }: { meeting: MeetingData }) => {
    const config = getStatusConfig(meeting.meetingStatus);
    const canEdit = !isSdr && canEditSQL(meeting.clientId);
    const badge = (
      <Badge className="gap-1 text-white text-xs cursor-default" style={{ backgroundColor: config.color }}>
        {config.hasIcon && <Check className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
    if (!canEdit || updating === meeting.id) return badge;
    return (
      <Select value={meeting.meetingStatus} onValueChange={(v) => handleStatusChange(meeting, v)}>
        <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto shadow-none focus:ring-0 [&>svg]:hidden">
          <Badge className="gap-1 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: config.color }}>
            {config.hasIcon && <Check className="h-3 w-3" />}
            {config.label}
          </Badge>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {STATUS_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                {opt.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const DateRangeFilter = ({
    label,
    range,
    setRange,
    popoverOpen,
    setPopoverOpen,
  }: {
    label: string;
    range: DateRange | undefined;
    setRange: (r: DateRange | undefined) => void;
    popoverOpen: boolean;
    setPopoverOpen: (o: boolean) => void;
  }) => {
    const hasRange = range?.from && range?.to;
    const buttonLabel = hasRange
      ? `${label}: ${format(range!.from!, "MMM dd")} – ${format(range!.to!, "MMM dd")}`
      : `${label}`;

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-xs sm:text-sm whitespace-nowrap gap-1",
              hasRange ? "bg-muted/50 border-primary/30" : "bg-background/50 border-border"
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {buttonLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border-border z-[100]" align="start" sideOffset={8}>
          <div className="p-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground"
              onClick={() => { setRange(undefined); setPopoverOpen(false); }}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={range?.from || new Date()}
            selected={range}
            onSelect={(r) => {
              setRange(r);
              if (r?.from && r?.to) setPopoverOpen(false);
            }}
            numberOfMonths={2}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-foreground">SQL Meetings</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? "s" : ""} booked
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts or companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-background/50 border-border">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter
              label="Booking Date"
              range={bookingDateRange}
              setRange={setBookingDateRange}
              popoverOpen={bookingPopoverOpen}
              setPopoverOpen={setBookingPopoverOpen}
            />
            <DateRangeFilter
              label="Meeting Date"
              range={meetingDateRange}
              setRange={setMeetingDateRange}
              popoverOpen={meetingPopoverOpen}
              setPopoverOpen={setMeetingPopoverOpen}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors whitespace-nowrap">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin scroll-gradient">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-[#f1f5f9] dark:bg-[#1e293b]">
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="bookingDate" label="Booking Date" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="contactPerson" label="Contact Person" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="companyName" label="Company" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">SDR</TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="meetingDate" label="Meeting Date" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                  <SortButton field="meetingStatus" label="Status" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]" style={{ minWidth: 200 }}>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMeetings.map((meeting, index) => (
                <TableRow key={meeting.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? "bg-muted/5" : ""} ${updating === meeting.id ? "opacity-60" : ""}`}>
                  <TableCell className="px-4 py-2 text-foreground whitespace-nowrap">
                    {format(meeting.bookingDate, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-foreground whitespace-nowrap">{meeting.contactPerson}</TableCell>
                  <TableCell className="px-4 py-2 text-foreground">{meeting.companyName}</TableCell>
                  <TableCell className="px-4 py-2 text-foreground whitespace-nowrap">{meeting.sdr}</TableCell>
                  <TableCell className="px-4 py-2 text-foreground whitespace-nowrap">
                    {meeting.meetingDate ? format(meeting.meetingDate, "MMM dd, yyyy") : "TBC"}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-center">
                    <StatusBadge meeting={meeting} />
                  </TableCell>
                  <TableCell className="px-4 py-2" style={{ minWidth: 200 }}>
                    <Input
                      defaultValue={meeting.clientNotes}
                      onBlur={(e) => handleNotesChange(meeting.id, e.target.value)}
                      placeholder={!isSdr && canEditSQL(meeting.clientId) ? "Add notes..." : ""}
                      disabled={updating === meeting.id || isSdr || !canEditSQL(meeting.clientId)}
                      className="bg-transparent border border-border/40 hover:border-border focus:border-ring h-8 text-sm rounded px-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {paginatedMeetings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <EmptyState icon={CalendarX} title="No meetings in this period" description="No SQL booked meetings found for the selected filters" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
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
      </CardContent>
    </Card>
  );
};
