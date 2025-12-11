export interface IPostConfig {
    headless: boolean;
    username: string;
    password: string;
    schedulePost: boolean;
    scheduleDateEnv: string;
    scheduleTimeEnv: string;
    postFilePath: string;
}
