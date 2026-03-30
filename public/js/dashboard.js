// ── Dashboard Page ───────────────────────────────────────────────

const DashboardPage = {
  weekOffset: 0,

  async render() {
    const [tasks, expenses, income, budget, settings, notes] = await Promise.all([
      API.get('tasks'),
      API.get('expenses'),
      API.get('income'),
      API.get('budget'),
      API.get('settings'),
      API.get('notes')
    ]);

    const today = Utils.todayStr();
    const { month, year } = Utils.currentMonth();

    // Weekly window (7 days carousel)
    const weekStart = Utils.addDays(today, DashboardPage.weekOffset);
    const weekEnd = Utils.addDays(weekStart, 6);
    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const date = Utils.addDays(weekStart, i);
      const dateObj = new Date(date);
      const dayTasks = tasks
        .filter(t => t.dueDate && t.dueDate >= weekStart && t.dueDate <= weekEnd)
        .filter(t => t.dueDate === date)
        .sort((a, b) => {
          const pr = { high: 0, medium: 1, low: 2 };
          return (pr[a.priority] || 2) - (pr[b.priority] || 2);
        });
      return {
        date,
        label: dateObj.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayNum: dateObj.getDate(),
        isToday: date === today,
        tasks: dayTasks
      };
    });

    const completedToday = tasks.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(today));

    // Month finances
    // - Budget tracks only non-recurring expenses that are not Savings and not Debt
    const expensesThisMonth = expenses.filter(e => Utils.isSameMonth(e.date));
    const recurringNames = new Set((settings.recurringExpenses || []).map(r => (r.name || '').toLowerCase()));
    const normCat = (c) => (c || '').toString().trim().toLowerCase();

    const textBlob = (e) => `${e.description || ''} ${e.notes || ''}`.toLowerCase();
    const isRecurringEntry = (e) => {
      if (e.isRecurring) return true;
      const txt = textBlob(e);
      if (txt.includes('recurring')) return true;
      if ([...recurringNames].some(name => name && txt.includes(name))) return true;
      return false;
    };
    const isInvestmentEntry = (e) => normCat(e.category) === 'savings';
    const isDebtEntry = (e) => normCat(e.category) === 'debt';

    // For the Month Expenses card (orange), exclude only Savings; show Debt there
    const monthExpenses = expensesThisMonth
      .filter(e => !isInvestmentEntry(e))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // For budget progress, exclude Savings and Debt
    const budgetEligible = expensesThisMonth
      .filter(e => !isInvestmentEntry(e) && !isDebtEntry(e));

    const recurringList = budgetEligible.filter(isRecurringEntry);
    const discretionaryList = budgetEligible.filter(e => !isRecurringEntry(e));
    const discretionaryExpenses = discretionaryList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const investmentsThisMonth = expensesThisMonth.filter(isInvestmentEntry);
    const investmentsTotal = investmentsThisMonth.reduce((s, e) => s + (e.amount || 0), 0);
    const debtThisMonth = expensesThisMonth.filter(isDebtEntry);
    const monthIncome = income.filter(i => Utils.isSameMonth(i.date))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    // Savings should subtract both expenses and investments
    const monthSavings = monthIncome - (monthExpenses + investmentsTotal);

    // Recurring status for this month (expenses only, exclude Savings)
    const recurringForMonth = (settings.recurringExpenses || []).filter(r => {
      if (r.category === 'Savings') return false;
      if (r.frequency === 'monthly') return true;
      if (r.frequency === 'yearly' && Array.isArray(r.months) && r.months.includes(month)) return true;
      return false;
    });
    const paidReminders = settings.paidReminders || [];
    const statusFor = (r) => paidReminders.find(pr => pr.expenseId === r.id && pr.dueMonth === month && pr.year === year);
    let recurringPaid = 0, recurringSkipped = 0;
    const recurringPaidCount = recurringForMonth.filter(r => {
      const st = statusFor(r);
      if (!st) return false;
      if (st.status === 'skipped') {
        recurringSkipped += r.amount;
        return false;
      }
      recurringPaid += st.amount || r.amount || 0;
      return true;
    }).length;
    const recurringSkippedCount = recurringForMonth.filter(r => {
      const st = statusFor(r);
      return st && st.status === 'skipped';
    }).length;
    const recurringTotal = recurringForMonth.reduce((s, r) => s + (r.amount || 0), 0);
    const recurringRemaining = Math.max(recurringTotal - recurringPaid - recurringSkipped, 0);
    const recurringPendingCount = recurringForMonth.length - recurringPaidCount - recurringSkippedCount;

    // Budget
    const currentBudget = Array.isArray(budget) ?
      budget.find(b => b.month === month && b.year === year) : null;
    const budgetAmount = currentBudget ? currentBudget.amount : 0;
    const budgetPct = budgetAmount > 0 ? Utils.pct(discretionaryExpenses, budgetAmount) : 0;

    // Debug logging to verify discretionary vs recurring classification
    console.log('[BudgetDebug]', {
      month,
      year,
      budgetAmount,
      budgetPct,
      discretionaryTotal: discretionaryExpenses,
      discretionaryCount: discretionaryList.length,
      recurringCount: recurringList.length,
      investmentsCount: investmentsThisMonth.length,
      debtCount: debtThisMonth.length,
      recurringNames: [...recurringNames],
      discretionaryTop: discretionaryList
        .slice()
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          desc: e.description,
        amount: e.amount,
        isRecurring: e.isRecurring,
        category: e.category
      })),
      discretionarySmall: discretionaryList
        .slice()
        .sort((a, b) => (a.amount || 0) - (b.amount || 0))
        .slice(0, 5)
        .map(e => ({
          id: e.id,
          desc: e.description,
          amount: e.amount,
          isRecurring: e.isRecurring,
          category: e.category
        })),
      recurringTop: recurringList
        .slice()
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 5)
        .map(e => ({
          id: e.id,
          desc: e.description,
          amount: e.amount,
          isRecurring: e.isRecurring,
          category: e.category
        })),
      discretionarySample: discretionaryList.slice(0, 5).map(e => ({
        id: e.id,
        desc: e.description,
        amount: e.amount,
        isRecurring: e.isRecurring,
        category: e.category
      })),
      recurringSample: recurringList.slice(0, 5).map(e => ({
        id: e.id,
        desc: e.description,
        amount: e.amount,
        isRecurring: e.isRecurring,
        category: e.category
      })),
      investmentsSample: investmentsThisMonth.slice(0, 3).map(e => ({
        id: e.id,
        desc: e.description,
        amount: e.amount,
        category: e.category,
        subcategory: e.subcategory
      }))
    });

    // Pinned notes
    const pinnedNotes = (notes || []).filter(n => n.pinned);
    const colorMap = {
      Personal: 'note-blue', Work: 'note-gray', Family: 'note-green',
      Finance: 'note-yellow', Health: 'note-pink', Ideas: 'note-purple',
      'To-Do': 'note-orange', Reference: 'note-teal'
    };

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card accent-blue">
          <div class="sc-label">Budget Used</div>
          <div class="sc-value">${budgetAmount > 0 ? budgetPct + '%' : 'Not Set'}</div>
          <div class="sc-sub">${budgetAmount > 0 ? Utils.currency(discretionaryExpenses) + ' of ' + Utils.currency(budgetAmount) : 'Set budget for ' + Utils.monthName(month)}</div>
          ${budgetAmount > 0 ? `<div class="progress-bar mt-8"><div class="progress-fill ${budgetPct > 90 ? 'danger' : budgetPct > 70 ? 'warning' : ''}" style="width:${Math.min(budgetPct, 100)}%"></div></div>` : ''}
        </div>
        <div class="summary-card accent-orange">
          <div class="sc-label">Recurring This Month</div>
          <div class="sc-value">${Utils.currency(recurringTotal)}</div>
          <div class="sc-sub">
            ${recurringPaidCount} paid (${Utils.currency(recurringPaid)}) · 
            ${recurringSkippedCount} skipped (${Utils.currency(recurringSkipped)}) · 
            ${recurringPendingCount} pending (${Utils.currency(recurringRemaining)})
          </div>
        </div>
        <div class="summary-card accent-teal">
          <div class="sc-label">Month Expenses</div>
          <div class="sc-value">${Utils.currency(monthExpenses)}</div>
          <div class="sc-sub">${Utils.monthName(month)} ${year} · excludes investments</div>
        </div>
        <div class="summary-card accent-orange">
          <div class="sc-label">Investments</div>
          <div class="sc-value">${Utils.currency(investmentsTotal)}</div>
          <div class="sc-sub">${investmentsThisMonth.length} item${investmentsThisMonth.length === 1 ? '' : 's'} · Savings category</div>
        </div>
        <div class="summary-card accent-green">
          <div class="sc-label">Month Income</div>
          <div class="sc-value">${Utils.currency(monthIncome)}</div>
          <div class="sc-sub">${Utils.monthName(month)} ${year}</div>
        </div>
        <div class="summary-card accent-purple">
          <div class="sc-label">Savings</div>
          <div class="sc-value">${Utils.currency(monthSavings)}</div>
          <div class="sc-sub">${monthSavings >= 0 ? 'Income - expenses - investments' : 'Overspent ⚠️'}</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="quick-action-btn" onclick="TasksPage.showAddModal()">
          <span class="qa-icon">✅</span> Add Task
        </button>
        <button class="quick-action-btn" onclick="ExpensesPage.showAddModal()">
          <span class="qa-icon">💳</span> Add Expense
        </button>
        <button class="quick-action-btn" onclick="location.hash='#/bills'">
          <span class="qa-icon">📄</span> Scan Bill
        </button>
        <button class="quick-action-btn" onclick="location.hash='#/reports'">
          <span class="qa-icon">📊</span> View Reports
        </button>
      </div>

      <!-- Pinned Sticky Notes -->
      ${pinnedNotes.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">📌 Pinned Notes</div>
              <div class="card-subtitle">${pinnedNotes.length} pinned note${pinnedNotes.length !== 1 ? 's' : ''}</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="location.hash='#/notes'">View All Notes</button>
          </div>
          <div class="pinned-notes-grid">
            ${pinnedNotes.map(n => `
              <div class="pinned-note-card ${colorMap[n.category] || 'note-yellow'}" onclick="NotesPage.showAddModal(null, '${n.id}')">
                <div class="pinned-note-title">${n.title || 'Untitled'}</div>
                <div class="pinned-note-content">${(n.content || '').substring(0, 120)}${(n.content || '').length > 120 ? '...' : ''}</div>
                <div class="pinned-note-meta">${n.category || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Weekly Tasks -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">🗓️ Weekly Planner</div>
            <div class="card-subtitle">${Utils.formatDateShort(weekStart)} - ${Utils.formatDateShort(weekEnd)}</div>
          </div>
          <div class="week-nav">
            <button class="btn btn-outline btn-sm" onclick="DashboardPage.shiftWeek(-7)">Prev</button>
            <button class="btn btn-outline btn-sm" onclick="DashboardPage.resetWeek()">Today</button>
            <button class="btn btn-outline btn-sm" onclick="DashboardPage.shiftWeek(7)">Next</button>
          </div>
        </div>
        <div id="dashboard-weekly-carousel" class="week-strip">
          ${weekDays.map(d => `
            <div class="week-card ${d.isToday ? 'today' : ''}">
              <div class="week-card-header">
                <div class="week-day">${d.label}</div>
                <div class="week-date">${d.dayNum}</div>
              </div>
              <div class="week-card-body">
                ${d.tasks.length === 0 ? `<div class="empty-day">No tasks</div>` : d.tasks.map(t => DashboardPage.renderTaskPill(t)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Completed Today -->
      ${completedToday.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">✅ Completed Today</div>
              <div class="card-subtitle">${completedToday.length} task${completedToday.length !== 1 ? 's' : ''} done</div>
            </div>
          </div>
          <ul class="task-list">
            ${completedToday.map(t => DashboardPage.renderTask(t, true)).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  },

  renderTask(task, completed = false) {
    return `
      <li class="task-item ${completed ? 'task-completed' : ''}">
        <div class="task-checkbox ${completed ? 'checked' : ''}"
             onclick="DashboardPage.toggleTask('${task.id}', ${!completed})"></div>
        <div class="task-info">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            ${Utils.assigneeBadge(task.assignee)}
            ${task.priority ? Utils.priorityBadge(task.priority) : ''}
            ${task.dueDate && !completed ? `<span class="text-small text-muted">${Utils.formatDateShort(task.dueDate)}</span>` : ''}
            ${completed && task.completedAt ? `<span class="text-small text-muted">Done at ${Utils.formatTime(task.completedAt.split('T')[1]?.substring(0, 5))}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon" onclick="TasksPage.editTask('${task.id}')" title="Edit">✏️</button>
          <button class="btn-icon" onclick="TasksPage.deleteTask('${task.id}')" title="Delete">🗑️</button>
        </div>
      </li>
    `;
  },

  renderTaskPill(task) {
    return `
      <button class="week-task" onclick="DashboardPage.showTaskDetail('${task.id}')">
        <div class="week-task-title">${task.title}</div>
        <div class="week-task-meta">
          ${Utils.assigneeBadge(task.assignee)}
          ${task.priority ? Utils.priorityBadge(task.priority) : ''}
          ${task.completed ? '<span class="badge badge-priority-low">Done</span>' : ''}
        </div>
      </button>
    `;
  },

  async showTaskDetail(id) {
    const task = await API.get('tasks', id);
    if (!task) return;
    const html = `
      <form id="task-detail-form">
        <div class="task-detail">
          <div class="task-detail-title">${task.title}</div>
          ${task.description ? `<p class="task-detail-desc">${task.description}</p>` : ''}
          <div class="task-detail-meta">
            ${Utils.assigneeBadge(task.assignee)}
            ${task.priority ? Utils.priorityBadge(task.priority) : ''}
            ${task.dueDate ? `<span class="badge badge-category">📅 ${Utils.formatDateShort(task.dueDate)}</span>` : ''}
            ${task.completed ? '<span class="badge badge-priority-low">Done</span>' : '<span class="badge badge-priority-high">Pending</span>'}
          </div>
          <div class="form-group">
            <label>Reschedule</label>
            <input type="date" id="td-date" value="${task.dueDate || Utils.todayStr()}">
          </div>
        </div>
        <div class="form-actions" style="justify-content: space-between;">
          <div class="form-actions-left">
            <button type="button" class="btn btn-outline" id="td-edit">Edit Task</button>
          </div>
          <div class="form-actions-right" style="display:flex;gap:8px;">
            <button type="button" class="btn btn-secondary" id="td-toggle">${task.completed ? 'Mark as Pending' : 'Mark as Done'}</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </div>
      </form>
    `;
    Utils.openModal('Task Details', html);

    document.getElementById('task-detail-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newDate = document.getElementById('td-date').value;
      await API.update('tasks', task.id, { dueDate: newDate });
      Utils.toast('Task rescheduled', 'success');
      Utils.closeModal();
      DashboardPage.refreshTaskViews();
    });

    document.getElementById('td-toggle').addEventListener('click', async () => {
      const update = task.completed ? { completed: false, completedAt: null } : { completed: true, completedAt: new Date().toISOString() };
      await API.update('tasks', task.id, update);
      Utils.toast(task.completed ? 'Marked as pending' : 'Marked as done', 'success');
      Utils.closeModal();
      DashboardPage.refreshTaskViews();
    });

    document.getElementById('td-edit').addEventListener('click', () => {
      Utils.closeModal();
      TasksPage.showAddModal(task);
    });
  },

  shiftWeek(deltaDays) {
    DashboardPage.weekOffset += deltaDays;
    DashboardPage.render();
  },

  resetWeek() {
    DashboardPage.weekOffset = 0;
    DashboardPage.render();
  },

  refreshTaskViews() {
    DashboardPage.render();
    if (location.hash.includes('tasks')) TasksPage.render();
  },

  async toggleTask(id, complete) {
    const update = complete ?
      { completed: true, completedAt: new Date().toISOString() } :
      { completed: false, completedAt: null };
    await API.update('tasks', id, update);
    DashboardPage.refreshTaskViews();
  }
};
