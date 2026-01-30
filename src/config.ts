import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path/posix';

const PACKAGE_JSON = JSON.parse(fs.readFileSync('package.json').toString());

if (!process.env.STEAMAUTH_REALM)
    throw new RangeError('STEAMAUTH realm missing.');
if (!process.env.STEAMAUTH_KEY)
    throw new RangeError('STEAMAUTH API key missing.');
const STEAMAUTH_REALM = new URL(process.env.STEAMAUTH_REALM);
const STEAMAUTH_REDIRECT = new URL(
    process.env.STEAMAUTH_REDIRECT_PATH
        ? path.join(STEAMAUTH_REALM.pathname, process.env.STEAMAUTH_REDIRECT_PATH)
        : path.join(STEAMAUTH_REALM.pathname, 'redirect'),
    STEAMAUTH_REALM
);

if (
    !process.env.STEAM_UNAME
    || !process.env.STEAM_PSWD
    || !process.env.STEAM_SECRET
)
    throw new RangeError('Steam credentials missing.');

export default {
    PACKAGE_JSON,
    STEAMAUTH_KEY: process.env.STEAMAUTH_KEY,
    STEAMAUTH_REALM,
    STEAMAUTH_REDIRECT,
    STEAM_UNAME: process.env.STEAM_UNAME,
    STEAM_PSWD: process.env.STEAM_PSWD,
    STEAM_SECRET: process.env.STEAM_SECRET
};
