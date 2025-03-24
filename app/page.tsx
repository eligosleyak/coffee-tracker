import { CoffeeExpenseTracker } from "@/components/coffee-expense-tracker"

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Coffee Expense Tracker</h1>
          <p className="text-amber-700 max-w-md mx-auto">
            Keep track of your coffee adventures and manage your caffeine budget
          </p>
        </header>
        <CoffeeExpenseTracker />
      </div>
    </div>
  )
}

