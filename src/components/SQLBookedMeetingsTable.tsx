import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMeetingUpdate } from "@/hooks/useMeetingUpdate";
import { usePermissions } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Download, ChevronDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, CalendarDays, CalendarX, Search as SearchIcon, Check, Filter, FileSpreadsheet } from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import type { DateRange } from "react-day-picker";
import type { SQLMeeting, Client } from "@/lib/supabase-types";
import * as XLSX from "xlsx-js-style";

interface MeetingData {
  id: string;
  sqlDate: Date;
  clientId: string;
  clientName: string;
  clientLogo: string | null;
  contactPerson: string;
  companyName: string;
  sdr: string;
  meetingDate: Date;
  meetingStatus: string;
  clientNotes: string;
}

const STATUS_OPTIONS: { value: string; label: string; color: string; icon?: typeof Check }[] = [
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "held", label: "Held", color: "#10b981", icon: Check },
  { value: "no_show", label: "No Show", color: "#f43f5e" },
  { value: "reschedule", label: "Reschedule", color: "#3b82f6" },
];

const getStatusConfig = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

const mapMeetings = (meetings: SQLMeeting[], clients?: Client[]): MeetingData[] =>
  meetings.map(m => {
    const client = clients?.find(c => c.client_id === m.client_id);
    return {
      id: m.id,
      sqlDate: parseISO(m.booking_date),
      clientId: m.client_id || "",
      clientName: client?.client_name || m.client_id || "",
      clientLogo: client?.logo_url || null,
      contactPerson: m.contact_person,
      companyName: m.company_name || "",
      sdr: m.sdr_name || "",
      meetingDate: m.meeting_date ? parseISO(m.meeting_date) : parseISO(m.booking_date),
      meetingStatus: m.meeting_status ?? "pending",
      clientNotes: m.client_notes ?? "",
    };
  });

type SortField = "sqlDate" | "clientName" | "contactPerson" | "companyName" | "sdr" | "meetingDate" | "meetingStatus";
type SortOrder = "asc" | "desc";

interface SQLBookedMeetingsTableProps {
  dateRange?: DateRange;
  isLoading?: boolean;
  meetings?: SQLMeeting[];
  clients?: Client[];
}

