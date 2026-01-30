import chalkTemplate from 'chalk-template';

export default function Logger(channel: string = '') {
    return {
        log: (...msg: unknown[]) =>
            console.log(chalkTemplate`{gray [${channel}] ${msg.join(' ')}}`),
        info: (...msg: unknown[]) =>
            console.info(chalkTemplate`{blue [${channel}*]} ${msg.join(' ')}`),
        warn: (...msg: unknown[]) =>
            console.warn(chalkTemplate`{yellow [${channel}?] ${msg.join(' ')}}`),
        error: (...msg: unknown[]) =>
            console.error(chalkTemplate`{red [${channel}!] ${msg.join(' ')}}`)
    };
};
