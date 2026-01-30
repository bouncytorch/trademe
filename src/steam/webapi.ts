export class SteamWebAPI {
    async #request (endpoint: string, key: string, args: { [key: string]: unknown }) {
        return await (await fetch(
            new URL(endpoint+`?key=${key}${Object.keys(args).map((v) => '&'+v+'='+args[v]).join('')}`, 'https://api.steampowered.com/'),
        )).json();
    }
}
