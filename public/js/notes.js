// ── Sticky Notes Page ────────────────────────────────────────────

const NotesPage = {
    viewMode: 'grid',
    searchQuery: '',
    filterCategory: '',

    async render() {
        const notes = await API.get('notes');

        let filtered = [...notes];
        if (NotesPage.searchQuery) {
            const q = NotesPage.searchQuery.toLowerCase();
            filtered = filtered.filter(n =>
                (n.title || '').toLowerCase().includes(q) ||
                (n.content || '').toLowerCase().includes(q)
            );
        }
        if (NotesPage.filterCategory) {
            filtered = filtered.filter(n => n.category === NotesPage.filterCategory);
        }

        // Sort: pinned first, then by creation date
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        const categories = ['Personal', 'Work', 'Family', 'Finance', 'Health', 'Ideas', 'To-Do', 'Reference'];
        const colorMap = {
            Personal: 'note-blue', Work: 'note-gray', Family: 'note-green',
            Finance: 'note-yellow', Health: 'note-pink', Ideas: 'note-purple',
            'To-Do': 'note-orange', Reference: 'note-teal'
        };

        const container = document.getElementById('page-content');
        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">📝 Sticky Notes</div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-outline btn-sm ${NotesPage.viewMode === 'grid' ? 'btn-primary' : ''}" onclick="NotesPage.toggleView('grid')">▦ Grid</button>
          <button class="btn btn-outline btn-sm ${NotesPage.viewMode === 'list' ? 'btn-primary' : ''}" onclick="NotesPage.toggleView('list')">☰ List</button>
          <button class="btn btn-primary" onclick="NotesPage.showAddModal()">+ New Note</button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="text" class="search-input" placeholder="Search notes..." value="${NotesPage.searchQuery}"
               oninput="NotesPage.searchQuery = this.value; NotesPage.render()">
        <select onchange="NotesPage.filterCategory = this.value; NotesPage.render()">
          <option value="">All Categories</option>
          ${categories.map(c => `<option value="${c}" ${NotesPage.filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>

      ${filtered.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <p>No notes found.</p>
            <button class="btn btn-primary" onclick="NotesPage.showAddModal()">Create a note</button>
          </div>
        </div>
      ` : `
        <div class="${NotesPage.viewMode === 'grid' ? 'notes-grid' : 'notes-list'}">
          ${filtered.map(n => `
            <div class="note-card ${colorMap[n.category] || 'note-yellow'}" onclick="NotesPage.showAddModal(null, '${n.id}')">
              ${n.pinned ? '<div class="note-pin">📌</div>' : ''}
              <div class="note-title">${n.title || 'Untitled'}</div>
              <div class="note-content">${n.content || ''}</div>
              <div class="note-meta">${n.category || ''} · ${Utils.formatDateShort(n.createdAt)}</div>
            </div>
          `).join('')}
        </div>
      `}
    `;
    },

    toggleView(mode) {
        NotesPage.viewMode = mode;
        NotesPage.render();
    },

    async showAddModal(note = null, noteId = null) {
        if (noteId && !note) {
            note = await API.get('notes', noteId);
        }
        const isEdit = !!note;
        const categories = ['Personal', 'Work', 'Family', 'Finance', 'Health', 'Ideas', 'To-Do', 'Reference'];
        const colors = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange', 'teal', 'gray'];

        const html = `
      <form id="note-form">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="note-title" value="${note?.title || ''}" placeholder="Note title">
        </div>
        <div class="form-group">
          <label>Content <span class="required">*</span></label>
          <textarea id="note-content" rows="6" required placeholder="Write your note...">${note?.content || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select id="note-category">
              ${categories.map(c => `<option value="${c}" ${(note?.category || 'Personal') === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Color</label>
            <select id="note-color">
              ${colors.map(c => `<option value="${c}" ${(note?.color || 'yellow') === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label style="display:flex;gap:8px;align-items:center;cursor:pointer;">
            <input type="checkbox" id="note-pinned" ${note?.pinned ? 'checked' : ''}>
            📌 Pin this note
          </label>
        </div>
        <div class="form-actions">
          ${isEdit ? `<button type="button" class="btn btn-danger btn-sm" onclick="NotesPage.deleteNote('${note.id}')">Delete</button>` : ''}
          <div style="flex:1"></div>
          <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Note</button>
        </div>
      </form>
    `;
        Utils.openModal(isEdit ? 'Edit Note' : 'New Note', html);
        document.getElementById('note-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('note-title').value.trim(),
                content: document.getElementById('note-content').value.trim(),
                category: document.getElementById('note-category').value,
                color: document.getElementById('note-color').value,
                pinned: document.getElementById('note-pinned').checked
            };
            if (isEdit) {
                await API.update('notes', note.id, data);
                Utils.toast('Note updated');
            } else {
                await API.create('notes', data);
                Utils.toast('Note created', 'success');
            }
            Utils.closeModal();
            NotesPage.render();
        });
    },

    async deleteNote(id) {
        if (await Utils.confirm('Delete this note?')) {
            await API.delete('notes', id);
            Utils.toast('Note deleted');
            Utils.closeModal();
            NotesPage.render();
        }
    }
};
