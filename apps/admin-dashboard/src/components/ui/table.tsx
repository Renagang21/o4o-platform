import { ElementRef, ComponentPropsWithoutRef } from "react"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Table = forwardRef<
  ElementRef<"table">,
  ComponentPropsWithoutRef<"table">
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = forwardRef<
  ElementRef<"thead">,
  ComponentPropsWithoutRef<"thead">
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = forwardRef<
  ElementRef<"tbody">,
  ComponentPropsWithoutRef<"tbody">
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = forwardRef<
  ElementRef<"tfoot">,
  ComponentPropsWithoutRef<"tfoot">
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-gray-50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = forwardRef<
  ElementRef<"tr">,
  ComponentPropsWithoutRef<"tr">
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = forwardRef<
  ElementRef<"th">,
  ComponentPropsWithoutRef<"th">
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = forwardRef<
  ElementRef<"td">,
  ComponentPropsWithoutRef<"td">
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = forwardRef<
  ElementRef<"caption">,
  ComponentPropsWithoutRef<"caption">
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-gray-500", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}