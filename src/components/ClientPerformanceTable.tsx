import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, ArrowUpDown, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const clientsData: ClientData[] = [
  {
    name: "Inxpress",
    slug: "inxpress",
    dials: 861,
    answered: 161,
    answeredPercent: 18.7,
    dms: 59,
    mqls: 21,
    sqls: 6,
    sqlsPercent: 10.17,
    target: 16,
    progress: 37.5,
  },
  {
    name: "Congero",
    slug: "congero",
    dials: 874,
    answered: 245,
    answeredPercent: 28.03,
    dms: 222,
    mqls: 1,
    sqls: 40,
    sqlsPercent: 18.02,
    target: 465,
    progress: 8.6,
  },
  {
    name: "TechCorp Solutions",
    slug: "techcorp-solutions",
    dials: 792,
    answered: 198,
    answeredPercent: 25.0,
    dms: 145,
    mqls: 32,
    sqls: 18,
    sqlsPercent: 12.41,
    target: 50,
    progress: 36.0,
  },
  {
    name: "Global Logistics",
    slug: "global-logistics",
    dials: 645,
    answered: 142,
    answeredPercent: 22.0,
    dms: 98,
    mqls: 24,
    sqls: 12,
    sqlsPercent: 12.24,
    target: 35,
    progress: 34.3,
  },
  {
    name: "FinServe Group",
    slug: "finserve-group",
    dials: 934,
    answered: 276,
    answeredPercent: 29.55,
    dms: 189,
    mqls: 45,
    sqls: 28,
    sqlsPercent: 14.81,
    target: 75,
    progress: 37.3,
  },
  {
    name: "HealthCare Plus",
    slug: "healthcare-plus",
    dials: 829,
    answered: 183,
    answeredPercent: 22.07,
    dms: 124,
    mqls: 28,
    sqls: 15,
    sqlsPercent: 12.1,
    target: 40,
    progress: 37.5,
  },
];

export const ClientPerformanceTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const navigate = useNavigate();

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
  }, [searchQuery, sortField, sortOrder]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
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
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">
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
                  <TableCell>
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
              {filteredAndSortedClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No clients found matching "{searchQuery}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
