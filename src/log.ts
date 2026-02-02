import chalk from 'chalk';

export default function Logger(channel: string = '') {
    return {
        log: (...msg: unknown[]) =>
            console.log(chalk.grey(`[${channel}]`), ...msg),
        info: (...msg: unknown[]) =>
            console.info(chalk.blue(`[${channel}*]`), ...msg),
        warn: (...msg: unknown[]) =>
            console.warn(chalk.yellow(`[${channel}?]`), ...msg),
        error: (...msg: unknown[]) =>
            console.error(chalk.red(`[${channel}!]`), ...msg)
    };
};
