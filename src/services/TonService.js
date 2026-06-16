const { WalletContractV4, internal, toNano, beginCell, storeMessage, external } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { Address } = require('@ton/core');
const axios = require('axios');

// 1 Telegram Star ≈ $0.02 (Telegram sells 50 Stars for $1)
const STARS_USD_RATE = parseFloat(process.env.STARS_USD_RATE || '0.02');

const TONAPI_BASE = 'https://tonapi.io/v2';

// Cache TON/USD rate for 5 minutes
let rateCache = { usd: null, fetchedAt: 0 };
const RATE_TTL_MS = 5 * 60 * 1000;

// CoinGecko slug for Toncoin (now GRAM). "the-open-network" is the established slug;
// "gram" may refer to a different token so it is only a fallback.
const COINGECKO_IDS = ['the-open-network', 'gram'];

function tonapiHeaders() {
	const key = process.env.TON_API_KEY;
	return key ? { Authorization: `Bearer ${key}` } : {};
}

async function getGramUsdRate() {
	if (rateCache.usd && (Date.now() - rateCache.fetchedAt) < RATE_TTL_MS) {
		return rateCache.usd;
	}

	for (const id of COINGECKO_IDS) {
		try {
			const res = await axios.get(
				`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
				{ timeout: 5000 }
			);
			const rate = res.data[id]?.usd;
			if (rate) {
				rateCache = { usd: rate, fetchedAt: Date.now() };
				return rate;
			}
		} catch (_) { /* try next slug */ }
	}

	throw new Error('Could not fetch TON/USD rate from CoinGecko');
}

/**
 * Convert Stars to TON amount
 * @param {number} stars
 * @returns {Promise<number>} TON amount (9 decimal places)
 */
async function starsToGram(stars) {
	const gramUsd = await getGramUsdRate();
	return parseFloat(((stars * STARS_USD_RATE) / gramUsd).toFixed(9));
}

/**
 * Validate a TON/GRAM wallet address
 * @param {string} address
 * @returns {boolean}
 */
function isValidTonAddress(address) {
	try {
		Address.parse(address);
		return true;
	} catch {
		return false;
	}
}

/**
 * Send TON from the bot's hot wallet via tonapi.io.
 * Get your API key at tonconsole.com (free 1 RPS tier).
 *
 * @param {string} toAddress - recipient address (any TON format)
 * @param {number} gramAmount - amount in TON (e.g. 0.5)
 * @returns {Promise<string>} seqno reference (tx hash not available synchronously in TON)
 */
async function sendGram(toAddress, gramAmount) {
	const mnemonic = process.env.TON_MNEMONIC;
	if (!mnemonic) throw new Error('TON_MNEMONIC not configured');

	const words = mnemonic.trim().split(/\s+/);
	const keyPair = await mnemonicToPrivateKey(words);

	const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
	// Raw address format required by tonapi.io (0:abcdef...)
	const rawAddress = wallet.address.toRawString();

	// 1. Get current seqno from tonapi.io
	const seqnoRes = await axios.get(
		`${TONAPI_BASE}/blockchain/accounts/${rawAddress}/methods/seqno`,
		{ headers: tonapiHeaders(), timeout: 8000 }
	);
	// decoded.seqno is present when tonapi recognises the method signature
	const seqno = seqnoRes.data.decoded?.seqno
		?? parseInt(seqnoRes.data.stack?.[0]?.num ?? '0', 16);

	// 2. Build signed transfer cell in memory (no network call needed)
	const transferBody = wallet.createTransfer({
		seqno,
		secretKey: keyPair.secretKey,
		messages: [
			internal({
				to: Address.parse(toAddress),
				value: toNano(gramAmount.toFixed(9)),
				bounce: false,
			}),
		],
	});

	// 3. Wrap in external message and serialise to BOC
	const externalMsg = beginCell()
		.store(storeMessage(external({ to: wallet.address, body: transferBody })))
		.endCell();
	const boc = externalMsg.toBoc().toString('base64');

	// 4. Broadcast via tonapi.io
	await axios.post(
		`${TONAPI_BASE}/blockchain/message`,
		{ boc },
		{ headers: { ...tonapiHeaders(), 'Content-Type': 'application/json' }, timeout: 10000 }
	);

	return `seqno:${seqno}`;
}

// Backwards-compatible aliases
const starsToTon = starsToGram;
const sendTon = sendGram;

module.exports = { starsToGram, sendGram, starsToTon, sendTon, isValidTonAddress, getGramUsdRate };
