const maintenance = {
    async loadMaintenanceBoards() {
        try {
            const maintenanceSnapshot = await firebase.firestore()
                .collection('organizations')
                .doc(app.currentOrg)
                .collection('maintenance')
                .orderBy('dueDate')
                .get();
            
            const pending = document.getElementById('pending-maintenance');
            const ongoing = document.getElementById('ongoing-maintenance');
            const completed = document.getElementById('completed-maintenance');
            
            pending.innerHTML = '';
            ongoing.innerHTML = '';
            completed.innerHTML = '';
            
            const today = utils.formatDate(new Date());
            
            maintenanceSnapshot.forEach(doc => {
                const maintenanceData = doc.data();
                const card = this.createMaintenanceCard(doc.id, maintenanceData);
                
                if (maintenanceData.status === 'pendente') {
                    pending.appendChild(card);
                } else if (maintenanceData.status === 'em_andamento') {
                    ongoing.appendChild(card);
                } else if (maintenanceData.status === 'concluida' && maintenanceData.completedAt && utils.formatDate(maintenanceData.completedAt.toDate()) === today) {
                    completed.appendChild(card);
                }
            });
            
            if (pending.children.length === 0) {
                pending.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma manutenção pendente</p>';
            }
            if (ongoing.children.length === 0) {
                ongoing.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma manutenção em andamento</p>';
            }
            if (completed.children.length === 0) {
                completed.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma manutenção concluída hoje</p>';
            }
            
        } catch (error) {
            console.error('Erro ao carregar manutenções:', error);
        }
    },

    createMaintenanceCard(id, data) {
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-3 shadow-sm';
        
        const isOverdue = new Date(data.dueDate) < new Date() && data.status === 'pendente';
        if (isOverdue) {
            card.className += ' border-red-300';
        }
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-sm">${data.equipmentName}</h4>
                ${isOverdue ? '<span class="text-red-500 text-xs">ATRASADA</span>' : ''}
            </div>
            <p class="text-xs text-gray-600 mb-2">${MAINTENANCE_TYPES[data.type]}</p>
            <p class="text-xs text-gray-500 mb-3">Prazo: ${utils.formatDate(new Date(data.dueDate))}</p>
            <div class="flex gap-2">
                ${this.getMaintenanceActions(id, data.status)}
            </div>
        `;
        
        return card;
    },

    getMaintenanceActions(id, status) {
        switch (status) {
            case 'pendente':
                return `<button onclick="maintenance.startMaintenance('${id}')" class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Iniciar</button>`;
            case 'em_andamento':
                return `<button onclick="maintenance.completeMaintenance('${id}')" class="text-xs bg-green-500 text-white px-2 py-1 rounded">Concluir</button>`;
            case 'concluida':
                return `<button onclick="components.viewMaintenanceDetails('${id}')" class="text-xs bg-gray-500 text-white px-2 py-1 rounded">Ver</button>`;
            default:
                return '';
        }
    },

    async startMaintenance(id) {
        try {
            await database.update('maintenance', id, {
                status: 'em_andamento',
                startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                startedBy: app.currentUser.uid
            });
            
            utils.showToast('Manutenção iniciada com sucesso!', 'success');
            this.loadMaintenanceBoards();
        } catch (error) {
            console.error('Erro ao iniciar manutenção:', error);
            utils.showToast('Erro ao iniciar manutenção', 'error');
        }
    },

    async completeMaintenance(id) {
        components.openMaintenanceCompletionModal(id);
    },

    async submitMaintenanceCompletion(id, data) {
        try {
            const maintenanceData = await database.get('maintenance', id);
            
            const historyData = {
                ...maintenanceData,
                ...data,
                status: 'concluida',
                completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                completedBy: app.currentUser.uid
            };
            
            await database.create('maintenance_history', historyData);
            await database.delete('maintenance', id);
            
            if (maintenanceData.equipmentId) {
                await database.update('equipment', maintenanceData.equipmentId, {
                    lastMaintenance: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'ativo'
                });
            }
            
            utils.showToast('Manutenção concluída com sucesso!', 'success');
            this.loadMaintenanceBoards();
            components.closeModal();
            
        } catch (error) {
            console.error('Erro ao concluir manutenção:', error);
            utils.showToast('Erro ao concluir manutenção', 'error');
        }
    },

    async scheduleForEquipment(equipmentId) {
        try {
            const equipment = await database.get('equipment', equipmentId);
            if (!equipment) {
                utils.showToast('Equipamento não encontrado', 'error');
                return;
            }
            
            components.openMaintenanceScheduleModal(equipment);
        } catch (error) {
            console.error('Erro ao abrir agendamento:', error);
            utils.showToast('Erro ao abrir agendamento', 'error');
        }
    },

    async scheduleMaintenance(data) {
        try {
            await database.create('maintenance', {
                ...data,
                status: 'pendente'
            });
            
            if (data.equipmentId) {
                await database.update('equipment', data.equipmentId, {
                    status: 'manutencao'
                });
            }
            
            utils.showToast('Manutenção agendada com sucesso!', 'success');
            components.closeModal();
            
        } catch (error) {
            console.error('Erro ao agendar manutenção:', error);
            utils.showToast('Erro ao agendar manutenção', 'error');
        }
    }
};