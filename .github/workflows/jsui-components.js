// ==========================================================================
// UI Components - Генерация интерфейса из конфигурации
// ==========================================================================

class UIComponents {
    constructor(container) {
        this.container = container;
        this.components = new Map();
        this.sections = {};
    }
    
    /**
     * Инициализация интерфейса
     */
    init() {
        // Создаем секции
        Object.entries(BLE_CONFIG.sections)
            .sort((a, b) => a[1].order - b[1].order)
            .forEach(([id, config]) => {
                this.createSection(id, config.title);
            });
        
        // Создаем компоненты для каждой характеристики
        BLE_CONFIG.characteristics.forEach(char => {
            this.createComponent(char);
        });
    }
    
    /**
     * Создание секции
     */
    createSection(id, title) {
        const section = document.createElement('div');
        section.id = `${id}-section`;
        section.className = 'section';
        section.innerHTML = `<h2 class="section-title">${title}</h2>`;
        
        const content = document.createElement('div');
        content.className = 'section-content';
        section.appendChild(content);
        
        this.container.appendChild(section);
        this.sections[id] = content;
    }
    
    /**
     * Создание компонента для характеристики
     */
    createComponent(char) {
        const section = this.sections[char.ui.section];
        if (!section) {
            console.warn(`Секция ${char.ui.section} не найдена для ${char.id}`);
            return;
        }
        
        let component;
        
        switch (char.ui.type) {
            case 'sensor':
                component = this.createSensor(char);
                break;
            case 'slider':
                component = this.createSlider(char);
                break;
            case 'compound':
                component = this.createCompound(char);
                break;
            case 'info':
                component = this.createInfo(char);
                break;
            default:
                component = this.createDefault(char);
        }
        
        if (component) {
            component.dataset.characteristicId = char.id;
            section.appendChild(component);
            this.components.set(char.id, component);
        }
    }
    
    /**
     * Создание сенсора
     */
    createSensor(char) {
        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `${char.id}-display`;
        
        card.innerHTML = `
            <div class="sensor-label">
                <span>${char.ui.icon || '📊'}</span>
                <span>${char.name}</span>
            </div>
            <div>
                <span class="sensor-value" id="${char.id}-value">--</span>
                <span class="sensor-unit">${char.ui.unit || ''}</span>
            </div>
        `;
        
        return card;
    }
    
    /**
     * Создание слайдера
     */
    createSlider(char) {
        const item = document.createElement('div');
        item.className = 'setting-item';
        item.id = `${char.id}-control`;
        
        item.innerHTML = `
            <div class="setting-label">
                <span>${char.ui.icon || '🎮'} ${char.name}</span>
                <span class="setting-value" id="${char.id}-value">--${char.ui.unit || ''}</span>
            </div>
            <div class="setting-control">
                <input type="range" 
                       id="${char.id}-slider"
                       min="${char.ui.min || 0}"
                       max="${char.ui.max || 100}"
                       value="0"
                       disabled>
            </div>
        `;
        
        return item;
    }
    
    /**
     * Создание составного компонента (все настройки)
     */
    createCompound(char) {
        const card = document.createElement('div');
        card.className = 'settings-card';
        card.id = `${char.id}-display`;
        
        card.innerHTML = `
            <h3>${char.ui.icon || '⚙️'} ${char.name}</h3>
            <div id="${char.id}-container" class="settings-container"></div>
        `;
        
        return card;
    }
    
    /**
     * Создание информационного компонента
     */
    createInfo(char) {
        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `${char.id}-display`;
        
        card.innerHTML = `
            <div class="sensor-label">ℹ️ Системная информация</div>
            <div class="sensor-value" id="${char.id}-value">--</div>
        `;
        
        return card;
    }
    
    createDefault(char) {
        const div = document.createElement('div');
        div.className = 'default-component';
        div.id = `${char.id}-display`;
        div.textContent = `${char.name}: --`;
        return div;
    }
    
    /**
     * Обновление значения компонента
     */
    updateComponent(charId, value, rawData = null) {
        const component = this.components.get(charId);
        if (!component) return;
        
        const char = BLE_CONFIG.characteristics.find(c => c.id === charId);
        if (!char) return;
        
        switch (char.ui.type) {
            case 'sensor':
                this.updateSensor(charId, value, char.ui.decimals);
                break;
            case 'slider':
                this.updateSlider(charId, value);
                break;
            case 'compound':
                this.updateCompound(charId, value);
                break;
            case 'info':
                this.updateInfo(charId, value);
                break;
        }
    }
    
    updateSensor(charId, value, decimals = 1) {
        const valueEl = document.getElementById(`${charId}-value`);
        if (valueEl && value !== null && !isNaN(value)) {
            valueEl.textContent = value.toFixed(decimals);
        } else if (valueEl) {
            valueEl.textContent = '--';
        }
    }
    
    updateSlider(charId, value) {
        const valueEl = document.getElementById(`${charId}-value`);
        const slider = document.getElementById(`${charId}-slider`);
        
        if (valueEl && value !== null && !isNaN(value)) {
            valueEl.textContent = `${value}${BLE_CONFIG.characteristics.find(c => c.id === charId).ui.unit}`;
        }
        
        if (slider && value !== null && !isNaN(value)) {
            slider.value = value;
        }
    }
    
    updateCompound(charId, settings) {
        const container = document.getElementById(`${charId}-container`);
        if (!container) return;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Создаем элементы для каждой настройки
        Object.entries(settings).forEach(([key, value]) => {
            if (key === 'crc' || key === 'version') return; // Пропускаем технические поля
            
            const item = document.createElement('div');
            item.className = 'setting-item';
            
            const displayName = getSettingDisplayName(key);
            const unit = getSettingUnit(key);
            
            item.innerHTML = `
                <div class="setting-label">
                    <span>${displayName}</span>
                    <span class="setting-value" id="setting-${key}">${value}${unit}</span>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    updateInfo(charId, info) {
        const valueEl = document.getElementById(`${charId}-value`);
        if (!valueEl) return;
        
        if (info.type === 'efficiency') {
            valueEl.textContent = `${info.value.toFixed(1)}%/мин`;
        } else {
            valueEl.textContent = info.value;
        }
    }
    
    /**
     * Активация/деактивация контролов
     */
    setControlsEnabled(enabled) {
        BLE_CONFIG.characteristics.forEach(char => {
            if (char.ui.type === 'slider') {
                const slider = document.getElementById(`${char.id}-slider`);
                if (slider) {
                    slider.disabled = !enabled;
                }
            }
        });
    }
    
    /**
     * Привязка обработчиков
     */
    bindSliderHandler(charId, handler) {
        const slider = document.getElementById(`${charId}-slider`);
        if (slider) {
            slider.addEventListener('change', (e) => {
                handler(parseInt(e.target.value));
            });
        }
    }
}

// Экспортируем
window.UIComponents = UIComponents;