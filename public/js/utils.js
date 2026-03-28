// ── HomeMakerz Utilities ─────────────────────────────────────────

const Utils = {
    // Currency formatting (Indian Rupee)
    currency(amount) {
        if (amount === null || amount === undefined) return '₹0';
        return '₹' + Number(amount).toLocaleString('en-IN');
    },

    // Date formatting
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatDateShort(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    },

    formatTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    },

    todayStr() {
        return new Date().toISOString().split('T')[0];
    },

    currentMonth() {
        const d = new Date();
        return { month: d.getMonth() + 1, year: d.getFullYear() };
    },

    monthName(m) {
        const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return names[m] || '';
    },

    monthNameShort(m) {
        return Utils.monthName(m).substring(0, 3);
    },

    isToday(dateStr) {
        return dateStr === Utils.todayStr();
    },

    isSameMonth(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    },

    daysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    },

    dayOfWeek(year, month, day) {
        return new Date(year, month - 1, day).getDay();
    },

    // Percentage
    pct(value, total) {
        if (!total) return 0;
        return Math.round((value / total) * 100);
    },

    // DOM helpers
    el(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        for (const [key, val] of Object.entries(attrs)) {
            if (key === 'className') element.className = val;
            else if (key === 'innerHTML') element.innerHTML = val;
            else if (key === 'textContent') element.textContent = val;
            else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
            else if (key === 'dataset') Object.assign(element.dataset, val);
            else if (key === 'style' && typeof val === 'object') Object.assign(element.style, val);
            else element.setAttribute(key, val);
        }
        children.forEach(child => {
            if (typeof child === 'string') element.appendChild(document.createTextNode(child));
            else if (child) element.appendChild(child);
        });
        return element;
    },

    // Toast notification
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = Utils.el('div', { className: `toast ${type}`, textContent: message });
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = '0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Modal
    openModal(title, contentHtml, options = {}) {
        const overlay = document.getElementById('modal-overlay');
        const modalEl = document.getElementById('modal');
        document.getElementById('modal-title').textContent = title;
        const body = document.getElementById('modal-body');
        if (typeof contentHtml === 'string') body.innerHTML = contentHtml;
        else { body.innerHTML = ''; body.appendChild(contentHtml); }
        if (options.large) modalEl.classList.add('modal-lg');
        else modalEl.classList.remove('modal-lg');
        overlay.classList.add('active');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
        document.getElementById('modal-body').innerHTML = '';
    },

    // Assignee badge
    assigneeBadge(assignee) {
        const map = {
            husband: '<span class="badge badge-husband">Husband</span>',
            wife: '<span class="badge badge-wife">Wife</span>',
            both: '<span class="badge badge-both">Both</span>',
            joint: '<span class="badge badge-both">Joint</span>'
        };
        return map[(assignee || '').toLowerCase()] || '';
    },

    priorityBadge(priority) {
        const map = {
            high: '<span class="badge badge-priority-high">High</span>',
            medium: '<span class="badge badge-priority-medium">Medium</span>',
            low: '<span class="badge badge-priority-low">Low</span>'
        };
        return map[(priority || '').toLowerCase()] || '';
    },

    // Categories and subcategories
    categories: {
        'Food': ['Groceries', 'Dining Out', 'Snacks', 'Beverages', 'Other'],
        'Transport': ['Fuel', 'Maintenance', 'Parking', 'Public Transport', 'Ride Share', 'Other'],
        'Utilities': ['Electricity', 'Water', 'Gas', 'Phone', 'Internet', 'Other'],
        'Healthcare': ['Doctor', 'Medicine', 'Lab Tests', 'Insurance Premium', 'Other'],
        'Education': ['Courses', 'Books', 'Supplies', 'Tuition', 'Other'],
        'Kids': ['School Fees', 'Activities', 'Toys', 'Clothing', 'Other'],
        'Entertainment': ['Movies', 'Subscriptions', 'Events', 'Hobbies', 'Other'],
        'Shopping': ['Clothing', 'Electronics', 'Home', 'Personal Care', 'Other'],
        'Housing': ['Rent', 'Maintenance', 'Furniture', 'Appliances', 'Other'],
        'Savings': ['Investment', 'FD', 'RD', 'SIP', 'Other'],
        'Other': ['Miscellaneous']
    },

    incomeTypes: ['Salary', 'Bonus', 'Variable Pay', 'Freelance', 'Business', 'Investment', 'Gift', 'Refund', 'Other'],

    paymentMethods: ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other'],

    // Motivational quotes
    quotes: [
        "The secret of getting ahead is getting started. — Mark Twain",
        "A budget is telling your money where to go. — Dave Ramsey",
        "Small steps every day lead to big changes. — Unknown",
        "The best time to plant a tree was 20 years ago. The second best time is now.",
        "Do not save what is left after spending, spend what is left after saving. — Warren Buffett",
        "It's not about how much money you make, but how much money you keep.",
        "Together we can do great things. — Mother Teresa",
        "Family is the compass that guides us. — Brad Henry",
        "Every expert was once a beginner. — Helen Hayes",
        "The future depends on what you do today. — Mahatma Gandhi"
    ],

    randomQuote() {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return Utils.quotes[dayOfYear % Utils.quotes.length];
    },

    // Debounce
    debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    },

    // Generate select options
    optionsHtml(items, selected = '') {
        return items.map(i =>
            `<option value="${i}" ${i === selected ? 'selected' : ''}>${i}</option>`
        ).join('');
    },

    // Confirm dialog (simple)
    async confirm(message) {
        return window.confirm(message);
    }
};
