// In-memory state for users who are entering their TON wallet address
// Map<telegramId, true>
const awaitingWallet = new Map();

module.exports = awaitingWallet;
