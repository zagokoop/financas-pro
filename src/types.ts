export type Category = string;

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: Category;
  amount: number;
  type: "income" | "expense";
  paid?: boolean;
}

export interface CreditCard {
  id: string;
  description: string;
  totalAmount: number;
  installmentsPaid: number;
  totalInstallments: number;
  dueDate: string;
  bank: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface Budget {
  category: Category;
  limit: number;
}

export type Tab = "dashboard" | "incomes" | "expenses" | "cards" | "goals" | "annual" | "budgets";
