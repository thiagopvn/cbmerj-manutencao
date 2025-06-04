const components = {
    openEquipmentModal(equipmentId = null) {
        const isEdit = equipmentId !== null;
        const title = isEdit ? 'Editar Equipamento' : 'Novo Equipamento';
        
        const modal = this.createModal('equipment-modal', title, `
            <form id="equipment-form" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Equipamento</label>
                        <input type="text" id="equipment-name" required class="input-field">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select id="equipment-type" required class="input-field">
                            <option value="">Selecione o tipo</option>
                            ${Object.entries(EQUIPMENT_TYPES).map(([key, value]) => 
                                `<option value="${key}">${value}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                        <input type="text" id="equipment-model" class="input-field">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                        <input type="text" id="equipment-serial" class="input-field">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ano de Fabricação</label>
                        <input type="number" id="equipment-year" min="1900" max="2030" class="input-field">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="equipment-status" required class="input-field">
                            ${Object.entries(EQUIPMENT_STATUS).map(([key, value]) => 
                                `<option value="${key}">${value}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea id="equipment-notes" rows="3" class="input-field"></textarea>
                </div>
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="components.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary">${isEdit ? 'Atualizar' : 'Cadastrar'}</button>
                </div>
            </form>
        `);
        
        if (isEdit) {
            this.loadEquipmentData(equipmentId);
        }
        
        document.getElementById('equipment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEquipment(equipmentId);
        });
    },

    async loadEquipmentData(equipmentId) {
        try {
            const equipment = await database.get('equipment', equipmentId);
            if (equipment) {
                document.getElementById('equipment-name').value = equipment.name || '';
                document.getElementById('equipment-type').value = equipment.type || '';
                document.getElementById('equipment-model').value = equipment.model || '';
                document.getElementById('equipment-serial').value = equipment.serialNumber || '';
                document.getElementById('equipment-year').value = equipment.year || '';
                document.getElementById('equipment-status').value = equipment.status || '';
                document.getElementById('equipment-notes').value = equipment.notes || '';
            }
        } catch (error) {
            console.error('Erro ao carregar dados do equipamento:', error);
            utils.showToast('Erro ao carregar dados do equipamento', 'error');
        }
    },

    async saveEquipment(equipmentId) {
        try {
            const formData = {
                name: document.getElementById('equipment-name').value,
                type: document.getElementById('equipment-type').value,
                model: document.getElementById('equipment-model').value,
                serialNumber: document.getElementById('equipment-serial').value,
                year: parseInt(document.getElementById('equipment-year').value) || null,
                status: document.getElementById('equipment-status').value,
                notes: document.getElementById('equipment-notes').value
            };
            
            if (equipmentId) {
                await database.update('equipment', equipmentId, formData);
                utils.showToast('Equipamento atualizado com sucesso!', 'success');
            } else {
                await database.create('equipment', formData);
                utils.showToast('Equipamento cadastrado com sucesso!', 'success');
            }
            
            this.closeModal();
            app.loadEquipment();
            
        } catch (error) {
            console.error('Erro ao salvar equipamento:', error);
            utils.showToast('Erro ao salvar equipamento', 'error');
        }
    },

    openMaintenanceModal() {
        const modal = this.createModal('maintenance-modal', 'Nova Manutenção', `
            <form id="maintenance-form" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Equipamento</label>
                        <select id="maintenance-equipment" required class="input-field">
                            <option value="">Selecione o equipamento</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Manutenção</label>
                        <select id="maintenance-type" required class="input-field">
                            ${Object.entries(MAINTENANCE_TYPES).map(([key, value]) => 
                                `<option value="${key}">${value}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Data Prevista</label>
                        <input type="date" id="maintenance-due-date" required class="input-field">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                        <input type="text" id="maintenance-responsible" required class="input-field">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea id="maintenance-description" rows="3" class="input-field" placeholder="Descreva o que deve ser feito..."></textarea>
                </div>
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="components.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary">Agendar</button>
                </div>
            </form>
        `);
        
        this.loadEquipmentOptions('maintenance-equipment');
        
        document.getElementById('maintenance-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.scheduleNewMaintenance();
        });
    },

    async loadEquipmentOptions(selectId) {
        try {
            const equipment = await database.getAll('equipment', { field: 'name', direction: 'asc' });
            const select = document.getElementById(selectId);
            
            equipment.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar equipamentos:', error);
        }
    },

    async scheduleNewMaintenance() {
        try {
            const equipmentId = document.getElementById('maintenance-equipment').value;
            const equipment = await database.get('equipment', equipmentId);
            
            const formData = {
                equipmentId: equipmentId,
                equipmentName: equipment.name,
                type: document.getElementById('maintenance-type').value,
                dueDate: document.getElementById('maintenance-due-date').value,
                responsibleName: document.getElementById('maintenance-responsible').value,
                description: document.getElementById('maintenance-description').value,
                status: 'pendente'
            };
            
            await maintenance.scheduleMaintenance(formData);
            
        } catch (error) {
            console.error('Erro ao agendar manutenção:', error);
            utils.showToast('Erro ao agendar manutenção', 'error');
        }
    },

    openMaintenanceCompletionModal(maintenanceId) {
        const modal = this.createModal('completion-modal', 'Concluir Manutenção', `
            <form id="completion-form" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Responsável pela Execução</label>
                        <input type="text" id="completion-responsible" required class="input-field">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Data de Realização</label>
                        <input type="date" id="completion-date" required class="input-field" value="${utils.formatDate(new Date())}">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">O que foi feito</label>
                    <textarea id="completion-work-done" required rows="3" class="input-field" placeholder="Descreva detalhadamente o que foi realizado..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Peças Trocadas</label>
                    <textarea id="completion-parts" rows="2" class="input-field" placeholder="Liste as peças que foram trocadas..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Número do Processo SEI (se aplicável)</label>
                    <input type="text" id="completion-sei" class="input-field" placeholder="Ex: 12345.678901/2024-12">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea id="completion-notes" rows="2" class="input-field" placeholder="Observações adicionais..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fotos (opcional)</label>
                    <input type="file" id="completion-photos" multiple accept="image/*" class="input-field">
                    <p class="text-xs text-gray-500 mt-1">Selecione até 5 fotos (PNG, JPG, JPEG)</p>
                </div>
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="components.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary">Concluir Manutenção</button>
                </div>
            </form>
        `);
        
        document.getElementById('completion-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitMaintenanceCompletion(maintenanceId);
        });
    },

    async submitMaintenanceCompletion(maintenanceId) {
        try {
            const photos = document.getElementById('completion-photos').files;
            const photoUrls = [];
            
            if (photos.length > 0) {
                for (let i = 0; i < Math.min(photos.length, 5); i++) {
                    const photo = photos[i];
                    const path = `maintenance/${maintenanceId}/photos/${Date.now()}_${i}`;
                    const uploadResult = await database.uploadFile(photo, path);
                    photoUrls.push(uploadResult.url);
                }
            }
            
            const completionData = {
                responsibleName: document.getElementById('completion-responsible').value,
                completionDate: document.getElementById('completion-date').value,
                workDone: document.getElementById('completion-work-done').value,
                partsReplaced: document.getElementById('completion-parts').value,
                seiNumber: document.getElementById('completion-sei').value,
                notes: document.getElementById('completion-notes').value,
                photos: photoUrls
            };
            
            await maintenance.submitMaintenanceCompletion(maintenanceId, completionData);
            
        } catch (error) {
            console.error('Erro ao concluir manutenção:', error);
            utils.showToast('Erro ao concluir manutenção', 'error');
        }
    },

    openMaintenanceScheduleModal(equipment) {
        const modal = this.createModal('schedule-modal', `Agendar Manutenção - ${equipment.name}`, `
            <form id="schedule-form" class="space-y-4">
                <input type="hidden" id="schedule-equipment-id" value="${equipment.id}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Manutenção</label>
                        <select id="schedule-type" required class="input-field">
                            ${Object.entries(MAINTENANCE_TYPES).map(([key, value]) => 
                                `<option value="${key}">${value}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Data Prevista</label>
                        <input type="date" id="schedule-due-date" required class="input-field">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                    <input type="text" id="schedule-responsible" required class="input-field">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea id="schedule-description" rows="3" class="input-field" placeholder="Descreva o que deve ser feito..."></textarea>
                </div>
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="components.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary">Agendar</button>
                </div>
            </form>
        `);
        
        document.getElementById('schedule-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitMaintenanceSchedule();
        });
    },

    async submitMaintenanceSchedule() {
        try {
            const equipmentId = document.getElementById('schedule-equipment-id').value;
            const equipment = await database.get('equipment', equipmentId);
            
            const scheduleData = {
                equipmentId: equipmentId,
                equipmentName: equipment.name,
                type: document.getElementById('schedule-type').value,
                dueDate: document.getElementById('schedule-due-date').value,
                responsibleName: document.getElementById('schedule-responsible').value,
                description: document.getElementById('schedule-description').value
            };
            
            await maintenance.scheduleMaintenance(scheduleData);
            
        } catch (error) {
            console.error('Erro ao agendar manutenção:', error);
            utils.showToast('Erro ao agendar manutenção', 'error');
        }
    },

    async viewEquipment(equipmentId) {
        try {
            const equipment = await database.get('equipment', equipmentId);
            if (!equipment) {
                utils.showToast('Equipamento não encontrado', 'error');
                return;
            }
            
            const modal = this.createModal('view-equipment-modal', `Detalhes - ${equipment.name}`, `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Nome</label>
                            <p class="text-gray-900">${equipment.name}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Tipo</label>
                            <p class="text-gray-900">${EQUIPMENT_TYPES[equipment.type] || equipment.type}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Modelo</label>
                            <p class="text-gray-900">${equipment.model || 'Não informado'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Número de Série</label>
                            <p class="text-gray-900">${equipment.serialNumber || 'Não informado'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Ano</label>
                            <p class="text-gray-900">${equipment.year || 'Não informado'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Status</label>
                            <p class="text-gray-900">${EQUIPMENT_STATUS[equipment.status] || equipment.status}</p>
                        </div>
                    </div>
                    ${equipment.notes ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Observações</label>
                            <p class="text-gray-900">${equipment.notes}</p>
                        </div>
                    ` : ''}
                    <div class="flex justify-end gap-3">
                        <button onclick="components.closeModal()" class="btn-secondary">Fechar</button>
                        <button onclick="components.editEquipment('${equipmentId}')" class="btn-primary">Editar</button>
                    </div>
                </div>
            `);
        } catch (error) {
            console.error('Erro ao visualizar equipamento:', error);
            utils.showToast('Erro ao carregar detalhes do equipamento', 'error');
        }
    },

    editEquipment(equipmentId) {
        this.closeModal();
        this.openEquipmentModal(equipmentId);
    },

    async viewMaintenanceHistory(historyId) {
        try {
            const history = await database.get('maintenance_history', historyId);
            if (!history) {
                utils.showToast('Registro não encontrado', 'error');
                return;
            }
            
            const modal = this.createModal('view-history-modal', `Manutenção - ${history.equipmentName}`, `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Equipamento</label>
                            <p class="text-gray-900">${history.equipmentName}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Tipo</label>
                            <p class="text-gray-900">${MAINTENANCE_TYPES[history.type]}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Data de Conclusão</label>
                            <p class="text-gray-900">${utils.formatDate(history.completedAt.toDate())}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Responsável</label>
                            <p class="text-gray-900">${history.responsibleName}</p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">O que foi feito</label>
                        <p class="text-gray-900">${history.workDone}</p>
                    </div>
                    ${history.partsReplaced ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Peças Trocadas</label>
                            <p class="text-gray-900">${history.partsReplaced}</p>
                        </div>
                    ` : ''}
                    ${history.seiNumber ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Número SEI</label>
                            <p class="text-gray-900">${history.seiNumber}</p>
                        </div>
                    ` : ''}
                    ${history.notes ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Observações</label>
                            <p class="text-gray-900">${history.notes}</p>
                        </div>
                    ` : ''}
                    ${history.photos && history.photos.length > 0 ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Fotos</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                ${history.photos.map(photo => `
                                    <img src="${photo}" alt="Foto da manutenção" class="w-full h-24 object-cover rounded cursor-pointer" onclick="window.open('${photo}', '_blank')">
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="flex justify-end">
                        <button onclick="components.closeModal()" class="btn-secondary">Fechar</button>
                    </div>
                </div>
            `);
        } catch (error) {
            console.error('Erro ao visualizar histórico:', error);
            utils.showToast('Erro ao carregar histórico', 'error');
        }
    },

    openInoperantModal(equipmentId) {
        const modal = this.createModal('inoperant-modal', 'Registrar Inoperância', `
            <form id="inoperant-form" class="space-y-4">
                <div class="alert alert-warning">
                    <p class="font-semibold">Atenção!</p>
                    <p class="text-sm">Você está prestes a marcar este equipamento como INOPERANTE. Esta ação criará um registro permanente no sistema.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Data da Inoperância *</label>
                        <input type="date" id="inoperant-date" required class="input-field" value="${utils.formatDate(new Date())}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Número do SEI *</label>
                        <input type="text" id="inoperant-sei" required class="input-field" placeholder="Ex: 12345.678901/2024-12">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Motivo da Inoperância *</label>
                    <select id="inoperant-reason" required class="input-field">
                        <option value="">Selecione o motivo</option>
                        <option value="dano_irreparavel">Dano Irreparável</option>
                        <option value="obsolescencia">Obsolescência</option>
                        <option value="acidente">Acidente/Sinistro</option>
                        <option value="desgaste_natural">Desgaste Natural</option>
                        <option value="incendio">Incêndio</option>
                        <option value="roubo">Roubo/Furto</option>
                        <option value="outro">Outro</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
                    <textarea id="inoperant-description" required rows="3" class="input-field" 
                        placeholder="Descreva detalhadamente o motivo da inoperância..."></textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Local onde se encontra *</label>
                    <input type="text" id="inoperant-location" required class="input-field" 
                        placeholder="Ex: Depósito do Quartel, Oficina Externa, etc.">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fotos do Equipamento (opcional)</label>
                    <input type="file" id="inoperant-photos" multiple accept="image/*" class="input-field">
                    <p class="text-xs text-gray-500 mt-1">Selecione até 5 fotos que comprovem o estado do equipamento</p>
                </div>
                
                <div class="border-t pt-4">
                    <label class="flex items-center">
                        <input type="checkbox" id="inoperant-confirm" required class="mr-2">
                        <span class="text-sm">Confirmo que este equipamento está inoperante e todas as informações estão corretas</span>
                    </label>
                </div>
                
                <div class="flex justify-end gap-3">
                    <button type="button" onclick="components.closeModal()" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors">
                        Confirmar Inoperância
                    </button>
                </div>
            </form>
        `);
        
        document.getElementById('inoperant-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitInoperantStatus(equipmentId);
        });
    },

    async submitInoperantStatus(equipmentId) {
        try {
            const photos = document.getElementById('inoperant-photos').files;
            const photoUrls = [];
            
            if (photos.length > 0) {
                utils.showToast('Fazendo upload das fotos...', 'info');
                for (let i = 0; i < Math.min(photos.length, 5); i++) {
                    const photo = photos[i];
                    const path = `inoperant/${equipmentId}/photos/${Date.now()}_${i}`;
                    const uploadResult = await database.uploadFile(photo, path);
                    photoUrls.push(uploadResult.url);
                }
            }
            
            const inoperantData = {
                equipmentId: equipmentId,
                date: document.getElementById('inoperant-date').value,
                seiNumber: document.getElementById('inoperant-sei').value,
                reason: document.getElementById('inoperant-reason').value,
                description: document.getElementById('inoperant-description').value,
                location: document.getElementById('inoperant-location').value,
                photos: photoUrls,
                registeredBy: app.currentUser.uid,
                registeredByEmail: app.currentUser.email,
                registeredAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await database.create('equipment_inoperant_records', inoperantData);
            
            await database.update('equipment', equipmentId, {
                status: 'inativo',
                inoperantDate: inoperantData.date,
                inoperantReason: inoperantData.reason,
                currentLocation: inoperantData.location
            });
            
            utils.showToast('Equipamento marcado como inoperante com sucesso!', 'success');
            this.closeModal();
            app.loadEquipment();
            
        } catch (error) {
            console.error('Erro ao registrar inoperância:', error);
            utils.showToast('Erro ao registrar inoperância', 'error');
        }
    },

    async viewInoperantRecord(equipmentId) {
        try {
            const records = await database.query('equipment_inoperant_records', [
                { field: 'equipmentId', operator: '==', value: equipmentId }
            ]);
            
            if (records.length === 0) {
                utils.showToast('Registro de inoperância não encontrado', 'error');
                return;
            }
            
            const record = records[0];
            const equipment = await database.get('equipment', equipmentId);
            
            const reasonLabels = {
                dano_irreparavel: 'Dano Irreparável',
                obsolescencia: 'Obsolescência',
                acidente: 'Acidente/Sinistro',
                desgaste_natural: 'Desgaste Natural',
                incendio: 'Incêndio',
                roubo: 'Roubo/Furto',
                outro: 'Outro'
            };
            
            const modal = this.createModal('view-inoperant-modal', `Registro de Inoperância - ${equipment.name}`, `
                <div class="space-y-4">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p class="text-red-800 font-semibold">Equipamento Inoperante</p>
                        <p class="text-sm text-red-600">Este equipamento foi declarado inoperante e não pode ser utilizado.</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Data da Inoperância</label>
                            <p class="text-gray-900">${utils.formatDateBR(new Date(record.date))}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Número SEI</label>
                            <p class="text-gray-900">${record.seiNumber}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Motivo</label>
                            <p class="text-gray-900">${reasonLabels[record.reason] || record.reason}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Local Atual</label>
                            <p class="text-gray-900">${record.location}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Descrição Detalhada</label>
                        <p class="text-gray-900 whitespace-pre-wrap">${record.description}</p>
                    </div>
                    
                    ${record.photos && record.photos.length > 0 ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fotos do Estado do Equipamento</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                ${record.photos.map(photo => `
                                    <img src="${photo}" alt="Foto da inoperância" 
                                         class="w-full h-32 object-cover rounded cursor-pointer border border-gray-300" 
                                         onclick="window.open('${photo}', '_blank')">
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="border-t pt-4">
                        <p class="text-sm text-gray-500">
                            Registrado por: ${record.registeredByEmail}<br>
                            Data do registro: ${record.registeredAt ? utils.formatDateTime(record.registeredAt.toDate()) : 'N/A'}
                        </p>
                    </div>
                    
                    <div class="flex justify-end">
                        <button onclick="components.closeModal()" class="btn-secondary">Fechar</button>
                    </div>
                </div>
            `);
        } catch (error) {
            console.error('Erro ao visualizar registro de inoperância:', error);
            utils.showToast('Erro ao carregar registro de inoperância', 'error');
        }
    },

    createModal(id, title, content) {
        this.closeModal();
        
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modals-container');
        
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-90vh overflow-y-auto">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
                    <button onclick="components.closeModal()" class="text-gray-400 hover:text-gray-600">
                        <span class="text-xl">&times;</span>
                    </button>
                </div>
                <div class="p-6">
                    ${content}
                </div>
            </div>
        `;
        
        container.appendChild(modal);
        overlay.classList.remove('hidden');
        
        return modal;
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modals-container');
        
        overlay.classList.add('hidden');
        container.innerHTML = '';
    }
};