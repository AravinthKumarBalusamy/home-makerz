// ── Budget Page ──────────────────────────────────────────────────

const BudgetPage = {
    async render() {
        const [budget, settings, expenses] = await Promise.all([
            API.get('budget'),
            API.get('settings'),
            API.get('expenses')
        ]);

        const { month, year } = Utils.currentMonth();
        const budgets = Array.isArray(budget) ? budget : [];
        const currentBudget = budgets.find(b => b.month === month && b.year === year);

        // Get recurring expenses for this month
        const recurringForMonth = (settings.recurringExpenses || []).filter(r => {
            if (r.frequency === 'monthly') return true;
            if (r.frequency === 'yearly' && r.months && r.months.includes(month)) return true;
            return false;
        });
        const recurringTotal = recurringForMonth.reduce((s, r) => s + r.amount, 0);

        // Month expenses
        const monthExpenses = expenses.filter(e => Utils.isSameMonth(e.date))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const expectedIncome = (settings.salaries?.husband || 0) + (settings.salaries?.wife || 0);

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">💰 Budget — ${Utils.monthName(month)} ${year}</div>
        <button class="btn btn-primary" onclick="BudgetPage.showBudgetDialog()">
          ${currentBudget ? 'Edit Budget' : 'Set Budget'}
        </button>
      </div>

      <!-- Budget Overview -->
      <div class="summary-cards">
        <div class="summary-card accent-green">
          <div class="sc-label">Expected Income</div>
          <div class="sc-value">${Utils.currency(expectedIncome)}</div>
          <div class="sc-sub">Husband + Wife salary</div>
        </div>
        <div class="summary-card accent-orange">
          <div class="sc-label">Recurring Expenses</div>
          <div class="sc-value">${Utils.currency(recurringTotal)}</div>
          <div class="sc-sub">${recurringForMonth.length} expenses this month</div>
        </div>
        <div class="summary-card accent-blue">
          <div class="sc-label">Budget Set</div>
          <div class="sc-value">${currentBudget ? Utils.currency(currentBudget.amount) : 'Not Set'}</div>
          <div class="sc-sub">${currentBudget ? 'Monthly budget' : 'Click to set'}</div>
        </div>
        <div class="summary-card accent-purple">
          <div class="sc-label">Spent</div>
          <div class="sc-value">${Utils.currency(monthExpenses)}</div>
          <div class="sc-sub">${currentBudget ? Utils.currency(currentBudget.amount - monthExpenses) + ' remaining' : ''}</div>
        </div>
      </div>

      ${currentBudget ? `
        <div class="card">
          <div class="card-title mb-8">Budget Progress</div>
          <div class="budget-progress">
            <div class="progress-label">
              <span>${Utils.currency(monthExpenses)} spent</span>
              <span>${Utils.currency(currentBudget.amount)} budget</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${Utils.pct(monthExpenses, currentBudget.amount) > 90 ? 'danger' : Utils.pct(monthExpenses, currentBudget.amount) > 70 ? 'warning' : ''}"
                   style="width: ${Math.min(Utils.pct(monthExpenses, currentBudget.amount), 100)}%"></div>
            </div>
            <div class="text-small text-muted mt-8">${Utils.pct(monthExpenses, currentBudget.amount)}% used</div>
          </div>
        </div>
      ` : ''}

      <!-- Recurring Expenses Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recurring Expenses This Month</div>
        </div>
        ${recurringForMonth.length === 0 ? '<p class="text-muted">No recurring expenses this month.</p>' : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Category</th>
                <th>Frequency</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${recurringForMonth.map(r => `
                <tr>
                  <td><strong>${r.name}</strong></td>
                  <td><span class="badge badge-category">${r.category}</span></td>
                  <td class="text-muted">${r.frequency}</td>
                  <td class="text-right amount">${Utils.currency(r.amount)}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="3"><strong>Total</strong></td>
                <td class="text-right amount"><strong>${Utils.currency(recurringTotal)}</strong></td>
              </tr>
            </tbody>
          </table>
        `}
      </div>
    `;
    },

    async showBudgetDialog() {
        const [budget, settings] = await Promise.all([
            API.get('budget'),
            API.get('settings')
        ]);
        const { month, year } = Utils.currentMonth();
        const budgets = Array.isArray(budget) ? budget : [];
        const currentBudget = budgets.find(b => b.month === month && b.year === year);
        const expectedIncome = (settings.salaries?.husband || 0) + (settings.salaries?.wife || 0);

        const recurringForMonth = (settings.recurringExpenses || []).filter(r => {
            if (r.frequency === 'monthly') return true;
            if (r.frequency === 'yearly' && r.months && r.months.includes(month)) return true;
            return false;
        });
        const recurringTotal = recurringForMonth.reduce((s, r) => s + r.amount, 0);

        const html = `
      <form id="budget-form">
        <div class="card" style="background: var(--primary-bg); border: none; margin-bottom: 16px;">
          <p><strong>Expected Income:</strong> ${Utils.currency(expectedIncome)}</p>
          <p><strong>Recurring Expenses:</strong> ${Utils.currency(recurringTotal)}</p>
          <p><strong>Available:</strong> ${Utils.currency(expectedIncome - recurringTotal)}</p>
        </div>
        <div class="form-group">
          <label>Monthly Budget Amount <span class="required">*</span></label>
          <input type="number" id="budget-amount" value="${currentBudget?.amount || expectedIncome}" min="0" step="1000" required>
          <div class="text-small text-muted mt-8">Set how much you plan to spend this month (including recurring expenses).</div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="budget-notes" placeholder="Any notes for this month's budget...">${currentBudget?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${currentBudget ? 'Update' : 'Set'} Budget</button>
        </div>
      </form>
    `;
        Utils.openModal(`Budget for ${Utils.monthName(month)} ${year}`, html);
        document.getElementById('budget-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                month, year,
                amount: Number(document.getElementById('budget-amount').value),
                notes: document.getElementById('budget-notes').value.trim()
            };
            if (currentBudget) {
                await API.update('budget', currentBudget.id, data);
                Utils.toast('Budget updated', 'success');
            } else {
                await API.create('budget', data);
                Utils.toast('Budget set!', 'success');
            }
            Utils.closeModal();
            BudgetPage.render();
        });
    },

    // Called from app.js to check if budget dialog should auto-show
    async checkBudgetReminder() {
        const today = new Date();
        const day = today.getDate();
        if (day > 3) return; // Only first 3 days

        const budget = await API.get('budget');
        const { month, year } = Utils.currentMonth();
        const budgets = Array.isArray(budget) ? budget : [];
        const currentBudget = budgets.find(b => b.month === month && b.year === year);

        if (!currentBudget) {
            BudgetPage.showBudgetDialog();
        }
    }
};
