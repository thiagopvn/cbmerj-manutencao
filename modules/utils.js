const utils = {
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    },

    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatDateBR(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white shadow-lg transition-all duration-300 ${this.getToastColor(type)}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    },

    getToastColor(type) {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        return colors[type] || colors.info;
    },

    async compressImage(file, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    },

    async exportHistory() {
        try {
            const historyData = await database.getAll('maintenance_history', 
                { field: 'completedAt', direction: 'desc' }
            );
            
            const csvContent = this.convertToCSV(historyData);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `historico_manutencoes_${this.formatDate(new Date())}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            this.showToast('Histórico exportado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar histórico:', error);
            this.showToast('Erro ao exportar histórico', 'error');
        }
    },

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = [
            'Data de Conclusão',
            'Equipamento',
            'Tipo de Manutenção',
            'Responsável',
            'O que foi feito',
            'Peças Trocadas',
            'Número SEI',
            'Observações'
        ];
        
        const rows = data.map(item => [
            this.formatDateBR(item.completedAt?.toDate?.() || item.completedAt),
            item.equipmentName || '',
            MAINTENANCE_TYPES[item.type] || item.type,
            item.responsibleName || '',
            item.workDone || '',
            item.partsReplaced || '',
            item.seiNumber || '',
            item.notes || ''
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        return '\ufeff' + csvContent;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};

window.performSearch = async function() {
    const searchTerm = document.getElementById('search-term').value.toLowerCase();
    const searchType = document.getElementById('search-type').value;
    const dateFrom = document.getElementById('search-date-from').value;
    const dateTo = document.getElementById('search-date-to').value;
    
    if (!searchTerm.trim()) {
        utils.showToast('Digite um termo para pesquisar', 'warning');
        return;
    }
    
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<div class="text-center py-8"><div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div><p class="text-gray-600">Pesquisando...</p></div>';
    
    try {
        let results = [];
        
        if (searchType === 'all' || searchType === 'equipment') {
            const equipment = await database.getAll('equipment');
            const equipmentResults = equipment.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.model && item.model.toLowerCase().includes(searchTerm)) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm))
            ).map(item => ({ ...item, type: 'equipment' }));
            results = results.concat(equipmentResults);
        }
        
        if (searchType === 'all' || searchType === 'maintenance') {
            const history = await database.getAll('maintenance_history');
            const maintenanceResults = history.filter(item => {
                const matchesTerm = item.equipmentName.toLowerCase().includes(searchTerm) ||
                    (item.workDone && item.workDone.toLowerCase().includes(searchTerm)) ||
                    (item.responsibleName && item.responsibleName.toLowerCase().includes(searchTerm));
                
                let matchesDate = true;
                if (dateFrom && item.completedAt) {
                    const completedDate = utils.formatDate(item.completedAt.toDate());
                    matchesDate = matchesDate && completedDate >= dateFrom;
                }
                if (dateTo && item.completedAt) {
                    const completedDate = utils.formatDate(item.completedAt.toDate());
                    matchesDate = matchesDate && completedDate <= dateTo;
                }
                
                return matchesTerm && matchesDate;
            }).map(item => ({ ...item, type: 'maintenance' }));
            results = results.concat(maintenanceResults);
        }
        
        displaySearchResults(results);
        
    } catch (error) {
        console.error('Erro na pesquisa:', error);
        resultsContainer.innerHTML = '<div class="text-center py-8 text-red-600">Erro ao realizar pesquisa</div>';
    }
};

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center py-8 text-gray-600">Nenhum resultado encontrado</div>';
        return;
    }
    
    resultsContainer.innerHTML = `
        <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-800">${results.length} resultado(s) encontrado(s)</h3>
        </div>
        <div class="space-y-4">
            ${results.map(item => createSearchResultCard(item)).join('')}
        </div>
    `;
}

function createSearchResultCard(item) {
    if (item.type === 'equipment') {
        return `
            <div class="bg-white border rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium text-blue-600">📱 ${item.name}</h4>
                        <p class="text-sm text-gray-600">${EQUIPMENT_TYPES[item.type]} ${item.model ? `- ${item.model}` : ''}</p>
                        <p class="text-sm text-gray-500">Status: ${EQUIPMENT_STATUS[item.status]}</p>
                    </div>
                    <button onclick="components.viewEquipment('${item.id}')" class="text-blue-600 hover:text-blue-800 text-sm">Ver detalhes</button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="bg-white border rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium text-green-600">🔧 ${item.equipmentName}</h4>
                        <p class="text-sm text-gray-600">${MAINTENANCE_TYPES[item.type]} - ${utils.formatDateBR(item.completedAt.toDate())}</p>
                        <p class="text-sm text-gray-500">Responsável: ${item.responsibleName}</p>
                        ${item.workDone ? `<p class="text-sm text-gray-700 mt-1">${item.workDone.substring(0, 100)}${item.workDone.length > 100 ? '...' : ''}</p>` : ''}
                    </div>
                    <button onclick="components.viewMaintenanceHistory('${item.id}')" class="text-green-600 hover:text-green-800 text-sm">Ver detalhes</button>
                </div>
            </div>
        `;
    }
}