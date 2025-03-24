"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import {
  CalendarIcon,
  Coffee,
  Download,
  MapPin,
  Pencil,
  Plus,
  Trash,
  Upload,
  CreditCard,
  FileText,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/github-storage"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const [activeTab, setActiveTab] = useState("all")

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

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + (Number.parseFloat(expense.price) || 0)
  }, 0)

  // Get unique locations
  const uniqueLocations = [...new Set(expenses.map((expense) => expense.location))]

  // Get unique coffee types
  const uniqueCoffeeTypes = [...new Set(expenses.map((expense) => expense.type))]

  // Filter expenses based on active tab
  const filteredExpenses = expenses.filter((expense) => {
    if (activeTab === "all") return true
    if (activeTab === "recent") {
      const expenseDate = new Date(expense.date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return expenseDate >= thirtyDaysAgo
    }
    return false
  })

  // Sort expenses by date (newest first)
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-amber-600" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-900">NPR {totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-amber-600 mt-1">Lifetime coffee expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-amber-600" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-900">{uniqueLocations.length}</p>
            <p className="text-sm text-amber-600 mt-1">Different coffee shops visited</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
              <Coffee className="mr-2 h-5 w-5 text-amber-600" />
              Coffee Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-900">{uniqueCoffeeTypes.length}</p>
            <p className="text-sm text-amber-600 mt-1">Different coffee varieties tried</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white shadow-lg border-amber-100">
        <CardHeader className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl text-amber-900 flex items-center">
                <Coffee className="mr-2 h-6 w-6 text-amber-700" />
                Coffee Expenses
              </CardTitle>
              <CardDescription className="text-amber-700">Track your coffee purchases and expenses</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddNew} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add New Expense
              </Button>
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={isSaving || expenses.length === 0}
                className="border-amber-200 text-amber-800 hover:bg-amber-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef?.click()}
                disabled={isSaving}
                className="border-amber-200 text-amber-800 hover:bg-amber-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={importFromCSV}
                ref={(input) => setFileInputRef(input)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="bg-amber-100 text-amber-900">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                All Expenses
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-white">
                Recent (30 days)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : sortedExpenses.length === 0 ? (
            <div className="text-center py-16 bg-amber-50 rounded-lg border border-amber-100">
              <Coffee className="h-12 w-12 text-amber-300 mx-auto mb-4" />
              <p className="text-amber-800 text-lg font-medium mb-2">No expenses recorded yet</p>
              <p className="text-amber-600 mb-6">Add your first coffee expense to start tracking!</p>
              <Button onClick={handleAddNew} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Coffee
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-amber-100 overflow-x-auto">
              <Table>
                <TableHeader className="bg-amber-50">
                  <TableRow>
                    <TableHead className="text-amber-900">Coffee Type</TableHead>
                    <TableHead className="text-amber-900">Location</TableHead>
                    <TableHead className="text-amber-900">Price (NPR)</TableHead>
                    <TableHead className="text-amber-900">Date</TableHead>
                    <TableHead className="text-amber-900">Notes</TableHead>
                    <TableHead className="text-amber-900">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-amber-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center">
                          <Coffee className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                          <span>{expense.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                          <span>{expense.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          NPR {Number.parseFloat(expense.price).toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                          <span>{expense.date}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {expense.notes && (
                          <div className="flex items-start">
                            <FileText className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0 mt-1" />
                            <span className="truncate">{expense.notes}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                            disabled={isSaving}
                            className="h-8 w-8 border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(expense.id)}
                            disabled={isSaving}
                            className="h-8 w-8 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-red-600"
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

        <CardFooter className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-100 px-4 sm:px-6 py-4">
          <p className="text-amber-700 text-sm">
            Showing {sortedExpenses.length} of {expenses.length} coffee expenses
          </p>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-amber-900 flex items-center">
              <Coffee className="mr-2 h-5 w-5 text-amber-700" />
              {editingId ? "Edit Coffee Expense" : "Add Coffee Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-amber-800">
                  Type of Coffee
                </Label>
                <div className="relative">
                  <Coffee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600" />
                  <Input
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    placeholder="e.g., Espresso, Cappuccino, Latte"
                    required
                    className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location" className="text-amber-800">
                  Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600" />
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Café name or shop"
                    required
                    className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price" className="text-amber-800">
                  Price (NPR)
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600" />
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Price in Nepali Rupees"
                    required
                    className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date" className="text-amber-800">
                  Date of Purchase
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal border-amber-200 text-amber-800 hover:bg-amber-50 pl-10 relative",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelect}
                      initialFocus
                      className="border-amber-200"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-amber-800">
                  Additional Notes
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-amber-600" />
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Special offer, drink size, etc."
                    rows={3}
                    className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
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

