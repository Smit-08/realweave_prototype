/**
 * RealWeave - Production MVP Logic
 * Integrates real APIs, Backend (FastAPI), and Live Data
 */

const API_BASE = "/api";

const API = {
    async fetch(endpoint, options = {}) {
        console.log(`[API] Fetching ${endpoint}...`);
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: { 'Content-Type': 'application/json', ...options.headers }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[API] Error ${response.status} on ${endpoint}:`, errorData);
                throw new Error(errorData.detail || `API Error: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[API] Success ${endpoint}:`, data);
            return data;
        } catch (error) {
            console.error(`[API] Fetch Failed for ${endpoint}:`, error);
            App.toast(`API Error: ${error.message}`, "danger");
            return null;
        }
    },
    shipments: {
        getAll: () => API.fetch("/shipments"),
        create: (data) => API.fetch("/shipments", { method: "POST", body: JSON.stringify(data) }),
        delete: (id) => API.fetch(`/shipments/${id}`, { method: "DELETE" })
    },
    inventory: {
        getAll: () => API.fetch("/inventory"),
        create: (data) => API.fetch("/inventory", { method: "POST", body: JSON.stringify(data) })
    },
    alerts: {
        getAll: () => API.fetch("/alerts")
    },
    analytics: {
        get: (range = 'monthly') => API.fetch(`/analytics?time_range=${range}`)
    },
    ai: {
        predictDelay: (lat, lng) => API.fetch(`/predict-delay?lat=${lat}&lng=${lng}`),
        optimizeRoute: (s_lng, s_lat, e_lng, e_lat) => API.fetch(`/optimize-route?start_lng=${s_lng}&start_lat=${s_lat}&end_lng=${e_lng}&end_lat=${e_lat}`),
        chat: (message) => API.fetch("/chat", { method: "POST", body: JSON.stringify({ message }) })
    },
    settings: {
        save: (data) => API.fetch("/settings", { method: "POST", body: JSON.stringify(data) }),
        get: () => API.fetch("/settings")
    }
};

const App = {
    currentView: 'dashboard',
    map: null,
    charts: {},
    markers: {},
    data: { shipments: [], inventory: [], alerts: [] },

    async init() {
        this.checkAuth();
        this.setupNavigation();
        this.setupModals();
        await this.loadInitialData();
        this.setupDashboard();
        this.setupTracking();
        this.setupInventory();
        this.setupAlerts();
        this.setupAnalytics();
        this.setupChat();
        this.setupSettings();
        this.updateUserProfileUI();
        this.startAutoRefresh();
        this.hideLoader();
    },

    checkAuth() {
        const user = localStorage.getItem('ss_user');
        if (!user) {
            window.location.href = '/login';
        } else {
            this.user = JSON.parse(user);
        }
    },

    updateUserProfileUI() {
        if (!this.user) return;
        
        // Update Sidebar/Top Bar
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        if (nameEl) nameEl.textContent = this.user.name;
        if (roleEl) roleEl.textContent = this.user.role;

        // Update Settings Page
        const setName = document.getElementById('set-name');
        const setEmail = document.getElementById('set-user-email');
        const setRole = document.getElementById('set-user-role');
        
        if (setName) setName.value = this.user.name;
        if (setEmail) setEmail.value = this.user.email;
        if (setRole) setRole.value = this.user.role;

        // Update Avatar seed
        const avatar = document.querySelector('.avatar-sm');
        if (avatar) {
            avatar.src = `https://api.dicebear.com/6.x/avataaars/svg?seed=${this.user.name.replace(' ', '')}`;
        }
    },

    async loadInitialData() {
        this.showLoader();
        const [shipments, inventory, alerts] = await Promise.all([
            API.shipments.getAll(),
            API.inventory.getAll(),
            API.alerts.getAll()
        ]);
        if (shipments) this.data.shipments = shipments;
        if (inventory) this.data.inventory = inventory;
        if (alerts) this.data.alerts = alerts;
        this.updateAlertBadge();
    },

    showLoader() { document.getElementById('app-loader').style.display = 'flex'; },
    hideLoader() { document.getElementById('app-loader').style.display = 'none'; },

    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-view]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                this.switchView(view);
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                this.toast("Signing out...", "info");
                localStorage.removeItem('ss_user');
                localStorage.removeItem('ss_token');
                setTimeout(() => window.location.href = '/login', 1000);
            };
        }
    },

    async switchView(viewId) {
        const views = document.querySelectorAll('.view-content');
        views.forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(`${viewId}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;
            const titles = {
                'dashboard': 'Operations Dashboard',
                'tracking': 'Shipment Management',
                'inventory': 'Inventory Intelligence',
                'alerts': 'Security & Risk Alerts',
                'analytics': 'Advanced Analytics Hub',
                'settings': 'System Settings'
            };
            document.getElementById('view-title').textContent = titles[viewId];

            if (viewId === 'dashboard') {
                if (this.map) setTimeout(() => this.map.invalidateSize(), 200);
                this.updateKPIs();
            }
            if (viewId === 'tracking') this.renderShipments();
            if (viewId === 'inventory') this.renderInventory();
            if (viewId === 'analytics') this.setupAnalytics();
            if (viewId === 'alerts') this.renderAlerts();
        }
    },

    setupModals() {
        const container = document.getElementById('modal-container');
        const closeBtns = [document.getElementById('btn-close-modal'), document.getElementById('btn-cancel-modal')];
        const closeModal = () => container.style.display = 'none';
        closeBtns.forEach(btn => { if (btn) btn.onclick = closeModal; });
        
        const submitBtn = document.getElementById('btn-submit-modal');
        if (submitBtn) {
            submitBtn.onclick = async () => {
                if (this.currentModalCallback) {
                    this.showLoader();
                    const success = await this.currentModalCallback();
                    this.hideLoader();
                    if (success === false) return; // Keep modal open on failure
                }
                closeModal();
            };
        }
    },

    openModal(title, templateId, callback) {
        const container = document.getElementById('modal-container');
        document.getElementById('modal-title').textContent = title;
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '';
        const tpl = document.getElementById(templateId);
        if (tpl) {
            modalBody.appendChild(tpl.content.cloneNode(true));
            container.style.display = 'flex';
            this.currentModalCallback = callback;
        }
    },

    // --- DASHBOARD ---
    setupDashboard() {
        this.initMap();
        this.updateKPIs();
        this.initCharts();
    },

    initMap() {
        const mapEl = document.getElementById('map');
        if (!mapEl || this.map) return;
        this.map = L.map('map', { center: [20, 78], zoom: 4, zoomControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);
        this.updateMapMarkers();
    },

    updateMapMarkers() {
        if (!this.map) return;
        this.data.shipments.forEach(s => {
            if (this.markers[s.id]) this.map.removeLayer(this.markers[s.id]);
            const icon = L.divIcon({
                className: 'custom-icon',
                html: `<div style="background: ${s.status === 'Delayed' ? 'var(--danger)' : 'var(--accent-glow)'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`
            });
            this.markers[s.id] = L.marker([s.lat, s.lng], { icon }).addTo(this.map)
                .bindPopup(`<strong>${s.id}</strong><br>${s.product}<br><button onclick="App.showRoute('${s.id}')" style="margin-top:5px; padding:2px 5px; font-size:10px; cursor:pointer;">Optimize Route</button>`);
        });
    },

    async showRoute(id) {
        const s = this.data.shipments.find(x => x.id === id);
        if (!s) return;
        this.toast(`Optimizing route for ${id}...`, "info");
        const dest = [77.2090, 28.6139]; // Delhi
        const route = await API.ai.optimizeRoute(s.lng, s.lat, dest[0], dest[1]);
        if (route && !route.error) {
            if (this.currentPolyline) this.map.removeLayer(this.currentPolyline);
            this.currentPolyline = L.polyline([[s.lat, s.lng], [dest[1], dest[0]]], {color: 'var(--accent-glow)', weight: 3}).addTo(this.map);
            this.map.fitBounds(this.currentPolyline.getBounds());
            this.toast(`Optimized Route: ${route.distance_km}km, ETA: ${route.eta_minutes}min`, "success");
        }
    },

    updateKPIs() {
        const stats = {
            total: this.data.shipments.length,
            active: this.data.shipments.filter(s => s.status === 'In Transit').length,
            risk: this.data.alerts.length,
            eco: "4.2t"
        };
        const cards = document.querySelectorAll('.stat-card');
        if (cards[0]) cards[0].querySelector('.stat-value').innerText = stats.total;
        if (cards[1]) cards[1].querySelector('.stat-value').innerText = stats.active;
        if (cards[2]) cards[2].querySelector('.stat-value').innerText = stats.risk;
        if (cards[3]) cards[3].querySelector('.stat-value').innerText = stats.eco;
    },

    // --- TRACKING ---
    setupTracking() {
        const addBtn = document.getElementById('btn-add-shipment');
        if (!addBtn) return;
        addBtn.onclick = () => {
            this.openModal("Create New Shipment", "tpl-shipment-form", async () => {
                const newShip = {
                    id: `SH-${Math.floor(1000 + Math.random() * 9000)}`,
                    product: document.getElementById('f-ship-product').value,
                    source: document.getElementById('f-ship-source').value,
                    destination: document.getElementById('f-ship-dest').value,
                    eta: document.getElementById('f-ship-eta').value || 'Pending',
                    status: document.getElementById('f-ship-status').value,
                    risk: 'Low',
                    lat: 20 + Math.random() * 10,
                    lng: 70 + Math.random() * 20
                };
                const res = await API.shipments.create(newShip);
                if (res) {
                    this.data.shipments.unshift(res);
                    this.renderShipments();
                    this.updateMapMarkers();
                    this.toast("Shipment Created", "success");
                    return true;
                }
                return false;
            });
        };
    },

    renderShipments(search = '', filter = 'all') {
        const tbody = document.querySelector('#shipment-table tbody');
        if (!tbody) return;
        let data = this.data.shipments;
        if (search) data = data.filter(s => s.id.includes(search) || s.product.toLowerCase().includes(search.toLowerCase()));
        if (filter !== 'all') data = data.filter(s => s.status === filter);
        tbody.innerHTML = data.map(s => `
            <tr>
                <td><strong style="color:var(--accent-glow)">${s.id}</strong></td>
                <td>${s.product}</td>
                <td>${s.source} <i class="fas fa-arrow-right"></i> ${s.destination}</td>
                <td>${s.eta}</td>
                <td><span class="badge badge-${this.getStatusClass(s.status)}">${s.status}</span></td>
                <td>${s.risk}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="App.deleteShipment('${s.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async deleteShipment(id) {
        if (confirm("Delete shipment?")) {
            const res = await API.shipments.delete(id);
            if (res) {
                this.data.shipments = this.data.shipments.filter(s => s.id !== id);
                this.renderShipments();
                this.toast("Shipment Deleted", "warning");
            }
        }
    },

    getStatusClass(s) {
        const map = { 'In Transit': 'info', 'Delivered': 'success', 'Delayed': 'danger', 'Pending': 'warning' };
        return map[s] || 'info';
    },

    // --- INVENTORY ---
    setupInventory() {
        const addBtn = document.getElementById('btn-add-inventory');
        if (!addBtn) return;
        addBtn.onclick = () => {
            this.openModal("Add Product", "tpl-inventory-form", async () => {
                const newItem = {
                    id: `INV-${Date.now().toString().slice(-4)}`,
                    sku: document.getElementById('f-inv-sku').value,
                    name: document.getElementById('f-inv-name').value,
                    stock: parseInt(document.getElementById('f-inv-stock').value),
                    threshold: parseInt(document.getElementById('f-inv-threshold').value),
                    supplier: document.getElementById('f-inv-supplier').value,
                    status: 'Healthy'
                };
                const res = await API.inventory.create(newItem);
                if (res) {
                    this.data.inventory.unshift(res);
                    const searchVal = document.getElementById('inventory-search')?.value || '';
                    const filterVal = document.getElementById('inventory-filter')?.value || 'all';
                    this.renderInventory(searchVal, filterVal);
                    this.toast("Product Added to Inventory", "success");
                    return true;
                }
                return false;
            });
        };

        const searchInput = document.getElementById('inventory-search');
        if (searchInput) searchInput.oninput = (e) => this.renderInventory(e.target.value, document.getElementById('inventory-filter').value);
        
        const filterSelect = document.getElementById('inventory-filter');
        if (filterSelect) filterSelect.onchange = (e) => this.renderInventory(document.getElementById('inventory-search').value, e.target.value);
    },

    renderInventory(search = '', filter = 'all') {
        const tbody = document.querySelector('#inventory-table tbody');
        if (!tbody) return;
        let data = this.data.inventory;
        
        if (search) data = data.filter(i => i.sku.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()));
        
        if (filter === 'low') data = data.filter(i => i.stock < i.threshold);
        if (filter === 'healthy') data = data.filter(i => i.stock >= i.threshold);

        tbody.innerHTML = data.map(i => {
            const isLow = i.stock < i.threshold;
            return `
                <tr>
                    <td><code style="color: var(--accent-glow); font-size: 0.85rem;">${i.sku}</code></td>
                    <td><strong style="color: #fff;">${i.name}</strong></td>
                    <td style="color: ${isLow ? 'var(--danger)' : '#fff'}; font-weight: 600;">${i.stock}</td>
                    <td style="color: var(--text-dim);">${i.threshold}</td>
                    <td>
                        <span class="badge badge-${isLow ? 'danger' : 'success'}">
                            <i class="fas ${isLow ? 'fa-exclamation-triangle' : 'fa-check-circle'}" style="margin-right: 5px;"></i>
                            ${isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                    </td>
                    <td style="color: var(--text-dim);">${i.supplier}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="App.deleteInventory('${i.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async deleteInventory(id) {
        if (confirm("Remove item from inventory?")) {
            // No backend delete endpoint for inventory yet, so we mock it on frontend
            this.data.inventory = this.data.inventory.filter(i => i.id !== id);
            this.renderInventory();
            this.toast("Product Removed", "warning");
        }
    },

    // --- ALERTS ---
    setupAlerts() {
        this.renderAlerts();
        
        // Mark All Resolved
        const btnAll = document.getElementById('btn-resolve-all');
        if (btnAll) {
            btnAll.onclick = () => {
                if (this.data.alerts.length > 0) {
                    this.data.alerts = [];
                    this.renderAlerts();
                    this.updateAlertBadge();
                    this.toast("All Alerts Marked as Resolved", "success");
                }
            };
        }

        // Severity Filter
        const filter = document.getElementById('alert-severity-filter');
        if (filter) {
            filter.onchange = (e) => this.renderAlerts(e.target.value);
        }
    },

    renderAlerts(severityFilter = 'all') {
        const grid = document.getElementById('alerts-grid');
        if (!grid) return;
        
        let filteredAlerts = this.data.alerts;
        if (severityFilter !== 'all') {
            filteredAlerts = filteredAlerts.filter(a => a.severity === severityFilter);
        }

        if (filteredAlerts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shield-check"></i>
                    <p>${severityFilter === 'all' ? 'All clear! No active risk alerts.' : `No ${severityFilter} severity alerts found.`}</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredAlerts.map(a => {
            let icon = 'fa-exclamation-triangle';
            if (a.type.includes('Weather')) icon = 'fa-cloud-showers-heavy';
            if (a.type.includes('Inventory')) icon = 'fa-boxes-stacked';
            if (a.type.includes('Security')) icon = 'fa-shield-halved';

            return `
                <div class="alert-card animate-fade">
                    <div class="alert-side">
                        <div class="alert-icon-box">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="alert-meta">
                            <span class="badge badge-${a.severity === 'High' || a.severity === 'Critical' ? 'danger' : 'warning'}">${a.severity}</span>
                            <small>${a.time}</small>
                        </div>
                    </div>
                    <div class="alert-content">
                        <h4>${a.type}</h4>
                        <p>${a.message}</p>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-icon" title="Mark Resolved" onclick="App.resolveAlert(${a.id})">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async resolveAlert(id) {
        this.data.alerts = this.data.alerts.filter(a => a.id !== id);
        this.renderAlerts();
        this.updateAlertBadge();
        this.toast("Alert Marked as Resolved", "success");
    },

    updateAlertBadge() {
        const badge = document.getElementById('alert-count-badge');
        if (!badge) return;
        const count = this.data.alerts.length;
        badge.innerText = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    },

    // --- ANALYTICS ---
    async setupAnalytics(range = 'monthly') {
        this.showLoader();
        const data = await API.analytics.get(range);
        this.hideLoader();
        
        if (!data) {
            console.error("[Analytics] No data received from API");
            return;
        }

        // Small delay to ensure view is visible and layout is calculated
        setTimeout(() => this.initAnalyticsCharts(data.charts), 100);

        // Setup range buttons listeners (only once)
        const filters = document.getElementById('analytics-range-filters');
        if (filters && !filters.dataset.initialized) {
            filters.dataset.initialized = 'true';
            filters.querySelectorAll('button').forEach(btn => {
                btn.onclick = () => {
                    filters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.setupAnalytics(btn.dataset.range);
                };
            });
        }

        // Export Report handler (Text File)
        const exportBtn = document.getElementById('btn-export-report');
        if (exportBtn && !exportBtn.dataset.initialized) {
            exportBtn.dataset.initialized = 'true';
            exportBtn.onclick = () => {
                // Dynamically read the currently active range
                const activeRangeBtn = document.querySelector('#analytics-range-filters button.active');
                const activeRange = activeRangeBtn ? activeRangeBtn.dataset.range : 'monthly';

                const now = new Date().toLocaleString();
                const divider = '='.repeat(60);
                const subDivider = '-'.repeat(40);

                let report = '';
                report += divider + '\n';
                report += `  REALWEAVE — ${activeRange.toUpperCase()} ANALYTICS REPORT\n`;
                report += divider + '\n';
                report += `  Generated: ${now}\n`;
                report += `  Time Range: ${activeRange}\n`;
                report += divider + '\n\n';

                // KPIs Summary
                report += '>> KEY PERFORMANCE INDICATORS\n';
                report += subDivider + '\n';
                report += `  Total Shipments : ${this.data.shipments.length}\n`;
                report += `  Active In-Transit: ${this.data.shipments.filter(s => s.status === 'In Transit').length}\n`;
                report += `  Delivered        : ${this.data.shipments.filter(s => s.status === 'Delivered').length}\n`;
                report += `  Delayed          : ${this.data.shipments.filter(s => s.status === 'Delayed').length}\n`;
                report += `  Active Alerts    : ${this.data.alerts.length}\n\n`;

                // Shipments Table
                report += '>> SHIPMENT DETAILS\n';
                report += subDivider + '\n';
                if (this.data.shipments.length > 0) {
                    this.data.shipments.forEach(s => {
                        report += `  [${s.id}] ${s.product}\n`;
                        report += `    Route  : ${s.source} → ${s.destination}\n`;
                        report += `    Status : ${s.status}  |  ETA: ${s.eta}  |  Risk: ${s.risk}\n\n`;
                    });
                } else {
                    report += '  No shipments recorded.\n\n';
                }

                // Inventory Summary
                report += '>> INVENTORY SUMMARY\n';
                report += subDivider + '\n';
                if (this.data.inventory.length > 0) {
                    this.data.inventory.forEach(i => {
                        const status = i.stock < i.threshold ? 'LOW STOCK' : 'Healthy';
                        report += `  [${i.sku}] ${i.name}\n`;
                        report += `    Stock: ${i.stock} / Threshold: ${i.threshold}  —  ${status}\n`;
                        report += `    Supplier: ${i.supplier}\n\n`;
                    });
                } else {
                    report += '  No inventory items recorded.\n\n';
                }

                // Alerts
                report += '>> ACTIVE ALERTS\n';
                report += subDivider + '\n';
                if (this.data.alerts.length > 0) {
                    this.data.alerts.forEach(a => {
                        report += `  [${a.severity}] ${a.type}\n`;
                        report += `    ${a.message}\n`;
                        report += `    Time: ${a.time}\n\n`;
                    });
                } else {
                    report += '  No active alerts. All clear.\n\n';
                }

                report += divider + '\n';
                report += '  End of Report — RealWeave\n';
                report += divider + '\n';

                // Download as .txt file
                const blob = new Blob([report], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RealWeave_Report_${activeRange}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.toast("Report exported successfully!", "success");
            };
        }
    },

    initCharts() {
        const canvas1 = document.getElementById('demandChart');
        if (canvas1) {
            const ctx = canvas1.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        { label: 'Actual', data: [450, 480, 510, 490, 530, 580], borderColor: '#00D1FF', tension: 0.4 },
                        { label: 'AI Forecast', data: [460, 495, 500, 515, 550, 610], borderColor: '#8B5CF6', borderDash: [5, 5], tension: 0.4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { display: true }, y: { display: true } } }
            });
        }

        const canvas2 = document.getElementById('disruptionChart');
        if (canvas2) {
            const ctx2 = canvas2.getContext('2d');
            new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Weather', 'Traffic', 'Port', 'Customs'],
                    datasets: [{ data: [35, 25, 20, 20], backgroundColor: ['#FBBF24', '#22D3EE', '#F43F5E', '#8B5CF6'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
            });
        }
    },

    initAnalyticsCharts(data) {
        console.log("[Analytics] Initializing charts with data:", data);
        if (!this.charts) this.charts = {};
        
        // Clear old charts to avoid overlaps
        ['volume', 'risk', 'delay', 'efficiency'].forEach(id => {
            if (this.charts[id]) {
                try { this.charts[id].destroy(); } catch(e) { console.error(`Error destroying ${id}:`, e); }
            }
        });

        const renderChart = (id, config) => {
            try {
                const canvas = document.getElementById(id);
                if (!canvas) {
                    console.error(`[Analytics] Canvas not found: ${id}`);
                    return;
                }
                const ctx = canvas.getContext('2d');
                this.charts[id] = new Chart(ctx, config);
                console.log(`[Analytics] Successfully rendered ${id}`);
            } catch (error) {
                console.error(`[Analytics] Failed to render ${id}:`, error);
            }
        };

        // 1. Shipment Volume
        renderChart('analyticsMonthlyChart', {
            type: 'bar',
            data: {
                labels: data.volume.labels,
                datasets: [{
                    label: 'Volume',
                    data: data.volume.data,
                    backgroundColor: 'rgba(0, 209, 255, 0.2)',
                    borderColor: '#00D1FF',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: this.getChartOptions()
        });

        // 2. Risk Breakdown
        renderChart('analyticsRiskChart', {
            type: 'polarArea',
            data: {
                labels: data.risk.labels,
                datasets: [{
                    data: data.risk.data,
                    backgroundColor: ['rgba(0, 209, 255, 0.6)', 'rgba(139, 92, 246, 0.6)', 'rgba(244, 63, 94, 0.6)', 'rgba(251, 191, 36, 0.6)'],
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }]
            },
            options: { ...this.getChartOptions(), scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } } }
        });

        // 3. Delay Rate
        renderChart('analyticsDelayChart', {
            type: 'line',
            data: {
                labels: data.delay.labels,
                datasets: [{
                    label: 'Delay %',
                    data: data.delay.data,
                    borderColor: '#F43F5E',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: this.getChartOptions()
        });

        // 4. Efficiency
        renderChart('analyticsEfficiencyChart', {
            type: 'bar',
            data: {
                labels: data.efficiency.labels,
                datasets: [{
                    label: 'Efficiency Index',
                    data: data.efficiency.data,
                    backgroundColor: 'rgba(34, 211, 238, 0.6)',
                    borderRadius: 5
                }]
            },
            options: { ...this.getChartOptions(), indexAxis: 'y' }
        });
    },

    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
            }
        };
    },

    setupChat() {
        const toggle = document.getElementById('toggle-chat');
        const chatWindow = document.getElementById('ai-chat');
        const close = document.getElementById('close-chat');
        const input = document.getElementById('chat-input');
        const send = document.getElementById('send-chat');
        const messages = document.getElementById('chat-messages');

        if (!toggle || !chatWindow) return;

        toggle.onclick = () => chatWindow.classList.toggle('active');
        close.onclick = () => chatWindow.classList.remove('active');

        const addMessage = (text, type) => {
            const msg = document.createElement('div');
            msg.className = `chat-msg msg-${type}`;
            msg.innerHTML = `<div class="msg-bubble">${text}</div>`;
            messages.appendChild(msg);
            messages.scrollTop = messages.scrollHeight;
        };

        const handleChat = async () => {
            const text = input.value.trim();
            if (!text) return;
            
            input.value = '';
            addMessage(text, 'user');
            
            const res = await API.ai.chat(text);
            if (res) {
                addMessage(res.response, 'ai');
            }
        };

        send.onclick = handleChat;
        input.onkeypress = (e) => { if (e.key === 'Enter') handleChat(); };

        // Welcome message
        setTimeout(() => {
            if (messages.children.length === 0) {
                addMessage("Hello! I am your RealWeave AI assistant. How can I help you optimize your supply chain today?", "ai");
            }
        }, 1000);
    },

    async setupSettings() {
        const saveBtn = document.getElementById('save-profile');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const data = {
                    name: document.getElementById('set-name').value,
                    email: document.getElementById('set-user-email').value,
                    darkMode: document.querySelector('.toggle-group input[type="checkbox"]').checked
                };
                
                const res = await API.settings.save(data);
                if (res) {
                    this.user.name = data.name;
                    this.user.email = data.email;
                    localStorage.setItem('ss_user', JSON.stringify(this.user));
                    this.updateUserProfileUI();
                    this.toast("Settings saved successfully!", "success");
                }
            };
        }

        // Load settings from backend if available
        const remoteSettings = await API.settings.get();
        if (remoteSettings) {
            if (remoteSettings.name) document.getElementById('set-name').value = remoteSettings.name;
            if (remoteSettings.email) document.getElementById('set-user-email').value = remoteSettings.email;
        }
    },
    startAutoRefresh() {
        // High frequency refresh for realtime simulation (10 seconds)
        setInterval(() => {
            this.loadInitialData().then(() => {
                // If in tracking view, update map
                if (this.currentView === 'dashboard') {
                    this.updateMapMarkers();
                    this.updateKPIs();
                }
                if (this.currentView === 'alerts') {
                    this.renderAlerts();
                }
                this.updateAlertBadge();
            });
        }, 10000);
    }
};

App.init();
