const crypto = require('crypto'), algorithm = 'aes-256-cbc',
	rl = require('prompt-sync')(),
	yaml = require('yaml'), 
	express = require('express'),
	app = express(),
	fs = require('fs'),
	CLUI = require('clui'),
	log = {
		error: (...msg) => console.log(chalk`{red ● Error:} ${msg.join('\n')}`),
		warn: (...msg) => console.log(chalk`{yellow ● Warning:} ${msg.join('\n')}`),
		info: (...msg) => console.log(chalk`{gray ● ${msg.join('\n')}}`),
		alert: (...msg) => console.log(chalk`{blue ●} ${msg.join('\n')}`),
		prompt: (msg, def = '', options) => rl(chalk`{green $} ${msg}`, def, options),
	},
	chalk = require('chalk');
function encrypt(text) {
	const iv = crypto.randomBytes(16);
	let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return `${iv.toString('hex')}${encrypted.toString('hex')}`;
}
function decrypt(text) {
	try {
		let iv = Buffer.from(text.slice(0, 32), 'hex');
		let encryptedText = Buffer.from(text.slice(32, text.length), 'hex');
		let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	}
	catch (err) { return err; }
}
// Log MOTD.
console.log(chalk` _                     _                        \r\n| |_  _ __   __ _   __| |  ___  _ __ ___    ___         by {bold bouncytorch}\r\n| __|| \'__| / _\` | / _\` | / _ \\| \'_ \` _ \\  / _ \\        Webpage: {underline https://dev.bouncytorch.xyz}\r\n| |_ | |   | (_| || (_| ||  __/| | | | | ||  __/        Source: {underline https://github.com/bouncytorch/trademe}\r\n \\__||_|    \\__,_| \\__,_| \\___||_| |_| |_| \\___|        Version: ${JSON.parse(fs.readFileSync('package.json').toString()).version}\r\n`);
log.info(chalk`Welcome, {white ${require('os').userInfo().username}}`);
if (!fs.existsSync('config.yml')) {
	log.info('No config found');
	log.alert(chalk`In order for the trade bot to work you need to supply it with info of a functional {blueBright Steam account} - {bgBlueBright username}, {bgBlueBright password} and {bgBlueBright secret}. These can be set through the {yellow config.yml} file.
  The {bgBlueBright secret} property is your bot's 2FA. Retrieving the property is not as simple as inputting a random code from your Steam Guard, but the program won't function without one.
  Tutorial to retrieving your Steam Guard secret is available here: INSERT URL HERE
  Once you edited the config, restart the app.`);
	fs.writeFileSync('config.yml', 'username: INSERT-USERNAME-HERE\npassword: INSERT-PASSWORD-HERE\nsecret: INSERT-SECRET-HERE');
	process.exit(1);
}
log.info('Config file found');
log.alert(chalk`Due to security reasons your {yellow config.yml} must be encrypted 
  If you encrypted it before, enter the password you used previously
  If you're encrypting it for the first time, enter a new password`);
log.warn('This app doesn\'t save encryption passwords. Make sure to remember it or write it down');
let secret = log.prompt('Enter encryption password: ', '', { echo: '*' });
const key = crypto.scryptSync(secret, 'solt', 32);
let config = fs.readFileSync('config.yml').toString();
validate();
function validate() {
	if (decrypt(config).message == 'Invalid initialization vector' || decrypt(config).message == 'error:1C800064:Provider routines::bad decrypt') {
		log.info(decrypt(config).message);
		log.alert(chalk`There's been an error decrypting the config file
  This means you either entered a wrong encryption password, the config file is unencrypted or corrupted
  To proceed with encryption, enter {bold Y}.`);
		log.warn(chalk`Carefully make sure you didn't enter a wrong password before proceeding.
  To do that, check if the config file is really unencrypted (an encrypted file would be a collection of random characters basically)`);
		const t = log.prompt('Re-enter password? (y/N): ', 'n').toLowerCase();
		if (t == 'y') {
			log.warn('This app doesn\'t save encryption passwords. Make sure to remember it or write it down');
			secret = log.prompt('Enter encryption password: ', '', { echo: '*' });
			return validate();
		}
		config = yaml.parse(fs.readFileSync('config.yml').toString());
		log.info('No yaml errors, encrypting file');
		fs.writeFileSync('config.yml', encrypt(yaml.stringify(config)));
	}
	else {
		log.alert(chalk`If you wish to make changes to the config file, you can decrypt config.yml here
  To decrypt to make changes, enter {bold N}.`);
		const t = log.prompt('Proceed? (Y/n): ', 'y').toLowerCase();
		if (t == 'n') {
			fs.writeFileSync('config.yml', decrypt(fs.readFileSync('config.yml').toString()));
			log.alert(chalk`The file has now been decrypted. Once you make all the necessary changes, restart the app`);
			process.exit(0);
		}
		config = yaml.parse(decrypt(fs.readFileSync('config.yml').toString()));
		log.info('No yaml errors, proceeding');
	}
}

