export type Trade = {
    tradeofferid: string,
    accountid_other: number,
    message: string,
    expiration_time: number,
    trade_offer_state: number,
    items_to_receive: TradeItem[],
    is_our_offer: boolean,
    time_created: number,
    time_updated: number,
    from_real_time_trade: boolean,
    escrow_end_date: number,
    confirmation_method: number,
    eresult: number,
    delay_settlement: boolean,
    settlement_date: number
};

export type TradeItem = {
    appid: number,
    contextid: string,
    assetid: string,
    classid: string,
    instanceid: string,
    amount: string,
    missing: boolean
}

// SERVICE FACTORY TYPES
type FunctionParameter = {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
};

type ServiceFunction = {
    params: { [key: string]: FunctionParameter };
    version?: number;
};

type ParamToTS<T extends FunctionParameter> =
    T['type'] extends 'string' ? string :
    T['type'] extends 'number' ? number :
    T['type'] extends 'boolean' ? boolean :
    T['type'] extends 'array' ? unknown[] :
    T['type'] extends 'object' ? object :
    unknown;

type ServiceMethods<T extends { [key: string]: ServiceFunction }> = {
    [K in keyof T]: (args:
        // Required params
        & {
            [P in keyof T[K]['params'] as
                T[K]['params'][P]['required'] extends false ? never : P
            ]: ParamToTS<T[K]['params'][P]>;
        }
        // Optional params
        & {
            [P in keyof T[K]['params'] as
                T[K]['params'][P]['required'] extends false ? P : never
            ]?: ParamToTS<T[K]['params'][P]>;
        }
    ) => Promise<Response>;
};

export class SteamWebAPI {
    #key;

    async #request(endpoint: string, key: string, args: { [key: string]: unknown }, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET') {
        return await fetch(
            new URL(
                endpoint +
                `?key=${key}${Object.keys(args)
                    .map(v => '&' + v + '=' + args[v])
                    .join('')}`,
                'https://api.steampowered.com/',
            ),
            { method }
        );
    }

    #createService<T extends { [key: string]: ServiceFunction }>(
        serviceName: string,
        APIkey: string,
        funcs: T,
    ): ServiceMethods<T> {
        const methods: Partial<ServiceMethods<T>> = {};

        for (const [funcName, funcDef] of Object.entries(funcs)) {
            methods[funcName as keyof T] = (async (args: { [key: string]: unknown }) => {
                for (const [paramName, paramDef] of Object.entries(funcDef.params)) {
                    if (paramDef.required !== false && !(paramName in args)) {
                        throw new Error(`Missing required parameter: ${paramName}`);
                    }
                }

                const version = funcDef.version || 1;
                const endpoint = `${serviceName}/${funcName}/v${version}/`;
                return await this.#request(endpoint, APIkey, args);
            });
        }

        return methods as ServiceMethods<T>;
    }

    // SERVICES
    IEconService;

    constructor(key: string) {
        this.#key = key;

        this.IEconService = this.#createService('IEconService', this.#key, {
            GetTradeOffers: {
                version: 1,
                params: {
                    get_sent_offers: { type: 'boolean', required: false },
                    get_received_offers: { type: 'boolean', required: false },
                    get_descriptions: { type: 'boolean', required: false },
                    language: { type: 'string', required: false },
                    active_only: { type: 'boolean', required: false },
                    historical_only: { type: 'boolean', required: false },
                    time_historical_cutoff: { type: 'number', required: false },
                    cursor: { type: 'number', required: false }
                }
            }
        });
    }
}
