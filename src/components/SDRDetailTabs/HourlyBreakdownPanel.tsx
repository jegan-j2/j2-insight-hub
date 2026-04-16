import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface HourlyBreakdownPanelProps {
  date: Date;
  sdrName: string;
  clientId?: string;
  totalDials: number;
  onClose: () => void;
}

interface HourData {
  hour: number;
  dials: number;
  answered: number;
  dms: number;
  sqls: number;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am–6pm

const getHourLabel = (h: number) => {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
};

const getHourCellStyle = (dials: number): { bg: string; text: string } => {
  if (dials === 0) return { bg: "#F1F5F9", text: "#94A3B8" };
  if (dials <= 3) return { bg: "#E2E8F0", text: "#475569" };
  if (dials <= 7) return { bg: "#CBD5E1", text: "#334155" };
  if (dials <= 10) return { bg: "#94A3B8", text: "#ffffff" };
  return { bg: "#475569", text: "#ffffff" };
};

const LOGO_LIGHT = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png";
const LOGO_DARK = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";

export const HourlyBreakdownPanel = ({
  date,
  sdrName,
  clientId,
  totalDials,
  onClose,
}: HourlyBreakdownPanelProps) => {
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const dateStr = format(date, "yyyy-MM-dd");
  const dateLabel = format(date, "MMM d");

  useEffect(() => {
    const fetchHourly = async () => {
      setLoading(true);
      setSelectedHour(null);

      const { data } = await supabase.rpc("get_sdr_hourly_breakdown", {
        p_sdr_name: sdrName,
        p_date: dateStr,
        p_client_id: clientId || null,
      });

      // Build full hour buckets
      const buckets: Record<number, HourData> = {};
      for (const h of HOURS) {
        buckets[h] = { hour: h, dials: 0, answered: 0, dms: 0, sqls: 0 };
      }

      if (data) {
        for (const row of data as any[]) {
          const h = Number(row.hour);
          if (buckets[h]) {
            buckets[h] = {
              hour: h,
              dials: Number(row.dials) || 0,
              answered: Number(row.answered) || 0,
              dms: Number(row.dms) || 0,
              sqls: Number(row.sqls_booked) || 0,
            };
          }
        }
      }

      setHourlyData(HOURS.map((h) => buckets[h]));
      setLoading(false);
    };

    fetchHourly();
  }, [dateStr, sdrName, clientId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const dayTotals = useMemo(() => {
    const d = hourlyData.reduce(
      (acc, h) => ({
        dials: acc.dials + h.dials,
        answered: acc.answered + h.answered,
        dms: acc.dms + h.dms,
        sqls: acc.sqls + h.sqls,
      }),
      { dials: 0, answered: 0, dms: 0, sqls: 0 }
    );
    let peakHour = 8;
    let peakDials = 0;
    for (const h of hourlyData) {
      if (h.dials > peakDials) {
        peakDials = h.dials;
        peakHour = h.hour;
      }
    }
    return { ...d, peakHour, peakDials };
  }, [hourlyData]);

  const selectedHourData = useMemo(() => {
    if (selectedHour === null) return null;
    return hourlyData.find((h) => h.hour === selectedHour) || null;
  }, [selectedHour, hourlyData]);

  const handleHourClick = useCallback((hour: number) => {
    setSelectedHour((prev) => (prev === hour ? null : hour));
  }, []);

  const answerRate = useMemo(() => {
    if (selectedHourData) {
      return selectedHourData.dials > 0
        ? Math.round((selectedHourData.answered / selectedHourData.dials) * 100)
        : 0;
    }
    return dayTotals.dials > 0
      ? Math.round((dayTotals.answered / dayTotals.dials) * 100)
      : 0;
  }, [selectedHourData, dayTotals]);

  const displaySqls = selectedHourData ? selectedHourData.sqls : dayTotals.sqls;
  const displayDms = selectedHourData ? selectedHourData.dms : dayTotals.dms;

  return (
    <div
      ref={panelRef}
      className="mt-3 border border-border rounded-lg bg-card overflow-hidden animate-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-foreground">
              {dateLabel} — {totalDials} Dials
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sdrName} · click an hour to drill in
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
            <Clock className="h-3 w-3" />
            Hour view
          </span>
        </div>
      </div>

      {/* Hour grid */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <img
              src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT}
              alt="Loading"
              className="w-10 h-10 rounded-full object-contain border border-border animate-[spin_2s_linear_infinite]"
            />
            <p className="text-xs text-muted-foreground font-medium">Loading...</p>
          </div>
        ) : (
          <>
            {/* Hour labels */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
              {HOURS.map((h) => (
                <div key={h} className="text-center text-[10px] text-muted-foreground font-medium">
                  {getHourLabel(h)}
                </div>
              ))}
            </div>

            {/* Hour cells */}
            <div
              className="grid gap-1 mt-1"
              style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}
            >
              {hourlyData.map((hd) => {
                const style = getHourCellStyle(hd.dials);
                const isSelected = selectedHour === hd.hour;
                let tooltipText: string;
                if (hd.dials === 0) {
                  tooltipText = `${getHourLabel(hd.hour)} — 0 dials`;
                } else {
                  tooltipText = `${getHourLabel(hd.hour)} — ${hd.dials} dials · ${hd.answered} answered · ${hd.dms} DMs`;
                  if (hd.sqls > 0) tooltipText += ` · ${hd.sqls} SQL 🎯`;
                }

                return (
                  <div
                    key={hd.hour}
                    className={cn(
                      "rounded flex items-center justify-center text-[12px] font-semibold cursor-pointer transition-all relative group",
                      isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                    style={{
                      height: 44,
                      backgroundColor: style.bg,
                      color: style.text,
                    }}
                    onClick={() => handleHourClick(hd.hour)}
                  >
                    {hd.dials}
                    {/* SQL badge */}
                    {hd.sqls > 0 && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] leading-none">🎯</span>
                    )}
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      {tooltipText}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Summary bar */}
      {!loading && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          {selectedHourData && (
            <button
              onClick={() => setSelectedHour(null)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
            >
              <ArrowLeft className="h-3 w-3" />
              back to full day
            </button>
          )}
          <div className="flex items-center divide-x divide-border">
            {/* Stat 1: Peak Hour (day view) or Dials (hour view) */}
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                {selectedHourData ? "Dials" : "Peak Hour"}
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {selectedHourData
                  ? selectedHourData.dials
                  : dayTotals.peakDials > 0
                  ? `${getHourLabel(dayTotals.peakHour)} (${dayTotals.peakDials})`
                  : "—"}
              </p>
            </div>

            {/* Stat 2: SQLs Booked */}
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                SQLs Booked
              </p>
              <p
                className="text-lg font-bold mt-0.5"
                style={{ color: displaySqls > 0 ? "#059669" : undefined }}
              >
                {displaySqls > 0 ? `🎯 ${displaySqls}` : "0"}
              </p>
            </div>

            {/* Stat 3: Answer Rate */}
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                Answer Rate
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">{answerRate}%</p>
            </div>

            {/* Stat 4: DM Conversations */}
            <div className="flex-1 text-center px-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                DM Conv.
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">{displayDms}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
