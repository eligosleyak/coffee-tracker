"use server"

import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

// Define the data directory and file path
const DATA_DIR = path.join(process.cwd(), "data")
const CSV_FILE = path.join(DATA_DIR, "coffee-expenses.csv")

// Ensure the data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(CSV_FILE)) {
    // Create the CSV file with headers
    fs.writeFileSync(CSV_FILE, "id,type,location,price,date,notes\n")
  }
}

// Parse CSV to array of objects
const parseCSV = (csvContent: string) => {
  const lines = csvContent.split("\n")
  const headers = lines[0].split(",")

  return lines
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
        record[header] = values[index] ? values[index].replace(/^"|"$/g, "") : ""
      })

      return record
    })
}

// Convert array of objects to CSV
const objectsToCSV = (objects: Record<string, string>[]) => {
  const headers = ["id", "type", "location", "price", "date", "notes"]

  const rows = objects.map((obj) => {
    return headers
      .map((header) => {
        // Escape fields with commas by wrapping in quotes
        const value = obj[header] || ""
        return value.includes(",") ? `"${value}"` : value
      })
      .join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

// Get all coffee expenses
export async function getCoffeeExpenses() {
  ensureDataDir()

  try {
    const csvContent = fs.readFileSync(CSV_FILE, "utf-8")
    return parseCSV(csvContent)
  } catch (error) {
    console.error("Error reading CSV file:", error)
    return []
  }
}

// Add a new coffee expense
export async function addCoffeeExpense(expense: {
  type: string
  location: string
  price: string
  date: string
  notes: string
}) {
  ensureDataDir()

  try {
    const expenses = await getCoffeeExpenses()
    const newExpense = {
      id: uuidv4(),
      ...expense,
    }

    expenses.push(newExpense)

    fs.writeFileSync(CSV_FILE, objectsToCSV(expenses))
    return { success: true, id: newExpense.id }
  } catch (error) {
    console.error("Error adding expense:", error)
    throw new Error("Failed to add expense")
  }
}

// Update an existing coffee expense
export async function updateCoffeeExpense(
  id: string,
  updatedExpense: {
    type: string
    location: string
    price: string
    date: string
    notes: string
  },
) {
  ensureDataDir()

  try {
    const expenses = await getCoffeeExpenses()
    const index = expenses.findIndex((exp) => exp.id === id)

    if (index === -1) {
      throw new Error("Expense not found")
    }

    expenses[index] = {
      id,
      ...updatedExpense,
    }

    fs.writeFileSync(CSV_FILE, objectsToCSV(expenses))
    return { success: true }
  } catch (error) {
    console.error("Error updating expense:", error)
    throw new Error("Failed to update expense")
  }
}

// Delete a coffee expense
export async function deleteCoffeeExpense(id: string) {
  ensureDataDir()

  try {
    let expenses = await getCoffeeExpenses()
    expenses = expenses.filter((exp) => exp.id !== id)

    fs.writeFileSync(CSV_FILE, objectsToCSV(expenses))
    return { success: true }
  } catch (error) {
    console.error("Error deleting expense:", error)
    throw new Error("Failed to delete expense")
  }
}

