const axios = require('axios');
const https = require('https');
const { SUBSCRIPTION_STATUS } = require('../config/constants');

class OutlineService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.agent = new https.Agent({
            rejectUnauthorized: false
        });
    }

    async createAccessKey(name = '', dataLimit = null) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/access-keys`,
                {},
                {
                    httpsAgent: this.agent,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const keyData = response.data;
            
            // Устанавливаем имя ключа если указано
            if (name) {
                await this.renameAccessKey(keyData.id, name);
                keyData.name = name;
            }

            // Устанавливаем лимит данных если указан
            if (dataLimit) {
                await this.setDataLimit(keyData.id, dataLimit);
                keyData.dataLimit = dataLimit;
            }

            return keyData;
        } catch (error) {
            console.error('Ошибка при создании ключа доступа:', error.message);
            throw error;
        }
    }

    async getAccessKey(keyId) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/access-keys/${keyId}`,
                {
                    httpsAgent: this.agent
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при получении ключа доступа:', error.message);
            throw error;
        }
    }

    async listAccessKeys() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/access-keys`,
                {
                    httpsAgent: this.agent
                }
            );
            return response.data.accessKeys;
        } catch (error) {
            console.error('Ошибка при получении списка ключей:', error.message);
            throw error;
        }
    }

    async renameAccessKey(keyId, name) {
        try {
            const response = await axios.put(
                `${this.apiUrl}/access-keys/${keyId}/name`,
                { name },
                {
                    httpsAgent: this.agent,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при переименовании ключа:', error.message);
            throw error;
        }
    }

    async deleteAccessKey(keyId) {
        try {
            const response = await axios.delete(
                `${this.apiUrl}/access-keys/${keyId}`,
                {
                    httpsAgent: this.agent
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при удалении ключа:', error.message);
            throw error;
        }
    }

    async setDataLimit(keyId, limitBytes) {
        try {
            const response = await axios.put(
                `${this.apiUrl}/access-keys/${keyId}/data-limit`,
                { limit: { bytes: limitBytes } },
                {
                    httpsAgent: this.agent,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при установке лимита данных:', error.message);
            throw error;
        }
    }

    async removeDataLimit(keyId) {
        try {
            const response = await axios.delete(
                `${this.apiUrl}/access-keys/${keyId}/data-limit`,
                {
                    httpsAgent: this.agent
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при удалении лимита данных:', error.message);
            throw error;
        }
    }

    async getDataUsage() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/metrics/transfer`,
                {
                    httpsAgent: this.agent
                }
            );
            return response.data.bytesTransferredByUserId;
        } catch (error) {
            console.error('Ошибка при получении статистики использования:', error.message);
            throw error;
        }
    }

    async getKeyDataUsage(keyId) {
        try {
            const allUsage = await this.getDataUsage();
            return allUsage[keyId] || 0;
        } catch (error) {
            console.error('Ошибка при получении использования ключа:', error.message);
            return 0;
        }
    }

    async getServerInfo() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/server`,
                {
                    httpsAgent: this.agent
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при получении информации о сервере:', error.message);
            throw error;
        }
    }

    async updateServerInfo(serverInfo) {
        try {
            const response = await axios.put(
                `${this.apiUrl}/server`,
                serverInfo,
                {
                    httpsAgent: this.agent,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Ошибка при обновлении информации о сервере:', error.message);
            throw error;
        }
    }

    // Метод для создания полного VPN доступа с учетом подписки
    async createSubscriptionKey(subscription, userName) {
        try {
            const keyName = `${userName}_${subscription.plan_id}_${subscription.id}`;
            
            // Создаем ключ с лимитом данных
            const keyData = await this.createAccessKey(keyName, subscription.data_limit);
            
            return {
                keyId: keyData.id,
                accessUrl: keyData.accessUrl,
                name: keyName
            };
        } catch (error) {
            console.error('Ошибка при создании ключа подписки:', error.message);
            throw error;
        }
    }

    // Метод для проверки и обновления использования данных
    async checkAndUpdateUsage(subscriptionId, outlineKeyId, currentDataUsed = 0) {
        try {
            const actualUsage = await this.getKeyDataUsage(outlineKeyId);
            
            // Если использование увеличилось, возвращаем новое значение
            if (actualUsage > currentDataUsed) {
                return {
                    updated: true,
                    newUsage: actualUsage,
                    additionalUsage: actualUsage - currentDataUsed
                };
            }
            
            return {
                updated: false,
                newUsage: currentDataUsed,
                additionalUsage: 0
            };
        } catch (error) {
            console.error('Ошибка при проверке использования:', error.message);
            return {
                updated: false,
                newUsage: currentDataUsed,
                additionalUsage: 0
            };
        }
    }

    // Метод для блокировки ключа при превышении лимита
    async suspendKey(outlineKeyId) {
        try {
            // В Outline нет прямого метода блокировки, но можно установить лимит в 0
            await this.setDataLimit(outlineKeyId, 1); // Минимальный лимит
            return true;
        } catch (error) {
            console.error('Ошибка при блокировке ключа:', error.message);
            return false;
        }
    }

    // Метод для разблокировки ключа
    async reactivateKey(outlineKeyId, newDataLimit) {
        try {
            await this.setDataLimit(outlineKeyId, newDataLimit);
            return true;
        } catch (error) {
            console.error('Ошибка при разблокировке ключа:', error.message);
            return false;
        }
    }

    // Утилитные методы
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    calculateUsagePercentage(used, limit) {
        if (limit === 0) return 0;
        return Math.round((used / limit) * 100);
    }
}

module.exports = OutlineService;