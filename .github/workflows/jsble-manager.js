// ==========================================================================
// BLE Manager - Управление подключением
// ==========================================================================

class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        service = null;
        this.characteristics = new Map();
        this.isConnected = false;
        this.eventHandlers = new Map();
    }
    
    /**
     * Подключение к устройству
     */
    async connect() {
        try {
            this.triggerEvent('connecting');
            
            // Запрос устройства
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: BLE_CONFIG.device.namePrefix }
                ],
                optionalServices: [BLE_CONFIG.device.serviceUUID]
            });
            
            this.log(`Найдено устройство: ${this.device.name}`);
            
            // Обработка отключения
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnect();
            });
            
            // Подключение
            this.server = await this.device.gatt.connect();
            this.log('GATT сервер подключен');
            
            // Получение сервиса
            const service = await this.server.getPrimaryService(BLE_CONFIG.device.serviceUUID);
            this.log('Сервис найден');
            
            // Получение характеристик
            await this.discoverCharacteristics(service);
            
            this.isConnected = true;
            this.triggerEvent('connected');
            
            // Подписка на уведомления
            await this.subscribeToNotifications();
            
            return true;
            
        } catch (error) {
            this.log(`Ошибка: ${error.message}`, 'error');
            this.triggerEvent('error', error);
            return false;
        }
    }
    
    /**
     * Отключение
     */
    async disconnect() {
        if (this.server && this.server.connected) {
            this.server.disconnect();
        }
        this.handleDisconnect();
    }
    
    /**
     * Обработка отключения
     */
    handleDisconnect() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristics.clear();
        
        this.log('Устройство отключено', 'warning');
        this.triggerEvent('disconnected');
    }
    
    /**
     * Получение всех характеристик
     */
    async discoverCharacteristics(service) {
        this.log('Поиск характеристик...');
        
        for (const char of BLE_CONFIG.characteristics) {
            try {
                const characteristic = await service.getCharacteristic(char.uuid);
                this.characteristics.set(char.id, {
                    characteristic,
                    config: char
                });
                this.log(`  ✓ ${char.id} (${char.uuid})`, 'success');
            } catch (e) {
                this.log(`  ✗ ${char.id}: ${e.message}`, 'error');
            }
        }
    }
    
    /**
     * Подписка на уведомления
     */
    async subscribeToNotifications() {
        for (const [id, data] of this.characteristics) {
            const { characteristic, config } = data;
            
            if (config.properties.includes('notify')) {
                try {
                    await characteristic.startNotifications();
                    
                    characteristic.addEventListener('characteristicvaluechanged', (event) => {
                        this.handleNotification(id, event.target.value);
                    });
                    
                    this.log(`  ✓ Уведомления ${id} активированы`, 'success');
                } catch (e) {
                    this.log(`  ✗ Уведомления ${id}: ${e.message}`, 'error');
                }
            }
        }
    }
    
    /**
     * Обработка уведомления
     */
    handleNotification(charId, value) {
        const charData = this.characteristics.get(charId);
        if (!charData) return;
        
        const { config } = charData;
        
        try {
            const parsedValue = config.parser ? config.parser(value) : value;
            this.triggerEvent('notification', {
                charId,
                value: parsedValue,
                raw: value
            });
        } catch (e) {
            this.log(`Ошибка парсинга ${charId}: ${e.message}`, 'error');
        }
    }
    
    /**
     * Чтение характеристики
     */
    async readCharacteristic(charId) {
        const charData = this.characteristics.get(charId);
        if (!charData) {
            throw new Error(`Характеристика ${charId} не найдена`);
        }
        
        const { characteristic, config } = charData;
        
        try {
            const value = await characteristic.readValue();
            
            if (config.parser) {
                return config.parser(value);
            }
            
            return new TextDecoder().decode(value);
            
        } catch (error) {
            this.log(`Ошибка чтения ${charId}: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Запись в характеристику
     */
    async writeCharacteristic(charId, value) {
        const charData = this.characteristics.get(charId);
        if (!charData) {
            throw new Error(`Характеристика ${charId} не найдена`);
        }
        
        const { characteristic, config } = charData;
        
        try {
            let writeValue;
            
            if (config.formatter) {
                writeValue = config.formatter(value);
            } else {
                writeValue = value.toString();
            }
            
            const encoder = new TextEncoder();
            await characteristic.writeValue(encoder.encode(writeValue));
            
            this.log(`✓ Запись в ${charId}: ${writeValue}`, 'success');
            
        } catch (error) {
            this.log(`Ошибка записи ${charId}: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Регистрация обработчика событий
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * Вызов события
     */
    triggerEvent(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    }
    
    /**
     * Логирование
     */
    log(message, type = 'info') {
        console.log(`📱 [BLE] ${message}`);
        this.triggerEvent('log', { message, type });
    }
    
    /**
     * Проверка поддержки Web Bluetooth
     */
    static isSupported() {
        return navigator.bluetooth !== undefined;
    }
}

// Экспортируем
window.BLEManager = BLEManager;