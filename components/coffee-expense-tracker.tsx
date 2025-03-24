"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, Pencil, Trash, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/github-storage"
import { useToast } from "@/hooks/use-toast"

interface CoffeeExpense {
  id: string
  type: string
  location: string
  price: string
  date: string
  notes: string
}

export function CoffeeExpenseTracker() {
  const [expenses, setExpenses] = useState<CoffeeExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Omit<CoffeeExpense, "id">>({
    type: "",
    location: "",
    price: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await getExpenses()
      setExpenses(data)
    } catch (error) {
      console.error("Failed to load expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      setFormData((prev) => ({
        ...prev,
        date: format(selectedDate, "yyyy-MM-dd"),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (editingId) {
        const updatedExpense = {
          id: editingId,
          ...formData,
        }
        await updateExpense(editingId, updatedExpense)
        toast({
          title: "Success",
          description: "Expense updated successfully",
        })
      } else {
        const newExpense = {
          id: uuidv4(),
          ...formData,
        }
        await addExpense(newExpense)
        toast({
          title: "Success",
          description: "New expense added successfully",
        })
      }

      // Reset form and reload expenses
      setFormData({
        type: "",
        location: "",
        price: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      })
      setDate(new Date())
      setEditingId(null)
      setIsDialogOpen(false)
      loadExpenses()
    } catch (error) {
      console.error("Error saving expense:", error)
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (expense: CoffeeExpense) => {
    setFormData({
      type: expense.type,
      location: expense.location,
      price: expense.price,
      date: expense.date,
      notes: expense.notes,
    })
    setDate(new Date(expense.date))
    setEditingId(expense.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      setIsSaving(true)
      try {
        await deleteExpense(id)
        toast({
          title: "Success",
          description: "Expense deleted successfully",
        })
        loadExpenses()
      } catch (error) {
        console.error("Error deleting expense:", error)
        toast({
          title: "Error",
          description: "Failed to delete expense. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleAddNew = () => {
    setFormData({
      type: "",
      location: "",
      price: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    })
    setDate(new Date())
    setEditingId(null)
    setIsDialogOpen(true)
  }

  const exportToCSV = () => {
    if (expenses.length === 0) {
      toast({
        title: "No Data",
        description: "No expenses to export",
      })
      return
    }

    // Create CSV content
    const headers = ["id", "type", "location", "price", "date", "notes"]
    const rows = expenses.map((expense) =>
      headers
        .map((header) => {
          const value = expense[header as keyof CoffeeExpense] || ""
          return value.includes(",") ? `"${value}"` : value
        })
        .join(","),
    )
    const csvContent = [headers.join(","), ...rows].join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `coffee-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string
        const lines = csvContent.split("\n")
        const headers = lines[0].split(",")

        const importedExpenses = lines
          .slice(1)
          .filter((line) => line.trim() !== "")
          .map((line) => {
            // Handle commas within quoted fields
            const values: string[] = []
            let currentValue = ""
            let inQuotes = false

            for (let i = 0; i < line.length; i++) {
              const char = line[i]

              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === "," && !inQuotes) {
                values.push(currentValue)
                currentValue = ""
              } else {
                currentValue += char
              }
            }

            values.push(currentValue)

            const record: Record<string, string> = {}
            headers.forEach((header, index) => {
              record[header.trim()] = values[index] ? values[index].replace(/^"|"$/g, "") : ""
            })

            return record as CoffeeExpense
          })

        setIsSaving(true)
        try {
          // Save all imported expenses to GitHub
          for (const expense of importedExpenses) {
            if (!expense.id) {
              expense.id = uuidv4()
            }
            await addExpense(expense)
          }

          toast({
            title: "Success",
            description: `Successfully imported ${importedExpenses.length} expenses`,
          })
          loadExpenses()
        } catch (error) {
          console.error("Error importing expenses:", error)
          toast({
            title: "Error",
            description: "Failed to import expenses. Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsSaving(false)
        }
      } catch (error) {
        console.error("Error parsing CSV:", error)
        toast({
          title: "Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // Reset the file input
    if (fileInputRef) {
      fileInputRef.value = ""
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Coffee Expenses</CardTitle>
          <CardDescription>Track your coffee purchases and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={handleAddNew} disabled={isSaving}>
              Add New Expense
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={isSaving || expenses.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
            <Button variant="outline" onClick={() => fileInputRef?.click()} disabled={isSaving}>
              <Upload className="mr-2 h-4 w-4" />
              Import from CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={importFromCSV}
              ref={(input) => setFileInputRef(input)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-center py-8">No expenses recorded yet. Add your first coffee expense!</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Price (NPR)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.type}</TableCell>
                      <TableCell>{expense.location}</TableCell>
                      <TableCell>{expense.price}</TableCell>
                      <TableCell>{expense.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.notes}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(expense)} disabled={isSaving}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                            disabled={isSaving}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Coffee Expense" : "Add Coffee Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type of Coffee</Label>
                <Input
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  placeholder="e.g., Espresso, Cappuccino, Latte"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Café name or shop"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price (NPR)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Price in Nepali Rupees"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date of Purchase</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Special offer, drink size, etc."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    {editingId ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>{editingId ? "Update Expense" : "Add Expense"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

