const mc = require('minecraft-protocol');
const mysql = require('./mysql')
const crypto = require('crypto')

const server = mc.createServer({
	'online-mode': true,
	encryption: true,
	host: '0.0.0.0',
	port: 25565,
	motd: process.env.SERVER_MOTD || '§3Quickplay Authentication Server',
	beforePing: function(response, client) {
		// Always allow the version the client is using
		response.version.protocol = client.protocolVersion;
		// Error text in case of incompatibility
		response.version.name = 'Requires MC 1.7+';
		response.players.max = 1;
		response.players.online = 0;
	}
})

if (process.env.SERVER_FAVICON_BASE64) {
	server.favicon = process.env.SERVER_FAVICON_BASE64
}
let kickMessage = "§7Your authentication code:\n§f§l%code%"
if (process.env.SERVER_KICK_MESSAGE) {
	kickMessage = process.env.SERVER_KICK_MESSAGE
}
let errorMessage = "§cSomething went wrong while generating a code!\n\n§7Please contact an administrator."
if (process.env.SERVER_ERROR_MESSAGE) {
	errorMessage = process.env.SERVER_ERROR_MESSAGE
}

server.on('login', async (client) => {
	try {
		let code = await addCode(client.uuid)
		// Add dash in the middle of the code - Makes it easier to read
		code = code.substr(0, 4) + "-" + code.substr(4, 4);
		const msg = kickMessage.replace(/%code%/g, code);
		client.end(msg)
	} catch(e) {
		console.error(e)
		client.end(errorMessage)
	}
})

/**
 * Add a code to the database
 * @param uuid {string} Minecraft UUID to create an account for. Assumed to be non-null, dashes will be removed.
 * @return {Promise<string>} Resolves with the code, or rejects on database error.
 */
async function addCode(uuid) {
	uuid = uuid.replace(/-/g, '')
	if(uuid === '00000000000000000000000000000000') {
		throw new Error("User with unknown ID connected!")
	}

	// Attempts to create a new account if the user doesn't already have an account
	const accountId = await getAccountIdOfUser(uuid)

	// If there's a collision of codes, a new code will be generated. As a safety net,
	// this caps out at 10 tries, but there should never reasonably be more than 2...
	const maxTries = 10;

	for (let tries = 0; tries < maxTries; tries++) {
		const code = crypto.randomBytes(4).toString("hex").toUpperCase()
		const [existingCodes] = await mysql.query('SELECT COUNT(code) AS count FROM mc_auth_codes WHERE code=?', [code])
		if (existingCodes[0].count > 0) {
			continue
		}

		await mysql.query('INSERT INTO mc_auth_codes (code, account) VALUES (?,?)', [code, accountId])
		return code
	}
	throw new Error("Unable to generate a unique code!")
}

/**
 * Create an account for the user with the provided Minecraft UUID if they do not already have one, and then
 * return the account ID of the user.
 * @param uuid {string} Minecraft UUID to get the account ID of. Assumed to be non-null and in no-dashes form.
 * @return {Promise<void>} Resolves on success with the account ID, rejects on database error.
 */
async function getAccountIdOfUser(uuid) {
	let [userSelectResponse] = await mysql.query('SELECT id FROM accounts WHERE mc_uuid=?', [uuid])
	// User already has an account
	if (userSelectResponse.length > 0) {
		return userSelectResponse[0].id
	}

	await mysql.query('INSERT INTO accounts (mc_uuid, first_login) VALUES (?,CURRENT_TIMESTAMP)', [uuid]);

	[userSelectResponse] = await mysql.query('SELECT id FROM accounts WHERE mc_uuid=?', [uuid])
	return userSelectResponse[0].id
}

