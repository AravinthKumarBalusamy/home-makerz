// ── Kids Management Page ─────────────────────────────────────────

const KidsPage = {
    currentTab: 'activities',
    calendarMonth: null,
    calendarYear: null,

    async render() {
        const kids = await API.get('kids');
        const now = new Date();
        if (!KidsPage.calendarMonth) KidsPage.calendarMonth = now.getMonth() + 1;
        if (!KidsPage.calendarYear) KidsPage.calendarYear = now.getFullYear();

        const activities = kids.filter(k => k.type === 'activity');
        const milestones = kids.filter(k => k.type === 'milestone');
        const health = kids.filter(k => k.type === 'health');
        const school = kids.filter(k => k.type === 'school');

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">👶 Kids Management</div>
        <button class="btn btn-primary" onclick="KidsPage.showAddModal()">+ Add Entry</button>
      </div>

      <div class="tabs">
        <button class="tab ${KidsPage.currentTab === 'activities' ? 'active' : ''}" onclick="KidsPage.switchTab('activities')">Activities (${activities.length})</button>
        <button class="tab ${KidsPage.currentTab === 'milestones' ? 'active' : ''}" onclick="KidsPage.switchTab('milestones')">Milestones (${milestones.length})</button>
        <button class="tab ${KidsPage.currentTab === 'health' ? 'active' : ''}" onclick="KidsPage.switchTab('health')">Health (${health.length})</button>
        <button class="tab ${KidsPage.currentTab === 'school' ? 'active' : ''}" onclick="KidsPage.switchTab('school')">School (${school.length})</button>
        <button class="tab ${KidsPage.currentTab === 'calendar' ? 'active' : ''}" onclick="KidsPage.switchTab('calendar')">Calendar</button>
      </div>

      <div id="kids-content"></div>
    `;

        const content = document.getElementById('kids-content');
        switch (KidsPage.currentTab) {
            case 'activities': KidsPage.renderList(content, activities, 'activity'); break;
            case 'milestones': KidsPage.renderList(content, milestones, 'milestone'); break;
            case 'health': KidsPage.renderList(content, health, 'health'); break;
            case 'school': KidsPage.renderList(content, school, 'school'); break;
            case 'calendar': KidsPage.renderCalendar(content, kids); break;
        }
    },

    renderList(container, items, type) {
        const sorted = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        if (sorted.length === 0) {
            const icons = { activity: '🎨', milestone: '⭐', health: '💊', school: '📚' };
            container.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">${icons[type] || '📋'}</div><p>No ${type} entries yet.</p><button class="btn btn-primary" onclick="KidsPage.showAddModal()">Add entry</button></div></div>`;
            return;
        }
        container.innerHTML = `
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              ${type === 'activity' ? '<th>Time</th><th>Category</th>' : ''}
              ${type === 'health' ? '<th>Category</th>' : ''}
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(item => `
              <tr>
                <td class="text-muted">${Utils.formatDateShort(item.date)}</td>
                <td><strong>${item.title}</strong></td>
                ${type === 'activity' ? `<td class="text-muted">${item.time ? Utils.formatTime(item.time) : '-'}</td><td><span class="badge badge-category">${item.category || '-'}</span></td>` : ''}
                ${type === 'health' ? `<td><span class="badge badge-category">${item.category || '-'}</span></td>` : ''}
                <td class="text-small text-muted">${item.notes || '-'}</td>
                <td>
                  <button class="btn-icon" onclick="KidsPage.editEntry('${item.id}')" title="Edit">✏️</button>
                  <button class="btn-icon" onclick="KidsPage.deleteEntry('${item.id}')" title="Delete">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    },

    renderCalendar(container, kids) {
        const m = KidsPage.calendarMonth;
        const y = KidsPage.calendarYear;
        const daysInMonth = Utils.daysInMonth(y, m);
        const firstDay = Utils.dayOfWeek(y, m, 1);
        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Events for this month
        const monthStr = `${y}-${String(m).padStart(2, '0')}`;
        const monthEvents = kids.filter(k => k.date && k.date.startsWith(monthStr));

        let calendarHTML = `
      <div class="card">
        <div class="flex-between mb-16">
          <button class="btn btn-outline btn-sm" onclick="KidsPage.changeMonth(-1)">← Prev</button>
          <strong>${Utils.monthName(m)} ${y}</strong>
          <button class="btn btn-outline btn-sm" onclick="KidsPage.changeMonth(1)">Next →</button>
        </div>
        <div class="calendar-grid">
          ${dayNames.map(d => `<div class="calendar-header">${d}</div>`).join('')}
    `;

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) calendarHTML += '<div class="calendar-day other-month"></div>';

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getDate() === day && today.getMonth() + 1 === m && today.getFullYear() === y;
            const dayEvents = monthEvents.filter(e => e.date === dateStr);

            calendarHTML += `
        <div class="calendar-day ${isToday ? 'today' : ''}">
          <div class="day-num">${day}</div>
          ${dayEvents.map(e => `<div class="calendar-event" title="${e.title}">${e.title}</div>`).join('')}
        </div>
      `;
        }

        calendarHTML += '</div></div>';
        container.innerHTML = calendarHTML;
    },

    changeMonth(delta) {
        KidsPage.calendarMonth += delta;
        if (KidsPage.calendarMonth > 12) { KidsPage.calendarMonth = 1; KidsPage.calendarYear++; }
        if (KidsPage.calendarMonth < 1) { KidsPage.calendarMonth = 12; KidsPage.calendarYear--; }
        KidsPage.render();
    },

    switchTab(tab) {
        KidsPage.currentTab = tab;
        KidsPage.render();
    },

    showAddModal(item = null) {
        const isEdit = !!item;
        const categories = {
            activity: ['School', 'Sports', 'Arts', 'Music', 'Dance', 'Other'],
            health: ['Vaccination', 'Doctor Visit', 'Medication', 'Lab Test', 'Other'],
            school: ['Exam', 'Event', 'Achievement', 'PTM', 'Other'],
            milestone: ['Development', 'First Time', 'Achievement', 'Other']
        };

        const html = `
      <form id="kids-form">
        <div class="form-group">
          <label>Title <span class="required">*</span></label>
          <input type="text" id="kids-title" value="${item?.title || ''}" required placeholder="What happened?">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="kids-type" onchange="KidsPage.updateCategoryDropdown()">
              <option value="activity" ${(item?.type || 'activity') === 'activity' ? 'selected' : ''}>Activity</option>
              <option value="milestone" ${item?.type === 'milestone' ? 'selected' : ''}>Milestone</option>
              <option value="health" ${item?.type === 'health' ? 'selected' : ''}>Health</option>
              <option value="school" ${item?.type === 'school' ? 'selected' : ''}>School</option>
            </select>
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="kids-category">
              ${(categories[item?.type || 'activity'] || []).map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="kids-date" value="${item?.date || Utils.todayStr()}">
          </div>
          <div class="form-group">
            <label>Time</label>
            <input type="time" id="kids-time" value="${item?.time || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="kids-notes" placeholder="Details...">${item?.notes || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Entry</button>
        </div>
      </form>
    `;
        Utils.openModal(isEdit ? 'Edit Entry' : 'New Kids Entry', html);

        document.getElementById('kids-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('kids-title').value.trim(),
                type: document.getElementById('kids-type').value,
                category: document.getElementById('kids-category').value,
                date: document.getElementById('kids-date').value,
                time: document.getElementById('kids-time').value,
                notes: document.getElementById('kids-notes').value.trim()
            };
            if (isEdit) {
                await API.update('kids', item.id, data);
                Utils.toast('Entry updated');
            } else {
                await API.create('kids', data);
                Utils.toast('Entry added', 'success');
            }
            Utils.closeModal();
            KidsPage.render();
        });
    },

    updateCategoryDropdown() {
        const type = document.getElementById('kids-type').value;
        const categories = {
            activity: ['School', 'Sports', 'Arts', 'Music', 'Dance', 'Other'],
            health: ['Vaccination', 'Doctor Visit', 'Medication', 'Lab Test', 'Other'],
            school: ['Exam', 'Event', 'Achievement', 'PTM', 'Other'],
            milestone: ['Development', 'First Time', 'Achievement', 'Other']
        };
        document.getElementById('kids-category').innerHTML =
            (categories[type] || []).map(c => `<option value="${c}">${c}</option>`).join('');
    },

    async editEntry(id) {
        const item = await API.get('kids', id);
        KidsPage.showAddModal(item);
    },

    async deleteEntry(id) {
        if (await Utils.confirm('Delete this entry?')) {
            await API.delete('kids', id);
            Utils.toast('Entry deleted');
            KidsPage.render();
        }
    }
};
