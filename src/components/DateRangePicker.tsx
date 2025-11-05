import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  className?: string;
}

export const DateRangePicker = ({ date, onDateChange, className }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const quickFilters = [
    {
      label: "Last 7 Days",
      range: { from: subDays(new Date(), 7), to: new Date() },
    },
    {
      label: "Last 30 Days",
      range: { from: subDays(new Date(), 30), to: new Date() },
    },
    {
      label: "This Month",
      range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    },
    {
      label: "Last Month",
      range: { 
        from: startOfMonth(subMonths(new Date(), 1)), 
        to: endOfMonth(subMonths(new Date(), 1)) 
      },
    },
  ];

  const handleQuickFilter = (range: DateRange) => {
    onDateChange(range);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Quick Filter Buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <Button
            key={filter.label}
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(filter.range)}
            className="border-border text-foreground hover:bg-muted/50 transition-all min-h-[44px] active:scale-95 text-xs sm:text-sm"
            aria-label={filter.label}
          >
            {filter.label}
          </Button>
        ))}
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
