const crypto = require('crypto'), algorithm = 'aes-256-cbc',
	yaml = require('yaml'), 
	fs = require('fs'),
	chalk = require('chalk'), 
	rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});

let secret = 'wow';
// rl.question('Enter config encryption secret')
const key = crypto.scryptSync(secret, 'solt', 32);

function encrypt(text) {
	const iv = crypto.randomBytes(16);
	let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return `${iv.toString('hex')}${encrypted.toString('hex')}`;
}
function decrypt(text = '') {
	let iv = Buffer.from(text.slice(0, 32), 'hex');
	let encryptedText = Buffer.from(text.slice(32, text.length), 'hex');
	let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}
let t = encrypt('welcome to BRASIL');
console.log(t);
console.log(decrypt(t));
// const dconfig = { key: 'INSERT-STEAMAPI-KEY', username: 'INSERT-BOT-USERNAME', password: 'INSERT-BOT-PASSWORD', secret: 'INSERT-2FA-SECRET' },
// 	config = fs.existsSync('./config.yml') ? yaml.parse(fs.readFileSync('./config.yml').toString()) : (() => { fs.writeFileSync('config.yml', yaml.stringify(dconfig)); process.exit(1) })();
// const SteamAPI = require('steamapi'), steam_api = new SteamAPI(config.key),
// 	SteamUser = require('steam-user'), steam_user = new SteamUser(),
// 	SteamTOTP = require('steam-totp');

// steam_user.logOn({
// 	u
// })

rl.close();