const client = new (require('steam-user'))(),
	totp = require('steam-totp'),
	community = new (require('steamcommunity'))(),
	auth = new (require('node-steam-openid'))({
		realm: 'http://localhost',
		returnUrl: 'http://localhost/auth/redirect',
		apiKey: config.api
	}),
	trade = new (require('steam-tradeoffer-manager'))({
		steam: client,
		community: community,
		language: 'en'
	});


client.logOn({
	accountName: config.username,
	password: config.password,
	twoFactorCode: totp.generateAuthCode(config.secret)
});
client.on('loggedOn', () => {
	log.info('(steam-user) Logged into Steam');
});
client.on('webSession', (id, cookies) => {
	log.info('(steam-user) Web session created, carrying over cookies');
	trade.setCookies(cookies);
	community.setCookies(cookies);
	community.startConfirmationChecker(10000, config.secret);
});
client.on('error', (err) => log.error('(steam-user) ' + err.message));

trade.on('newOffer', (offer) => {
	console.log(offer.itemsToReceive + '\n' + offer.itemsToGive);
});
const session = require('express-session');
app.set('views', './express/pages');
app.set('view engine', 'ejs');
app.use(session({
	genid: () => require('uuid').v4(),
	secret: config.secret,
	resave: true,
	store: new (require('session-file-store')(session))({
		path: './express/sessions',
		ttl: 86400
	}),
	saveUninitialized: false,
	cookie: { maxAge: 86400, secure: false }
}));
app.use(express.static('./express/static'));
app.use(require('express-slashes')());
app.use(require('body-parser').json());
app.use(require('cookie-parser')());

app.get('/auth/redirect', (req, res) => {
	auth.authenticate(req).then(user => {
		req.session.steam = user;
		res.redirect('/');
	}).catch(err => res.send(err));
});
app.post('/auth', (req, res) => {
	auth.getRedirectUrl().then((url) => res.redirect(url));
});
app.get('/', (req, res) => {
	if ('steam' in req.session) {
		res.send(req.session.steam);
	}
	else res.render('index');
});
app.listen(80, () => log.info('Web page launched'));

// if (decrypt(fs.readFileSync('config.yml')).message == 'Invalid initialization vector') {
// 	rl.keyInYN(chalk` wow `);
// }
// const dconfig = { key: 'INSERT-STEAMAPI-KEY', username: 'INSERT-BOT-USERNAME', password: 'INSERT-BOT-PASSWORD', secret: 'INSERT-2FA-SECRET' },
// 	config = fs.existsSync('./config.yml') ? yaml.parse(fs.readFileSync('./config.yml').toString()) : (() => { fs.writeFileSync('config.yml', yaml.stringify(dconfig)); process.exit(1) })();
// const SteamAPI = require('steamapi'), steam_api = new SteamAPI(config.key),
// 	SteamUser = require('steam-user'), steam_user = new SteamUser(),
// 	SteamTOTP = require('steam-totp');

// steam_user.logOn({
// 	u
// })
