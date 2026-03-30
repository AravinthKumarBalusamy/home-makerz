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

        // Get recurring expenses for this month (exclude Savings/Investments)
        const recurringForMonth = (settings.recurringExpenses || []).filter(r => {
            if (r.category === 'Savings') return false; // Exclude investments
            if (r.frequency === 'monthly') return true;
            if (r.frequency === 'yearly' && r.months && r.months.includes(month)) return true;
            return false;
        });
        const recurringTotal = recurringForMonth.reduce((s, r) => s + r.amount, 0);

        // Get recurring investments for this month
        const investmentsForMonth = (settings.recurringExpenses || []).filter(r => {
            if (r.category !== 'Savings') return false; // Only Savings category
            if (r.frequency === 'monthly') return true;
            if (r.frequency === 'yearly' && r.months && r.months.includes(month)) return true;
            return false;
        });
        const investmentsTotal = investmentsForMonth.reduce((s, r) => s + r.amount, 0);


        // Month discretionary expenses (exclude recurring entries, Savings, and Debt categories)
        const expensesThisMonth = expenses.filter(e => Utils.isSameMonth(e.date));
        const normCat = (c) => (c || '').toString().trim().toLowerCase();
        const isRecurringEntry = (e) => e.isRecurring || ((e.description || '').toLowerCase() + ' ' + (e.notes || '').toLowerCase()).includes('recurring');
        const isInvestment = (e) => normCat(e.category) === 'savings';
        const isDebt = (e) => normCat(e.category) === 'debt';

        const discretionaryExpenses = expensesThisMonth
            .filter(e => !isRecurringEntry(e))
            .filter(e => !isInvestment(e))
            .filter(e => !isDebt(e))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

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
        <div class="summary-card accent-orange">
          <div class="sc-label">Recurring Expenses</div>
          <div class="sc-value">${Utils.currency(recurringTotal)}</div>
          <div class="sc-sub">${recurringForMonth.length} expenses this month</div>
        </div>
        <div class="summary-card accent-purple">
          <div class="sc-label">Recurring Investments</div>
          <div class="sc-value">${Utils.currency(investmentsTotal)}</div>
          <div class="sc-sub">${investmentsForMonth.length} investments this month</div>
        </div>
        <div class="summary-card accent-blue">
          <div class="sc-label">Budget Set</div>
          <div class="sc-value">${currentBudget ? Utils.currency(currentBudget.amount) : 'Not Set'}</div>
          <div class="sc-sub">${currentBudget ? 'Non-recurring spend only' : 'Click to set'}</div>
        </div>
        <div class="summary-card accent-teal">
          <div class="sc-label">Spent</div>
          <div class="sc-value">${Utils.currency(discretionaryExpenses)}</div>
          <div class="sc-sub">${currentBudget ? Utils.currency(currentBudget.amount - discretionaryExpenses) + ' remaining' : 'Non-recurring only'}</div>
        </div>
      </div>

      ${currentBudget ? `
        <div class="card">
            <div class="card-title mb-8">Budget Progress</div>
          <div class="budget-progress">
            <div class="progress-label">
              <span>${Utils.currency(discretionaryExpenses)} spent</span>
              <span>${Utils.currency(currentBudget.amount)} budget</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${Utils.pct(discretionaryExpenses, currentBudget.amount) > 90 ? 'danger' : Utils.pct(discretionaryExpenses, currentBudget.amount) > 70 ? 'warning' : ''}"
                   style="width: ${Math.min(Utils.pct(discretionaryExpenses, currentBudget.amount), 100)}%"></div>
            </div>
            <div class="text-small text-muted mt-8">${Utils.pct(discretionaryExpenses, currentBudget.amount)}% used</div>
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

      <!-- Recurring Investments Table -->
      ${investmentsForMonth.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <div class="card-title">💰 Recurring Investments This Month</div>
          <div class="card-subtitle">Not counted as expenses</div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Investment</th>
              <th>Type</th>
              <th>Frequency</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${investmentsForMonth.map(r => `
              <tr>
                <td><strong>${r.name}</strong></td>
                <td><span class="badge badge-category">${r.subcategory || 'Investment'}</span></td>
                <td class="text-muted">${r.frequency}</td>
                <td class="text-right amount">${Utils.currency(r.amount)}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="3"><strong>Total Investments</strong></td>
              <td class="text-right amount"><strong>${Utils.currency(investmentsTotal)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}
    `;
    },

    async showBudgetDialog() {
        const budget = await API.get('budget');
        const { month, year } = Utils.currentMonth();
        const budgets = Array.isArray(budget) ? budget : [];
        const currentBudget = budgets.find(b => b.month === month && b.year === year);
        const defaultAmount = currentBudget?.amount ?? 0;

        const html = `
      <form id="budget-form">
        <div class="form-group">
          <label>Monthly Discretionary Budget (excl. recurring) <span class="required">*</span></label>
          <input type="number" id="budget-amount" value="${defaultAmount}" min="0" step="500" required>
          <div class="text-small text-muted mt-8">
            This is only for non-recurring spending. Recurring expenses and investments are tracked separately below.
          </div>
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
            const amount = Number(document.getElementById('budget-amount').value);
            const data = {
                month, year,
                amount,
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
