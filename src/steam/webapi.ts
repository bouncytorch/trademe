type FunctionParameter = {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
};

type ServiceFunction = {
    params: { [key: string]: FunctionParameter };
    version?: number;
};

type ServiceMethods<T extends { [key: string]: ServiceFunction }> = {
    [K in keyof T]: (args: {
        [P in keyof T[K]['params']]:
            T[K]['params'][P]['type'] extends 'string' ? string :
            T[K]['params'][P]['type'] extends 'number' ? number :
            T[K]['params'][P]['type'] extends 'boolean' ? boolean :
            T[K]['params'][P]['type'] extends 'array' ? unknown[] :
            T[K]['params'][P]['type'] extends 'object' ? object :
            unknown;
    }) => Promise<unknown>;
};

async function request(endpoint: string, key: string, args: { [key: string]: unknown }) {
    return await (await fetch(
        new URL(
            endpoint +
                `?key=${key}${Object.keys(args)
                    .map(v => '&' + v + '=' + args[v])
                    .join('')}`,
            'https://api.steampowered.com/',
        ),
    )).json();
}

// factory instead of class
function createService<T extends { [key: string]: ServiceFunction }>(
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
            return await request(endpoint, APIkey, args);
        }) as ServiceMethods<T>[keyof T];
    }

    return methods as ServiceMethods<T>;
}

export class SteamWebAPI {
    #key;

    // SERVICES
    IEconService;

    constructor(key: string) {
        this.#key = key;

        this.IEconService = createService('IEconService', this.#key, {
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
