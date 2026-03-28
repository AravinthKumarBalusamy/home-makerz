// ── Goals & Habits Page ──────────────────────────────────────────

const GoalsPage = {
    currentTab: 'habits',

    async render() {
        const goals = await API.get('goals');
        const today = Utils.todayStr();

        const habits = goals.filter(g => g.type === 'habit');
        const weekly = goals.filter(g => g.type === 'weekly');
        const monthly = goals.filter(g => g.type === 'monthly');
        const oneTime = goals.filter(g => g.type === 'one-time');
        const financial = goals.filter(g => g.type === 'financial');

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">🎯 Goals & Habits</div>
        <button class="btn btn-primary" onclick="GoalsPage.showAddModal()">+ Add Goal</button>
      </div>

      <div class="tabs">
        <button class="tab ${GoalsPage.currentTab === 'habits' ? 'active' : ''}" onclick="GoalsPage.switchTab('habits')">Daily Habits (${habits.length})</button>
        <button class="tab ${GoalsPage.currentTab === 'weekly' ? 'active' : ''}" onclick="GoalsPage.switchTab('weekly')">Weekly (${weekly.length})</button>
        <button class="tab ${GoalsPage.currentTab === 'monthly' ? 'active' : ''}" onclick="GoalsPage.switchTab('monthly')">Monthly (${monthly.length})</button>
        <button class="tab ${GoalsPage.currentTab === 'one-time' ? 'active' : ''}" onclick="GoalsPage.switchTab('one-time')">One-Time (${oneTime.length})</button>
        <button class="tab ${GoalsPage.currentTab === 'financial' ? 'active' : ''}" onclick="GoalsPage.switchTab('financial')">Financial (${financial.length})</button>
      </div>

      <div id="goals-content"></div>
    `;

        const content = document.getElementById('goals-content');
        switch (GoalsPage.currentTab) {
            case 'habits': GoalsPage.renderHabits(content, habits, today); break;
            case 'weekly': GoalsPage.renderCountGoals(content, weekly, 'weekly'); break;
            case 'monthly': GoalsPage.renderCountGoals(content, monthly, 'monthly'); break;
            case 'one-time': GoalsPage.renderOneTime(content, oneTime); break;
            case 'financial': GoalsPage.renderFinancial(content, financial); break;
        }
    },

    renderHabits(container, habits, today) {
        if (habits.length === 0) {
            container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">🔄</div><p>No daily habits yet.</p><button class="btn btn-primary" onclick="GoalsPage.showAddModal()">Add a habit</button></div></div>`;
            return;
        }
        container.innerHTML = `
      <div class="card">
        <div class="card-title mb-16">Today's Habits — ${Utils.formatDate(today)}</div>
        ${habits.map(h => {
            const completions = h.completions || [];
            const doneToday = completions.includes(today);
            const streak = GoalsPage.calcStreak(completions);
            return `
            <div class="habit-row">
              <div class="task-checkbox ${doneToday ? 'checked' : ''}" onclick="GoalsPage.toggleHabit('${h.id}', '${today}', ${doneToday})"></div>
              <div class="habit-name">${h.title} ${Utils.assigneeBadge(h.assignee)}</div>
              <div class="streak-badge ${streak >= 7 ? 'fire' : ''}">🔥 ${streak} day${streak !== 1 ? 's' : ''}</div>
              <div class="task-actions">
                <button class="btn-icon" onclick="GoalsPage.editGoal('${h.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="GoalsPage.deleteGoal('${h.id}')" title="Delete">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    },

    renderCountGoals(container, goals, type) {
        if (goals.length === 0) {
            container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">🎯</div><p>No ${type} goals yet.</p><button class="btn btn-primary" onclick="GoalsPage.showAddModal()">Add a goal</button></div></div>`;
            return;
        }
        container.innerHTML = `
      <div class="card">
        ${goals.map(g => {
            const count = g.currentCount || 0;
            const target = g.targetCount || 1;
            const pct = Utils.pct(count, target);
            return `
            <div class="habit-row">
              <div class="habit-name">
                ${g.title} ${Utils.assigneeBadge(g.assignee)}
                <div class="text-small text-muted">${count}/${target} times</div>
              </div>
              <div style="flex:1;max-width:200px;">
                <div class="progress-bar"><div class="progress-fill ${pct >= 100 ? 'success' : ''}" style="width:${Math.min(pct, 100)}%"></div></div>
              </div>
              <button class="btn btn-sm btn-outline" onclick="GoalsPage.incrementGoal('${g.id}')">+1</button>
              <div class="task-actions">
                <button class="btn-icon" onclick="GoalsPage.editGoal('${g.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="GoalsPage.deleteGoal('${g.id}')" title="Delete">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    },

    renderOneTime(container, goals) {
        if (goals.length === 0) {
            container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">🏁</div><p>No one-time goals yet.</p><button class="btn btn-primary" onclick="GoalsPage.showAddModal()">Add a goal</button></div></div>`;
            return;
        }
        container.innerHTML = `
      <div class="card">
        ${goals.map(g => {
            const isOverdue = g.deadline && g.deadline < Utils.todayStr() && !g.completed;
            return `
            <div class="habit-row ${g.completed ? 'task-completed' : ''}">
              <div class="task-checkbox ${g.completed ? 'checked' : ''}" onclick="GoalsPage.toggleOneTime('${g.id}')"></div>
              <div class="habit-name">
                ${g.title} ${Utils.assigneeBadge(g.assignee)}
                ${g.deadline ? `<div class="text-small ${isOverdue ? 'text-danger' : 'text-muted'}">📅 ${Utils.formatDateShort(g.deadline)} ${isOverdue ? '(Overdue)' : ''}</div>` : ''}
                ${g.notes ? `<div class="text-small text-muted">${g.notes}</div>` : ''}
              </div>
              <div class="task-actions">
                <button class="btn-icon" onclick="GoalsPage.editGoal('${g.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="GoalsPage.deleteGoal('${g.id}')" title="Delete">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    },

    renderFinancial(container, goals) {
        if (goals.length === 0) {
            container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">💰</div><p>No financial goals yet.</p><button class="btn btn-primary" onclick="GoalsPage.showAddModal()">Add a financial goal</button></div></div>`;
            return;
        }
        container.innerHTML = `
      <div class="card">
        ${goals.map(g => {
            const current = g.currentAmount || 0;
            const target = g.targetAmount || 1;
            const pct = Utils.pct(current, target);
            return `
            <div style="padding:16px 0;border-bottom:1px solid var(--border-light);">
              <div class="flex-between mb-8">
                <div>
                  <strong>${g.title}</strong> ${Utils.assigneeBadge(g.assignee)}
                  ${g.deadline ? `<span class="text-small text-muted"> · Due ${Utils.formatDateShort(g.deadline)}</span>` : ''}
                </div>
                <div>
                  <button class="btn-icon" onclick="GoalsPage.updateFinancialAmount('${g.id}')" title="Update amount">💰</button>
                  <button class="btn-icon" onclick="GoalsPage.editGoal('${g.id}')" title="Edit">✏️</button>
                  <button class="btn-icon" onclick="GoalsPage.deleteGoal('${g.id}')" title="Delete">🗑️</button>
                </div>
              </div>
              <div class="budget-progress">
                <div class="progress-label">
                  <span>${Utils.currency(current)}</span>
                  <span>${Utils.currency(target)}</span>
                </div>
                <div class="progress-bar"><div class="progress-fill ${pct >= 100 ? 'success' : ''}" style="width:${Math.min(pct, 100)}%"></div></div>
                <div class="text-small text-muted mt-8">${pct}% complete · ${Utils.currency(target - current)} remaining</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    },

    switchTab(tab) {
        GoalsPage.currentTab = tab;
        GoalsPage.render();
    },

    calcStreak(completions) {
        if (!completions || completions.length === 0) return 0;
        const sorted = [...completions].sort().reverse();
        let streak = 0;
        let checkDate = new Date();
        // If today not completed, start from yesterday
        if (!completions.includes(Utils.todayStr())) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        for (let i = 0; i < 365; i++) {
            const ds = checkDate.toISOString().split('T')[0];
            if (sorted.includes(ds)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }
        return streak;
    },

    async toggleHabit(id, date, isDone) {
        const goal = await API.get('goals', id);
        let completions = goal.completions || [];
        if (isDone) {
            completions = completions.filter(d => d !== date);
        } else {
            completions.push(date);
        }
        await API.update('goals', id, { completions });
        GoalsPage.render();
    },

    async toggleOneTime(id) {
        const goal = await API.get('goals', id);
        await API.update('goals', id, { completed: !goal.completed, completedAt: !goal.completed ? new Date().toISOString() : null });
        GoalsPage.render();
    },

    async incrementGoal(id) {
        const goal = await API.get('goals', id);
        await API.update('goals', id, { currentCount: (goal.currentCount || 0) + 1 });
        GoalsPage.render();
    },

    async updateFinancialAmount(id) {
        const goal = await API.get('goals', id);
        const html = `
      <form id="fin-amount-form">
        <div class="form-group">
          <label>Current Amount</label>
          <input type="number" id="fin-current" value="${goal.currentAmount || 0}" min="0" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update</button>
        </div>
      </form>
    `;
        Utils.openModal('Update Amount', html);
        document.getElementById('fin-amount-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await API.update('goals', id, { currentAmount: Number(document.getElementById('fin-current').value) });
            Utils.closeModal();
            Utils.toast('Amount updated', 'success');
            GoalsPage.render();
        });
    },

    showAddModal(goal = null) {
        const isEdit = !!goal;
        const html = `
      <form id="goal-form">
        <div class="form-group">
          <label>Title <span class="required">*</span></label>
          <input type="text" id="goal-title" value="${goal?.title || ''}" required placeholder="e.g., Exercise, Read, Save for vacation">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="goal-type" onchange="GoalsPage.updateGoalForm()">
              <option value="habit" ${(goal?.type || 'habit') === 'habit' ? 'selected' : ''}>Daily Habit</option>
              <option value="weekly" ${goal?.type === 'weekly' ? 'selected' : ''}>Weekly Goal</option>
              <option value="monthly" ${goal?.type === 'monthly' ? 'selected' : ''}>Monthly Goal</option>
              <option value="one-time" ${goal?.type === 'one-time' ? 'selected' : ''}>One-Time Goal</option>
              <option value="financial" ${goal?.type === 'financial' ? 'selected' : ''}>Financial Goal</option>
            </select>
          </div>
          <div class="form-group">
            <label>Assigned To</label>
            <select id="goal-assignee">
              <option value="both" ${(goal?.assignee || 'both') === 'both' ? 'selected' : ''}>Both</option>
              <option value="husband" ${goal?.assignee === 'husband' ? 'selected' : ''}>Husband</option>
              <option value="wife" ${goal?.assignee === 'wife' ? 'selected' : ''}>Wife</option>
            </select>
          </div>
        </div>
        <div id="goal-extra-fields">
          ${GoalsPage.extraFields(goal?.type || 'habit', goal)}
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="goal-notes" placeholder="Optional...">${goal?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Goal</button>
        </div>
      </form>
    `;
        Utils.openModal(isEdit ? 'Edit Goal' : 'New Goal', html);
        document.getElementById('goal-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('goal-type').value;
            const data = {
                title: document.getElementById('goal-title').value.trim(),
                type,
                assignee: document.getElementById('goal-assignee').value,
                notes: document.getElementById('goal-notes').value.trim()
            };
            if (type === 'weekly' || type === 'monthly') {
                data.targetCount = Number(document.getElementById('goal-target')?.value || 1);
                data.currentCount = goal?.currentCount || 0;
            }
            if (type === 'one-time') {
                data.deadline = document.getElementById('goal-deadline')?.value || '';
                data.completed = goal?.completed || false;
            }
            if (type === 'financial') {
                data.targetAmount = Number(document.getElementById('goal-target-amount')?.value || 0);
                data.currentAmount = goal?.currentAmount || 0;
                data.deadline = document.getElementById('goal-fin-deadline')?.value || '';
            }
            if (type === 'habit') {
                data.completions = goal?.completions || [];
            }

            if (isEdit) {
                await API.update('goals', goal.id, data);
                Utils.toast('Goal updated');
            } else {
                await API.create('goals', data);
                Utils.toast('Goal added', 'success');
            }
            Utils.closeModal();
            GoalsPage.render();
        });
    },

    extraFields(type, goal) {
        if (type === 'weekly' || type === 'monthly') {
            return `<div class="form-group"><label>Target Count</label><input type="number" id="goal-target" value="${goal?.targetCount || 3}" min="1"></div>`;
        }
        if (type === 'one-time') {
            return `<div class="form-group"><label>Deadline</label><input type="date" id="goal-deadline" value="${goal?.deadline || ''}"></div>`;
        }
        if (type === 'financial') {
            return `
        <div class="form-row">
          <div class="form-group"><label>Target Amount</label><input type="number" id="goal-target-amount" value="${goal?.targetAmount || ''}" min="0" placeholder="₹ 0"></div>
          <div class="form-group"><label>Deadline</label><input type="date" id="goal-fin-deadline" value="${goal?.deadline || ''}"></div>
        </div>
      `;
        }
        return '';
    },

    updateGoalForm() {
        const type = document.getElementById('goal-type').value;
        document.getElementById('goal-extra-fields').innerHTML = GoalsPage.extraFields(type);
    },

    async editGoal(id) {
        const goal = await API.get('goals', id);
        GoalsPage.showAddModal(goal);
    },

    async deleteGoal(id) {
        if (await Utils.confirm('Delete this goal?')) {
            await API.delete('goals', id);
            Utils.toast('Goal deleted');
            GoalsPage.render();
        }
    }
};
