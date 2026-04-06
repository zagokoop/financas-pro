/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CalendarDays, 
  Plus, 
  Download,
  Upload,
  FileJson,
  Trash2,
  Menu,
  X,
  CreditCard as CreditCardIcon,
  CheckCircle2,
  Circle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO,
  differenceInMonths,
  addMonths
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";

import { cn, formatCurrency } from "@/src/lib/utils";
import { Transaction, FinancialGoal, Tab, Category, CreditCard } from "@/src/types";

// Mock Initial Data
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "1", date: "2026-04-01", description: "Salário Mensal", category: "Salário", amount: 5000, type: "income" },
  { id: "2", date: "2026-04-02", description: "Aluguel", category: "Contas", amount: 1200, type: "expense" },
  { id: "3", date: "2026-04-05", description: "Supermercado", category: "Mercado", amount: 450, type: "expense" },
  { id: "4", date: "2026-04-06", description: "Venda Freelance", category: "Vendas", amount: 800, type: "income" },
  { id: "5", date: "2026-04-07", description: "Internet Fibra", category: "Internet", amount: 120, type: "expense" },
];

const INITIAL_GOALS: FinancialGoal[] = [
  { id: "1", title: "Reserva de Emergência", targetAmount: 10000, currentAmount: 4500, deadline: "2026-12-31" },
  { id: "2", title: "Viagem de Férias", targetAmount: 5000, currentAmount: 1200, deadline: "2026-08-15" },
];

const INITIAL_CARDS: CreditCard[] = [
  { id: "1", description: "Notebook Gamer", totalAmount: 4500, installmentsPaid: 4, totalInstallments: 10, dueDate: "15", bank: "Nubank" },
  { id: "2", description: "Smartphone", totalAmount: 2400, installmentsPaid: 8, totalInstallments: 12, dueDate: "10", bank: "Inter" },
];

