// ==========================================================================
// Парсер настроек - РАСШИРЯЕМЫЙ
// ==========================================================================

// Определяем все возможные настройки и их парсеры
const SETTINGS_PARSERS = {
    // Числовые настройки
    targetHumidity: (value) => parseInt(value),
    lockHoldTime: (value) => parseInt(value),
    waterHeaterMaxTemp: (value) => parseInt(value),
    deadZonePercent: (value) => parseFloat(value),
    minHumidityChange: (value) => parseFloat(value),
    maxOperationDuration: (value) => parseInt(value),
    operationCooldown: (value) => parseInt(value),
    maxSafeHumidity: (value) => parseInt(value),
    resourceCheckDiff: (value) => parseInt(value),
    hysteresis: (value) => parseFloat(value),
    lowFaultThreshold: (value) => parseInt(value),
    emptyFaultThreshold: (value) => parseInt(value),
    
    // Булевы настройки
    doorSoundEnabled: (value) => value === '1',
    waterSilicaSoundEnabled: (value) => value === '1',
    waterHeaterEnabled: (value) => value === '1',
    autoRebootEnabled: (value) => value === '1',
    
    // Индексы
    lockTimeIndex: (value) => parseInt(value),
    menuTimeoutOptionIndex: (value) => parseInt(value),
    screenTimeoutOptionIndex: (value) => parseInt(value),
    
    // Время (специальные)
    autoRebootHour: (value) => parseInt(value),
    autoRebootMinute: (value) => parseInt(value),
    autoRebootDays: (value) => parseInt(value),
    
    // Счетчики
    rebootCounter: (value) => parseInt(value),
    totalRebootCounter: (value) => parseInt(value),
    wdtResetCount: (value) => parseInt(value)
};

// Форматтеры для отправки на устройство
const SETTINGS_FORMATTERS = {
    targetHumidity: (value) => value.toString(),
    lockHoldTime: (value) => value.toString(),
    waterHeaterEnabled: (value) => value ? '1' : '0',
    // ... и так далее
};

/**
 * Парсит строку настроек в объект
 * @param {string} data - Строка вида "key1=value1,key2=value2"
 * @returns {Object} Объект с настройками
 */
function parseSettingsString(data) {
    const settings = {};
    
    if (!data || data.length === 0) {
        return settings;
    }
    
    const pairs = data.split(',');
    
    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
            // Применяем соответствующий парсер, если есть
            if (SETTINGS_PARSERS[key]) {
                try {
                    settings[key] = SETTINGS_PARSERS[key](value);
                } catch (e) {
                    console.warn(`⚠️ Ошибка парсинга ${key}=${value}:`, e);
                    settings[key] = value; // Сохраняем как строку
                }
            } else {
                // Если парсера нет, сохраняем как строку
                settings[key] = value;
            }
        }
    });
    
    return settings;
}

/**
 * Форматирует объект настроек в строку для отправки
 * @param {Object} settings - Объект с настройками
 * @returns {string} Строка вида "key1=value1,key2=value2"
 */
function formatSettingsString(settings) {
    const pairs = [];
    
    Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            // Применяем соответствующий форматтер, если есть
            if (SETTINGS_FORMATTERS[key]) {
                pairs.push(`${key}=${SETTINGS_FORMATTERS[key](value)}`);
            } else {
                pairs.push(`${key}=${value}`);
            }
        }
    });
    
    return pairs.join(',');
}

/**
 * Получить человекочитаемое название настройки
 */
function getSettingDisplayName(key) {
    const names = {
        targetHumidity: 'Целевая влажность',
        lockHoldTime: 'Время удержания замка',
        waterHeaterEnabled: 'Подогрев воды',
        waterHeaterMaxTemp: 'Макс. температура',
        doorSoundEnabled: 'Звук двери',
        waterSilicaSoundEnabled: 'Звук ресурсов',
        deadZonePercent: 'Мертвая зона',
        minHumidityChange: 'Мин. изменение',
        maxOperationDuration: 'Макс. время работы',
        operationCooldown: 'Время отдыха',
        maxSafeHumidity: 'Макс. безопасная H%',
        resourceCheckDiff: 'Порог ресурса',
        hysteresis: 'Гистерезис',
        lowFaultThreshold: 'Порог "Мало"',
        emptyFaultThreshold: 'Порог "Нет"'
    };
    
    return names[key] || key;
}

/**
 * Получить единицу измерения настройки
 */
function getSettingUnit(key) {
    const units = {
        targetHumidity: '%',
        lockHoldTime: 'мс',
        waterHeaterMaxTemp: '°C',
        deadZonePercent: '%',
        minHumidityChange: '%',
        maxOperationDuration: 'мин',
        operationCooldown: 'мин',
        maxSafeHumidity: '%',
        resourceCheckDiff: '%',
        hysteresis: '%'
    };
    
    return units[key] || '';
}

// Экспортируем
window.SETTINGS_PARSERS = SETTINGS_PARSERS;
window.parseSettingsString = parseSettingsString;
window.formatSettingsString = formatSettingsString;
window.getSettingDisplayName = getSettingDisplayName;
window.getSettingUnit = getSettingUnit;