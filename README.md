# trademe

This is a one-way Steam item trading application, which allows you to donate items on Steam in any video game. This project is a tech demo, the sole purpose of which is to demonstrate my abilities to implement a trading/marketplace system and interfacing with external APIs, such as Steam's.

## Steam abstraction
The project contains 2 APIs related to Valve's Steam - the `client.ts` and `webapi.ts`. 
- **WebAPI** - This is rather straightforward - it's Steam's RESTful store/community API. The entire documentation of the official Steam Web API is available on https://steamapi.xpaw.me/
- **Client** - The "client" module communicates with Steam's desktop client API.