const INCOME_CATEGORIES = ["Salário", "Extra", "Vendas", "Investimentos"];
const EXPENSE_CATEGORIES = [
  "Alimentação", "Mercado", "Transporte", "Lazer", "Contas", 
  "Internet", "Empréstimo", "Financiamento", "Educação", "Saúde", 
  "Investimentos", "Outros"
];

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem("financas_pro_current_user"));
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginInput, setLoginInput] = useState("");

  // Load user data on login
  useEffect(() => {
    if (user) {
      const savedData = localStorage.getItem(`financas_pro_data_${user}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setTransactions(parsed.transactions || []);
        setGoals(parsed.goals || INITIAL_GOALS);
        setCards(parsed.cards || INITIAL_CARDS);
      } else {
        // New user gets initial data
        setTransactions(INITIAL_TRANSACTIONS);
        setGoals(INITIAL_GOALS);
        setCards(INITIAL_CARDS);
      }
    }
  }, [user]);

  // Save user data on changes
  useEffect(() => {
    if (user) {
      const data = { transactions, goals, cards };
      localStorage.setItem(`financas_pro_data_${user}`, JSON.stringify(data));
    }
  }, [transactions, goals, cards, user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.trim()) {
      setUser(loginInput.trim());
      localStorage.setItem("financas_pro_current_user", loginInput.trim());
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("financas_pro_current_user");
    setLoginInput("");
  };
  const totals = useMemo(() => {
    const filtered = transactions.filter(t => {
      const date = parseISO(t.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
    const income = filtered
      .filter(t => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered
      .filter(t => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    const paidExpense = filtered
      .filter(t => t.type === "expense" && t.paid)
      .reduce((acc, t) => acc + t.amount, 0);
    const pendingExpense = expense - paidExpense;
    return { income, expense, paidExpense, pendingExpense, balance: income - expense };
  }, [transactions, selectedMonth, selectedYear]);

  // Derived Goals with automatic progress from transactions
  const goalsWithProgress = useMemo(() => {
    return goals.map(goal => {
      const contributions = transactions
        .filter(t => t.category === goal.title)
        .reduce((acc, t) => acc + t.amount, 0);
      return { ...goal, currentAmount: contributions };
    });
  }, [goals, transactions]);

  // Derived Cards with automatic progress from transactions
  const cardsWithProgress = useMemo(() => {
    return cards.map(card => {
      const paidCount = transactions.filter(t => t.category === card.bank && t.paid).length;
      return { ...card, installmentsPaid: card.installmentsPaid + paidCount };
    });
  }, [cards, transactions]);

  // Chart Data
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions
      .filter(t => {
        const date = parseISO(t.date);
        return (
          t.type === "expense" &&
          date.getMonth() === selectedMonth &&
          date.getFullYear() === selectedYear
        );
      })
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions, selectedMonth, selectedYear]);

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months.map((month, idx) => {
      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.date);
        return date.getMonth() === idx && date.getFullYear() === selectedYear;
      });
      const income = monthTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      const allPaid = monthTransactions.filter(t => t.type === "expense").every(t => t.paid);
      const hasExpenses = monthTransactions.some(t => t.type === "expense");
      return { 
        name: month, 
        receita: income, 
        despesa: expense, 
        saldo: income - expense,
        status: hasExpenses ? (allPaid ? "Pago" : "Pendente") : "Sem Despesas"
      };
    });
  }, [transactions, selectedYear]);

  const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

  const addTransaction = (type: "income" | "expense") => {
    const defaultDate = new Date(selectedYear, selectedMonth, 1);
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: format(defaultDate, "yyyy-MM-dd"),
      description: "Nova " + (type === "income" ? "Entrada" : "Saída"),
      category: type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
      amount: 0,
      type,
      paid: false
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const addCard = () => {
    const newCard: CreditCard = {
      id: Math.random().toString(36).substr(2, 9),
      description: "Nova Compra",
      totalAmount: 0,
      installmentsPaid: 0,
      totalInstallments: 1,
      dueDate: "10",
      bank: "Cartão"
    };
    setCards([newCard, ...cards]);
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: any) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateCard = (id: string, field: keyof CreditCard, value: any) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const addGoal = () => {
    const newGoal: FinancialGoal = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Nova Meta",
      targetAmount: 1000,
      currentAmount: 0,
      deadline: format(new Date(), "yyyy-MM-dd")
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, field: keyof FinancialGoal, value: any) => {
    setGoals(goals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const exportToCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Valor", "Tipo"];
    const rows = transactions.map(t => [
      t.date,
      t.description,
      t.category,
      t.amount.toString(),
      t.type === "income" ? "Receita" : "Despesa"
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `financas_pro_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBackup = () => {
    const data = { transactions, goals, cards, version: "1.0" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `backup_financas_pro_${user}_${format(new Date(), "yyyy-MM-dd")}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.transactions && data.goals && data.cards) {
          setTransactions(data.transactions);
          setGoals(data.goals);
          setCards(data.cards);
        }
      } catch (err) {
        console.error("Erro ao ler o arquivo de backup.", err);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-md space-y-6 md:space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <TrendingUp className="text-white w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Finanças Pro</h1>
            <p className="text-sm md:text-base text-slate-500">Acesse sua planilha financeira pessoal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Seu Nome ou Usuário</label>
              <input 
                type="text" 
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Ex: joao_finance"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:ring-0 transition-all outline-none font-medium"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              Entrar na Planilha
            </button>
          </form>

          <div className="pt-6 text-center border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Produto Digital Premium</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans pb-20 md:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className={cn(
        "bg-slate-900 text-white transition-all duration-300 flex-col fixed h-full z-50 hidden md:flex",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">Finanças Pro</span>}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          <NavItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<TrendingUp />} 
            label="Entradas" 
            active={activeTab === "incomes"} 
            onClick={() => setActiveTab("incomes")} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<TrendingDown />} 
            label="Despesas" 
            active={activeTab === "expenses"} 
            onClick={() => setActiveTab("expenses")} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<CreditCardIcon />} 
            label="Cartões" 
            active={activeTab === "cards"} 
            onClick={() => setActiveTab("cards")} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<Target />} 
            label="Metas" 
            active={activeTab === "goals"} 
            onClick={() => setActiveTab("goals")} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<CalendarDays />} 
            label="Controle Anual" 
            active={activeTab === "annual"} 
            onClick={() => setActiveTab("annual")} 
            collapsed={!isSidebarOpen}
          />
          <div className="pt-4 border-t border-slate-800 mt-4">
            <button 
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all",
                !isSidebarOpen && "justify-center"
              )}
            >
              <X size={20} />
              {isSidebarOpen && <span className="font-medium">Sair da Conta</span>}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white z-50 flex justify-around items-center p-2 border-t border-slate-800">
        <button onClick={() => setActiveTab("dashboard")} className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === "dashboard" ? "text-emerald-500" : "text-slate-400")}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] mt-1">Início</span>
        </button>
        <button onClick={() => setActiveTab("incomes")} className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === "incomes" ? "text-emerald-500" : "text-slate-400")}>
          <TrendingUp size={20} />
          <span className="text-[10px] mt-1">Ganhos</span>
        </button>
        <button onClick={() => setActiveTab("expenses")} className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === "expenses" ? "text-emerald-500" : "text-slate-400")}>
          <TrendingDown size={20} />
          <span className="text-[10px] mt-1">Gastos</span>
        </button>
        <button onClick={() => setActiveTab("cards")} className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === "cards" ? "text-emerald-500" : "text-slate-400")}>
          <CreditCardIcon size={20} />
          <span className="text-[10px] mt-1">Cartões</span>
        </button>
        <button onClick={() => setActiveTab("goals")} className={cn("flex flex-col items-center p-2 rounded-lg", activeTab === "goals" ? "text-emerald-500" : "text-slate-400")}>
          <Target size={20} />
          <span className="text-[10px] mt-1">Metas</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        isSidebarOpen ? "md:ml-64" : "md:ml-20"
      )}>
        <header className="bg-white border-b border-slate-200 p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-40 gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {activeTab === "dashboard" && "Resumo Geral"}
              {activeTab === "incomes" && "Controle de Entradas"}
              {activeTab === "expenses" && "Controle de Despesas"}
              {activeTab === "cards" && "Cartões de Crédito"}
              {activeTab === "goals" && "Metas Financeiras"}
              {activeTab === "annual" && "Controle Anual"}
            </h1>
            <button onClick={handleLogout} className="md:hidden p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {(activeTab === "dashboard" || activeTab === "incomes" || activeTab === "expenses" || activeTab === "annual") && (
              <div className="flex gap-2 w-full sm:w-auto">
                {activeTab !== "annual" && (
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                )}
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="hidden md:flex gap-2">
              <button 
                onClick={exportBackup}
                title="Exportar Backup (JSON)"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
              >
                <FileJson size={18} />
              </button>
              <label className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-all" title="Importar Backup">
                <Upload size={18} />
                <input type="file" accept=".json" onChange={importBackup} className="hidden" />
              </label>
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            {(activeTab === "incomes" || activeTab === "expenses" || activeTab === "cards") && (
              <button 
                onClick={() => {
                  if (activeTab === "cards") addCard();
                  else addTransaction(activeTab === "incomes" ? "income" : "expense");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-all"
              >
                <Plus size={18} />
                <span>Novo Registro</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 md:space-y-8"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <SummaryCard 
                    title={`Receita em ${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth]}`} 
                    value={totals.income} 
                    icon={<TrendingUp className="text-emerald-600" />} 
                    color="emerald"
                  />
                  <SummaryCard 
                    title={`Despesas em ${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedMonth]}`} 
                    value={totals.expense} 
                    icon={<TrendingDown className="text-rose-600" />} 
                    color="rose"
                    extraInfo={
                      <div className="flex justify-between text-[10px] md:text-xs">
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 size={12} />
                          <span>Pago: {formatCurrency(totals.paidExpense)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 font-medium">
                          <Circle size={12} />
                          <span>Pendente: {formatCurrency(totals.pendingExpense)}</span>
                        </div>
                      </div>
                    }
                  />
                  <SummaryCard 
                    title="Saldo do Mês" 
                    value={totals.balance} 
                    icon={<LayoutDashboard className="text-blue-600" />} 
                    color={totals.balance >= 0 ? "blue" : "rose"}
                    showIndicator
                  />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">Despesas por Categoria</h3>
                    <div className="h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">Receitas vs Despesas</h3>
                    <div className="h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData.filter(m => m.receita > 0 || m.despesa > 0)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} name="Receita" />
                          <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesa" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                    <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">Evolução do Saldo</h3>
                    <div className="h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} name="Saldo" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === "incomes" || activeTab === "expenses") && (
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 font-semibold text-slate-600">Data</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Descrição</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Categoria</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Valor</th>
                            {activeTab === "expenses" && (
                              <th className="px-6 py-4 font-semibold text-slate-600 text-center">Status</th>
                            )}
                            <th className="px-6 py-4 font-semibold text-slate-600 text-right">Ações</th>
                          </tr>
                        </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions
                        .filter(t => {
                          const date = parseISO(t.date);
                          return (
                            t.type === (activeTab === "incomes" ? "income" : "expense") &&
                            date.getMonth() === selectedMonth &&
                            date.getFullYear() === selectedYear
                          );
                        })
                        .map(transaction => (
                          <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <input 
                                type="date" 
                                value={transaction.date}
                                onChange={(e) => updateTransaction(transaction.id, "date", e.target.value)}
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                value={transaction.description}
                                onChange={(e) => updateTransaction(transaction.id, "description", e.target.value)}
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-full"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                value={transaction.category}
                                onChange={(e) => {
                                  const newCategory = e.target.value;
                                  updateTransaction(transaction.id, "category", newCategory);
                                  
                                  // Auto-fill amount if it's a credit card
                                  const card = cardsWithProgress.find(c => c.bank === newCategory);
                                  if (card) {
                                    const installmentValue = card.totalAmount / card.totalInstallments;
                                    updateTransaction(transaction.id, "amount", installmentValue);
                                    if (transaction.description === "Nova Saída") {
                                      updateTransaction(transaction.id, "description", `Parcela ${card.bank}`);
                                    }
                                  }
                                }}
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1"
                              >
                                {activeTab === "incomes" ? (
                                  INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                ) : (
                                  <>
                                    <optgroup label="Categorias Padrão">
                                      {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </optgroup>
                                    <optgroup label="Metas Financeiras">
                                      {goals.map(goal => <option key={goal.id} value={goal.title}>{goal.title}</option>)}
                                    </optgroup>
                                    <optgroup label="Cartões de Crédito">
                                      {cardsWithProgress.map(card => <option key={card.id} value={card.bank}>{card.bank}</option>)}
                                    </optgroup>
                                  </>
                                )}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">R$</span>
                                <input 
                                  type="number" 
                                  value={transaction.amount}
                                  onChange={(e) => updateTransaction(transaction.id, "amount", parseFloat(e.target.value) || 0)}
                                  className={`bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-24 font-medium ${transaction.paid ? 'text-slate-400 line-through' : ''}`}
                                />
                              </div>
                            </td>
                            {activeTab === "expenses" && (
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => updateTransaction(transaction.id, "paid", !transaction.paid)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                      transaction.paid 
                                        ? "bg-emerald-100 text-emerald-700" 
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    }`}
                                  >
                                    {transaction.paid ? (
                                      <>
                                        <CheckCircle2 size={14} />
                                        <span>Pago</span>
                                      </>
                                    ) : (
                                      <>
                                        <Circle size={14} />
                                        <span>Pagar</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => deleteTransaction(transaction.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "cards" && (
              <motion.div 
                key="cards"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 font-semibold text-slate-600">Descrição</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Banco/Cartão</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Vencimento</th>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-center">Parcelas</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Valor Total</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Valor Parcela</th>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cardsWithProgress.map(card => {
                        const installmentValue = card.totalAmount / card.totalInstallments;
                        const installmentsLeft = card.totalInstallments - card.installmentsPaid;
                        return (
                          <tr key={card.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                value={card.description}
                                onChange={(e) => updateCard(card.id, "description", e.target.value)}
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-full"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                value={card.bank}
                                onChange={(e) => updateCard(card.id, "bank", e.target.value)}
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-full"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-xs">Dia</span>
                                <input 
                                  type="text" 
                                  value={card.dueDate}
                                  onChange={(e) => updateCard(card.id, "dueDate", e.target.value)}
                                  className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-10 text-center"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <input 
                                  type="number" 
                                  value={card.installmentsPaid}
                                  onChange={(e) => updateCard(card.id, "installmentsPaid", parseInt(e.target.value) || 0)}
                                  className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-12 text-center font-bold text-emerald-600"
                                />
                                <span className="text-slate-400">/</span>
                                <input 
                                  type="number" 
                                  value={card.totalInstallments}
                                  onChange={(e) => updateCard(card.id, "totalInstallments", parseInt(e.target.value) || 1)}
                                  className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-12 text-center"
                                />
                              </div>
                              <div className="text-[10px] text-center text-slate-400 mt-1">
                                {installmentsLeft} restantes
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">R$</span>
                                <input 
                                  type="number" 
                                  value={card.totalAmount}
                                  onChange={(e) => updateCard(card.id, "totalAmount", parseFloat(e.target.value) || 0)}
                                  className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-24 font-medium"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-700">
                              {formatCurrency(installmentValue)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    const dueDate = parseInt(card.dueDate) || 1;
                                    const installmentsToGenerate = card.totalInstallments - card.installmentsPaid;
                                    
                                    if (installmentsToGenerate <= 0) {
                                      return;
                                    }
 
                                    const newTransactions: Transaction[] = [];
                                    for (let i = 0; i < installmentsToGenerate; i++) {
                                      const installmentDate = addMonths(new Date(selectedYear, selectedMonth, dueDate), i);
                                      newTransactions.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        date: format(installmentDate, "yyyy-MM-dd"),
                                        description: `Parcela ${card.installmentsPaid + i + 1}/${card.totalInstallments} - ${card.bank}`,
                                        category: card.bank,
                                        amount: card.totalAmount / card.totalInstallments,
                                        type: "expense",
                                        paid: false
                                      });
                                    }
                                    setTransactions(prev => [...newTransactions, ...prev]);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all group/btnAll relative"
                                  title="Gerar todas as parcelas restantes"
                                >
                                  <CalendarDays size={18} />
                                  <span className="absolute -top-8 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/btnAll:opacity-100 transition-opacity whitespace-nowrap">
                                    Gerar Todas
                                  </span>
                                </button>
                                <button 
                                  onClick={() => {
                                    const dueDate = parseInt(card.dueDate) || 1;
                                    const defaultDate = new Date(selectedYear, selectedMonth, dueDate);
                                    const newTransaction: Transaction = {
                                      id: Math.random().toString(36).substr(2, 9),
                                      date: format(defaultDate, "yyyy-MM-dd"),
                                      description: `Parcela ${card.installmentsPaid + 1}/${card.totalInstallments} - ${card.bank}`,
                                      category: card.bank,
                                      amount: card.totalAmount / card.totalInstallments,
                                      type: "expense",
                                      paid: true
                                    };
                                    setTransactions(prev => [newTransaction, ...prev]);
                                  }}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all group/btn relative"
                                  title="Lançar parcela no mês atual"
                                >
                                  <Plus size={18} />
                                  <span className="absolute -top-8 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                    Lançar Parcela
                                  </span>
                                </button>
                                <button 
                                  onClick={() => deleteCard(card.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "goals" && (
              <motion.div 
                key="goals"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {goalsWithProgress.map(goal => {
                  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);
                  
                  // Calculate months remaining
                  const today = new Date();
                  const deadlineDate = parseISO(goal.deadline);
                  const monthsRemaining = Math.max(differenceInMonths(deadlineDate, today), 1);
                  const monthlySaving = remainingAmount / monthsRemaining;

                  return (
                    <div key={goal.id} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6 relative group">
                      <button 
                        onClick={() => deleteGoal(goal.id)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="space-y-4">
                        <input 
                          type="text" 
                          value={goal.title}
                          onChange={(e) => updateGoal(goal.id, "title", e.target.value)}
                          className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1 w-full"
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Meta (R$)</label>
                            <input 
                              type="number" 
                              value={goal.targetAmount}
                              onChange={(e) => updateGoal(goal.id, "targetAmount", parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Total Acumulado (Automático)</label>
                            <div className="w-full bg-emerald-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-emerald-700">
                              {formatCurrency(goal.currentAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Progresso</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <div className="flex flex-col">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Prazo</label>
                          <input 
                            type="date" 
                            value={goal.deadline}
                            onChange={(e) => updateGoal(goal.id, "deadline", e.target.value)}
                            className="text-xs font-bold text-slate-600 bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded px-1"
                          />
                        </div>
                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                          Faltam {formatCurrency(remainingAmount)}
                        </div>
                      </div>

                      {remainingAmount > 0 && (
                        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Economia Mensal Necessária</p>
                            <p className="text-lg font-black text-emerald-400">{formatCurrency(monthlySaving)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Meses Restantes</p>
                            <p className="text-lg font-black">{monthsRemaining}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button 
                  onClick={addGoal}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all group min-h-[250px]"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 transition-all">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold">Nova Meta Financeira</span>
                </button>
              </motion.div>
            )}

            {activeTab === "annual" && (
              <motion.div 
                key="annual"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 font-semibold text-slate-600">Mês</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Receita</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Despesa</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Saldo</th>
                        <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyData.map((data, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium">{data.name}</td>
                          <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(data.receita)}</td>
                          <td className="px-6 py-4 text-rose-600 font-medium">{formatCurrency(data.despesa)}</td>
                          <td className={cn(
                            "px-6 py-4 font-bold",
                            data.saldo >= 0 ? "text-emerald-700" : "text-rose-700"
                          )}>
                            {formatCurrency(data.saldo)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                              data.status === "Pago" ? "bg-emerald-100 text-emerald-700" : 
                              data.status === "Pendente" ? "bg-amber-100 text-amber-700" : 
                              "bg-slate-100 text-slate-500"
                            )}>
                              {data.status === "Pago" && <CheckCircle2 size={12} />}
                              {data.status === "Pendente" && <Circle size={12} />}
                              {data.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="px-6 py-6">TOTAL ANUAL</td>
                        <td className="px-6 py-6 text-emerald-400">
                          {formatCurrency(monthlyData.reduce((acc, m) => acc + m.receita, 0))}
                        </td>
                        <td className="px-6 py-6 text-rose-400">
                          {formatCurrency(monthlyData.reduce((acc, m) => acc + m.despesa, 0))}
                        </td>
                        <td className="px-6 py-6" colSpan={2}>
                          {formatCurrency(monthlyData.reduce((acc, m) => acc + m.saldo, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean, 
  onClick: () => void,
  collapsed?: boolean
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <span className={cn(
        "shrink-0",
        active ? "text-white" : "group-hover:text-emerald-400"
      )}>
        {icon}
      </span>
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
}

function SummaryCard({ title, value, icon, color, showIndicator, extraInfo }: { 
  title: string, 
  value: number, 
  icon: React.ReactNode, 
  color: "emerald" | "rose" | "blue",
  showIndicator?: boolean,
  extraInfo?: React.ReactNode
}) {
  const isPositive = value >= 0;
  
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium mb-1">{title}</p>
          <h2 className="text-lg md:text-2xl font-bold text-slate-900">{formatCurrency(value)}</h2>
          {showIndicator && (
            <div className={cn(
              "mt-1 md:mt-2 flex items-center gap-1 text-[10px] md:text-xs font-bold",
              isPositive ? "text-emerald-600" : "text-rose-600"
            )}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? "Positivo" : "Negativo"}
            </div>
          )}
        </div>
        <div className={cn(
          "p-2 md:p-3 rounded-xl",
          color === "emerald" && "bg-emerald-50",
          color === "rose" && "bg-rose-50",
          color === "blue" && "bg-blue-50"
        )}>
          {icon}
        </div>
      </div>
      {extraInfo && (
        <div className="pt-3 border-t border-slate-50">
          {extraInfo}
        </div>
      )}
    </div>
  );
}
