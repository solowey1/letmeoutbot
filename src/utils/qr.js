const QRCode = require('qrcode');

/**
 * Генерирует QR-код в виде PNG Buffer
 * @param {string} text - текст для кодирования
 * @returns {Promise<Buffer>}
 */
async function generateQR(text) {
	return QRCode.toBuffer(text, {
		type: 'png',
		width: 512,
		margin: 2,
		color: { dark: '#000000', light: '#ffffff' }
	});
}

module.exports = { generateQR };
