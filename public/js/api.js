// ── API Helper ───────────────────────────────────────────────────

const API = {
    // Handle 401 globally
    _checkAuth(res) {
        if (res.status === 401) {
            window.location.href = '/login.html';
            throw new Error('Session expired');
        }
        return res;
    },

    async get(collection, id) {
        const url = id ? `/api/${collection}/${id}` : `/api/${collection}`;
        const res = API._checkAuth(await fetch(url));
        if (!res.ok) throw new Error(`Failed to fetch ${collection}`);
        return res.json();
    },

    async create(collection, data) {
        const res = API._checkAuth(await fetch(`/api/${collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }));
        if (!res.ok) throw new Error(`Failed to create in ${collection}`);
        return res.json();
    },

    async update(collection, id, data) {
        const res = API._checkAuth(await fetch(`/api/${collection}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }));
        if (!res.ok) throw new Error(`Failed to update ${collection}/${id}`);
        return res.json();
    },

    async delete(collection, id) {
        const res = API._checkAuth(await fetch(`/api/${collection}/${id}`, {
            method: 'DELETE'
        }));
        if (!res.ok) throw new Error(`Failed to delete ${collection}/${id}`);
        return res.json();
    },

    async updateCollection(collection, data) {
        const res = API._checkAuth(await fetch(`/api/${collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }));
        if (!res.ok) throw new Error(`Failed to update ${collection}`);
        return res.json();
    },

    async backup() {
        const res = API._checkAuth(await fetch('/api/system/backup', { method: 'POST' }));
        return res.json();
    },

    async listBackups() {
        const res = API._checkAuth(await fetch('/api/system/backups'));
        return res.json();
    },

    async restore(backup) {
        const res = API._checkAuth(await fetch('/api/system/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backup })
        }));
        return res.json();
    }
};
