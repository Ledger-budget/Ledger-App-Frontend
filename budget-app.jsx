import { useState, useEffect, useRef } from "react";

const STORAGE_KEYS = {
  transactions: "budget_transactions",
  savingsGoals: "budget_savings_goals",
  bills: "budget_bills",
  budgetLimits: "budget_limits",
};

const CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Clothing",
  "Education",
  "Subscriptions",
  "Other",
];

const CATEGORY_COLORS = {
  Housing: "#6366f1",
  Food: "#f59e0b",
  Transport: "#10b981",
  Utilities: "#3b82f6",
  Entertainment: "#ec4899",
  Health: "#14b8a6",
  Clothing: "#f97316",
  Education: "#8b5cf6",
  Subscriptions: "#06b6d4",
  Other: "#6b7280",
};

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n || 0,
  );

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
};

async function loadData(key) {
  try {
    const result = await window.storage.get(key);
    return result ? JSON.parse(result.value) : null;
  } catch {
    return null;
  }
}

async function saveData(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error("Save error", e);
  }
}

// ── Mini Components ────────────────────────────────────────────────────────────

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm p-5 ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 28,
          width: "min(480px,94vw)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#f1f5f9",
              fontFamily: "'Playfair Display',serif",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#94a3b8",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 14px",
          color: "#f1f5f9",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          ...props.style,
        }}
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          width: "100%",
          background: "#1e1e35",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 14px",
          color: "#f1f5f9",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          ...props.style,
        }}
      >
        {children}
      </select>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  small = false,
  style = {},
}) {
  const base = {
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "inherit",
    transition: "all 0.15s",
    ...style,
  };
  const size = small
    ? { padding: "6px 14px", fontSize: 12 }
    : { padding: "11px 20px", fontSize: 14 };
  const variants = {
    primary: {
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      color: "#fff",
    },
    ghost: { background: "rgba(255,255,255,0.06)", color: "#94a3b8" },
    danger: { background: "rgba(239,68,68,0.15)", color: "#f87171" },
    success: { background: "rgba(16,185,129,0.15)", color: "#34d399" },
  };
  return (
    <button
      onClick={onClick}
      style={{ ...base, ...size, ...variants[variant] }}
    >
      {children}
    </button>
  );
}

function DonutChart({ data, size = 120 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontSize: 12,
        }}
      >
        No data
      </div>
    );
  let cum = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const start = cum;
    cum += pct;
    return { ...d, start, pct };
  });
  const r = 45,
    cx = 60,
    cy = 60,
    stroke = 18;
  const arc = (start, pct) => {
    const s = start * 2 * Math.PI - Math.PI / 2;
    const e = (start + pct) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(s),
      y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e),
      y2 = cy + r * Math.sin(e);
    const large = pct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={stroke}
      />
      {slices.map(
        (s, i) =>
          s.pct > 0 && (
            <path
              key={i}
              d={arc(s.start, s.pct)}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            />
          ),
      )}
    </svg>
  );
}

