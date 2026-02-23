// ==========================================================================
// Главный файл приложения
// ==========================================================================

class GuitarCabinetApp {
    constructor() {
        this.bleManager = new BLEManager();
        this.ui = null;
        this.debugEnabled = false;
        this.debugLog = [];
    }
    
    /**
     * Инициализация приложения
     */
    async init() {
        console.log('🚀 Guitar Cabinet Controller инициализация...');
        
        // Проверка поддержки Web Bluetooth
        if (!BLEManager.isSupported()) {
            this.showError('Web Bluetooth не поддерживается в этом браузере. Используйте Chrome/Edge.');
            return;
        }
        
        // Валидация конфигурации
        if (!validateConfig()) {
            this.showError('Ошибка в конфигурации BLE. Проверьте консоль.');
            return;
        }
        
        // Инициализация UI
        this.ui = new UIComponents(document.querySelector('.container'));
        this.ui.init();
        
        // Настройка обработчиков событий
        this.setupEventHandlers();
        
        // Настройка BLE обработчиков
        this.setupBLEHandlers();
        
        // Инициализация интерфейса
        this.updateConnectionUI(false);
        
        // Загрузка сохраненного состояния
        this.loadSavedState();
        
        console.log('✅ Приложение готово');
    }
    
    /**
     * Настройка обработчиков событий UI
     */
    setupEventHandlers() {
        // Кнопка подключения
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.addEventListener('click', () => this.toggleConnection());
        
        // Отладка
        document.getElementById('debugToggle').addEventListener('click', () => {
            const panel = document.getElementById('debugPanel');
            const isHidden = panel.style.display === 'none';
            panel.style.display = isHidden ? 'block' : 'none';
        });
        
        // Обработчики для слайдеров
        this.ui.bindSliderHandler('targetHum', (value) => {
            this.bleManager.writeCharacteristic('targetHum', value);
        });
    }
    
    /**
     * Настройка обработчиков BLE
     */
    setupBLEHandlers() {
        // Подключение
        this.bleManager.on('connecting', () => {
            this.updateConnectionUI('connecting');
            this.addLog('🔍 Подключение...', 'info');
        });
        
        this.bleManager.on('connected', async () => {
            this.updateConnectionUI(true);
            this.addLog('✅ Подключено успешно', 'success');
            
            // Читаем начальные данные
            await this.readAllData();
        });
        
        this.bleManager.on('disconnected', () => {
            this.updateConnectionUI(false);
            this.addLog('❌ Отключено', 'warning');
            this.ui.setControlsEnabled(false);
        });
        
        this.bleManager.on('error', (error) => {
            this.addLog(`❌ Ошибка: ${error.message}`, 'error');
        });
        
        // Уведомления
        this.bleManager.on('notification', (data) => {
            this.ui.updateComponent(data.charId, data.value, data.raw);
            
            // Логируем для отладки
            if (this.debugEnabled) {
                this.addLog(`📨 ${data.charId}: ${JSON.stringify(data.value)}`, 'debug');
            }
        });
        
        // Логи
        this.bleManager.on('log', (logData) => {
            this.addLog(logData.message, logData.type);
        });
    }
    
    /**
     * Переключение подключения
     */
    async toggleConnection() {
        const connectBtn = document.getElementById('connectBtn');
        
        if (this.bleManager.isConnected) {
            // Отключаемся
            connectBtn.disabled = true;
            await this.bleManager.disconnect();
            connectBtn.disabled = false;
        } else {
            // Подключаемся
            connectBtn.disabled = true;
            const success = await this.bleManager.connect();
            connectBtn.disabled = false;
            
            if (success) {
                // Сохраняем устройство для быстрого подключения в будущем
                this.saveDeviceInfo();
            }
        }
    }
    
    /**
     * Чтение всех данных
     */
    async readAllData() {
        this.addLog('📥 Чтение данных...', 'info');
        
        for (const char of BLE_CONFIG.characteristics) {
            if (char.properties.includes('read')) {
                try {
                    const value = await this.bleManager.readCharacteristic(char.id);
                    this.ui.updateComponent(char.id, value);
                    this.addLog(`  ✓ ${char.id}: ${JSON.stringify(value)}`, 'success');
                } catch (e) {
                    this.addLog(`  ✗ ${char.id}: ${e.message}`, 'error');
                }
                
                // Небольшая задержка между чтениями
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        this.ui.setControlsEnabled(true);
        this.addLog('✅ Данные загружены', 'success');
    }
    
    /**
     * Обновление UI статуса подключения
     */
    updateConnectionUI(isConnected) {
        const statusLed = document.getElementById('statusLed');
        const statusText = document.getElementById('statusText');
        const connectBtn = document.getElementById('connectBtn');
        
        if (isConnected === 'connecting') {
            statusLed.className = 'status-led';
            statusText.textContent = '⏳ Подключение...';
            connectBtn.textContent = '⏳ Подключение...';
            connectBtn.disabled = true;
        } else if (isConnected) {
            statusLed.className = 'status-led connected';
            statusText.textContent = '✅ Подключено';
            connectBtn.textContent = '❌ Отключиться';
            connectBtn.classList.add('connected');
            connectBtn.disabled = false;
        } else {
            statusLed.className = 'status-led';
            statusText.textContent = 'Ожидание подключения...';
            connectBtn.textContent = '🔌 Подключиться';
            connectBtn.classList.remove('connected');
            connectBtn.disabled = false;
        }
    }
    
    /**
     * Добавление записи в лог
     */
    addLog(message, type = 'info') {
        const logDiv = document.getElementById('debugLog');
        if (!logDiv) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        entry.textContent = `[${time}] ${message}`;
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
        
        // Сохраняем в массив для истории
        this.debugLog.push({ time, message, type });
        if (this.debugLog.length > 100) {
            this.debugLog.shift();
        }
    }
    
    /**
     * Сохранение информации об устройстве
     */
    saveDeviceInfo() {
        if (this.bleManager.device) {
            localStorage.setItem('lastDeviceId', this.bleManager.device.id);
            localStorage.setItem('lastDeviceName', this.bleManager.device.name);
        }
    }
    
    /**
     * Загрузка сохраненного состояния
     */
    loadSavedState() {
        const lastDevice = localStorage.getItem('lastDeviceName');
        if (lastDevice) {
            this.addLog(`📎 Последнее устройство: ${lastDevice}`, 'info');
        }
    }
    
    /**
     * Показать ошибку
     */
    showError(message) {
        const container = document.querySelector('.container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 8px; margin: 10px 0;">
                ❌ ${message}
            </div>
        `;
        container.insertBefore(errorDiv, container.firstChild);
    }
}

// ==========================================================================
// Запуск приложения
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new GuitarCabinetApp();
    app.init();
    
    // Сохраняем в глобальную область для отладки
    window.app = app;
});