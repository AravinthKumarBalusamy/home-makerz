// ── Bill Scanner Page ────────────────────────────────────────────

const BillsPage = {
    currentView: 'upload', // 'upload', 'review', 'history'
    uploadedFile: null,
    extractedData: null,

    async render() {
        const container = document.getElementById('page-content');
        const bills = await API.get('bills');
        const billsList = Array.isArray(bills) ? bills : [];

        container.innerHTML = `
      <div class="section-header">
        <div class="section-title">📄 Bill Scanner</div>
        <div class="bills-tab-bar">
          <button class="btn ${BillsPage.currentView === 'upload' ? 'btn-primary' : 'btn-outline'}" onclick="BillsPage.switchView('upload')">📤 Upload</button>
          <button class="btn ${BillsPage.currentView === 'history' ? 'btn-primary' : 'btn-outline'}" onclick="BillsPage.switchView('history')">📋 History (${billsList.length})</button>
        </div>
      </div>
      <div id="bills-view-content"></div>
    `;

        if (BillsPage.currentView === 'upload') {
            BillsPage.renderUploadView();
        } else if (BillsPage.currentView === 'review') {
            BillsPage.renderReviewView();
        } else {
            BillsPage.renderHistoryView(billsList);
        }
    },

    switchView(view) {
        BillsPage.currentView = view;
        BillsPage.render();
    },

    renderUploadView() {
        const content = document.getElementById('bills-view-content');
        content.innerHTML = `
      <div class="card bills-upload-card">
        <div class="bills-upload-zone" id="bill-drop-zone">
          <div class="upload-icon">📸</div>
          <div class="upload-title">Drop your bill here</div>
          <div class="upload-subtitle">or click to browse files</div>
          <div class="upload-formats">Supports: JPG, PNG, WebP, HEIC</div>
          <input type="file" id="bill-file-input" accept="image/*,.pdf" style="display:none" onchange="BillsPage.handleFileSelect(event)">
        </div>

        <div id="bill-preview-area" class="bill-preview-area" style="display:none;">
          <div class="bill-preview-img-wrap">
            <img id="bill-preview-img" src="" alt="Bill preview">
            <button class="btn-icon bill-remove-btn" onclick="BillsPage.removeFile()" title="Remove">✕</button>
          </div>
          <div class="bill-file-info" id="bill-file-info"></div>
        </div>

        <div class="bill-options">
          <div class="form-group">
            <label>Bill Type <span class="required">*</span></label>
            <select id="bill-type-select">
              <option value="supermarket">🛒 Supermarket / Grocery (DMart, LuLu, etc.)</option>
              <option value="medical">💊 Medical / Pharmacy</option>
              <option value="upi_history">📱 UPI Transaction History</option>
              <option value="food_delivery">🍕 Food Delivery (Swiggy, Zomato)</option>
              <option value="general">📄 General Bill / Receipt</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Paid By</label>
              <select id="bill-paid-by">
                <option value="husband">Husband</option>
                <option value="wife">Wife</option>
                <option value="joint">Joint</option>
              </select>
            </div>
            <div class="form-group">
              <label>Payment Method</label>
              <select id="bill-payment-method">
                ${Utils.paymentMethods.map(m => `<option value="${m}">${m}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="bill-actions">
          <button class="btn btn-primary btn-lg" id="scan-bill-btn" onclick="BillsPage.scanBill()" disabled>
            🔍 Scan & Extract
          </button>
        </div>
      </div>

      <div class="card bills-how-it-works">
        <div class="card-title">How it works</div>
        <div class="how-steps">
          <div class="how-step">
            <div class="how-step-num">1</div>
            <div class="how-step-text"><strong>Upload</strong> — Take a photo or screenshot of your bill</div>
          </div>
          <div class="how-step">
            <div class="how-step-num">2</div>
            <div class="how-step-text"><strong>Extract</strong> — AI reads and extracts every line item</div>
          </div>
          <div class="how-step">
            <div class="how-step-num">3</div>
            <div class="how-step-text"><strong>Review</strong> — Check, edit, or remove items</div>
          </div>
          <div class="how-step">
            <div class="how-step-num">4</div>
            <div class="how-step-text"><strong>Import</strong> — One click adds all expenses & updates budget</div>
          </div>
        </div>
      </div>
    `;

        // Drag and drop handlers
        const dropZone = document.getElementById('bill-drop-zone');
        const fileInput = document.getElementById('bill-file-input');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                BillsPage.processFile(e.dataTransfer.files[0]);
            }
        });

        // If a file was already selected (coming back from review)
        if (BillsPage.uploadedFile) {
            BillsPage.showPreview(BillsPage.uploadedFile);
        }
    },

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) BillsPage.processFile(file);
    },

    processFile(file) {
        BillsPage.uploadedFile = file;
        BillsPage.showPreview(file);
    },

    showPreview(file) {
        const dropZone = document.getElementById('bill-drop-zone');
        const previewArea = document.getElementById('bill-preview-area');
        const previewImg = document.getElementById('bill-preview-img');
        const fileInfo = document.getElementById('bill-file-info');
        const scanBtn = document.getElementById('scan-bill-btn');

        if (!dropZone || !previewArea) return;

        dropZone.style.display = 'none';
        previewArea.style.display = 'flex';
        scanBtn.disabled = false;

        if (file.type && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => { previewImg.src = e.target.result; };
            reader.readAsDataURL(file);
        } else {
            previewImg.src = '';
            previewImg.alt = '📄 ' + file.name;
        }

        const sizeKB = (file.size / 1024).toFixed(1);
        fileInfo.innerHTML = `<strong>${file.name}</strong> · ${sizeKB} KB`;
    },

    removeFile() {
        BillsPage.uploadedFile = null;
        BillsPage.extractedData = null;
        BillsPage.renderUploadView();
    },

    async scanBill() {
        if (!BillsPage.uploadedFile) {
            Utils.toast('Please select a file first', 'error');
            return;
        }

        const scanBtn = document.getElementById('scan-bill-btn');
        const billType = document.getElementById('bill-type-select').value;

        scanBtn.disabled = true;
        scanBtn.innerHTML = '<span class="scan-spinner"></span> Scanning with AI...';

        try {
            // Single step: upload file + extract in one request
            const formData = new FormData();
            formData.append('bill', BillsPage.uploadedFile);
            formData.append('billType', billType);

            const extractRes = await fetch('/api/bills/extract', {
                method: 'POST',
                body: formData
            });
            if (!extractRes.ok) {
                const err = await extractRes.json();
                throw new Error(err.error || 'Extraction failed');
            }
            const extracted = await extractRes.json();

            BillsPage.extractedData = {
                ...extracted,
                billType,
                paidBy: document.getElementById('bill-paid-by').value,
                paymentMethod: document.getElementById('bill-payment-method').value
            };

            // Switch to review view
            BillsPage.currentView = 'review';
            BillsPage.render();
            Utils.toast('Bill scanned successfully!', 'success');

        } catch (err) {
            console.error('Scan error:', err);
            Utils.toast(err.message || 'Failed to scan bill', 'error');
            scanBtn.disabled = false;
            scanBtn.innerHTML = '🔍 Scan & Extract';
        }
    },

    renderReviewView() {
        const content = document.getElementById('bills-view-content');
        const data = BillsPage.extractedData;
        if (!data) {
            BillsPage.currentView = 'upload';
            BillsPage.renderUploadView();
            return;
        }

        const items = data.items || [];
        const billTypeLabels = {
            supermarket: '🛒 Supermarket',
            medical: '💊 Medical',
            upi_history: '📱 UPI History',
            food_delivery: '🍕 Food Delivery',
            general: '📄 General'
        };

        const categoryOptions = Object.keys(Utils.categories).map(c =>
            `<option value="${c}">${c}</option>`
        ).join('');

        content.innerHTML = `
      <div class="card bill-review-card">
        <div class="bill-review-header">
          <div>
            <h3>📋 Review Extracted Items</h3>
            <p class="text-muted">Review and edit the extracted data before importing as expenses.</p>
          </div>
          <span class="badge badge-category">${billTypeLabels[data.billType] || data.billType}</span>
        </div>

        <div class="bill-review-meta">
          <div class="form-row">
            <div class="form-group">
              <label>Store / Source</label>
              <input type="text" id="review-store" value="${data.store || ''}" placeholder="Store name">
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="review-date" value="${data.date || Utils.todayStr()}">
            </div>
            <div class="form-group">
              <label>Paid By</label>
              <select id="review-paid-by">
                <option value="husband" ${data.paidBy === 'husband' ? 'selected' : ''}>Husband</option>
                <option value="wife" ${data.paidBy === 'wife' ? 'selected' : ''}>Wife</option>
                <option value="joint" ${data.paidBy === 'joint' ? 'selected' : ''}>Joint</option>
              </select>
            </div>
            <div class="form-group">
              <label>Payment Method</label>
              <select id="review-payment-method">
                ${Utils.paymentMethods.map(m =>
            `<option value="${m}" ${(data.paymentMethod || '').toLowerCase() === m.toLowerCase() ? 'selected' : ''}>${m}</option>`
        ).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="bill-review-table-wrap">
          <table class="data-table bill-review-table" id="review-items-table">
            <thead>
              <tr>
                <th style="width:40px;">
                  <input type="checkbox" id="review-select-all" checked onchange="BillsPage.toggleAllItems(this.checked)">
                </th>
                <th>Description</th>
                ${data.billType === 'upi_history' ? '<th>Date</th>' : ''}
                <th>Category</th>
                <th>Subcategory</th>
                <th class="text-right" style="width:120px;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr class="review-item-row" data-idx="${idx}">
                  <td>
                    <input type="checkbox" class="review-item-check" data-idx="${idx}" checked>
                  </td>
                  <td>
                    <input type="text" class="review-input review-desc" data-idx="${idx}" value="${(item.description || '').replace(/"/g, '&quot;')}">
                  </td>
                  ${data.billType === 'upi_history' ? `
                    <td>
                      <input type="date" class="review-input review-item-date" data-idx="${idx}" value="${item.date || data.date || ''}">
                    </td>
                  ` : ''}
                  <td>
                    <select class="review-input review-cat" data-idx="${idx}" onchange="BillsPage.updateSubcategoryOptions(${idx})">
                      ${Object.keys(Utils.categories).map(c =>
            `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`
        ).join('')}
                    </select>
                  </td>
                  <td>
                    <select class="review-input review-subcat" data-idx="${idx}" id="review-subcat-${idx}">
                      ${(Utils.categories[item.category] || Utils.categories['Other']).map(s =>
            `<option value="${s}" ${item.subcategory === s ? 'selected' : ''}>${s}</option>`
        ).join('')}
                    </select>
                  </td>
                  <td>
                    <input type="number" class="review-input review-amount text-right" data-idx="${idx}" value="${item.amount || 0}" min="0" step="1">
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="review-total-row">
                <td colspan="${data.billType === 'upi_history' ? 5 : 4}" class="text-right"><strong>Total:</strong></td>
                <td class="text-right"><strong id="review-total">${Utils.currency(data.total || items.reduce((s, i) => s + (i.amount || 0), 0))}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="bill-review-summary">
          <div class="review-stat">
            <span class="review-stat-label">Items</span>
            <span class="review-stat-value" id="review-item-count">${items.length}</span>
          </div>
          <div class="review-stat">
            <span class="review-stat-label">Selected</span>
            <span class="review-stat-value" id="review-selected-count">${items.length}</span>
          </div>
          <div class="review-stat">
            <span class="review-stat-label">Total</span>
            <span class="review-stat-value" id="review-selected-total">${Utils.currency(data.total || items.reduce((s, i) => s + (i.amount || 0), 0))}</span>
          </div>
        </div>

        <div class="bill-review-actions">
          <button class="btn btn-outline" onclick="BillsPage.backToUpload()">← Back</button>
          <div>
            <button class="btn btn-outline" onclick="BillsPage.addManualItem()">+ Add Item</button>
            <button class="btn btn-primary btn-lg" id="import-btn" onclick="BillsPage.importItems()">
              ✅ Import ${items.length} Expenses
            </button>
          </div>
        </div>
      </div>
    `;

        // Add event listeners for live total updates
        document.querySelectorAll('.review-amount, .review-item-check').forEach(el => {
            el.addEventListener('change', () => BillsPage.updateReviewTotals());
            el.addEventListener('input', () => BillsPage.updateReviewTotals());
        });
    },

    toggleAllItems(checked) {
        document.querySelectorAll('.review-item-check').forEach(cb => {
            cb.checked = checked;
        });
        BillsPage.updateReviewTotals();
    },

    updateSubcategoryOptions(idx) {
        const catSelect = document.querySelector(`.review-cat[data-idx="${idx}"]`);
        const subSelect = document.getElementById(`review-subcat-${idx}`);
        if (!catSelect || !subSelect) return;
        const cat = catSelect.value;
        subSelect.innerHTML = (Utils.categories[cat] || Utils.categories['Other']).map(s =>
            `<option value="${s}">${s}</option>`
        ).join('');
    },

    updateReviewTotals() {
        const checks = document.querySelectorAll('.review-item-check');
        const amounts = document.querySelectorAll('.review-amount');
        let selectedCount = 0;
        let selectedTotal = 0;
        let allTotal = 0;

        checks.forEach((cb, i) => {
            const amt = Number(amounts[i]?.value || 0);
            allTotal += amt;
            if (cb.checked) {
                selectedCount++;
                selectedTotal += amt;
            }
        });

        const totalEl = document.getElementById('review-total');
        const selectedCountEl = document.getElementById('review-selected-count');
        const selectedTotalEl = document.getElementById('review-selected-total');
        const importBtn = document.getElementById('import-btn');

        if (totalEl) totalEl.textContent = Utils.currency(allTotal);
        if (selectedCountEl) selectedCountEl.textContent = selectedCount;
        if (selectedTotalEl) selectedTotalEl.textContent = Utils.currency(selectedTotal);
        if (importBtn) importBtn.textContent = `✅ Import ${selectedCount} Expenses`;
    },

    addManualItem() {
        const tbody = document.querySelector('#review-items-table tbody');
        if (!tbody) return;
        const idx = tbody.querySelectorAll('tr').length;
        const isUpi = BillsPage.extractedData?.billType === 'upi_history';
        const row = document.createElement('tr');
        row.className = 'review-item-row';
        row.dataset.idx = idx;
        row.innerHTML = `
      <td><input type="checkbox" class="review-item-check" data-idx="${idx}" checked></td>
      <td><input type="text" class="review-input review-desc" data-idx="${idx}" value="" placeholder="Item description"></td>
      ${isUpi ? `<td><input type="date" class="review-input review-item-date" data-idx="${idx}" value="${Utils.todayStr()}"></td>` : ''}
      <td>
        <select class="review-input review-cat" data-idx="${idx}" onchange="BillsPage.updateSubcategoryOptions(${idx})">
          ${Object.keys(Utils.categories).map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="review-input review-subcat" data-idx="${idx}" id="review-subcat-${idx}">
          ${Utils.categories['Food'].map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" class="review-input review-amount text-right" data-idx="${idx}" value="0" min="0" step="1"></td>
    `;
        tbody.appendChild(row);

        // Re-bind events
        row.querySelectorAll('.review-amount, .review-item-check').forEach(el => {
            el.addEventListener('change', () => BillsPage.updateReviewTotals());
            el.addEventListener('input', () => BillsPage.updateReviewTotals());
        });

        BillsPage.updateReviewTotals();
    },

    backToUpload() {
        BillsPage.currentView = 'upload';
        BillsPage.render();
    },

    async importItems() {
        const rows = document.querySelectorAll('.review-item-row');
        const data = BillsPage.extractedData;
        const items = [];

        rows.forEach(row => {
            const idx = row.dataset.idx;
            const checked = row.querySelector('.review-item-check')?.checked;
            const desc = row.querySelector('.review-desc')?.value || '';
            const amount = Number(row.querySelector('.review-amount')?.value || 0);
            const category = row.querySelector('.review-cat')?.value || 'Other';
            const subcategory = row.querySelector('.review-subcat')?.value || 'Other';
            const dateInput = row.querySelector('.review-item-date');
            const itemDate = dateInput ? dateInput.value : null;

            items.push({
                description: desc,
                amount,
                category,
                subcategory,
                date: itemDate,
                excluded: !checked
            });
        });

        const store = document.getElementById('review-store')?.value || data.store;
        const date = document.getElementById('review-date')?.value || data.date;
        const paidBy = document.getElementById('review-paid-by')?.value || data.paidBy;
        const paymentMethod = document.getElementById('review-payment-method')?.value || data.paymentMethod;

        const importBtn = document.getElementById('import-btn');
        importBtn.disabled = true;
        importBtn.innerHTML = '<span class="scan-spinner"></span> Importing...';

        try {
            const res = await fetch('/api/bills/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    store,
                    date,
                    billType: data.billType,
                    total: items.filter(i => !i.excluded).reduce((s, i) => s + i.amount, 0),
                    paidBy,
                    paymentMethod,
                    filename: data.filename
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Import failed');
            }

            const result = await res.json();
            Utils.toast(`${result.expensesCreated} expenses imported successfully!`, 'success');

            // Reset state and show history
            BillsPage.uploadedFile = null;
            BillsPage.extractedData = null;
            BillsPage.currentView = 'history';
            BillsPage.render();

        } catch (err) {
            console.error('Import error:', err);
            Utils.toast(err.message || 'Failed to import', 'error');
            importBtn.disabled = false;
            importBtn.innerHTML = '✅ Import Expenses';
        }
    },

    renderHistoryView(bills) {
        const content = document.getElementById('bills-view-content');
        const sorted = [...bills].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const billTypeLabels = {
            supermarket: '🛒 Supermarket',
            medical: '💊 Medical',
            upi_history: '📱 UPI History',
            food_delivery: '🍕 Food Delivery',
            general: '📄 General'
        };

        content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Scanned Bills History</div>
          <div class="card-subtitle">${sorted.length} bill${sorted.length !== 1 ? 's' : ''} processed</div>
        </div>
        ${sorted.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📄</div>
            <p>No bills scanned yet.</p>
            <button class="btn btn-primary" onclick="BillsPage.switchView('upload')">Scan your first bill</button>
          </div>
        ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Store</th>
                <th>Type</th>
                <th>Items</th>
                <th>Paid By</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(b => `
                <tr>
                  <td class="text-muted">${Utils.formatDateShort(b.date)}</td>
                  <td><strong>${b.store || '-'}</strong></td>
                  <td><span class="badge badge-category">${billTypeLabels[b.billType] || b.billType}</span></td>
                  <td>${b.itemCount || 0} items</td>
                  <td>${Utils.assigneeBadge(b.paidBy)}</td>
                  <td class="text-right amount">${Utils.currency(b.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
    }
};
