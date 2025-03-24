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
import { CalendarIcon, Pencil, Trash } from "lucide-react"
import { cn } from "@/lib/utils"
import { addCoffeeExpense, getCoffeeExpenses, updateCoffeeExpense, deleteCoffeeExpense } from "@/lib/coffee-actions"

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

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await getCoffeeExpenses()
      setExpenses(data)
    } catch (error) {
      console.error("Failed to load expenses:", error)
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

    try {
      if (editingId) {
        await updateCoffeeExpense(editingId, formData)
      } else {
        await addCoffeeExpense(formData)
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
      loadExpenses()
    } catch (error) {
      console.error("Error saving expense:", error)
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
      try {
        await deleteCoffeeExpense(id)
        loadExpenses()
      } catch (error) {
        console.error("Error deleting expense:", error)
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

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Coffee Expenses</CardTitle>
          <CardDescription>Track your coffee purchases and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAddNew} className="mb-4">
            Add New Expense
          </Button>

          {loading ? (
            <p>Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p>No expenses recorded yet. Add your first coffee expense!</p>
          ) : (
            <div className="rounded-md border">
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
                          <Button variant="outline" size="icon" onClick={() => handleEdit(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(expense.id)}>
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
              <Button type="submit">{editingId ? "Update Expense" : "Add Expense"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

