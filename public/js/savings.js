// ── Savings & Investments Page ────────────────────────────────────

const SavingsPage = {
    async render() {
        const [savings, income, expenses] = await Promise.all([
            API.get('savings'),
            API.get('income'),
            API.get('expenses')
        ]);

        const totalPortfolio = savings.reduce((s, item) => s + (item.amount || 0), 0);
        const { month, year } = Utils.currentMonth();
        const monthIncome = income.filter(i => Utils.isSameMonth(i.date)).reduce((s, i) => s + (i.amount || 0), 0);
        const monthExpenses = expenses.filter(e => Utils.isSameMonth(e.date)).reduce((s, e) => s + (e.amount || 0), 0);
        const monthSavings = monthIncome - monthExpenses;
        const savingsRate = monthIncome > 0 ? Utils.pct(monthSavings, monthIncome) : 0;

        const typeGroups = {};
        savings.forEach(s => {
            if (!typeGroups[s.type]) typeGroups[s.type] = [];
            typeGroups[s.type].push(s);
        });

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">🏦 Savings & Investments</div>
        <button class="btn btn-primary" onclick="SavingsPage.showAddModal()">+ Add Investment</button>
      </div>

      <div class="summary-cards">
        <div class="summary-card accent-green">
          <div class="sc-label">Total Portfolio</div>
          <div class="sc-value">${Utils.currency(totalPortfolio)}</div>
          <div class="sc-sub">${savings.length} investments</div>
        </div>
        <div class="summary-card accent-blue">
          <div class="sc-label">Savings Rate</div>
          <div class="sc-value">${savingsRate}%</div>
          <div class="sc-sub">${Utils.monthName(month)} ${year}</div>
        </div>
        <div class="summary-card accent-purple">
          <div class="sc-label">Month Savings</div>
          <div class="sc-value">${Utils.currency(monthSavings)}</div>
          <div class="sc-sub">Income - Expenses</div>
        </div>
      </div>

      ${savings.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">🏦</div>
            <p>No investments tracked yet.</p>
            <button class="btn btn-primary" onclick="SavingsPage.showAddModal()">Add your first investment</button>
          </div>
        </div>
      ` : `
        ${Object.entries(typeGroups).map(([type, items]) => `
          <div class="card">
            <div class="card-header">
              <div class="card-title">${type}</div>
              <div class="card-subtitle">${Utils.currency(items.reduce((s, i) => s + (i.amount || 0), 0))}</div>
            </div>
            <div class="savings-grid">
              ${items.map(item => `
                <div class="savings-card">
                  <div class="sc-type">${item.type}</div>
                  <div class="sc-name">${item.name}</div>
                  <div class="sc-amount">${Utils.currency(item.amount)}</div>
                  ${item.institution ? `<div class="text-small text-muted">${item.institution}</div>` : ''}
                  ${item.interestRate ? `<div class="text-small text-muted">${item.interestRate}% p.a.</div>` : ''}
                  ${item.maturityDate ? `<div class="text-small text-muted">Matures: ${Utils.formatDateShort(item.maturityDate)}</div>` : ''}
                  <div style="margin-top:10px;display:flex;gap:4px;">
                    <button class="btn-icon" onclick="SavingsPage.editItem('${item.id}')" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="SavingsPage.deleteItem('${item.id}')" title="Delete">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      `}
    `;
    },

    showAddModal(item = null) {
        const isEdit = !!item;
        const types = ['Savings Account', 'Fixed Deposit', 'Mutual Fund', 'Stocks', 'PPF', 'NPS', 'Gold', 'RD', 'Other'];

        const html = `
      <form id="savings-form">
        <div class="form-row">
          <div class="form-group">
            <label>Name <span class="required">*</span></label>
            <input type="text" id="sav-name" value="${item?.name || ''}" required placeholder="e.g., SBI FD, HDFC MF">
          </div>
          <div class="form-group">
            <label>Type</label>
            <select id="sav-type">
              ${types.map(t => `<option value="${t}" ${(item?.type || 'Savings Account') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount <span class="required">*</span></label>
            <input type="number" id="sav-amount" value="${item?.amount || ''}" min="0" required placeholder="₹ 0">
          </div>
          <div class="form-group">
            <label>Interest Rate (%)</label>
            <input type="number" id="sav-rate" value="${item?.interestRate || ''}" min="0" step="0.1" placeholder="e.g., 7.5">
          </div>
        </div>
        <div class="form-group">
          <label>Institution</label>
          <input type="text" id="sav-institution" value="${item?.institution || ''}" placeholder="e.g., SBI, HDFC">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start Date</label>
            <input type="date" id="sav-start" value="${item?.startDate || ''}">
          </div>
          <div class="form-group">
            <label>Maturity Date</label>
            <input type="date" id="sav-maturity" value="${item?.maturityDate || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="sav-notes" placeholder="Optional notes...">${item?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Investment</button>
        </div>
      </form>
    `;
        Utils.openModal(isEdit ? 'Edit Investment' : 'Add Investment', html);
        document.getElementById('savings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('sav-name').value.trim(),
                type: document.getElementById('sav-type').value,
                amount: Number(document.getElementById('sav-amount').value),
                interestRate: document.getElementById('sav-rate').value ? Number(document.getElementById('sav-rate').value) : null,
                institution: document.getElementById('sav-institution').value.trim(),
                startDate: document.getElementById('sav-start').value,
                maturityDate: document.getElementById('sav-maturity').value,
                notes: document.getElementById('sav-notes').value.trim()
            };
            if (isEdit) {
                await API.update('savings', item.id, data);
                Utils.toast('Investment updated');
            } else {
                await API.create('savings', data);
                Utils.toast('Investment added', 'success');
            }
            Utils.closeModal();
            SavingsPage.render();
        });
    },

    async editItem(id) {
        const item = await API.get('savings', id);
        SavingsPage.showAddModal(item);
    },

    async deleteItem(id) {
        if (await Utils.confirm('Delete this investment?')) {
            await API.delete('savings', id);
            Utils.toast('Investment deleted');
            SavingsPage.render();
        }
    }
};
