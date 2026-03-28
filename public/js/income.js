// ── Income Page ──────────────────────────────────────────────────

const IncomePage = {
  filters: { type: '', person: '' },

  async render() {
    const income = await API.get('income');
    const { month, year } = Utils.currentMonth();

    let filtered = [...income].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (IncomePage.filters.type) filtered = filtered.filter(i => i.type === IncomePage.filters.type);
    if (IncomePage.filters.person) filtered = filtered.filter(i => i.person === IncomePage.filters.person);

    const monthIncome = income.filter(i => Utils.isSameMonth(i.date)).reduce((s, i) => s + (i.amount || 0), 0);
    const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="section-header">
        <div class="section-title">💵 Income Tracking</div>
        <button class="btn btn-primary" onclick="IncomePage.showAddModal()">+ Add Income</button>
      </div>

      <div class="summary-cards">
        <div class="summary-card accent-green">
          <div class="sc-label">This Month</div>
          <div class="sc-value">${Utils.currency(monthIncome)}</div>
          <div class="sc-sub">${Utils.monthName(month)} ${year}</div>
        </div>
        <div class="summary-card accent-blue">
          <div class="sc-label">Total (Filtered)</div>
          <div class="sc-value">${Utils.currency(total)}</div>
          <div class="sc-sub">${filtered.length} entries</div>
        </div>
      </div>

      <div class="filter-bar">
        <select onchange="IncomePage.filters.type = this.value; IncomePage.render()">
          <option value="">All Types</option>
          ${Utils.incomeTypes.map(t => `<option value="${t}" ${IncomePage.filters.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <select onchange="IncomePage.filters.person = this.value; IncomePage.render()">
          <option value="">All People</option>
          <option value="husband" ${IncomePage.filters.person === 'husband' ? 'selected' : ''}>Husband</option>
          <option value="wife" ${IncomePage.filters.person === 'wife' ? 'selected' : ''}>Wife</option>
        </select>
      </div>

      <div class="card">
        ${filtered.length === 0 ? `   
          <div class="empty-state">
            <div class="empty-icon">💵</div>
            <p>No income recorded yet.</p>
            <button class="btn btn-primary" onclick="IncomePage.showAddModal()">Record income</button>
          </div>
        ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Person</th>
                <th class="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(i => `
                <tr>
                  <td class="text-muted">${Utils.formatDateShort(i.date)}</td>
                  <td>
                    <strong>${i.description || i.type}</strong>
                    ${i.isRecurring ? ' <span class="badge badge-category">🔄 Recurring</span>' : ''}
                  </td>
                  <td><span class="badge badge-category">${i.type}</span></td>
                  <td>${Utils.assigneeBadge(i.person)}</td>
                  <td class="text-right amount">${Utils.currency(i.amount)}</td>
                  <td>
                    <button class="btn-icon" onclick="IncomePage.editIncome('${i.id}')" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="IncomePage.deleteIncome('${i.id}')" title="Delete">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  },

  showAddModal(incomeItem = null) {
    const isEdit = !!incomeItem;
    const html = `
      <form id="income-form">
        <div class="form-row">
          <div class="form-group">
            <label>Amount <span class="required">*</span></label>
            <input type="number" id="inc-amount" value="${incomeItem?.amount || ''}" min="0" required placeholder="₹ 0">
          </div>
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input type="date" id="inc-date" value="${incomeItem?.date || Utils.todayStr()}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="inc-desc" value="${incomeItem?.description || ''}" placeholder="e.g., March Salary">
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Type</label>
            <select id="inc-type">
              ${Utils.incomeTypes.map(t => `<option value="${t}" ${(incomeItem?.type || 'Salary') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Person</label>
            <select id="inc-person">
              <option value="husband" ${incomeItem?.person === 'husband' ? 'selected' : ''}>Husband</option>
              <option value="wife" ${incomeItem?.person === 'wife' ? 'selected' : ''}>Wife</option>
            </select>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:3px;">
            <label style="display:flex;gap:8px;align-items:center;cursor:pointer;">
              <input type="checkbox" id="inc-recurring" ${incomeItem?.isRecurring ? 'checked' : ''}>
              Recurring
            </label>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Income</button>
        </div>
      </form>
    `;
    Utils.openModal(isEdit ? 'Edit Income' : 'Add Income', html);
    document.getElementById('income-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        amount: Number(document.getElementById('inc-amount').value),
        date: document.getElementById('inc-date').value,
        description: document.getElementById('inc-desc').value.trim(),
        type: document.getElementById('inc-type').value,
        person: document.getElementById('inc-person').value,
        isRecurring: document.getElementById('inc-recurring').checked
      };
      if (isEdit) {
        await API.update('income', incomeItem.id, data);
        Utils.toast('Income updated');
      } else {
        await API.create('income', data);
        Utils.toast('Income added', 'success');
      }
      Utils.closeModal();
      const hash = location.hash || '#/dashboard';
      if (hash.includes('dashboard')) DashboardPage.render();
      else IncomePage.render();
    });
  },

  async editIncome(id) {
    const item = await API.get('income', id);
    IncomePage.showAddModal(item);
  },

  async deleteIncome(id) {
    if (await Utils.confirm('Delete this income entry?')) {
      await API.delete('income', id);
      Utils.toast('Income deleted');
      IncomePage.render();
    }
  }
};
