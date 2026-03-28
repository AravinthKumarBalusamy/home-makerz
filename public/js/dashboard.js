// ── Dashboard Page ───────────────────────────────────────────────

const DashboardPage = {
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

    // Filter today's tasks
    const pendingTasks = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate <= today));
    const completedToday = tasks.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(today));

    // Month finances
    const monthExpenses = expenses.filter(e => Utils.isSameMonth(e.date))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthIncome = income.filter(i => Utils.isSameMonth(i.date))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const monthSavings = monthIncome - monthExpenses;

    // Budget
    const currentBudget = Array.isArray(budget) ?
      budget.find(b => b.month === month && b.year === year) : null;
    const budgetAmount = currentBudget ? currentBudget.amount : 0;
    const budgetPct = budgetAmount > 0 ? Utils.pct(monthExpenses, budgetAmount) : 0;

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
          <div class="sc-sub">${budgetAmount > 0 ? Utils.currency(monthExpenses) + ' of ' + Utils.currency(budgetAmount) : 'Set budget for ' + Utils.monthName(month)}</div>
          ${budgetAmount > 0 ? `<div class="progress-bar mt-8"><div class="progress-fill ${budgetPct > 90 ? 'danger' : budgetPct > 70 ? 'warning' : ''}" style="width:${Math.min(budgetPct, 100)}%"></div></div>` : ''}
        </div>
        <div class="summary-card accent-orange">
          <div class="sc-label">Month Expenses</div>
          <div class="sc-value">${Utils.currency(monthExpenses)}</div>
          <div class="sc-sub">${Utils.monthName(month)} ${year}</div>
        </div>
        <div class="summary-card accent-green">
          <div class="sc-label">Month Income</div>
          <div class="sc-value">${Utils.currency(monthIncome)}</div>
          <div class="sc-sub">${Utils.monthName(month)} ${year}</div>
        </div>
        <div class="summary-card accent-purple">
          <div class="sc-label">Savings</div>
          <div class="sc-value">${Utils.currency(monthSavings)}</div>
          <div class="sc-sub">${monthSavings >= 0 ? 'Good going! 👍' : 'Overspent ⚠️'}</div>
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
        <button class="quick-action-btn" onclick="IncomePage.showAddModal()">
          <span class="qa-icon">💵</span> Add Income
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

      <!-- Pending Tasks (PRIMARY FOCUS) -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📋 Today's Tasks</div>
            <div class="card-subtitle">${pendingTasks.length} pending task${pendingTasks.length !== 1 ? 's' : ''}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="TasksPage.showAddModal()">+ Add Task</button>
        </div>
        <div id="dashboard-pending-tasks">
          ${pendingTasks.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">🎉</div>
              <p>All caught up! No pending tasks for today.</p>
            </div>
          ` : ''}
          <ul class="task-list">
            ${pendingTasks.map(t => DashboardPage.renderTask(t)).join('')}
          </ul>
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

  async toggleTask(id, complete) {
    const update = complete ?
      { completed: true, completedAt: new Date().toISOString() } :
      { completed: false, completedAt: null };
    await API.update('tasks', id, update);
    DashboardPage.render();
  }
};