function ProgressBar({ value, max, color = "#6366f1", height = 8 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isOver = value > max && max > 0;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 99,
        height,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: isOver ? "#ef4444" : color,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────

export default function BudgetApp() {
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(getCurrentMonth());
  const [transactions, setTransactions] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [budgetLimits, setBudgetLimits] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null); // "transaction"|"goal"|"bill"|"limit"
  const [editItem, setEditItem] = useState(null);

  // Form states
  const [txForm, setTxForm] = useState({
    type: "expense",
    amount: "",
    category: "Food",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [goalForm, setGoalForm] = useState({
    name: "",
    target: "",
    saved: "",
    color: "#6366f1",
  });
  const [billForm, setBillForm] = useState({
    name: "",
    amount: "",
    dueDay: "1",
    category: "Utilities",
    autopay: false,
  });
  const [limitForm, setLimitForm] = useState({});

  useEffect(() => {
    (async () => {
      const [t, g, b, l] = await Promise.all([
        loadData(STORAGE_KEYS.transactions),
        loadData(STORAGE_KEYS.savingsGoals),
        loadData(STORAGE_KEYS.bills),
        loadData(STORAGE_KEYS.budgetLimits),
      ]);
      if (t) setTransactions(t);
      if (g) setSavingsGoals(g);
      if (b) setBills(b);
      if (l) {
        setBudgetLimits(l);
        setLimitForm(l);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) saveData(STORAGE_KEYS.transactions, transactions);
  }, [transactions, loaded]);
  useEffect(() => {
    if (loaded) saveData(STORAGE_KEYS.savingsGoals, savingsGoals);
  }, [savingsGoals, loaded]);
  useEffect(() => {
    if (loaded) saveData(STORAGE_KEYS.bills, bills);
  }, [bills, loaded]);
  useEffect(() => {
    if (loaded) saveData(STORAGE_KEYS.budgetLimits, budgetLimits);
  }, [budgetLimits, loaded]);

  const monthTx = transactions.filter((t) => t.date.startsWith(month));
  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = monthTx
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((s, t) => s + t.amount, 0);
    return acc;
  }, {});

  const donutData = CATEGORIES.filter((c) => byCategory[c] > 0).map((c) => ({
    label: c,
    value: byCategory[c],
    color: CATEGORY_COLORS[c],
  }));

  const monthBills = bills
    .map((b) => {
      const d = new Date();
      const due = new Date(d.getFullYear(), d.getMonth(), b.dueDay);
      const daysLeft = Math.ceil((due - d) / 86400000);
      return { ...b, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const billsTotal = bills.reduce((s, b) => s + b.amount, 0);

  const openModal = (type, item = null) => {
    setEditItem(item);
    if (type === "transaction") {
      setTxForm(
        item
          ? {
              type: item.type,
              amount: String(item.amount),
              category: item.category,
              note: item.note || "",
              date: item.date,
            }
          : {
              type: "expense",
              amount: "",
              category: "Food",
              note: "",
              date: new Date().toISOString().slice(0, 10),
            },
      );
    }
    if (type === "goal")
      setGoalForm(
        item
          ? {
              name: item.name,
              target: String(item.target),
              saved: String(item.saved),
              color: item.color,
            }
          : { name: "", target: "", saved: "", color: "#6366f1" },
      );
    if (type === "bill")
      setBillForm(
        item
          ? {
              name: item.name,
              amount: String(item.amount),
              dueDay: String(item.dueDay),
              category: item.category,
              autopay: item.autopay,
            }
          : {
              name: "",
              amount: "",
              dueDay: "1",
              category: "Utilities",
              autopay: false,
            },
      );
    if (type === "limit") setLimitForm({ ...budgetLimits });
    setModal(type);
  };

  const closeModal = () => {
    setModal(null);
    setEditItem(null);
  };

  const saveTransaction = () => {
    if (!txForm.amount || !txForm.date) return;
    const item = {
      id: editItem?.id || Date.now(),
      type: txForm.type,
      amount: parseFloat(txForm.amount),
      category: txForm.category,
      note: txForm.note,
      date: txForm.date,
    };
    setTransactions((prev) =>
      editItem
        ? prev.map((t) => (t.id === editItem.id ? item : t))
        : [item, ...prev],
    );
    closeModal();
  };

  const deleteTransaction = (id) =>
    setTransactions((prev) => prev.filter((t) => t.id !== id));

  const saveGoal = () => {
    if (!goalForm.name || !goalForm.target) return;
    const item = {
      id: editItem?.id || Date.now(),
      name: goalForm.name,
      target: parseFloat(goalForm.target),
      saved: parseFloat(goalForm.saved) || 0,
      color: goalForm.color,
    };
    setSavingsGoals((prev) =>
      editItem
        ? prev.map((g) => (g.id === editItem.id ? item : g))
        : [...prev, item],
    );
    closeModal();
  };

  const saveBill = () => {
    if (!billForm.name || !billForm.amount) return;
    const item = {
      id: editItem?.id || Date.now(),
      name: billForm.name,
      amount: parseFloat(billForm.amount),
      dueDay: parseInt(billForm.dueDay),
      category: billForm.category,
      autopay: billForm.autopay,
    };
    setBills((prev) =>
      editItem
        ? prev.map((b) => (b.id === editItem.id ? item : b))
        : [...prev, item],
    );
    closeModal();
  };

  const saveLimits = () => {
    const parsed = Object.fromEntries(
      Object.entries(limitForm).map(([k, v]) => [k, parseFloat(v) || 0]),
    );
    setBudgetLimits(parsed);
    closeModal();
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "transactions", label: "Transactions" },
    { id: "bills", label: "Bills" },
    { id: "savings", label: "Savings" },
  ];

  if (!loaded)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0f1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6366f1",
          fontFamily: "sans-serif",
        }}
      >
        Loading your finances…
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f1a",
        color: "#f1f5f9",
        fontFamily: "'DM Sans',system-ui,sans-serif",
        padding: "0 0 40px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.5); }
        input::placeholder { color:#475569 !important; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "rgba(15,15,26,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 60,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              💰
            </div>
            <span
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#f1f5f9",
              }}
            >
              Ledger
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background:
                    tab === t.id ? "rgba(99,102,241,0.2)" : "transparent",
                  border:
                    tab === t.id
                      ? "1px solid rgba(99,102,241,0.4)"
                      : "1px solid transparent",
                  borderRadius: 8,
                  padding: "6px 14px",
                  color: tab === t.id ? "#818cf8" : "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 0" }}>
        {/* Month selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "'Playfair Display',serif",
            }}
          >
            {getMonthLabel(month)}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => {
                const [y, m] = month.split("-").map(Number);
                const d = new Date(y, m - 2);
                setMonth(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                );
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                color: "#94a3b8",
                borderRadius: 8,
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ‹
            </button>
            <button
              onClick={() => setMonth(getCurrentMonth())}
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: 8,
                padding: "4px 12px",
                color: "#818cf8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Today
            </button>
            <button
              onClick={() => {
                const [y, m] = month.split("-").map(Number);
                const d = new Date(y, m);
                setMonth(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                );
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                color: "#94a3b8",
                borderRadius: 8,
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            {/* Summary cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 14,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Income", value: income, color: "#10b981", icon: "↑" },
                {
                  label: "Expenses",
                  value: expenses,
                  color: "#f87171",
                  icon: "↓",
                },
                {
                  label: "Net",
                  value: net,
                  color: net >= 0 ? "#34d399" : "#f87171",
                  icon: "=",
                },
              ].map((c) => (
                <Card key={c.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#475569",
                          marginBottom: 8,
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: c.color,
                        }}
                      >
                        {formatCurrency(c.value)}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${c.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: c.color,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      {c.icon}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {/* Spending by category */}
              <Card>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    Spending by Category
                  </h4>
                  <Btn small variant="ghost" onClick={() => openModal("limit")}>
                    Set Limits
                  </Btn>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <DonutChart data={donutData} size={100} />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {CATEGORIES.filter((c) => byCategory[c] > 0)
                      .slice(0, 5)
                      .map((c) => (
                        <div key={c}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: CATEGORY_COLORS[c],
                                  display: "inline-block",
                                }}
                              />
                              {c}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color:
                                  budgetLimits[c] &&
                                  byCategory[c] > budgetLimits[c]
                                    ? "#f87171"
                                    : "#cbd5e1",
                              }}
                            >
                              {formatCurrency(byCategory[c])}
                            </span>
                          </div>
                          {budgetLimits[c] > 0 && (
                            <ProgressBar
                              value={byCategory[c]}
                              max={budgetLimits[c]}
                              color={CATEGORY_COLORS[c]}
                              height={4}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </Card>

              {/* Upcoming bills */}
              <Card>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    Upcoming Bills
                  </h4>
                  <span
                    style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}
                  >
                    {formatCurrency(billsTotal)}/mo
                  </span>
                </div>
                {monthBills.length === 0 && (
                  <div
                    style={{
                      color: "#475569",
                      fontSize: 13,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    No bills added yet
                  </div>
                )}
                {monthBills.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#e2e8f0",
                        }}
                      >
                        {b.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color:
                            b.daysLeft <= 3
                              ? "#f87171"
                              : b.daysLeft <= 7
                                ? "#f59e0b"
                                : "#64748b",
                        }}
                      >
                        {b.daysLeft < 0
                          ? "Overdue"
                          : b.daysLeft === 0
                            ? "Due today"
                            : `Due in ${b.daysLeft}d`}
                        {b.autopay && " · Auto"}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f1f5f9",
                      }}
                    >
                      {formatCurrency(b.amount)}
                    </span>
                  </div>
                ))}
              </Card>

              {/* Savings summary */}
              <Card style={{ gridColumn: "span 2" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    Savings Goals
                  </h4>
                  <Btn small onClick={() => openModal("goal")}>
                    + Add Goal
                  </Btn>
                </div>
                {savingsGoals.length === 0 && (
                  <div
                    style={{
                      color: "#475569",
                      fontSize: 13,
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    No savings goals yet
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                    gap: 12,
                  }}
                >
                  {savingsGoals.map((g) => {
                    const pct = Math.min(100, (g.saved / g.target) * 100);
                    return (
                      <div
                        key={g.id}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${g.color}30`,
                          borderRadius: 14,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#e2e8f0",
                            }}
                          >
                            {g.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: g.color,
                              fontWeight: 700,
                            }}
                          >
                            {Math.round(pct)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={g.saved}
                          max={g.target}
                          color={g.color}
                          height={6}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 6,
                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          <span>{formatCurrency(g.saved)}</span>
                          <span>{formatCurrency(g.target)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === "transactions" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 16,
              }}
            >
              <Btn onClick={() => openModal("transaction")}>
                + Add Transaction
              </Btn>
            </div>
            {monthTx.length === 0 && (
              <Card>
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#475569",
                  }}
                >
                  No transactions for {getMonthLabel(month)}
                </div>
              </Card>
            )}
            {monthTx
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    marginBottom: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${CATEGORY_COLORS[t.category]}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {t.type === "income"
                        ? "💵"
                        : [
                            "🏠",
                            "🍔",
                            "🚗",
                            "💡",
                            "🎮",
                            "💊",
                            "👕",
                            "📚",
                            "📱",
                            "📦",
                          ][CATEGORIES.indexOf(t.category)] || "💳"}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#e2e8f0",
                        }}
                      >
                        {t.note || t.category}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {t.category} · {t.date}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: t.type === "income" ? "#34d399" : "#f87171",
                      }}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn
                        small
                        variant="ghost"
                        onClick={() => openModal("transaction", t)}
                      >
                        ✏️
                      </Btn>
                      <Btn
                        small
                        variant="danger"
                        onClick={() => deleteTransaction(t.id)}
                      >
                        🗑
                      </Btn>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── BILLS ── */}
        {tab === "bills" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  Monthly total:{" "}
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}
                >
                  {formatCurrency(billsTotal)}
                </span>
              </div>
              <Btn onClick={() => openModal("bill")}>+ Add Bill</Btn>
            </div>
            {bills.length === 0 && (
              <Card>
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#475569",
                  }}
                >
                  No recurring bills added yet
                </div>
              </Card>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                gap: 12,
              }}
            >
              {monthBills.map((b) => (
                <Card key={b.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#e2e8f0",
                        }}
                      >
                        {b.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: CATEGORY_COLORS[b.category] || "#64748b",
                          marginTop: 3,
                        }}
                      >
                        {b.category}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#f1f5f9",
                      }}
                    >
                      {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background:
                          b.daysLeft <= 3
                            ? "rgba(239,68,68,0.15)"
                            : b.daysLeft <= 7
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(255,255,255,0.05)",
                        color:
                          b.daysLeft <= 3
                            ? "#f87171"
                            : b.daysLeft <= 7
                              ? "#fbbf24"
                              : "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      {b.daysLeft < 0
                        ? "Overdue"
                        : b.daysLeft === 0
                          ? "Due today"
                          : `Due day ${b.dueDay}`}
                    </span>
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      {b.autopay && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#34d399",
                            background: "rgba(16,185,129,0.1)",
                            padding: "2px 6px",
                            borderRadius: 5,
                          }}
                        >
                          AUTO
                        </span>
                      )}
                      <Btn
                        small
                        variant="ghost"
                        onClick={() => openModal("bill", b)}
                      >
                        ✏️
                      </Btn>
                      <Btn
                        small
                        variant="danger"
                        onClick={() =>
                          setBills((prev) => prev.filter((x) => x.id !== b.id))
                        }
                      >
                        🗑
                      </Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── SAVINGS ── */}
        {tab === "savings" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 16,
              }}
            >
              <Btn onClick={() => openModal("goal")}>+ New Goal</Btn>
            </div>
            {savingsGoals.length === 0 && (
              <Card>
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#475569",
                  }}
                >
                  Start your first savings goal!
                </div>
              </Card>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: 14,
              }}
            >
              {savingsGoals.map((g) => {
                const pct = Math.min(100, (g.saved / g.target) * 100);
                const remaining = g.target - g.saved;
                return (
                  <Card key={g.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#f1f5f9",
                            fontFamily: "'Playfair Display',serif",
                          }}
                        >
                          {g.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginTop: 4,
                          }}
                        >
                          {formatCurrency(remaining)} to go
                        </div>
                      </div>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: `${g.color}15`,
                          border: `2px solid ${g.color}40`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          color: g.color,
                        }}
                      >
                        {Math.round(pct)}%
                      </div>
                    </div>
                    <ProgressBar
                      value={g.saved}
                      max={g.target}
                      color={g.color}
                      height={10}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 10,
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      <span>
                        Saved:{" "}
                        <strong style={{ color: "#e2e8f0" }}>
                          {formatCurrency(g.saved)}
                        </strong>
                      </span>
                      <span>
                        Goal:{" "}
                        <strong style={{ color: "#e2e8f0" }}>
                          {formatCurrency(g.target)}
                        </strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <Btn
                        small
                        variant="success"
                        style={{ flex: 1 }}
                        onClick={() => {
                          const amt = prompt("Add savings amount:");
                          if (amt && !isNaN(amt))
                            setSavingsGoals((prev) =>
                              prev.map((x) =>
                                x.id === g.id
                                  ? {
                                      ...x,
                                      saved: Math.min(
                                        x.target,
                                        x.saved + parseFloat(amt),
                                      ),
                                    }
                                  : x,
                              ),
                            );
                        }}
                      >
                        + Deposit
                      </Btn>
                      <Btn
                        small
                        variant="ghost"
                        onClick={() => openModal("goal", g)}
                      >
                        Edit
                      </Btn>
                      <Btn
                        small
                        variant="danger"
                        onClick={() =>
                          setSavingsGoals((prev) =>
                            prev.filter((x) => x.id !== g.id),
                          )
                        }
                      >
                        🗑
                      </Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Transaction Modal */}
      <Modal
        open={modal === "transaction"}
        onClose={closeModal}
        title={editItem ? "Edit Transaction" : "New Transaction"}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["expense", "income"].map((type) => (
            <button
              key={type}
              onClick={() => setTxForm((f) => ({ ...f, type }))}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: `2px solid ${txForm.type === type ? (type === "income" ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.08)"}`,
                background:
                  txForm.type === type
                    ? type === "income"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(239,68,68,0.1)"
                    : "transparent",
                color:
                  txForm.type === type
                    ? type === "income"
                      ? "#34d399"
                      : "#f87171"
                    : "#64748b",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={txForm.amount}
          onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
        />
        <Select
          label="Category"
          value={txForm.category}
          onChange={(e) =>
            setTxForm((f) => ({ ...f, category: e.target.value }))
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          label="Note (optional)"
          placeholder="e.g. Grocery run"
          value={txForm.note}
          onChange={(e) => setTxForm((f) => ({ ...f, note: e.target.value }))}
        />
        <Input
          label="Date"
          type="date"
          value={txForm.date}
          onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))}
        />
        <Btn onClick={saveTransaction} style={{ width: "100%", marginTop: 4 }}>
          {editItem ? "Update" : "Add Transaction"}
        </Btn>
      </Modal>

      {/* Goal Modal */}
      <Modal
        open={modal === "goal"}
        onClose={closeModal}
        title={editItem ? "Edit Goal" : "New Savings Goal"}
      >
        <Input
          label="Goal Name"
          placeholder="e.g. Emergency Fund"
          value={goalForm.name}
          onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="Target Amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={goalForm.target}
          onChange={(e) =>
            setGoalForm((f) => ({ ...f, target: e.target.value }))
          }
        />
        <Input
          label="Already Saved"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={goalForm.saved}
          onChange={(e) =>
            setGoalForm((f) => ({ ...f, saved: e.target.value }))
          }
        />
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Color
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              "#6366f1",
              "#10b981",
              "#f59e0b",
              "#ec4899",
              "#3b82f6",
              "#f97316",
              "#14b8a6",
              "#8b5cf6",
            ].map((c) => (
              <button
                key={c}
                onClick={() => setGoalForm((f) => ({ ...f, color: c }))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border:
                    goalForm.color === c
                      ? "3px solid white"
                      : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
        <Btn onClick={saveGoal} style={{ width: "100%", marginTop: 4 }}>
          {editItem ? "Update" : "Create Goal"}
        </Btn>
      </Modal>

      {/* Bill Modal */}
      <Modal
        open={modal === "bill"}
        onClose={closeModal}
        title={editItem ? "Edit Bill" : "New Recurring Bill"}
      >
        <Input
          label="Bill Name"
          placeholder="e.g. Netflix, Rent, Electric"
          value={billForm.name}
          onChange={(e) => setBillForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="Monthly Amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={billForm.amount}
          onChange={(e) =>
            setBillForm((f) => ({ ...f, amount: e.target.value }))
          }
        />
        <Input
          label="Due Day of Month"
          type="number"
          min="1"
          max="31"
          value={billForm.dueDay}
          onChange={(e) =>
            setBillForm((f) => ({ ...f, dueDay: e.target.value }))
          }
        />
        <Select
          label="Category"
          value={billForm.category}
          onChange={(e) =>
            setBillForm((f) => ({ ...f, category: e.target.value }))
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            marginBottom: 16,
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          <input
            type="checkbox"
            checked={billForm.autopay}
            onChange={(e) =>
              setBillForm((f) => ({ ...f, autopay: e.target.checked }))
            }
            style={{ width: 16, height: 16 }}
          />
          Autopay enabled
        </label>
        <Btn onClick={saveBill} style={{ width: "100%" }}>
          {editItem ? "Update" : "Add Bill"}
        </Btn>
      </Modal>

      {/* Budget Limits Modal */}
      <Modal
        open={modal === "limit"}
        onClose={closeModal}
        title="Monthly Budget Limits"
      >
        <p
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Set spending limits per category. Progress bars will show on the
          overview.
        </p>
        {CATEGORIES.map((c) => (
          <Input
            key={c}
            label={c}
            type="number"
            min="0"
            step="0.01"
            placeholder="No limit"
            value={limitForm[c] || ""}
            onChange={(e) =>
              setLimitForm((f) => ({ ...f, [c]: e.target.value }))
            }
          />
        ))}
        <Btn onClick={saveLimits} style={{ width: "100%" }}>
          Save Limits
        </Btn>
      </Modal>
    </div>
  );
}
