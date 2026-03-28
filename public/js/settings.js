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

    // Build recurring expense rows
    const reRows = (settings.recurringExpenses || []).map(r => `
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

    // Build widget lists
    const leftWidgets = (settings.widgets?.left || []).map(w => `
          <div class="habit-row"><span>${w.type === 'quote' ? '💬' : w.type === 'reminder' ? '🔔' : w.type === 'photo' ? '📷' : '📄'} ${w.title}</span>
          <button class="btn-icon" onclick="SettingsPage.deleteWidget('left','${w.id}')">🗑️</button></div>
        `).join('');

    const rightWidgets = (settings.widgets?.right || []).map(w => `
          <div class="habit-row"><span>${w.type === 'quote' ? '💬' : w.type === 'reminder' ? '🔔' : w.type === 'photo' ? '📷' : '📄'} ${w.title}</span>
          <button class="btn-icon" onclick="SettingsPage.deleteWidget('right','${w.id}')">🗑️</button></div>
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
          <div class="card-title">Recurring Expenses</div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.showRecurringModal()">+ Add</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Frequency</th><th>Months</th><th class="text-right">Amount</th><th></th></tr></thead>
          <tbody>${reRows}</tbody>
        </table>
      </div>

      <!-- Widgets -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Sidebar Widgets</div>
          <button class="btn btn-primary btn-sm" onclick="SettingsPage.showWidgetModal()">+ Add Widget</button>
        </div>
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
  showRecurringModal(recurring = null) {
    const isEdit = !!recurring;
    const html = `
      <form id="recurring-form">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" id="rec-name" value="${recurring?.name || ''}" required></div>
          <div class="form-group"><label>Amount</label><input type="number" id="rec-amount" value="${recurring?.amount || ''}" min="0" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Frequency</label>
            <select id="rec-freq"><option value="monthly" ${recurring?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option><option value="yearly" ${recurring?.frequency === 'yearly' ? 'selected' : ''}>Yearly</option></select>
          </div>
          <div class="form-group"><label>Category</label>
            <select id="rec-cat">${Object.keys(Utils.categories).map(c => `<option value="${c}" ${recurring?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-group"><label>Months (for yearly, comma-separated, e.g. 1,12)</label>
          <input type="text" id="rec-months" value="${recurring?.months ? recurring.months.join(',') : ''}" placeholder="Leave empty for monthly">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
        </div>
      </form>`;
    Utils.openModal(isEdit ? 'Edit Recurring' : 'Add Recurring Expense', html);
    document.getElementById('recurring-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = await API.get('settings');
      const list = settings.recurringExpenses || [];
      const data = {
        id: recurring?.id || 'r' + Date.now(),
        name: document.getElementById('rec-name').value.trim(),
        amount: Number(document.getElementById('rec-amount').value),
        frequency: document.getElementById('rec-freq').value,
        category: document.getElementById('rec-cat').value,
        subcategory: '',
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
  showWidgetModal() {
    const html = `
      <form id="widget-form">
        <div class="form-row">
          <div class="form-group"><label>Sidebar</label>
            <select id="wid-side"><option value="left">Left</option><option value="right">Right</option></select>
          </div>
          <div class="form-group"><label>Type</label>
            <select id="wid-type"><option value="text">Custom Text</option><option value="quote">Quote</option><option value="reminder">Reminders</option><option value="photo">Photo</option></select>
          </div>
        </div>
        <div class="form-group"><label>Title</label><input type="text" id="wid-title" required></div>
        <div class="form-group"><label>Content / URL / Items (one per line for reminders)</label>
          <textarea id="wid-content" rows="4"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Widget</button>
        </div>
      </form>`;
    Utils.openModal('Add Widget', html);
    document.getElementById('widget-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = await API.get('settings');
      const side = document.getElementById('wid-side').value;
      const type = document.getElementById('wid-type').value;
      const widget = {
        id: 'w' + Date.now(), type,
        title: document.getElementById('wid-title').value.trim(),
        content: type !== 'reminder' ? document.getElementById('wid-content').value.trim() : '',
        items: type === 'reminder' ? document.getElementById('wid-content').value.trim().split('\n').filter(Boolean) : undefined
      };
      if (!settings.widgets) settings.widgets = { left: [], right: [] };
      settings.widgets[side].push(widget);
      await API.updateCollection('settings', { widgets: settings.widgets });
      Utils.closeModal(); Utils.toast('Widget added', 'success');
      SettingsPage.render(); App.renderWidgets(settings);
    });
  },

  async deleteWidget(side, id) {
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
