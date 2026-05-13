"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      // @ts-ignore - react-day-picker v9 use outsideDays
      outsideDays={showOutsideDays ? "visible" : "hidden"}
      className={cn("p-4 bg-background rounded-3xl", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center items-center h-10 w-full mb-4 relative",
        caption_label: "text-sm font-semibold tracking-tight",
        nav: "flex items-center justify-between absolute left-2 right-2 top-4 h-10 z-10",

        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-none"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-none"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-10 font-normal text-[0.7rem] uppercase tracking-wider text-center",
        week: "flex w-full mt-2",
        day: "h-10 w-10 p-0 text-center text-sm relative focus-within:relative focus-within:z-20 transition-all",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg shadow-primary/20",
        today: "bg-accent/50 text-accent-foreground font-bold border-2 border-primary/20",
        outside: "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground/30 line-through cursor-not-allowed",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === "left") {
            return <ChevronLeft className="h-5 w-5" />;
          }
          return <ChevronRight className="h-5 w-5" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
