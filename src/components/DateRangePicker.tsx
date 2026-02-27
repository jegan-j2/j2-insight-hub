import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { FilterType } from "@/contexts/DateFilterContext";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  filterType?: FilterType;
  onFilterTypeChange?: (type: FilterType) => void;
  className?: string;
}

export const DateRangePicker = ({ 
  date, 
  onDateChange, 
  filterType,
  onFilterTypeChange,
  className 
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const quickFilters = [
    {
      label: "Last 7 Days",
      type: "last7days" as FilterType,
      range: { from: subDays(new Date(), 7), to: new Date() },
    },
    {
      label: "Last 30 Days",
      type: "last30days" as FilterType,
      range: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      label: "This Month",
      type: "thisMonth" as FilterType,
      range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    },
    {
      label: "Last Month",
      type: "lastMonth" as FilterType,
      range: { 
        from: startOfMonth(subMonths(new Date(), 1)), 
        to: endOfMonth(subMonths(new Date(), 1)) 
      },
    },
  ];

  const isFilterActive = (filter: typeof quickFilters[0]) => {
    if (!date?.from || !date?.to) return false;
    return isSameDay(date.from, filter.range.from) && isSameDay(date.to, filter.range.to);
  };

  const handleQuickFilter = (filter: typeof quickFilters[0]) => {
    onDateChange(filter.range);
    onFilterTypeChange?.(filter.type);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Quick Filter Buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {quickFilters.map((filter) => {
          const isActive = isFilterActive(filter);
          return (
            <Button
              key={filter.label}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickFilter(filter)}
              className={cn(
                "transition-all duration-200 min-h-[44px] active:scale-95 text-xs sm:text-sm",
                isActive
                  ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-md dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                  : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
              )}
              aria-label={filter.label}
              aria-pressed={isActive}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>

      {/* Custom Date Range Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal border-border bg-card hover:bg-muted/50 min-h-[44px] w-full sm:w-auto text-xs sm:text-sm",
              !date && "text-muted-foreground"
            )}
            aria-label="Select custom date range"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {date?.from ? (
                date.to ? (
                  <>
                    <span className="hidden sm:inline">{format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}</span>
                    <span className="sm:hidden">{format(date.from, "MMM dd")} - {format(date.to, "MMM dd")}</span>
                  </>
                ) : (
                  format(date.from, "MMM dd, yyyy")
                )
              ) : (
                <span>Custom Range</span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border-border z-[100]" align="center" sideOffset={8}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(range) => {
              onDateChange(range);
              onFilterTypeChange?.("custom");
              if (range?.from && range?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={window.innerWidth >= 768 ? 2 : 1}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
