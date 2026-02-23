// ==========================================================================
// BLE Configuration - ЕДИНСТВЕННОЕ МЕСТО ДЛЯ НАСТРОЙКИ ХАРАКТЕРИСТИК
// ==========================================================================

const BLE_CONFIG = {
    // Информация об устройстве
    device: {
        namePrefix: 'GuitarCabinet',
        serviceUUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
    },
    
    // Характеристики - добавляйте новые здесь
    characteristics: [
        {
            id: 'targetHum',
            uuid: "beb5483e-36e1-4688-b7f5-ea07361b26a1",
            name: 'Целевая влажность',
            type: 'setting',
            properties: ['read', 'write'],
            ui: {
                type: 'slider',
                min: 0,
                max: 100,
                unit: '%',
                icon: '🎯',
                section: 'controls'
            },
            parser: (value) => parseInt(value),
            formatter: (value) => value.toString()
        },
        {
            id: 'currentTemp',
            uuid: "beb5483e-36e1-4688-b7f5-ea07361b26a2",
            name: 'Температура',
            type: 'sensor',
            properties: ['read', 'notify'],
            ui: {
                type: 'sensor',
                unit: '°C',
                icon: '🌡️',
                section: 'sensors',
                decimals: 1
            },
            parser: (value) => {
                const str = typeof value === 'string' ? value : new TextDecoder().decode(value);
                return str.startsWith('T:') ? parseFloat(str.substring(2)) : null;
            }
        },
        {
            id: 'currentHum',
            uuid: "beb5483e-36e1-4688-b7f5-ea07361b26a3",
            name: 'Влажность',
            type: 'sensor',
            properties: ['read', 'notify'],
            ui: {
                type: 'sensor',
                unit: '%',
                icon: '💧',
                section: 'sensors',
                decimals: 1
            },
            parser: (value) => {
                const str = typeof value === 'string' ? value : new TextDecoder().decode(value);
                return str.startsWith('H:') ? parseFloat(str.substring(2)) : null;
            }
        },
        {
            id: 'allSettings',
            uuid: "beb5483e-36e1-4688-b7f5-ea07361b26a4",
            name: 'Все настройки',
            type: 'settings',
            properties: ['read', 'write'],
            ui: {
                type: 'compound',
                section: 'settings'
            },
            parser: parseSettingsString, // Из settings-parser.js
            formatter: (settings) => formatSettingsString(settings) // Из settings-parser.js
        },
        {
            id: 'sysInfo',
            uuid: "beb5483e-36e1-4688-b7f5-ea07361b26a5",
            name: 'Системная информация',
            type: 'info',
            properties: ['read', 'notify'],
            ui: {
                type: 'info',
                section: 'sensors'
            },
            parser: (value) => {
                const str = new TextDecoder().decode(value);
                if (str.startsWith('E:')) {
                    return { type: 'efficiency', value: parseFloat(str.substring(2)) };
                }
                return { type: 'raw', value: str };
            }
        }
    ],
    
    // Группировка по секциям
    sections: {
        sensors: { title: '📊 Датчики', order: 1 },
        controls: { title: '🎮 Управление', order: 2 },
        settings: { title: '⚙️ Настройки', order: 3 }
    }
};

// Валидация конфигурации
function validateConfig() {
    const errors = [];
    
    // Проверяем уникальность ID
    const ids = new Set();
    BLE_CONFIG.characteristics.forEach(char => {
        if (ids.has(char.id)) {
            errors.push(`Дубликат ID: ${char.id}`);
        }
        ids.add(char.id);
    });
    
    // Проверяем UUID
    BLE_CONFIG.characteristics.forEach(char => {
        if (!char.uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            errors.push(`Неверный UUID для ${char.id}: ${char.uuid}`);
        }
    });
    
    if (errors.length > 0) {
        console.error('❌ Ошибки в конфигурации BLE:', errors);
    }
    
    return errors.length === 0;
}

// Экспортируем
window.BLE_CONFIG = BLE_CONFIG;
window.validateConfig = validateConfig;