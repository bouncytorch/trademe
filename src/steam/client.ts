import Logger from '../log';
const logger = Logger('SteamClient');

import SteamUser from 'steam-user';
import SteamAuth from 'node-steam-openid';
import SteamTOTP from 'steam-totp';
import { EventEmitter } from 'node:stream';
import { Request } from 'express';
import { SteamWebAPI } from './webapi';

type SteamConfig = {
    username: string
    password: string
    shared_secret: string
    oauth: {
        key: string
        realm: string
        return_url: string
    }
}

export default class Steam extends EventEmitter {
    #client;
    #auth;
    #webapi;

    #config;

    constructor(config: SteamConfig) {
        super();
        this.#config = config;

        this.#client = new SteamUser({
            language: 'en',
            autoRelogin: true,
            renewRefreshTokens: true
        });

        this.#auth = new SteamAuth({
            apiKey: this.#config.oauth.key,
            realm: this.#config.oauth.realm,
            returnUrl: this.#config.oauth.return_url
        });

        this.#webapi = new SteamWebAPI(this.#config.oauth.key);

        // TODO: REMOVE ALL THIS AND IMPLEMENT IT PROPERLY
        this.#client.on('tradeOffers', async (count) => {
            console.log(count);
        });

        this.#client.on('tradeRequest', (steamid, respond) => {
            logger.log(steamid);
        });

        this.#client.on('tradeStarted', (steamid) => {
            logger.log(steamid);
        });

        this.#client.on('tradeResponse', (steamid, response, restrictions) => {
            logger.log(steamid);
            logger.log(response);
            logger.log(restrictions);
        });
    }

    oauthLogin(request: Request) {
        return this.#auth.authenticate(request);
    }

    oauthRedirect() {
        return this.#auth.getRedirectUrl();
    }

    login() {
        return new Promise<void>((resolve) => {
            this.#client.logOn({
                accountName: this.#config.username,
                password: this.#config.password,
                authCode: SteamTOTP.generateAuthCode(this.#config.shared_secret)
            });

            this.#client.once('loggedOn', async () => {
                logger.info('Logged in');

                const trades = await this.#webapi.IEconService.GetTradeOffers({ active_only: true, get_received_offers: true, get_sent_offers: true });
                logger.info((await trades.json()).response?.trade_offers_received[0]?.items_to_receive);

                resolve();
            });

            this.#client.once('error', (err) => {
                logger.error(err);
                this.#client.logOff();
            });
        });
    }

    logout() {
        this.#client.logOff();
    }
}
