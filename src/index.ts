import chalkTemplate from 'chalk-template';
import config from './config';
import Steam from './steam/client';

// === BANNER ===
console.log(chalkTemplate` _                     _                        \r\n| |_  _ __   __ _   __| |  ___  _ __ ___    ___         by {bold bouncytorch}\r\n| __|| \'__| / _\` | / _\` | / _ \\| \'_ \` _ \\  / _ \\        Homepage: {underline ${config.PACKAGE_JSON?.homepage}}\r\n| |_ | |   | (_| || (_| ||  __/| | | | | ||  __/        Source: {underline ${config.PACKAGE_JSON?.repository?.url}}\r\n \\__||_|    \\__,_| \\__,_| \\___||_| |_| |_| \\___|        Version: ${config.PACKAGE_JSON?.version}\r\n`);
// === BANNER ===

const steam = new Steam({
    username: config.STEAM_UNAME,
    password: config.STEAM_PSWD,
    shared_secret: config.STEAM_SECRET,
    oauth: {
        key: config.STEAMAUTH_KEY,
        realm: config.STEAMAUTH_REALM.toString(),
        return_url: config.STEAMAUTH_REDIRECT.toString()
    }
});

(async () => {
    await steam.login();

})();
