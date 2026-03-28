// ── Reports Page ─────────────────────────────────────────────────

const ReportsPage = {
    async render() {
        const [expenses, income, goals] = await Promise.all([
            API.get('expenses'), API.get('income'), API.get('goals')
        ]);
        const { month, year } = Utils.currentMonth();
        const monthExp = expenses.filter(e => Utils.isSameMonth(e.date));
        const catTotals = {};
        monthExp.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0); });
        const totalExp = monthExp.reduce((s, e) => s + (e.amount || 0), 0);
        const personTotals = { husband: 0, wife: 0, joint: 0 };
        monthExp.forEach(e => { personTotals[e.paidBy] = (personTotals[e.paidBy] || 0) + (e.amount || 0); });

        // 6-month trend
        const trend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            const m = d.getMonth() + 1, y = d.getFullYear();
            const ms = `${y}-${String(m).padStart(2, '0')}`;
            trend.push({
                label: Utils.monthNameShort(m),
                exp: expenses.filter(e => e.date?.startsWith(ms)).reduce((s, e) => s + (e.amount || 0), 0),
                inc: income.filter(inc => inc.date?.startsWith(ms)).reduce((s, inc) => s + (inc.amount || 0), 0)
            });
        }
        const maxT = Math.max(...trend.map(t => Math.max(t.exp, t.inc)), 1);
        const colors = ['#4a6fa5', '#48bb78', '#ed8936', '#e53e3e', '#8b5cf6', '#4299e1', '#d53f8c', '#38b2ac', '#dd6b20', '#667eea', '#a0aec0'];
        const habits = goals.filter(g => g.type === 'habit');

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header"><div class="section-title">📊 Reports — ${Utils.monthName(month)} ${year}</div></div>

      <div class="card">
        <div class="card-title mb-16">Expense Breakdown by Category</div>
        ${Object.keys(catTotals).length === 0 ? '<p class="text-muted">No expenses this month.</p>' : `
          <div class="donut-container">
            <div class="donut" style="background:conic-gradient(${Object.entries(catTotals).map(([, a], i) => {
            const s = Object.values(catTotals).slice(0, i).reduce((x, v) => x + Utils.pct(v, totalExp), 0);
            return `${colors[i % colors.length]} ${s}% ${s + Utils.pct(a, totalExp)}%`;
        }).join(',')})"><div class="donut-center">${Utils.currency(totalExp)}</div></div>
            <div class="donut-legend">${Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([c, a], i) => `
              <div class="legend-item"><div class="legend-swatch" style="background:${colors[i % colors.length]}"></div><span>${c}: ${Utils.currency(a)} (${Utils.pct(a, totalExp)}%)</span></div>
            `).join('')}</div>
          </div>`}
      </div>

      <div class="card">
        <div class="card-title mb-16">Expense by Person</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          ${Object.entries(personTotals).filter(([, v]) => v > 0).map(([p, a]) => `
            <div style="text-align:center"><div style="font-size:2rem">${p === 'husband' ? '👨' : p === 'wife' ? '👩' : '👫'}</div>
            <div style="font-weight:600">${p.charAt(0).toUpperCase() + p.slice(1)}</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--primary)">${Utils.currency(a)}</div>
            <div class="text-small text-muted">${Utils.pct(a, totalExp)}%</div></div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title mb-16">6-Month Trend</div>
        <div style="display:flex;gap:4px;margin-bottom:8px;font-size:0.78rem">
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:var(--danger);border-radius:2px;display:inline-block"></span> Expenses</span>
          <span style="display:inline-flex;align-items:center;gap:4px;margin-left:12px"><span style="width:12px;height:12px;background:var(--success);border-radius:2px;display:inline-block"></span> Income</span>
        </div>
        <div class="bar-chart">${trend.map(t => `
          <div class="bar-item">
            <div class="bar" style="background:var(--success);height:${(t.inc / maxT) * 170}px;max-width:24px"></div>
            <div class="bar" style="background:var(--danger);height:${(t.exp / maxT) * 170}px;max-width:24px"></div>
            <div class="bar-label">${t.label}</div>
          </div>`).join('')}
        </div>
      </div>

      ${habits.length > 0 ? `<div class="card"><div class="card-title mb-16">Habit Completion (30 Days)</div>
        ${habits.map(h => {
            const last30 = []; for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); last30.push(d.toISOString().split('T')[0]); }
            const ct = last30.filter(d => (h.completions || []).includes(d)).length;
            const r = Utils.pct(ct, 30);
            return `<div class="habit-row"><div class="habit-name">${h.title}</div><div style="flex:1;max-width:200px"><div class="progress-bar"><div class="progress-fill ${r >= 80 ? 'success' : r < 50 ? 'danger' : ''}" style="width:${r}%"></div></div></div><span class="text-small">${ct}/30 (${r}%)</span></div>`;
        }).join('')}</div>` : ''}

      <div class="card"><div class="card-title mb-16">Savings Rate</div>
        <table class="data-table"><thead><tr><th>Month</th><th class="text-right">Income</th><th class="text-right">Expenses</th><th class="text-right">Savings</th><th class="text-right">Rate</th></tr></thead>
        <tbody>${trend.map(t => { const sv = t.inc - t.exp; return `<tr><td>${t.label}</td><td class="text-right">${Utils.currency(t.inc)}</td><td class="text-right">${Utils.currency(t.exp)}</td><td class="text-right ${sv >= 0 ? 'text-success' : 'text-danger'}">${Utils.currency(sv)}</td><td class="text-right"><strong>${t.inc > 0 ? Utils.pct(sv, t.inc) : 0}%</strong></td></tr>`; }).join('')}
        </tbody></table></div>`;
    }
};
