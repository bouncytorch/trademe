const crypto = require('crypto'), algorithm = 'aes-256-cbc',
	rl = require('prompt-sync')(),
	yaml = require('yaml'), 
	express = require('express'),
	SteamID = require('steamid'),
	app = express(),
	fs = require('fs'),
	{ JSDOM } = require('jsdom'), 
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
	fs.writeFileSync('config.yml', `username: INSERT-USERNAME-HERE
 password: INSERT-PASSWORD-HERE
 secret: INSERT-AUTHSECRET-HERE
 api: INSERT-STEAMWEBAPIKEY-HERE
 market: INSERT-MARKETCSGOCOMKEY-HERE`);
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
		realm: 'https://dev.bouncytorch.xyz',
		returnUrl: 'https://dev.bouncytorch.xyz/auth/redirect',
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

const trchange = (offer) => {
	if (offer.itemsToGive.length == 0) {
		log.alert(chalk`Trade with ${offer.partner.accountid} changed. Trade meets requirements, accepting.`)
		offer.accept();
	}
	else {
		log.alert(chalk`Trade with ${offer.partner.accountid} changed. Trade doesn't meet requirements, declining.`)
		offer.decline();
	};
}
trade.on('newOffer', trchange);

trade.on('sentOfferChanged', trchange);

trade.on('receivedOfferChanged', trchange)

const session = require('express-session');
app.set('views', './express/pages');
app.set('view engine', 'ejs');
app.use(session({
	genid: () => require('uuid').v4(),
	secret: config.secret,
	resave: true,
	store: new (require('session-file-store')(session))({
		path: './express/sessions',
		ttl: 86400,
		logFn: () => {}
	}),
	saveUninitialized: false,
	cookie: { maxAge: 86400000, secure: false }
}));
app.use('/api', require('express-rate-limit')({
	windowMs: 15 * 60 * 1000, 
	max: 100, 
	standardHeaders: true, 
	legacyHeaders: false, 
}));
app.use(express.static('./express/static'));
app.use(require('express-slashes')());
app.use(require('body-parser').json());
app.use(require('cookie-parser')());

app.get('/auth/redirect', (req, res) => {
	auth.authenticate(req).then(user => {
		req.session.steam = user;
		res.redirect('/');
	}).catch(err => {
		res.sendStatus(500);
		log.error(err);
	});
});
app.get('/api/items', (req, res) => {
	if (!('steam' in req.session)) res.sendStatus(403);
	else {
		try { community.getUserInventoryContents(req.session.steam.steamid, 730, 2, true, 'en', (err, items) => {
			if (err) {
				if (err.message == 'This profile is private.') return res.sendStatus(401);
				else {
					res.sendStatus(500);
					return log.error(err);
				}
			}
			if (items.length > 0) {
				const itemQuality = {
					'factory new': 'FN',
					'minimal wear': 'MW',
					'field-tested': 'FT',
					'well-worn': 'WW',
					'battle-scarred': 'BS'
				};
	
				let organizedItems = [];
				let urls = [`https://market.csgo.com/api/v2/get-list-items-info?key=${config.market}`];
				let indexdelta = 1;
				items.forEach((item, index) => {
					urls[indexdelta-1] += `&list_hash_name[]=${item.market_hash_name}`;
					if (index + 1 == indexdelta * 50) {
						urls.push(`https://market.csgo.com/api/v2/get-list-items-info?key=${config.market}`);
						indexdelta++;	
					}
				});
				const recFetch = (urlArray, index) => import('node-fetch').then(({default: fetch}) => fetch(urlArray[index]).then(body => body.text()).then(text => {
					let data;
					try {
						data = JSON.parse(text);
					}
					catch(err) {
						log.error(text);
						data = {}
					}
					items.forEach(item => organizedItems.push({
						id: `${item.assetid}:${item.classid}:${item.instanceid}`,
						name: item.market_hash_name.split(' | ')[0],
						type: item.market_hash_name.split(' | ')[1] ? item.market_hash_name.split(' | ')[1].replace(/(?<= \().*(?=\))/gm, (match) => itemQuality[match.toLowerCase()] ? itemQuality[match.toLowerCase()] : match) : null,
						grade: 'type' in item ? item.type.split(' ')[0].toLowerCase() : null,
						price: 'data' in data && item.market_hash_name in data.data ? data.data[item.market_hash_name].min.toFixed(2) : null,
						icon: 'icon_url_large' in item ? item.icon_url_large : 'icon_url' in item ? item.icon_url : null
					}));
					if (urlArray - 1 > index) recFetch(urlArray, index + 1);
					else res.send(organizedItems.sort((a, b) => b.price - a.price));
				})).catch(err => { res.sendStatus(500); log.error(err); });
				recFetch(urls, 0);
			}
		});}
		catch (err) {
			if (err.message == 'This profile is private.') res.sendStatus(401);
			else log.error(err);
		}
	}
});
app.post('/api/trade', (req, res) => {
	if (!('steam' in req.session)) return req.sendStatus(403);
	else if (req.headers['content-type'] != "application/json") return res.sendStatus(400);
	else if (!('url' in req.body) || typeof req.body.url !== 'string' || !('items' in req.body) || !Array.isArray(req.body.items)) return res.sendStatus(400);
	let url
	try {
		url = new URL(req.body.url);
	}
	catch (err) { return res.status(400).send('Bad Trade URL') }
	if (!url.searchParams.has('partner') || url.searchParams.get('partner') != (new SteamID(req.session.steam.steamid)).accountid || !url.searchParams.has('token')) return res.status(400).send('Bad Trade URL');
	const offer = trade.createOffer(req.body.url);
	trade.getUserInventoryContents(req.session.steam.steamid, 730, 2, true, (err, items) => {
		if (err) {
			if (err.message == 'This profile is private.') return res.sendStatus(401);
			else {
				res.sendStatus(500);
				return log.error(err);
			}
		}
		req.body.items.forEach((item) => {
			if (typeof item != 'string') return res.sendStatus(400);
			else if (item.split(':').length < 3) return res.sendStatus(400);
			const ids = item.split(':');
			const found = items.find(el => el.assetid == ids[0] && el.classid == ids[1] && el.instanceid == ids[2]);
			if (!found) return res.status(400).send('No Valid Item Found').end();
			else offer.addTheirItem(found);
		});
		offer.send((err, status) => {
			if (err) log.error(err);
			else log.alert(chalk`Sent offer to {yellow ${(new SteamID(req.session.steam.steamid)).accountid}}`);
		});
		offer.accept();
		return res.status(200).send({ code: 200, status: 'Sent trade offer' })
	});
});
app.post('/login', (req, res) => {
	auth.getRedirectUrl().then((url) => res.redirect(url)).catch(err => { console.log(err); });
});
app.post('/logout', (req, res) => {
	req.session.destroy();
	res.redirect('/');
});
app.get('/', (req, res) => {
	if ('steam' in req.session) res.render('trade');
	else res.render('index');
});
app.listen(2000, () => log.info('Web page launched'));

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
