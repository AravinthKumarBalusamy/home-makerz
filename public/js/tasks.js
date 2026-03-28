// ── Tasks Page ───────────────────────────────────────────────────

const TasksPage = {
    currentView: 'today',

    async render() {
        const tasks = await API.get('tasks');
        const today = Utils.todayStr();

        let filtered;
        switch (TasksPage.currentView) {
            case 'today':
                filtered = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate <= today));
                break;
            case 'upcoming':
                filtered = tasks.filter(t => !t.completed && t.dueDate && t.dueDate > today);
                break;
            case 'completed':
                filtered = tasks.filter(t => t.completed);
                break;
            default:
                filtered = tasks.filter(t => !t.completed);
        }

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">Task Management</div>
        <button class="btn btn-primary" onclick="TasksPage.showAddModal()">+ New Task</button>
      </div>

      <div class="tabs">
        <button class="tab ${TasksPage.currentView === 'today' ? 'active' : ''}" onclick="TasksPage.switchView('today')">Today</button>
        <button class="tab ${TasksPage.currentView === 'upcoming' ? 'active' : ''}" onclick="TasksPage.switchView('upcoming')">Upcoming</button>
        <button class="tab ${TasksPage.currentView === 'all' ? 'active' : ''}" onclick="TasksPage.switchView('all')">All</button>
        <button class="tab ${TasksPage.currentView === 'completed' ? 'active' : ''}" onclick="TasksPage.switchView('completed')">Completed</button>
      </div>

      <div class="card">
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>No tasks in this view.</p>
            <button class="btn btn-primary" onclick="TasksPage.showAddModal()">Add a task</button>
          </div>
        ` : `
          <ul class="task-list">
            ${filtered.sort((a, b) => {
            const p = { high: 0, medium: 1, low: 2 };
            return (p[a.priority] || 2) - (p[b.priority] || 2);
        }).map(t => `
              <li class="task-item ${t.completed ? 'task-completed' : ''}">
                <div class="task-checkbox ${t.completed ? 'checked' : ''}"
                     onclick="TasksPage.toggleTask('${t.id}')"></div>
                <div class="task-info">
                  <div class="task-title">${t.title}</div>
                  ${t.description ? `<div class="text-small text-muted">${t.description}</div>` : ''}
                  <div class="task-meta">
                    ${Utils.assigneeBadge(t.assignee)}
                    ${Utils.priorityBadge(t.priority)}
                    ${t.dueDate ? `<span class="text-small text-muted">📅 ${Utils.formatDateShort(t.dueDate)}</span>` : ''}
                    ${t.recurring && t.recurring !== 'none' ? `<span class="badge badge-category">🔄 ${t.recurring}</span>` : ''}
                    ${t.completed && t.completedAt ? `<span class="text-small text-muted">✓ ${Utils.formatDateTime(t.completedAt)}</span>` : ''}
                  </div>
                </div>
                <div class="task-actions">
                  <button class="btn-icon" onclick="TasksPage.editTask('${t.id}')" title="Edit">✏️</button>
                  <button class="btn-icon" onclick="TasksPage.deleteTask('${t.id}')" title="Delete">🗑️</button>
                </div>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    `;
    },

    switchView(view) {
        TasksPage.currentView = view;
        TasksPage.render();
    },

    showAddModal(task = null) {
        const isEdit = !!task;
        const html = `
      <form id="task-form">
        <div class="form-group">
          <label>Title <span class="required">*</span></label>
          <input type="text" id="task-title" value="${task?.title || ''}" required placeholder="What needs to be done?">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="task-desc" placeholder="Optional details...">${task?.description || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Assigned To</label>
            <select id="task-assignee">
              <option value="husband" ${task?.assignee === 'husband' ? 'selected' : ''}>Husband</option>
              <option value="wife" ${task?.assignee === 'wife' ? 'selected' : ''}>Wife</option>
              <option value="both" ${task?.assignee === 'both' ? 'selected' : ''}>Both</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="task-priority">
              <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Due Date</label>
            <input type="date" id="task-date" value="${task?.dueDate || Utils.todayStr()}">
          </div>
          <div class="form-group">
            <label>Recurring</label>
            <select id="task-recurring">
              <option value="none" ${task?.recurring === 'none' ? 'selected' : ''}>None</option>
              <option value="daily" ${task?.recurring === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${task?.recurring === 'weekly' ? 'selected' : ''}>Weekly</option>
              <option value="monthly" ${task?.recurring === 'monthly' ? 'selected' : ''}>Monthly</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Task</button>
        </div>
      </form>
    `;
        Utils.openModal(isEdit ? 'Edit Task' : 'New Task', html);
        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('task-title').value.trim(),
                description: document.getElementById('task-desc').value.trim(),
                assignee: document.getElementById('task-assignee').value,
                priority: document.getElementById('task-priority').value,
                dueDate: document.getElementById('task-date').value,
                recurring: document.getElementById('task-recurring').value,
                completed: task?.completed || false,
                completedAt: task?.completedAt || null
            };
            if (!data.title) return Utils.toast('Title is required', 'error');
            if (isEdit) {
                await API.update('tasks', task.id, data);
                Utils.toast('Task updated');
            } else {
                await API.create('tasks', data);
                Utils.toast('Task added', 'success');
            }
            Utils.closeModal();
            // Re-render current page
            const hash = location.hash || '#/dashboard';
            if (hash.includes('dashboard')) DashboardPage.render();
            else TasksPage.render();
        });
    },

    async editTask(id) {
        const task = await API.get('tasks', id);
        TasksPage.showAddModal(task);
    },

    async toggleTask(id) {
        const task = await API.get('tasks', id);
        const update = task.completed ?
            { completed: false, completedAt: null } :
            { completed: true, completedAt: new Date().toISOString() };
        await API.update('tasks', id, update);
        TasksPage.render();
    },

    async deleteTask(id) {
        if (await Utils.confirm('Delete this task?')) {
            await API.delete('tasks', id);
            Utils.toast('Task deleted');
            const hash = location.hash || '#/dashboard';
            if (hash.includes('dashboard')) DashboardPage.render();
            else TasksPage.render();
        }
    }
};
