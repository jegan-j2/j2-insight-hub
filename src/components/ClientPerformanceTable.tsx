import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, ArrowUpDown, Search, DatabaseZap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import type { DailySnapshot, SQLMeeting } from "@/lib/supabase-types";

type SortField = "name" | "dials" | "answered" | "dms" | "mqls" | "sqls" | "target" | "progress";
type SortOrder = "asc" | "desc";

interface ClientData {
  name: string;
  slug: string;
  dials: number;
  answered: number;
  answeredPercent: number;
  dms: number;
  mqls: number;
  sqls: number;
  sqlsPercent: number;
  target: number;
  progress: number;
}

interface ClientPerformanceTableProps {
  snapshots?: DailySnapshot[];
  meetings?: SQLMeeting[];
}

export const ClientPerformanceTable = ({ snapshots, meetings }: ClientPerformanceTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [clients, setClients] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("status", "active")
        .order("client_name");
      if (data) setClients(data);
    };
    fetchClients();
  }, []);

  const clientsData: ClientData[] = useMemo(() => {
    return clients.map((client) => {
      const clientSnapshots = (snapshots || []).filter((s) => s.client_id === client.client_id);
      const totalDials = clientSnapshots.reduce((sum, s) => sum + (s.dials || 0), 0);
      const totalAnswered = clientSnapshots.reduce((sum, s) => sum + (s.answered || 0), 0);
      const totalDMs = clientSnapshots.reduce((sum, s) => sum + (s.dms_reached || 0), 0);
      const totalMQLs = clientSnapshots.reduce((sum, s) => sum + (s.mqls || 0), 0);
      const totalSQLs = clientSnapshots.reduce((sum, s) => sum + (s.sqls || 0), 0);
      const target = client.target_sqls || 0;

      return {
        name: client.client_name,
        slug: client.client_id,
        dials: totalDials,
        answered: totalAnswered,
        answeredPercent: totalDials > 0 ? (totalAnswered / totalDials) * 100 : 0,
        dms: totalDMs,
        mqls: totalMQLs,
        sqls: totalSQLs,
        sqlsPercent: totalDMs > 0 ? (totalSQLs / totalDMs) * 100 : 0,
        target,
        progress: target > 0 ? (totalSQLs / target) * 100 : 0,
      };
    });
  }, [clients, snapshots]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clientsData.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      if (sortField === "name") {
        aVal = a.name;
        bVal = b.name;
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [clientsData, searchQuery, sortField, sortOrder]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1"
      aria-label={`Sort by ${label}`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
    </button>
  );

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "500ms" }}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-foreground">Client Performance Overview</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border"
              aria-label="Search clients"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <EmptyState
            icon={DatabaseZap}
            title="No clients found"
            description="Client data will appear once clients are added to the database"
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin scroll-gradient">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10" role="rowgroup">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground sticky left-0 bg-card z-20">
                    <SortButton field="name" label="Client" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="dials" label="Dials" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="answered" label="Answered" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="dms" label="DMs" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="mqls" label="MQLs" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="sqls" label="SQLs" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="target" label="Target" />
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    <SortButton field="progress" label="Progress" />
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClients.map((client, index) => (
                  <TableRow
                    key={client.slug}
                    className="border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    style={{ animationDelay: `${600 + index * 50}ms` }}
                    onClick={() => navigate(`/client/${client.slug}`)}
                  >
                    <TableCell className="sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center flex-shrink-0">
                          <Target className="h-4 w-4 text-secondary" />
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">{client.dials.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{client.answered.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{client.answeredPercent.toFixed(2)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">{client.dms.toLocaleString()}</TableCell>
                    <TableCell className="text-foreground font-medium">{client.mqls.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{client.sqls.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{client.sqlsPercent.toFixed(2)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-medium">{client.target.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <Progress value={client.progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{client.progress.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary hover:text-secondary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/client/${client.slug}`);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAndSortedClients.length === 0 && clients.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12">
                      <EmptyState 
                        icon={Search}
                        title="No clients found"
                        description={`No clients match "${searchQuery}". Try adjusting your search.`}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
