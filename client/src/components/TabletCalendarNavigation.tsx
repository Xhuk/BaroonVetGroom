import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTodayInUserTimezone, formatCST1Date, addDaysInUserTimezone } from "@shared/timeUtils";
import { useTimezone } from "@/contexts/TimezoneContext";

interface TabletCalendarNavigationProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function TabletCalendarNavigation({ selectedDate, onDateChange }: TabletCalendarNavigationProps) {
  const { timezone } = useTimezone();
  const today = getTodayInUserTimezone(timezone);
  const isToday = selectedDate === today;

  const handlePreviousDay = () => {
    const previousDay = addDaysInUserTimezone(selectedDate, -1, timezone);
    onDateChange(previousDay);
  };

  const handleNextDay = () => {
    const nextDay = addDaysInUserTimezone(selectedDate, 1, timezone);
    onDateChange(nextDay);
  };

  const goToToday = () => {
    onDateChange(today);
  };

  return (
    <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50 shadow-sm">
      {/* Previous Day Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePreviousDay}
        className="h-8 w-8 p-0 hover:bg-accent/80"
        data-testid="button-previous-day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Current Date Display */}
      <div className="flex items-center gap-2 min-w-[140px] justify-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {formatCST1Date(selectedDate)}
        </span>
      </div>

      {/* Today Button (only show if not today) */}
      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="h-8 px-3 text-xs bg-primary/10 border-primary/20 hover:bg-primary/20"
          data-testid="button-go-to-today"
        >
          Hoy
        </Button>
      )}

      {/* Next Day Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextDay}
        className="h-8 w-8 p-0 hover:bg-accent/80"
        data-testid="button-next-day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}