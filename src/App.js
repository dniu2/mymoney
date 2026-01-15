import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import "./App.css";

function App() {
  // -------------------- STATE --------------------
  const [currentTab, setCurrentTab] = useState("dashboard"); // dashboard | expenses
  const [expenses, setExpenses] = useState([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  const [goals, setGoals] = useState([
    { id: 1, name: "Emergency Fund", target: 1000, saved: 200 },
    { id: 2, name: "Brokerage", target: 5000, saved: 1500 },
  ]);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");

  const [budgets, setBudgets] = useState({
    Food: 400,
    Rent: 1000,
    Gym: 100,
    Fun: 200,
    Other: 100,
  });

  const [chartType, setChartType] = useState("pie");
  const [theme, setTheme] = useState("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({}); // {Food: false}

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF"];

  // -------------------- LOCAL STORAGE --------------------
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses");
    const savedGoals = localStorage.getItem("goals");
    const savedBudgets = localStorage.getItem("budgets");
    const savedTheme = localStorage.getItem("theme");

    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // -------------------- SAVE HELPERS --------------------
  const saveExpenses = (newExpenses) => {
    setExpenses(newExpenses);
    localStorage.setItem("expenses", JSON.stringify(newExpenses));
  };
  const saveGoals = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem("goals", JSON.stringify(newGoals));
  };
  const saveBudgets = (newBudgets) => {
    setBudgets(newBudgets);
    localStorage.setItem("budgets", JSON.stringify(newBudgets));
  };
  const saveTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // -------------------- EXPENSE FUNCTIONS --------------------
  const addExpense = () => {
    if (!name || !amount) return;
    const newExpense = {
      id: Date.now(),
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      contributions: {},
    };
    saveExpenses([...expenses, newExpense]);
    setName("");
    setAmount("");
  };

  const deleteExpense = (id) => {
    const exp = expenses.find((e) => e.id === id);
    if (exp && exp.contributions) {
      const updatedGoals = goals.map((goal) => {
        const contrib = exp.contributions[goal.id] || 0;
        return { ...goal, saved: goal.saved - contrib };
      });
      saveGoals(updatedGoals);
    }
    saveExpenses(expenses.filter((e) => e.id !== id));
  };

  // -------------------- GOAL FUNCTIONS --------------------
  const addGoal = () => {
    if (!newGoalName || !newGoalTarget) return;
    const newGoal = {
      id: Date.now(),
      name: newGoalName.trim(),
      target: parseFloat(newGoalTarget),
      saved: 0,
    };
    saveGoals([...goals, newGoal]);
    setNewGoalName("");
    setNewGoalTarget("");
  };

  const deleteGoal = (goalId) => {
    if (!window.confirm("Delete this goal? Contributions from expenses will also be removed.")) return;

    // Remove contributions from expenses
    const updatedExpenses = expenses.map((exp) => {
      if (exp.contributions && exp.contributions[goalId]) {
        const { [goalId]: _, ...rest } = exp.contributions;
        return { ...exp, contributions: rest };
      }
      return exp;
    });

    saveExpenses(updatedExpenses);
    saveGoals(goals.filter((g) => g.id !== goalId));
  };

  const contributeToGoal = (expenseId, goalId) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;
    if (!expense.contributions) expense.contributions = {};
    if (expense.contributions[goalId]) return;

    const amount = expense.amount;
    const updatedGoals = goals.map((goal) =>
      goal.id === goalId ? { ...goal, saved: goal.saved + amount } : goal
    );
    saveGoals(updatedGoals);

    const updatedExpenses = expenses.map((e) =>
      e.id === expenseId
        ? { ...e, contributions: { ...e.contributions, [goalId]: amount } }
        : e
    );
    saveExpenses(updatedExpenses);
  };

  const undoContribution = (expenseId, goalId) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense || !expense.contributions || !expense.contributions[goalId]) return;

    const amount = expense.contributions[goalId];
    const updatedGoals = goals.map((goal) =>
      goal.id === goalId ? { ...goal, saved: goal.saved - amount } : goal
    );
    saveGoals(updatedGoals);

    const updatedExpenses = expenses.map((e) =>
      e.id === expenseId
        ? { ...e, contributions: { ...e.contributions, [goalId]: undefined } }
        : e
    );
    saveExpenses(updatedExpenses);
  };

  // -------------------- CATEGORY FUNCTIONS --------------------
  const deleteCategory = (cat) => {
    if (!window.confirm(`Delete category "${cat}"? Expenses will move to "Other".`)) return;
    const { [cat]: removed, ...restBudgets } = budgets;
    saveBudgets(restBudgets);

    const filteredExpenses = expenses.map((exp) =>
      exp.category === cat ? { ...exp, category: "Other" } : exp
    );
    saveExpenses(filteredExpenses);
  };

  // -------------------- COLLAPSE HANDLER --------------------
  const toggleCategory = (cat) => {
    setCollapsedCategories({
      ...collapsedCategories,
      [cat]: !collapsedCategories[cat],
    });
  };

  // -------------------- RESET --------------------
  const resetAll = () => {
    if (!window.confirm("Reset all expenses, budgets, and goals?")) return;
    saveExpenses([]);
    const resetGoals = goals.map((goal) => ({ ...goal, saved: 0 }));
    saveGoals(resetGoals);
    saveBudgets({ Food: 400, Rent: 1000, Gym: 100, Fun: 200, Other: 100 });
  };

  // -------------------- CHART DATA --------------------
  const categoryData = Object.values(
    expenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = { name: e.category, value: 0 };
      acc[e.category].value += e.amount;
      return acc;
    }, {})
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const barData = Object.keys(budgets || {}).map((cat) => {
    const spent = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return { category: cat, spent, budget: budgets[cat] || 0 };
  });

  // -------------------- RENDER --------------------
  return (
    <div className={`app-container ${theme}`}>
      {/* Header */}
      <header>
        <h1>💰 DERRICK GOATED WEBSITE</h1>
        <button className="settings-button" onClick={() => setSettingsOpen(true)}>⚙️</button>
      </header>

      {/* Settings Overlay */}
      {settingsOpen && <div className="settings-overlay open" onClick={() => setSettingsOpen(false)}></div>}

      {/* Settings Panel */}
      <div className={`settings-panel ${settingsOpen ? "open" : ""}`}>
        <h2>Settings</h2>
        <label>
          Theme:
          <select value={theme} onChange={(e) => saveTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <button onClick={() => setSettingsOpen(false)}>Close</button>
      </div>

      {/* Tabs */}
      <div className="tab-content">
        {currentTab === "dashboard" && (
          <>
            <h2>Total Expenses: ${total.toFixed(2)}</h2>

            {/* Charts */}
            <div className="chart-toggle">
              <button onClick={() => setChartType("pie")}>Pie Chart</button>
              <button onClick={() => setChartType("bar")}>Bar Chart</button>
            </div>
            {chartType === "pie" && expenses.length > 0 && (
              <PieChart width={500} height={300}>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                  isAnimationActive={true}
                  animationDuration={1000}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            )}
            {chartType === "bar" && (
              <BarChart width={500} height={300} data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="spent" fill="#00C49F" />
                <Bar dataKey="budget" fill="#8884d8" />
              </BarChart>
            )}

            {/* Goals */}
            <h2>Goals</h2>
            {goals.map((goal) => {
              const progress = Math.min((goal.saved / goal.target) * 100, 100);
              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <span>{goal.name}</span>
                    <span>${goal.saved.toFixed(2)} / ${goal.target.toFixed(2)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <button className="delete-btn" onClick={() => deleteGoal(goal.id)}>Delete Goal</button>
                </div>
              );
            })}

            {/* Category Budgets */}
            <h2>Budgets</h2>
            <div className="budgets-section">
              {Object.keys(budgets || {}).map((cat) => {
                const spent = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                const overBudget = spent > (budgets[cat] || 0);
                return (
                  <div key={cat} className="budget-card">
                    <span>{cat}</span>
                    <input
                      type="number"
                      value={budgets[cat] || 0}
                      onChange={(e) => saveBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })}
                      style={{ borderColor: overBudget ? "red" : "#ccc" }}
                    />
                    <span className={overBudget ? "over-budget" : ""}>
                      Spent: ${spent.toFixed(2)} / ${budgets[cat]}
                    </span>
                    <button className="delete-btn" onClick={() => deleteCategory(cat)}>Delete</button>
                  </div>
                );
              })}
            </div>

            <button className="reset-btn" onClick={resetAll}>Reset All</button>
          </>
        )}

        {/* Expenses Tab */}
        {currentTab === "expenses" && (
          <>
            <h2>Add Expense</h2>
            <div className="input-section">
              <input type="text" placeholder="Expense name" value={name} onChange={(e) => setName(e.target.value)} />
              <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.keys(budgets || {}).map((cat) => <option key={cat}>{cat}</option>)}
              </select>
              <button className="add-btn" onClick={addExpense}>Add</button>
            </div>

            {/* Collapsible expenses by category */}
            {Object.keys(budgets || {}).map((cat) => {
              const catExpenses = expenses.filter(e => e.category === cat);
              if (catExpenses.length === 0) return null;
              const collapsed = collapsedCategories[cat];
              const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key={cat} className="category-section">
                  <div className="category-header" onClick={() => toggleCategory(cat)}>
                    <strong>{cat}</strong> - Total: ${spent.toFixed(2)} {collapsed ? "▼" : "▲"}
                  </div>
                  {!collapsed && (
                    <ul className="expense-list">
                      {catExpenses.map((exp) => (
                        <li key={exp.id} className="expense-card">
                          <div>
                            {exp.name} (${exp.amount.toFixed(2)})
                            {exp.contributions && Object.keys(exp.contributions).length > 0 && (
                              <span className="contributed"> • Contributed</span>
                            )}
                          </div>
                          <div className="expense-buttons">
                            {goals.map((goal) =>
                              !exp.contributions || !exp.contributions[goal.id] ? (
                                <button key={goal.id} onClick={() => contributeToGoal(exp.id, goal.id)}>+ {goal.name}</button>
                              ) : (
                                <button key={goal.id} className="undo-btn" onClick={() => undoContribution(exp.id, goal.id)}>Undo {goal.name}</button>
                              )
                            )}
                            <button className="delete-btn" onClick={() => deleteExpense(exp.id)}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="bottom-tabs">
        <button className={currentTab === "dashboard" ? "active" : ""} onClick={() => setCurrentTab("dashboard")}>Dashboard</button>
        <button className={currentTab === "expenses" ? "active" : ""} onClick={() => setCurrentTab("expenses")}>Expenses</button>
      </div>

      {/* Ryan's Picture */}
<img
  src={`${process.env.PUBLIC_URL}/ryan.png`}
  alt="Ryan"
  className="ryan-picture"
/>
</div>  // closes app-container  
    </div>
  );
}

export default App;
