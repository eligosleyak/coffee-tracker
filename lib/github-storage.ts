"use server"

import { Octokit } from "@octokit/rest"

// These will need to be set as environment variables in Vercel
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO || ""
const GITHUB_OWNER = process.env.GITHUB_OWNER || ""
const DATA_PATH = "data/coffee-expenses.json"

interface CoffeeExpense {
  id: string
  type: string
  location: string
  price: string
  date: string
  notes: string
}

// Initialize Octokit
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
})

// Get the current SHA of the file (needed for updates)
async function getFileSha() {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: DATA_PATH,
    })

    if (!Array.isArray(data)) {
      return data.sha
    }
    return null
  } catch (error) {
    // File doesn't exist yet
    return null
  }
}

// Get all expenses from GitHub
export async function getExpenses(): Promise<CoffeeExpense[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: DATA_PATH,
    })

    if (Array.isArray(data)) {
      return []
    }

    const content = Buffer.from(data.content, "base64").toString()
    return JSON.parse(content)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    // If file doesn't exist yet, return empty array
    return []
  }
}

// Save expenses to GitHub
export async function saveExpenses(expenses: CoffeeExpense[]) {
  try {
    const content = JSON.stringify(expenses, null, 2)
    const sha = await getFileSha()

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: DATA_PATH,
      message: `Update coffee expenses - ${new Date().toISOString()}`,
      content: Buffer.from(content).toString("base64"),
      sha: sha || undefined,
    })

    return { success: true }
  } catch (error) {
    console.error("Error saving expenses:", error)
    throw new Error("Failed to save expenses")
  }
}

// Add a new expense
export async function addExpense(expense: CoffeeExpense) {
  const expenses = await getExpenses()
  expenses.push(expense)
  return saveExpenses(expenses)
}

// Update an existing expense
export async function updateExpense(id: string, updatedExpense: CoffeeExpense) {
  const expenses = await getExpenses()
  const index = expenses.findIndex((exp) => exp.id === id)

  if (index === -1) {
    throw new Error("Expense not found")
  }

  expenses[index] = updatedExpense
  return saveExpenses(expenses)
}

// Delete an expense
export async function deleteExpense(id: string) {
  const expenses = await getExpenses()
  const filteredExpenses = expenses.filter((exp) => exp.id !== id)
  return saveExpenses(filteredExpenses)
}

