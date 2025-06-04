class CBMERJApp {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.currentUser = null;
        this.currentOrg = null;
        this.currentSection = 'dashboard';
        
        this.initializeApp();
    }

    async initializeApp() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                this.currentOrg = localStorage.getItem('cbmerj_org');
                
                if (!this.currentOrg) {
                    window.location.href = 'login.html';
                    return;
                }
                
                await this.loadUserData();
                this.showApp();
                this.loadDashboard();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    async loadUserData() {
        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            const userData = userDoc.data();
            
            document.getElementById('user-name').textContent = userData.name || this.currentUser.email;
            document.getElementById('current-org').textContent = ORGANIZATIONS[this.currentOrg];
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }

    showApp() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
    }

    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(`${sectionName}-section`).classList.remove('hidden');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        this.currentSection = sectionName;
        
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'equipment':
                this.loadEquipment();
                break;
            case 'maintenance':
                this.loadMaintenance();
                break;
            case 'schedule':
                this.loadSchedule();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'search':
                this.loadSearch();
                break;
        }
    }

    async loadDashboard() {
        try {
            const equipmentRef = this.db.collection('organizations').doc(this.currentOrg).collection('equipment');
            const maintenanceRef = this.db.collection('organizations').doc(this.currentOrg).collection('maintenance');
            
            const equipmentSnapshot = await equipmentRef.get();
            const maintenanceSnapshot = await maintenanceRef.where('dueDate', '==', utils.formatDate(new Date())).get();
            
            let activeCount = 0;
            let maintenanceCount = 0;
            
            equipmentSnapshot.forEach(doc => {
                const equipment = doc.data();
                if (equipment.status === 'ativo') activeCount++;
                if (equipment.status === 'manutencao') maintenanceCount++;
            });
            
            document.getElementById('active-equipment').textContent = activeCount;
            document.getElementById('maintenance-equipment').textContent = maintenanceCount;
            document.getElementById('today-tasks').textContent = maintenanceSnapshot.size;
            
            const overdueSnapshot = await maintenanceRef.where('dueDate', '<', utils.formatDate(new Date())).where('status', '==', 'pendente').get();
            document.getElementById('overdue-tasks').textContent = overdueSnapshot.size;
            
            this.loadTodaysTasks();
            this.loadRecentActivities();
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    async loadTodaysTasks() {
        try {
            const today = utils.formatDate(new Date());
            const tasksSnapshot = await this.db.collection('organizations')
                .doc(this.currentOrg)
                .collection('maintenance')
                .where('dueDate', '==', today)
                .where('status', '==', 'pendente')
                .get();
            
            const tasksList = document.getElementById('today-tasks-list');
            tasksList.innerHTML = '';
            
            if (tasksSnapshot.empty) {
                tasksList.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma tarefa para hoje</p>';
                return;
            }
            
            tasksSnapshot.forEach(doc => {
                const task = doc.data();
                const taskElement = document.createElement('div');
                taskElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded border-l-4 border-blue-500';
                taskElement.innerHTML = `
                    <div>
                        <p class="font-medium">${task.equipmentName}</p>
                        <p class="text-sm text-gray-600">${MAINTENANCE_TYPES[task.type]}</p>
                    </div>
                    <button onclick="maintenance.startMaintenance('${doc.id}')" class="text-blue-600 hover:text-blue-800">
                        Iniciar
                    </button>
                `;
                tasksList.appendChild(taskElement);
            });
        } catch (error) {
            console.error('Erro ao carregar tarefas de hoje:', error);
        }
    }

    async loadRecentActivities() {
        try {
            const activitiesSnapshot = await this.db.collection('organizations')
                .doc(this.currentOrg)
                .collection('maintenance_history')
                .orderBy('completedAt', 'desc')
                .limit(5)
                .get();
            
            const activitiesList = document.getElementById('recent-activities');
            activitiesList.innerHTML = '';
            
            if (activitiesSnapshot.empty) {
                activitiesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma atividade recente</p>';
                return;
            }
            
            activitiesSnapshot.forEach(doc => {
                const activity = doc.data();
                const activityElement = document.createElement('div');
                activityElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded';
                activityElement.innerHTML = `
                    <div>
                        <p class="font-medium">${activity.equipmentName}</p>
                        <p class="text-sm text-gray-600">${activity.responsibleName} - ${utils.formatDateTime(activity.completedAt.toDate())}</p>
                    </div>
                    <span class="text-green-600 text-sm">✓</span>
                `;
                activitiesList.appendChild(activityElement);
            });
        } catch (error) {
            console.error('Erro ao carregar atividades recentes:', error);
        }
    }

    async loadEquipment() {
    try {
        const equipmentSnapshot = await this.db.collection('organizations')
            .doc(this.currentOrg)
            .collection('equipment')
            .orderBy('name')
            .get();
        
        const tableBody = document.getElementById('equipment-table-body');
        tableBody.innerHTML = '';
        
        equipmentSnapshot.forEach(doc => {
            const equipment = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4">
                    <div>
                        <div class="text-sm font-medium text-gray-900">${equipment.name}</div>
                        <div class="text-sm text-gray-500">${equipment.model || ''}</div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${EQUIPMENT_TYPES[equipment.type]}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${this.getStatusColor(equipment.status)}">
                        ${EQUIPMENT_STATUS[equipment.status]}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${equipment.lastMaintenance ? utils.formatDate(equipment.lastMaintenance.toDate()) : 'Nunca'}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2 flex-wrap">
                        <button onclick="components.viewEquipment('${doc.id}')" 
                                class="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 transition-colors duration-200">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            Ver
                        </button>
                        <button onclick="components.editEquipment('${doc.id}')" 
                                class="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-md hover:bg-green-100 transition-colors duration-200">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            Editar
                        </button>
                        ${equipment.status !== 'inativo' ? `
                            <button onclick="maintenance.scheduleForEquipment('${doc.id}')" 
                                    class="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-md hover:bg-purple-100 transition-colors duration-200">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                                </svg>
                                Cadastrar manutenção
                            </button>
                            <button onclick="components.openInoperantModal('${doc.id}')" 
                                    class="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-md hover:bg-red-100 transition-colors duration-200">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                                </svg>
                                Cadastrar inoperância
                            </button>
                        ` : `
                            <button onclick="components.viewInoperantRecord('${doc.id}')" 
                                    class="inline-flex items-center px-3 py-1.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors duration-200">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Ver Inoperância
                            </button>
                        `}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        this.setupEquipmentFilters();
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
    }
}

    getStatusColor(status) {
        const colors = {
            ativo: 'bg-green-100 text-green-800',
            manutencao: 'bg-yellow-100 text-yellow-800',
            inativo: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    setupEquipmentFilters() {
        const searchInput = document.getElementById('equipment-search');
        const typeFilter = document.getElementById('equipment-type-filter');
        const statusFilter = document.getElementById('equipment-status-filter');
        
        [searchInput, typeFilter, statusFilter].forEach(element => {
            element.addEventListener('change', () => this.filterEquipment());
            element.addEventListener('keyup', () => this.filterEquipment());
        });
    }

    filterEquipment() {
        const searchTerm = document.getElementById('equipment-search').value.toLowerCase();
        const typeFilter = document.getElementById('equipment-type-filter').value;
        const statusFilter = document.getElementById('equipment-status-filter').value;
        
        const rows = document.querySelectorAll('#equipment-table-body tr');
        
        rows.forEach(row => {
            const name = row.cells[0].textContent.toLowerCase();
            const type = row.cells[1].textContent;
            const status = row.cells[2].textContent;
            
            const matchesSearch = !searchTerm || name.includes(searchTerm);
            const matchesType = !typeFilter || type.includes(EQUIPMENT_TYPES[typeFilter]);
            const matchesStatus = !statusFilter || status.includes(EQUIPMENT_STATUS[statusFilter]);
            
            row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
        });
    }

    async loadMaintenance() {
        maintenance.loadMaintenanceBoards();
    }

    async loadSchedule() {
        if (!window.calendar) {
            window.calendar = new Calendar();
        }
        calendar.render();
    }

    async loadHistory() {
        try {
            const historySnapshot = await this.db.collection('organizations')
                .doc(this.currentOrg)
                .collection('maintenance_history')
                .orderBy('completedAt', 'desc')
                .limit(50)
                .get();
            
            const tableBody = document.getElementById('history-table-body');
            tableBody.innerHTML = '';
            
            historySnapshot.forEach(doc => {
                const record = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-900">${utils.formatDate(record.completedAt.toDate())}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${record.equipmentName}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${MAINTENANCE_TYPES[record.type]}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${record.responsibleName}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Concluída
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm">
                        <button onclick="components.viewMaintenanceHistory('${doc.id}')" class="text-blue-600 hover:text-blue-800">Ver detalhes</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            this.loadEquipmentForHistoryFilter();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    async loadEquipmentForHistoryFilter() {
        try {
            const equipmentSnapshot = await this.db.collection('organizations')
                .doc(this.currentOrg)
                .collection('equipment')
                .get();
            
            const select = document.getElementById('history-equipment-filter');
            select.innerHTML = '<option value="">Todos os equipamentos</option>';
            
            equipmentSnapshot.forEach(doc => {
                const equipment = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = equipment.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar equipamentos para filtro:', error);
        }
    }

    loadSearch() {
        document.getElementById('search-results').innerHTML = '';
    }
}

class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.events = [];
    }

    async render() {
        this.updateTitle();
        await this.loadEvents();
        this.renderGrid();
    }

    updateTitle() {
        const title = document.getElementById('calendar-title');
        const options = { year: 'numeric', month: 'long' };
        title.textContent = this.currentDate.toLocaleDateString('pt-BR', options);
    }

    async loadEvents() {
        try {
            const startOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const endOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
            
            const eventsSnapshot = await app.db.collection('organizations')
                .doc(app.currentOrg)
                .collection('maintenance')
                .where('dueDate', '>=', utils.formatDate(startOfMonth))
                .where('dueDate', '<=', utils.formatDate(endOfMonth))
                .get();
            
            this.events = [];
            eventsSnapshot.forEach(doc => {
                const event = doc.data();
                this.events.push({
                    id: doc.id,
                    date: event.dueDate,
                    title: event.equipmentName,
                    type: event.type,
                    status: event.status
                });
            });
        } catch (error) {
            console.error('Erro ao carregar eventos do calendário:', error);
        }
    }

    renderGrid() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        
        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'p-2 text-center font-semibold text-gray-600 bg-gray-100';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });
        
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        for (let i = 0; i < 42; i++) {
            const cellDate = new Date(startDate);
            cellDate.setDate(startDate.getDate() + i);
            
            const cell = document.createElement('div');
            cell.className = 'min-h-24 p-2 border border-gray-200 relative';
            
            if (cellDate.getMonth() !== this.currentDate.getMonth()) {
                cell.className += ' bg-gray-50 text-gray-400';
            }
            
            const dateSpan = document.createElement('span');
            dateSpan.className = 'text-sm font-medium';
            dateSpan.textContent = cellDate.getDate();
            cell.appendChild(dateSpan);
            
            const dayEvents = this.events.filter(event => event.date === utils.formatDate(cellDate));
            dayEvents.forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.className = `text-xs p-1 mt-1 rounded truncate ${this.getEventColor(event.type, event.status)}`;
                eventDiv.textContent = event.title;
                eventDiv.title = `${event.title} - ${MAINTENANCE_TYPES[event.type]}`;
                cell.appendChild(eventDiv);
            });
            
            grid.appendChild(cell);
        }
    }

    getEventColor(type, status) {
        if (status === 'concluida') return 'bg-green-100 text-green-800';
        if (status === 'em_andamento') return 'bg-blue-100 text-blue-800';
        
        const colors = {
            diaria: 'bg-yellow-100 text-yellow-800',
            trimestral: 'bg-purple-100 text-purple-800',
            semestral: 'bg-indigo-100 text-indigo-800',
            anual: 'bg-pink-100 text-pink-800',
            corretiva: 'bg-red-100 text-red-800',
            reparo: 'bg-orange-100 text-orange-800'
        };
        
        return colors[type] || 'bg-gray-100 text-gray-800';
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }
}

const app = new CBMERJApp();