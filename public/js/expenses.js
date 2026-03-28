// ── Expenses Page ────────────────────────────────────────────────

const ExpensesPage = {
    filters: { category: '', person: '', search: '', dateFrom: '', dateTo: '' },

    async render() {
        const expenses = await API.get('expenses');
        const { month, year } = Utils.currentMonth();

        // Apply filters
        let filtered = [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        if (ExpensesPage.filters.category) filtered = filtered.filter(e => e.category === ExpensesPage.filters.category);
        if (ExpensesPage.filters.person) filtered = filtered.filter(e => e.paidBy === ExpensesPage.filters.person);
        if (ExpensesPage.filters.search) {
            const q = ExpensesPage.filters.search.toLowerCase();
            filtered = filtered.filter(e => (e.description || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q));
        }
        if (ExpensesPage.filters.dateFrom) filtered = filtered.filter(e => e.date >= ExpensesPage.filters.dateFrom);
        if (ExpensesPage.filters.dateTo) filtered = filtered.filter(e => e.date <= ExpensesPage.filters.dateTo);

        const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">💳 Expense Tracking</div>
        <button class="btn btn-primary" onclick="ExpensesPage.showAddModal()">+ Add Expense</button>
      </div>

      <div class="filter-bar">
        <input type="text" class="search-input" placeholder="Search expenses..." value="${ExpensesPage.filters.search}"
               oninput="ExpensesPage.filters.search = this.value; ExpensesPage.render()">
        <select onchange="ExpensesPage.filters.category = this.value; ExpensesPage.render()">
          <option value="">All Categories</option>
          ${Object.keys(Utils.categories).map(c => `<option value="${c}" ${ExpensesPage.filters.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <select onchange="ExpensesPage.filters.person = this.value; ExpensesPage.render()">
          <option value="">All People</option>
          <option value="husband" ${ExpensesPage.filters.person === 'husband' ? 'selected' : ''}>Husband</option>
          <option value="wife" ${ExpensesPage.filters.person === 'wife' ? 'selected' : ''}>Wife</option>
          <option value="joint" ${ExpensesPage.filters.person === 'joint' ? 'selected' : ''}>Joint</option>
        </select>
        <input type="date" value="${ExpensesPage.filters.dateFrom}" onchange="ExpensesPage.filters.dateFrom = this.value; ExpensesPage.render()" title="From date">
        <input type="date" value="${ExpensesPage.filters.dateTo}" onchange="ExpensesPage.filters.dateTo = this.value; ExpensesPage.render()" title="To date">
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-subtitle">${filtered.length} expense${filtered.length !== 1 ? 's' : ''} · Total: <strong>${Utils.currency(total)}</strong></div>
        </div>
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">💳</div>
            <p>No expenses found.</p>
            <button class="btn btn-primary" onclick="ExpensesPage.showAddModal()">Add your first expense</button>
          </div>
        ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Paid By</th>
                <th>Method</th>
                <th class="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(e => `
                <tr>
                  <td class="text-muted">${Utils.formatDateShort(e.date)}</td>
                  <td>
                    <strong>${e.description || '-'}</strong>
                    ${e.notes ? `<br><span class="text-small text-muted">${e.notes}</span>` : ''}
                  </td>
                  <td><span class="badge badge-category">${e.category}${e.subcategory ? ' › ' + e.subcategory : ''}</span></td>
                  <td>${Utils.assigneeBadge(e.paidBy)}</td>
                  <td class="text-muted text-small">${e.paymentMethod || '-'}</td>
                  <td class="text-right amount">${Utils.currency(e.amount)}</td>
                  <td>
                    <button class="btn-icon" onclick="ExpensesPage.editExpense('${e.id}')" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="ExpensesPage.deleteExpense('${e.id}')" title="Delete">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
    },

    showAddModal(expense = null) {
        const isEdit = !!expense;
        const html = `
      <form id="expense-form">
        <div class="form-row">
          <div class="form-group">
            <label>Amount <span class="required">*</span></label>
            <input type="number" id="exp-amount" value="${expense?.amount || ''}" min="0" step="1" required placeholder="₹ 0">
          </div>
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input type="date" id="exp-date" value="${expense?.date || Utils.todayStr()}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Description <span class="required">*</span></label>
          <input type="text" id="exp-desc" value="${expense?.description || ''}" required placeholder="What was this expense for?">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select id="exp-category" onchange="ExpensesPage.updateSubcategories()">
              ${Object.keys(Utils.categories).map(c => `<option value="${c}" ${(expense?.category || 'Food') === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Subcategory</label>
            <select id="exp-subcategory">
              ${(Utils.categories[expense?.category || 'Food'] || []).map(s => `<option value="${s}" ${expense?.subcategory === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Paid By</label>
            <select id="exp-paidby">
              <option value="husband" ${expense?.paidBy === 'husband' ? 'selected' : ''}>Husband</option>
              <option value="wife" ${expense?.paidBy === 'wife' ? 'selected' : ''}>Wife</option>
              <option value="joint" ${expense?.paidBy === 'joint' ? 'selected' : ''}>Joint</option>
            </select>
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select id="exp-method">
              ${Utils.paymentMethods.map(m => `<option value="${m}" ${expense?.paymentMethod === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:3px;">
            <label style="display:flex;gap:8px;align-items:center;cursor:pointer;">
              <input type="checkbox" id="exp-recurring" ${expense?.isRecurring ? 'checked' : ''}>
              Recurring
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="exp-notes" placeholder="Optional notes...">${expense?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Expense</button>
        </div>
      </form>
    `;
        Utils.openModal(isEdit ? 'Edit Expense' : 'Add Expense', html);
        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                amount: Number(document.getElementById('exp-amount').value),
                date: document.getElementById('exp-date').value,
                description: document.getElementById('exp-desc').value.trim(),
                category: document.getElementById('exp-category').value,
                subcategory: document.getElementById('exp-subcategory').value,
                paidBy: document.getElementById('exp-paidby').value,
                paymentMethod: document.getElementById('exp-method').value,
                isRecurring: document.getElementById('exp-recurring').checked,
                notes: document.getElementById('exp-notes').value.trim()
            };
            if (isEdit) {
                await API.update('expenses', expense.id, data);
                Utils.toast('Expense updated');
            } else {
                await API.create('expenses', data);
                Utils.toast('Expense added', 'success');
            }
            Utils.closeModal();
            const hash = location.hash || '#/dashboard';
            if (hash.includes('dashboard')) DashboardPage.render();
            else ExpensesPage.render();
        });
    },

    updateSubcategories() {
        const cat = document.getElementById('exp-category').value;
        const sub = document.getElementById('exp-subcategory');
        sub.innerHTML = (Utils.categories[cat] || []).map(s => `<option value="${s}">${s}</option>`).join('');
    },

    async editExpense(id) {
        const expense = await API.get('expenses', id);
        ExpensesPage.showAddModal(expense);
    },

    async deleteExpense(id) {
        if (await Utils.confirm('Delete this expense?')) {
            await API.delete('expenses', id);
            Utils.toast('Expense deleted');
            ExpensesPage.render();
        }
    }
};
