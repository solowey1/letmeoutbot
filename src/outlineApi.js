const axios = require('axios');
const https = require('https');

class OutlineAPI {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.agent = new https.Agent({
            rejectUnauthorized: false
        });
    }

    async createAccessKey(name = '') {
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
            
            if (name) {
                await this.renameAccessKey(keyData.id, name);
                keyData.name = name;
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
}

module.exports = OutlineAPI;