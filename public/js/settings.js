// ── Settings Page ────────────────────────────────────────────────

const SettingsPage = {
  async render() {
    const settings = await API.get('settings');

    // Build recurring income rows
    const riRows = (settings.recurringIncome || []).map(r => `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td>${Utils.assigneeBadge(r.person)}</td>
            <td><span class="badge badge-category">${r.type}</span></td>
            <td>${r.frequency}</td>
            <td class="text-small text-muted">${r.months ? r.months.map(m => Utils.monthNameShort(m)).join(', ') : 'All'}</td>
            <td class="text-right amount">${Utils.currency(r.amount)}</td>
            <td>
              <button class="btn-icon" onclick="SettingsPage.editRecurringIncome('${r.id}')" title="Edit">✏️</button>
              <button class="btn-icon" onclick="SettingsPage.deleteRecurringIncome('${r.id}')" title="Delete">🗑️</button>
            </td>
          </tr>
        `).join('');

    const riHtml = (settings.recurringIncome || []).length === 0
      ? '<p class="text-muted">No recurring income configured.</p>'
      : `<table class="data-table">
                <thead><tr><th>Name</th><th>Person</th><th>Type</th><th>Frequency</th><th>Months</th><th class="text-right">Amount</th><th></th></tr></thead>
                <tbody>${riRows}</tbody>
              </table>`;

    // Build recurring expense rows (exclude Savings category)
    const reRows = (settings.recurringExpenses || []).filter(r => r.category !== 'Savings').map(r => `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td><span class="badge badge-category">${r.category}</span></td>
            <td>${r.frequency}</td>
            <td class="text-small text-muted">${r.frequency === 'yearly' && r.months ? r.months.map(m => Utils.monthNameShort(m)).join(', ') : 'All'}</td>
            <td class="text-right amount">${Utils.currency(r.amount)}</td>
            <td>
              <button class="btn-icon" onclick="SettingsPage.editRecurring('${r.id}')" title="Edit">✏️</button>
              <button class="btn-icon" onclick="SettingsPage.deleteRecurring('${r.id}')" title="Delete">🗑️</button>
            </td>
          </tr>
        `).join('');
    
    // Calculate totals for recurring expenses
    const recurringExpensesList = (settings.recurringExpenses || []).filter(r => r.category !== 'Savings');
    const monthlyExpensesTotal = recurringExpensesList.filter(r => r.frequency === 'monthly').reduce((s, r) => s + r.amount, 0);
    const yearlyExpensesTotal = recurringExpensesList.filter(r => r.frequency === 'yearly').reduce((s, r) => s + r.amount, 0);

    // Build recurring investment rows (Savings category items)
    const invRows = (settings.recurringExpenses || []).filter(r => r.category === 'Savings').map(r => `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td><span class="badge badge-category">${r.subcategory || 'Investment'}</span></td>
            <td>${r.frequency}</td>
            <td class="text-small text-muted">${r.frequency === 'yearly' && r.months ? r.months.map(m => Utils.monthNameShort(m)).join(', ') : 'All'}</td>
            <td class="text-right amount">${Utils.currency(r.amount)}</td>
            <td>
              <button class="btn-icon" onclick="SettingsPage.editRecurring('${r.id}')" title="Edit">✏️</button>
              <button class="btn-icon" onclick="SettingsPage.deleteRecurring('${r.id}')" title="Delete">🗑️</button>
            </td>
          </tr>
        `).join('');
    
    // Calculate totals for investments
    const investmentsList = (settings.recurringExpenses || []).filter(r => r.category === 'Savings');
    const monthlyInvestmentsTotal = investmentsList.filter(r => r.frequency === 'monthly').reduce((s, r) => s + r.amount, 0);
    const yearlyInvestmentsTotal = investmentsList.filter(r => r.frequency === 'yearly').reduce((s, r) => s + r.amount, 0);

    // Build widget lists
    const leftWidgetsList = (settings.widgets?.left || []).filter(w => w.type !== 'reminder');
    const reminderWidgets = [
      ...(settings.widgets?.left || []).filter(w => w.type === 'reminder'),
      ...(settings.widgets?.right || []).filter(w => w.type === 'reminder')
    ];
    const rightWidgetsList = [
      ...reminderWidgets,
      ...(settings.widgets?.right || []).filter(w => w.type !== 'reminder')
    ];

    const leftWidgets = leftWidgetsList.map(w => `
          <div class="habit-row"><span>${w.type === 'quote' ? '💬' : w.type === 'reminder' ? '🔔' : w.type === 'photo' ? '📷' : '📄'} ${w.title}</span>
          <div>
            <button class="btn-icon" onclick="SettingsPage.editWidget('left','${w.id}')" title="Edit">✏️</button>
            <button class="btn-icon" onclick="SettingsPage.deleteWidget('left','${w.id}')" title="Delete">🗑️</button>
          </div></div>
        `).join('');

    const rightWidgets = rightWidgetsList.map(w => `
          <div class="habit-row"><span>${w.type === 'quote' ? '💬' : w.type === 'reminder' ? '🔔' : w.type === 'photo' ? '📷' : '📄'} ${w.title}</span>
          <div>
            <button class="btn-icon" onclick="SettingsPage.editWidget('${reminderWidgets.some(r => r.id === w.id) ? (settings.widgets?.right?.some(x => x.id === w.id) ? 'right' : 'left') : 'right'}','${w.id}')" title="Edit">✏️</button>
            <button class="btn-icon" onclick="SettingsPage.deleteWidget('${reminderWidgets.some(r => r.id === w.id) ? (settings.widgets?.right?.some(x => x.id === w.id) ? 'right' : 'left') : 'right'}','${w.id}')" title="Delete">🗑️</button>
          </div></div>
        `).join('');

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="section-header"><div class="section-title">⚙️ Settings</div></div>

      <!-- Salaries -->
      <div class="card">
        <div class="card-header"><div class="card-title">Monthly Salaries</div></div>
        <form id="salary-form">
          <div class="form-row">
            <div class="form-group">
              <label>Husband's Salary</label>
              <input type="number" id="set-sal-h" value="${settings.salaries?.husband || 0}" min="0">
            </div>
            <div class="form-group">
              <label>Wife's Salary</label>
              <input type="number" id="set-sal-w" value="${settings.salaries?.wife || 0}" min="0">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Salaries</button>
          </div>
        </form>
      </div>

      <!-- Recurring Income -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recurring Income</div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.showRecurringIncomeModal()">+ Add</button>
        </div>
        ${riHtml}
      </div>

      <!-- Recurring Expenses -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recurring Expenses</div>
            <div class="card-subtitle">
              Monthly: <strong>${Utils.currency(monthlyExpensesTotal)}</strong> · 
              Yearly: <strong>${Utils.currency(yearlyExpensesTotal)}</strong> · 
              Total/Month: <strong>${Utils.currency(monthlyExpensesTotal + (yearlyExpensesTotal / 12))}</strong>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.showRecurringModal()">+ Add Expense</button>
        </div>
        ${reRows.length === 0 ? '<p class="text-muted">No recurring expenses configured.</p>' : `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Frequency</th><th>Months</th><th class="text-right">Amount</th><th></th></tr></thead>
          <tbody>${reRows}</tbody>
        </table>`}
      </div>

      <!-- Recurring Investments -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">💰 Recurring Investments</div>
            <div class="card-subtitle">
              Monthly: <strong>${Utils.currency(monthlyInvestmentsTotal)}</strong> · 
              Yearly: <strong>${Utils.currency(yearlyInvestmentsTotal)}</strong> · 
              Total/Month: <strong>${Utils.currency(monthlyInvestmentsTotal + (yearlyInvestmentsTotal / 12))}</strong>
              <span class="text-muted"> · Not counted as expenses</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.showRecurringModal(null, true)">+ Add Investment</button>
        </div>
        ${invRows.length === 0 ? '<p class="text-muted">No recurring investments configured.</p>' : `
        <table class="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Frequency</th><th>Months</th><th class="text-right">Amount</th><th></th></tr></thead>
          <tbody>${invRows}</tbody>
        </table>`}
      </div>

      <!-- Widgets -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Sidebar Widgets</div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.showWidgetModal()">+ Add Widget</button>
        </div>
        <p class="text-small text-muted" style="margin: 0 0 12px;">
          Reminder widgets always appear on the right sidebar.
        </p>
        <div class="form-row">
          <div>
            <h4 class="mb-8">Left Sidebar</h4>
            ${leftWidgets}
          </div>
          <div>
            <h4 class="mb-8">Right Sidebar</h4>
            ${rightWidgets}
          </div>
        </div>
      </div>

      <!-- Backup/Restore -->
      <div class="card">
        <div class="card-header"><div class="card-title">Backup & Restore</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="SettingsPage.createBackup()">📦 Create Backup</button>
          <button class="btn btn-outline" onclick="SettingsPage.showRestoreModal()">📂 Restore Backup</button>
        </div>
      </div>`;

    document.getElementById('salary-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await API.updateCollection('settings', {
        salaries: {
          husband: Number(document.getElementById('set-sal-h').value),
          wife: Number(document.getElementById('set-sal-w').value)
        }
      });
      Utils.toast('Salaries saved', 'success');
    });
  },

  // ── Recurring Income CRUD ──────────────────────────────────────
  showRecurringIncomeModal(item = null) {
    const isEdit = !!item;
    const html = `
      <form id="rec-income-form">
        <div class="form-row">
          <div class="form-group"><label>Name <span class="required">*</span></label><input type="text" id="ri-name" value="${item?.name || ''}" required placeholder="e.g., Variable Pay"></div>
          <div class="form-group"><label>Amount <span class="required">*</span></label><input type="number" id="ri-amount" value="${item?.amount || ''}" min="0" required placeholder="₹ 0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Person</label>
            <select id="ri-person">
              <option value="husband" ${item?.person === 'husband' ? 'selected' : ''}>Husband</option>
              <option value="wife" ${(item?.person || 'wife') === 'wife' ? 'selected' : ''}>Wife</option>
            </select>
          </div>
          <div class="form-group"><label>Type</label>
            <select id="ri-type">
              ${Utils.incomeTypes.map(t => `<option value="${t}" ${(item?.type || 'Bonus') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Frequency</label>
            <select id="ri-freq">
              <option value="monthly" ${item?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
              <option value="quarterly" ${(item?.frequency || 'quarterly') === 'quarterly' ? 'selected' : ''}>Quarterly</option>
              <option value="yearly" ${item?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
            </select>
          </div>
          <div class="form-group"><label>Months (comma-separated, e.g. 3,6,9,12)</label>
            <input type="text" id="ri-months" value="${item?.months ? item.months.join(',') : ''}" placeholder="e.g., 3,6,9,12">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
        </div>
      </form>`;
    Utils.openModal(isEdit ? 'Edit Recurring Income' : 'Add Recurring Income', html);
    document.getElementById('rec-income-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = await API.get('settings');
      const list = settings.recurringIncome || [];
      const data = {
        id: item?.id || 'ri' + Date.now(),
        name: document.getElementById('ri-name').value.trim(),
        amount: Number(document.getElementById('ri-amount').value),
        person: document.getElementById('ri-person').value,
        type: document.getElementById('ri-type').value,
        frequency: document.getElementById('ri-freq').value,
        months: document.getElementById('ri-months').value.trim()
          ? document.getElementById('ri-months').value.split(',').map(Number) : null
      };
      if (isEdit) {
        const idx = list.findIndex(r => r.id === item.id);
        if (idx >= 0) list[idx] = data;
      } else { list.push(data); }
      await API.updateCollection('settings', { recurringIncome: list });
      Utils.closeModal(); Utils.toast('Saved', 'success'); SettingsPage.render();
    });
  },

  async editRecurringIncome(id) {
    const settings = await API.get('settings');
    const r = (settings.recurringIncome || []).find(x => x.id === id);
    if (r) SettingsPage.showRecurringIncomeModal(r);
  },

  async deleteRecurringIncome(id) {
    if (!await Utils.confirm('Delete this recurring income?')) return;
    const settings = await API.get('settings');
    settings.recurringIncome = (settings.recurringIncome || []).filter(r => r.id !== id);
    await API.updateCollection('settings', { recurringIncome: settings.recurringIncome });
    Utils.toast('Deleted'); SettingsPage.render();
  },

  // ── Recurring Expenses CRUD ────────────────────────────────────
  showRecurringModal(recurring = null, isInvestment = false) {
    const isEdit = !!recurring;
    
    // If editing, determine if it's an investment based on category
    if (isEdit && !isInvestment) {
      isInvestment = recurring.category === 'Savings';
    }
    
    const html = `
      <form id="recurring-form">
        <div class="form-row">
          <div class="form-group"><label>Name <span class="required">*</span></label><input type="text" id="rec-name" value="${recurring?.name || ''}" required placeholder="${isInvestment ? 'e.g., SIP - Mutual Fund' : 'e.g., Rent'}"></div>
          <div class="form-group"><label>Amount <span class="required">*</span></label><input type="number" id="rec-amount" value="${recurring?.amount || ''}" min="0" required placeholder="₹ 0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Frequency</label>
            <select id="rec-freq"><option value="monthly" ${recurring?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option><option value="yearly" ${recurring?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option></select>
          </div>
          ${isInvestment ? `
          <div class="form-group"><label>Investment Type</label>
            <select id="rec-subcat">
              <option value="SIP" ${recurring?.subcategory === 'SIP' ? 'selected' : ''}>SIP (Mutual Fund)</option>
              <option value="PPF" ${recurring?.subcategory === 'PPF' ? 'selected' : ''}>PPF</option>
              <option value="RD" ${recurring?.subcategory === 'RD' ? 'selected' : ''}>RD (Recurring Deposit)</option>
              <option value="FD" ${recurring?.subcategory === 'FD' ? 'selected' : ''}>FD (Fixed Deposit)</option>
              <option value="NPS" ${recurring?.subcategory === 'NPS' ? 'selected' : ''}>NPS</option>
              <option value="Stocks" ${recurring?.subcategory === 'Stocks' ? 'selected' : ''}>Stocks</option>
              <option value="Gold" ${recurring?.subcategory === 'Gold' ? 'selected' : ''}>Gold</option>
              <option value="Other" ${recurring?.subcategory === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          ` : `
          <div class="form-group"><label>Category</label>
            <select id="rec-cat">${Object.keys(Utils.categories).filter(c => c !== 'Savings').map(c => `<option value="${c}" ${recurring?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
          `}
        </div>
        <div class="form-group"><label>Months (for yearly, comma-separated, e.g. 1,12)</label>
          <input type="text" id="rec-months" value="${recurring?.months ? recurring.months.join(',') : ''}" placeholder="Leave empty for monthly">
        </div>
        ${isInvestment ? `
        <div class="info-box" style="background: var(--success-bg); border-left: 3px solid var(--success); padding: 12px; margin-top: 12px; border-radius: 4px;">
          <div style="font-size: 0.9rem; color: var(--text-primary);">
            💡 <strong>Note:</strong> Investments are tracked separately and won't be counted as expenses in your budget calculations.
          </div>
        </div>
        ` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
        </div>
      </form>`;
    Utils.openModal(isEdit ? (isInvestment ? 'Edit Investment' : 'Edit Recurring Expense') : (isInvestment ? 'Add Recurring Investment' : 'Add Recurring Expense'), html);
    document.getElementById('recurring-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = await API.get('settings');
      const list = settings.recurringExpenses || [];
      const data = {
        id: recurring?.id || 'r' + Date.now(),
        name: document.getElementById('rec-name').value.trim(),
        amount: Number(document.getElementById('rec-amount').value),
        frequency: document.getElementById('rec-freq').value,
        category: isInvestment ? 'Savings' : document.getElementById('rec-cat').value,
        subcategory: isInvestment ? document.getElementById('rec-subcat').value : '',
        months: document.getElementById('rec-months').value.trim() ?
          document.getElementById('rec-months').value.split(',').map(Number) : null
      };
      if (isEdit) {
        const idx = list.findIndex(r => r.id === recurring.id);
        if (idx >= 0) list[idx] = data;
      } else { list.push(data); }
      await API.updateCollection('settings', { recurringExpenses: list });
      Utils.closeModal(); Utils.toast('Saved', 'success'); SettingsPage.render();
    });
  },

  async editRecurring(id) {
    const settings = await API.get('settings');
    const r = (settings.recurringExpenses || []).find(x => x.id === id);
    if (r) SettingsPage.showRecurringModal(r);
  },

  async deleteRecurring(id) {
    if (!await Utils.confirm('Delete this recurring expense?')) return;
    const settings = await API.get('settings');
    settings.recurringExpenses = (settings.recurringExpenses || []).filter(r => r.id !== id);
    await API.updateCollection('settings', { recurringExpenses: settings.recurringExpenses });
    Utils.toast('Deleted'); SettingsPage.render();
  },

  // ── Widgets ─────────────────────────────────────────────────────
  showWidgetModal(widget = null, side = null) {
    const isEdit = !!widget;
    const contentValue = widget ? (widget.type === 'reminder' ? (widget.items || []).join('\n') : (widget.content || '')) : '';
    
    const html = `
      <form id="widget-form">
        <div class="form-row">
          <div class="form-group"><label>Sidebar</label>
            <select id="wid-side" ${isEdit ? 'disabled' : ''}>
              <option value="left" ${side === 'left' ? 'selected' : ''}>Left</option>
              <option value="right" ${side === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </div>
          <div class="form-group"><label>Type</label>
            <select id="wid-type" ${isEdit ? 'disabled' : ''}>
              <option value="text" ${widget?.type === 'text' ? 'selected' : ''}>Custom Text</option>
              <option value="quote" ${widget?.type === 'quote' ? 'selected' : ''}>Quote</option>
              <option value="reminder" ${widget?.type === 'reminder' ? 'selected' : ''}>Reminders</option>
              <option value="photo" ${widget?.type === 'photo' ? 'selected' : ''}>Photo</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Title</label><input type="text" id="wid-title" value="${widget?.title || ''}" required></div>
        <div class="form-group"><label>Content / URL / Items (one per line for reminders)</label>
          <textarea id="wid-content" rows="4">${contentValue}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Widget' : 'Add Widget'}</button>
        </div>
      </form>`;
    Utils.openModal(isEdit ? 'Edit Widget' : 'Add Widget', html);
    document.getElementById('widget-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = await API.get('settings');
      const selectedSide = isEdit ? side : document.getElementById('wid-side').value;
      const type = document.getElementById('wid-type').value;
      const targetSide = type === 'reminder' ? 'right' : selectedSide;
      const widgetData = {
        id: widget?.id || 'w' + Date.now(), 
        type,
        title: document.getElementById('wid-title').value.trim(),
        content: type !== 'reminder' ? document.getElementById('wid-content').value.trim() : '',
        items: type === 'reminder' ? document.getElementById('wid-content').value.trim().split('\n').filter(Boolean) : undefined
      };
      if (!settings.widgets) settings.widgets = { left: [], right: [] };
      
      // Ensure widget lives only on the chosen side
      settings.widgets.left = (settings.widgets.left || []).filter(w => w.id !== widgetData.id);
      settings.widgets.right = (settings.widgets.right || []).filter(w => w.id !== widgetData.id);
      settings.widgets[targetSide].push(widgetData);
      
      await API.updateCollection('settings', { widgets: settings.widgets });
      Utils.closeModal(); 
      Utils.toast(isEdit ? 'Widget updated' : 'Widget added', 'success');
      SettingsPage.render(); 
      App.renderWidgets(settings);
    });
  },

  async editWidget(side, id) {
    const settings = await API.get('settings');
    const widget = settings.widgets?.[side]?.find(w => w.id === id);
    if (widget) SettingsPage.showWidgetModal(widget, side);
  },

  async deleteWidget(side, id) {
    if (!await Utils.confirm('Delete this widget?')) return;
    const settings = await API.get('settings');
    settings.widgets[side] = settings.widgets[side].filter(w => w.id !== id);
    await API.updateCollection('settings', { widgets: settings.widgets });
    Utils.toast('Widget removed'); SettingsPage.render(); App.renderWidgets(settings);
  },

  // ── Backup/Restore ──────────────────────────────────────────────
  async createBackup() {
    const res = await API.backup();
    Utils.toast(`Backup created: ${res.backup}`, 'success');
  },

  async showRestoreModal() {
    const backups = await API.listBackups();
    const html = backups.length === 0 ? '<p>No backups found.</p>' : `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${backups.map(b => `<button class="btn btn-outline" onclick="SettingsPage.restoreBackup('${b}')">${b}</button>`).join('')}
      </div>`;
    Utils.openModal('Restore Backup', html);
  },

  async restoreBackup(name) {
    if (!await Utils.confirm(`Restore from ${name}? Current data will be overwritten.`)) return;
    await API.restore(name);
    Utils.closeModal();
    Utils.toast('Restored!', 'success');
    location.reload();
  }
};
