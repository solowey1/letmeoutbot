const axios = require('axios');
const https = require('https');

class OutlineService {
	constructor(apiUrl) {
		this.apiUrl = apiUrl;
		this.agent = new https.Agent({
			rejectUnauthorized: false
		});
	}

	async createAccessKey(name = '', dataLimit = null) {
		const maxRetries = 3;
		let lastError;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`🔄 Попытка ${attempt}/${maxRetries} создания ключа доступа...`);
                
				const response = await axios.post(
					`${this.apiUrl}/access-keys`,
					{},
					{
						httpsAgent: this.agent,
						timeout: 15000, // 15 секунд
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

				console.log(`✅ Ключ создан успешно на попытке ${attempt}`);
				return keyData;
                
			} catch (error) {
				lastError = error;
				console.error(`❌ Попытка ${attempt} неудачна:`, error.message);
                
				if (attempt < maxRetries) {
					const delay = attempt * 2000; // 2, 4, 6 секунд
					console.log(`⏳ Ждем ${delay}ms перед следующей попыткой...`);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}
        
		console.error('❌ Все попытки создания ключа исчерпаны');
		throw lastError;
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
	async createSubscriptionKey(subscription, userTID) {
		try {
			const keyName = `${userTID}_${subscription.plan_id.split('_')[1]}`;

			// Создаем ключ с лимитом данных
			const keyData = await this.createAccessKey(keyName, subscription.data_limit);

			// Добавляем имя ключа в URL для отображения в клиенте
			const displayName = `LetMeOut_#${keyData.id}_${subscription.plan_id}`;
			const accessUrlWithName = `${keyData.accessUrl}#${encodeURIComponent(displayName)}`;

			return {
				keyId: keyData.id,
				accessUrl: accessUrlWithName,
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