export const SQLBookedMeetingsTable = ({ dateRange, isLoading = false, meetings, clients }: SQLBookedMeetingsTableProps) => {
  const { canEditSQL, isSdr } = usePermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("sqlDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sdrFilter, setSdrFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingDateRange, setBookingDateRange] = useState<DateRange | undefined>();
  const [meetingDateRange, setMeetingDateRange] = useState<DateRange | undefined>();
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const displayMeetings = useMemo(() => {
    if (meetings && meetings.length > 0) return mapMeetings(meetings, clients);
    return [];
  }, [meetings, clients]);

  const [localMeetings, setLocalMeetings] = useState<MeetingData[]>([]);
  useEffect(() => { setLocalMeetings(displayMeetings); }, [displayMeetings]);

  const { updateMeetingStatus, updateClientNotes, createRescheduleRow, updating } = useMeetingUpdate();

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
        const client = clients?.find(c => c.client_id === newRow.client_id);
        setLocalMeetings(prev => [{
          id: newRow.id,
          sqlDate: parseISO(newRow.booking_date),
          clientId: newRow.client_id || "",
          clientName: client?.client_name || newRow.client_id || "",
          clientLogo: client?.logo_url || null,
          contactPerson: newRow.contact_person,
          companyName: newRow.company_name || "",
          sdr: newRow.sdr_name || "",
          meetingDate: newRow.meeting_date ? parseISO(newRow.meeting_date) : parseISO(newRow.booking_date),
          meetingStatus: newRow.meeting_status ?? "pending",
          clientNotes: newRow.client_notes ?? "",
        }, ...prev]);
      }
    }
  }, [updateMeetingStatus, createRescheduleRow, clients]);

  const handleNotesChange = useCallback(async (meetingId: string, newNotes: string) => {
    const original = localMeetings.find(m => m.id === meetingId)?.clientNotes || "";
    if (newNotes === original) return;
    setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, clientNotes: newNotes } : m));
    const success = await updateClientNotes(meetingId, newNotes);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, clientNotes: original } : m));
    }
  }, [updateClientNotes, localMeetings]);

  const rowsPerPage = 15;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const exportData = (type: "csv" | "excel") => {
    const headers = ["SQL Date", "Client", "Contact Person", "Company", "SDR", "Meeting Date", "Status", "Notes"];
    const rows = filteredMeetings.map(m => [
      format(m.sqlDate, "MMM dd, yyyy"),
      m.clientName,
      m.contactPerson,
      m.companyName,
      m.sdr,
      format(m.meetingDate, "MMM dd, yyyy"),
      getStatusConfig(m.meetingStatus).label,
      m.clientNotes,
    ]);

    if (type === "csv") {
      const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sql-meetings-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [
        { wch: 15 }, // Booking Date
        { wch: 20 }, // Client
        { wch: 25 }, // Contact Person
        { wch: 25 }, // Company
        { wch: 20 }, // SDR
        { wch: 15 }, // Meeting Date
        { wch: 12 }, // Status
        { wch: 30 }, // Notes
      ];

      // Header row styling — navy background, white bold Arial
      const headerStyle = {
        fill: { fgColor: { rgb: "0F172A" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, name: "Arial" },
        alignment: { horizontal: "center" as const },
      };
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cellRef]) ws[cellRef].s = headerStyle;
      }

      // Alternating row fills
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
      XLSX.writeFile(wb, `sql-meetings-${format(new Date(), "yyyy-MM-dd")}.xlsx`, { cellStyles: true });
    }
  };

  const clearAllFilters = () => {
    setClientFilter("all"); setStatusFilter("all"); setSdrFilter("all");
    setSearchQuery(""); setBookingDateRange(undefined); setMeetingDateRange(undefined);
    setCurrentPage(1);
  };

  const hiddenFiltersCount = [
    bookingDateRange !== undefined,
    meetingDateRange !== undefined,
  ].filter(Boolean).length;

  const activeFiltersCount = [
    clientFilter !== "all", statusFilter !== "all", sdrFilter !== "all",
    searchQuery !== "", bookingDateRange !== undefined, meetingDateRange !== undefined,
  ].filter(Boolean).length;

  const filteredMeetings = useMemo(() => {
    let filtered = [...localMeetings];
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(m => isWithinInterval(m.sqlDate, { start: dateRange.from!, end: dateRange.to! }));
    }
    if (clientFilter !== "all") filtered = filtered.filter(m => m.clientId === clientFilter);
    if (statusFilter !== "all") filtered = filtered.filter(m => m.meetingStatus === statusFilter);
    if (sdrFilter !== "all") filtered = filtered.filter(m => m.sdr === sdrFilter);
    if (bookingDateRange?.from && bookingDateRange?.to) filtered = filtered.filter(m => isWithinInterval(m.sqlDate, { start: bookingDateRange.from!, end: bookingDateRange.to! }));
    if (meetingDateRange?.from && meetingDateRange?.to) filtered = filtered.filter(m => isWithinInterval(m.meetingDate, { start: meetingDateRange.from!, end: meetingDateRange.to! }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => m.contactPerson.toLowerCase().includes(q) || m.companyName.toLowerCase().includes(q) || m.sdr.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]; let bVal: any = b[sortField];
      if (sortField === "sqlDate" || sortField === "meetingDate") { aVal = aVal.getTime(); bVal = bVal.getTime(); }
      else if (typeof aVal === "string") return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return filtered;
  }, [localMeetings, dateRange, clientFilter, statusFilter, sdrFilter, searchQuery, bookingDateRange, meetingDateRange, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredMeetings.length / rowsPerPage);
  const paginatedMeetings = filteredMeetings.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const uniqueClients = Array.from(new Set(localMeetings.map(m => m.clientId))).sort();
  const uniqueSdrs = Array.from(new Set(localMeetings.map(m => m.sdr))).sort();

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
        {config.icon && <config.icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );

    if (!canEdit || updating === meeting.id) return badge;

    return (
      <Select value={meeting.meetingStatus} onValueChange={(v) => handleStatusChange(meeting, v)}>
        <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto shadow-none focus:ring-0 [&>svg]:hidden">
          <Badge className="gap-1 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: config.color }}>
            {config.icon && <config.icon className="h-3 w-3" />}
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

  if (isLoading) return <TableSkeleton />;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "600ms" }}>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-foreground">SQL Meetings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredMeetings.length} of {localMeetings.length} meetings
              </p>
            </div>
            <div className="flex gap-2">
              {activeFiltersCount > 0 && (
                <Button onClick={clearAllFilters} variant="outline" size="sm" className="gap-2">
                  <X className="h-4 w-4" /> Clear ({activeFiltersCount})
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100 font-medium text-sm transition-colors">
                    <Download className="h-4 w-4" /> Export <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border z-50">
                  <DropdownMenuItem onClick={() => exportData("csv")} className="cursor-pointer">
                    <Download className="h-4 w-4 mr-2" /> Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData("excel")} className="cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Always-visible filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search contact, company..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="bg-background/50 border-border min-h-[40px] min-w-[280px] flex-1" />
            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="bg-background/50 border-border min-h-[40px] w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map(cid => {
                  const c = clients?.find(cl => cl.client_id === cid);
                  return <SelectItem key={cid} value={cid}>{c?.client_name || cid}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="bg-background/50 border-border min-h-[40px] w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sdrFilter} onValueChange={(v) => { setSdrFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="bg-background/50 border-border min-h-[40px] w-[180px]">
                <SelectValue placeholder="All SDRs" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All SDRs</SelectItem>
                {uniqueSdrs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={cn("gap-2 min-h-[40px]", showMoreFilters && "bg-muted")}>
              <Filter className="h-4 w-4" /> More Filters
              {hiddenFiltersCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                  {hiddenFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Expandable hidden filters */}
          {showMoreFilters && (
             <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50">
               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className={cn("justify-start text-left font-normal min-h-[40px] w-[260px]", !bookingDateRange && "text-muted-foreground")}>
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {bookingDateRange?.from ? (
                       bookingDateRange.to ? (
                         `${format(bookingDateRange.from, "MMM dd")} – ${format(bookingDateRange.to, "MMM dd, yyyy")}`
                       ) : format(bookingDateRange.from, "MMM dd, yyyy")
                     ) : "Booking Date Range"}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                   <Calendar mode="range" selected={bookingDateRange} onSelect={(d) => { setBookingDateRange(d); setCurrentPage(1); }} initialFocus className="pointer-events-auto" numberOfMonths={2} />
                 </PopoverContent>
               </Popover>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className={cn("justify-start text-left font-normal min-h-[40px] w-[260px]", !meetingDateRange && "text-muted-foreground")}>
                     <CalendarDays className="mr-2 h-4 w-4" />
                     {meetingDateRange?.from ? (
                       meetingDateRange.to ? (
                         `${format(meetingDateRange.from, "MMM dd")} – ${format(meetingDateRange.to, "MMM dd, yyyy")}`
                       ) : format(meetingDateRange.from, "MMM dd, yyyy")
                     ) : "Meeting Date Range"}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                   <Calendar mode="range" selected={meetingDateRange} onSelect={(d) => { setMeetingDateRange(d); setCurrentPage(1); }} initialFocus className="pointer-events-auto" numberOfMonths={2} />
                 </PopoverContent>
               </Popover>
             </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin scroll-gradient">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-[#f1f5f9] dark:bg-[#1e293b]">
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] sticky left-0 z-20 bg-[#f1f5f9] dark:bg-[#1e293b]">
                  <SortButton field="sqlDate" label="Booking Date" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="clientName" label="Client" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="contactPerson" label="Contact Person" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="companyName" label="Company" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="sdr" label="SDR" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="meetingDate" label="Meeting Date" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="meetingStatus" label="Status" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]" style={{ minWidth: 200 }}>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMeetings.map((meeting, index) => (
                <TableRow key={meeting.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? "bg-muted/5" : ""} ${updating === meeting.id ? "opacity-60" : ""}`}>
                  <TableCell className="text-foreground whitespace-nowrap sticky left-0 bg-card z-10">{format(meeting.sqlDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {meeting.clientLogo ? (
                        <img src={meeting.clientLogo} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {meeting.clientName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">{meeting.clientName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{meeting.contactPerson}</TableCell>
                  <TableCell className="text-foreground">{meeting.companyName}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{meeting.sdr}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{format(meeting.meetingDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell><StatusBadge meeting={meeting} /></TableCell>
                  <TableCell style={{ minWidth: 200 }}>
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
                  <TableCell colSpan={8} className="py-12">
                    {activeFiltersCount > 0 ? (
                      <EmptyState icon={SearchIcon} title="No results found" description="Try adjusting your filters" actionLabel="Clear Filters" onAction={clearAllFilters} />
                    ) : (
                      <EmptyState icon={CalendarX} title="No meetings booked yet" description="SQL meetings will appear here once leads are generated" />
                    )}
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
