// ── App Router & Shell ───────────────────────────────────────────

const App = {
  pages: {
    dashboard: { title: 'Dashboard', render: () => DashboardPage.render() },
    tasks: { title: 'Task Management', render: () => TasksPage.render() },
    budget: { title: 'Budget Planning', render: () => BudgetPage.render() },
    expenses: { title: 'Expense Tracking', render: () => ExpensesPage.render() },
    income: { title: 'Income Tracking', render: () => IncomePage.render() },
    goals: { title: 'Goals & Habits', render: () => GoalsPage.render() },
    kids: { title: 'Kids Management', render: () => KidsPage.render() },
    notes: { title: 'Sticky Notes', render: () => NotesPage.render() },
    savings: { title: 'Savings & Investments', render: () => SavingsPage.render() },
    reports: { title: 'Reports', render: () => ReportsPage.render() },
    settings: { title: 'Settings', render: () => SettingsPage.render() },
    bills: { title: 'Bill Scanner', render: () => BillsPage.render() }
  },

  async init() {
    // Check authentication before loading anything
    try {
      const authRes = await fetch('/api/auth/check');
      const authData = await authRes.json();
      if (!authData.authenticated) {
        window.location.href = '/login.html';
        return;
      }
    } catch (e) {
      console.warn('Auth check failed', e);
    }

    // Set today's date
    const dateEl = document.getElementById('today-date');
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });

    // Sidebar toggles
    document.getElementById('toggle-left-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar-left').classList.toggle('open');
    });
    document.getElementById('close-left-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar-left').classList.remove('open');
    });
    document.getElementById('toggle-right-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar-right').classList.toggle('open');
    });
    document.getElementById('close-right-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar-right').classList.remove('open');
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', Utils.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) Utils.closeModal();
    });

    // Load widgets
    try {
      const settings = await API.get('settings');
      App.renderWidgets(settings);
    } catch (e) { console.warn('Could not load widgets', e); }

    // Router
    window.addEventListener('hashchange', () => App.navigate());
    App.navigate();

    // Budget reminder
    try { await BudgetPage.checkBudgetReminder(); } catch (e) { }
  },

  navigate() {
    const hash = location.hash.replace('#/', '').replace('#', '') || 'dashboard';
    const page = App.pages[hash];
    if (!page) { location.hash = '#/dashboard'; return; }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === hash);
    });

    // Update title
    document.getElementById('page-title').textContent = page.title;

    // Close mobile sidebar on nav
    document.getElementById('sidebar-left').classList.remove('open');

    // Render page
    document.getElementById('page-content').innerHTML = '<div class="loading">Loading...</div>';
    page.render().catch(err => {
      console.error('Page render error:', err);
      document.getElementById('page-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Error loading page. Please try again.</p>
        </div>`;
    });
  },

  renderWidgets(settings) {
    const leftContainer = document.getElementById('left-widgets');
    const rightContainer = document.getElementById('right-widgets');

    const renderWidget = (w) => {
      switch (w.type) {
        case 'quote':
          return `<div class="widget-card"><h4>${w.title}</h4><p class="widget-quote">"${Utils.randomQuote()}"</p></div>`;
        case 'reminder':
          return `<div class="widget-card"><h4>${w.title}</h4><ul>${(w.items || []).map(i => `<li>${i}</li>`).join('')}</ul></div>`;
        case 'photo':
          return `<div class="widget-card widget-photo"><h4>${w.title}</h4><img src="${w.content}" alt="${w.title}" onerror="this.style.display='none'"></div>`;
        case 'text':
        default:
          return `<div class="widget-card"><h4>${w.title}</h4><p>${(w.content || '').replace(/\\n/g, '<br>')}</p></div>`;
      }
    };

    const widgets = settings?.widgets || { left: [], right: [] };
    leftContainer.innerHTML = (widgets.left || []).map(renderWidget).join('');

    // Build right sidebar: user widgets + upcoming expense reminders
    let rightHtml = (widgets.right || []).map(renderWidget).join('');
    rightHtml += App.buildUpcomingRemindersWidget(settings);
    rightContainer.innerHTML = rightHtml;
  },

  // ── Upcoming Expense Reminders ──────────────────────────────────
  buildUpcomingRemindersWidget(settings) {
    const recurringExpenses = settings?.recurringExpenses || [];
    const paidReminders = settings?.paidReminders || [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Find yearly expenses due within the next 2 months (inclusive of current month)
    const upcoming = [];
    const yearlyExpenses = recurringExpenses.filter(r => r.frequency === 'yearly' && r.months && r.months.length > 0);

    for (const exp of yearlyExpenses) {
      for (const dueMonth of exp.months) {
        // Check if current month is within 2 months before the due month (or the due month itself)
        const diff = App.monthDifference(currentMonth, currentYear, dueMonth, currentYear);

        // Show if due in current month, next month, or month after (0, 1, or 2 months ahead)
        // Also handle year wrap (e.g., November showing January reminders)
        let show = false;
        let dueYear = currentYear;

        if (diff >= 0 && diff <= 2) {
          show = true;
        } else {
          // Check next year's occurrence
          const diffNextYear = App.monthDifference(currentMonth, currentYear, dueMonth, currentYear + 1);
          if (diffNextYear >= 0 && diffNextYear <= 2) {
            show = true;
            dueYear = currentYear + 1;
          }
        }

        if (show) {
          // Check if already paid for this year
          const isPaid = paidReminders.some(p =>
            p.expenseId === exp.id && p.year === dueYear && p.dueMonth === dueMonth
          );
          if (!isPaid) {
            upcoming.push({
              ...exp,
              dueMonth,
              dueYear,
              dueMonthName: Utils.monthName(dueMonth),
              monthsAway: App.monthDifference(currentMonth, currentYear, dueMonth, dueYear)
            });
          }
        }
      }
    }

    if (upcoming.length === 0) return '';

    // Sort by how soon they are due
    upcoming.sort((a, b) => a.monthsAway - b.monthsAway);

    const cards = upcoming.map(exp => {
      const urgencyClass = exp.monthsAway === 0 ? 'reminder-urgent' : exp.monthsAway === 1 ? 'reminder-soon' : 'reminder-upcoming';
      const urgencyLabel = exp.monthsAway === 0 ? '⚠️ Due this month' : exp.monthsAway === 1 ? '📅 Due next month' : `📅 Due in ${exp.dueMonthName}`;

      return `
            <div class="reminder-card ${urgencyClass}">
              <div class="reminder-info">
                <div class="reminder-name">${exp.name}</div>
                <div class="reminder-amount">${Utils.currency(exp.amount)}</div>
                <div class="reminder-due">${urgencyLabel} ${exp.dueYear}</div>
                <div class="reminder-category"><span class="badge badge-category">${exp.category}</span></div>
              </div>
              <button class="btn btn-primary btn-sm reminder-pay-btn" onclick="App.showMarkAsPaidModal('${exp.id}', ${exp.dueMonth}, ${exp.dueYear})">
                ✅ Mark as Paid
              </button>
            </div>`;
    }).join('');

    return `
        <div class="widget-card widget-reminders">
          <h4>🔔 Upcoming Expenses</h4>
          <div class="reminder-list">${cards}</div>
        </div>`;
  },

  monthDifference(fromMonth, fromYear, toMonth, toYear) {
    return (toYear - fromYear) * 12 + (toMonth - fromMonth);
  },

  // ── Mark as Paid Modal & Logic ──────────────────────────────────
  async showMarkAsPaidModal(expenseId, dueMonth, dueYear) {
    const [settings, savings] = await Promise.all([
      API.get('settings'),
      API.get('savings')
    ]);

    const expense = (settings.recurringExpenses || []).find(r => r.id === expenseId);
    if (!expense) { Utils.toast('Expense not found', 'error'); return; }

    const savingsOptions = savings.map(s =>
      `<option value="${s.id}">${s.name} (${Utils.currency(s.amount)})</option>`
    ).join('');

    const html = `
      <form id="mark-paid-form">
        <div class="card" style="background: var(--primary-bg); border: none; margin-bottom: 16px;">
          <p><strong>Expense:</strong> ${expense.name}</p>
          <p><strong>Due:</strong> ${Utils.monthName(dueMonth)} ${dueYear}</p>
          <p><strong>Category:</strong> ${expense.category}</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Amount Paid <span class="required">*</span></label>
            <input type="number" id="mp-amount" value="${expense.amount}" min="0" required placeholder="₹ 0">
          </div>
          <div class="form-group">
            <label>Date Paid <span class="required">*</span></label>
            <input type="date" id="mp-date" value="${Utils.todayStr()}" required>
          </div>
        </div>

        <div class="form-group">
          <label>Deduct From <span class="required">*</span></label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="mp-deduct" value="budget" checked> 💰 Budget (add as expense)
            </label>
            <label class="radio-label">
              <input type="radio" name="mp-deduct" value="savings"> 🏦 Savings (deduct from savings)
            </label>
          </div>
        </div>

        <div class="form-group" id="mp-savings-group" style="display:none;">
          <label>Select Savings Account</label>
          <select id="mp-savings-id">
            ${savingsOptions || '<option value="">No savings found</option>'}
          </select>
        </div>

        <div class="form-group">
          <label>Payment Method</label>
          <select id="mp-method">
            ${Utils.paymentMethods.map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Paid By</label>
          <select id="mp-paidby">
            <option value="husband">Husband</option>
            <option value="wife">Wife</option>
            <option value="joint">Joint</option>
          </select>
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea id="mp-notes" placeholder="Optional notes..."></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">✅ Confirm Payment</button>
        </div>
      </form>`;

    Utils.openModal('Mark as Paid — ' + expense.name, html);

    // Toggle savings dropdown visibility
    document.querySelectorAll('input[name="mp-deduct"]').forEach(radio => {
      radio.addEventListener('change', () => {
        document.getElementById('mp-savings-group').style.display =
          document.querySelector('input[name="mp-deduct"]:checked').value === 'savings' ? '' : 'none';
      });
    });

    document.getElementById('mark-paid-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById('mp-amount').value);
      const date = document.getElementById('mp-date').value;
      const deductFrom = document.querySelector('input[name="mp-deduct"]:checked').value;
      const paymentMethod = document.getElementById('mp-method').value;
      const paidBy = document.getElementById('mp-paidby').value;
      const notes = document.getElementById('mp-notes').value.trim();

      // 1. Create expense entry
      const expenseData = {
        amount,
        date,
        description: expense.name + ' (Yearly)',
        category: expense.category,
        subcategory: expense.subcategory || '',
        paidBy,
        paymentMethod,
        isRecurring: true,
        notes: notes || `Yearly expense - ${Utils.monthName(dueMonth)} ${dueYear}`
      };
      const createdExpense = await API.create('expenses', expenseData);

      // 2. If deducting from savings, reduce savings amount
      if (deductFrom === 'savings') {
        const savingsId = document.getElementById('mp-savings-id').value;
        if (savingsId) {
          const savingsItem = await API.get('savings', savingsId);
          if (savingsItem) {
            await API.update('savings', savingsId, {
              amount: Math.max(0, (savingsItem.amount || 0) - amount)
            });
          }
        }
      }

      // 3. Record as paid in settings
      const latestSettings = await API.get('settings');
      const paidReminders = latestSettings.paidReminders || [];
      paidReminders.push({
        expenseId: expenseId,
        dueMonth: dueMonth,
        year: dueYear,
        paidDate: date,
        expenseEntryId: createdExpense.id,
        deductedFrom: deductFrom,
        amount
      });
      await API.updateCollection('settings', { paidReminders });

      // 4. Refresh UI
      Utils.closeModal();
      Utils.toast(`${expense.name} marked as paid!`, 'success');

      // Refresh widgets
      const refreshedSettings = await API.get('settings');
      App.renderWidgets(refreshedSettings);

      // Refresh current page if relevant
      const hash = location.hash || '#/dashboard';
      if (hash.includes('dashboard')) DashboardPage.render();
      else if (hash.includes('expenses')) ExpensesPage.render();
      else if (hash.includes('savings')) SavingsPage.render();
    });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
