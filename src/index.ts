import * as dotenv from 'dotenv';
import { LinkedInPoster } from './linkedInPoster.js';
import { IPostConfig } from './config/types.js';
import { loadPostContent } from './utils/file.js';

dotenv.config();

/**
 * Main function to initialize and run the LinkedInPoster class.
 */
async function main(): Promise<void> {
    const config: IPostConfig = {
        headless: process.env.HEADLESS === 'true',
        username: process.env.LINKEDIN_USERNAME as string,
        password: process.env.LINKEDIN_PASSWORD as string,
        schedulePost: process.env.SCHEDULE_POST === 'true',
        scheduleDateEnv: process.env.SCHEDULE_DATE as string,
        scheduleTimeEnv: process.env.SCHEDULE_TIME as string,
        postFilePath: process.env.POST_FILE_PATH as string,
    };

    if (!config.username || !config.password) {
        throw new Error('LINKEDIN_USERNAME and LINKEDIN_PASSWORD must be set in the .env file.');
    }

    if (!config.postFilePath) {
        throw new Error('POST_FILE_PATH must be set in the .env file to load content.');
    }

    const postContent = await loadPostContent(config.postFilePath);

    if (postContent.length === 0) {
        throw new Error('Post content is empty after loading from file.');
    }

    const poster = new LinkedInPoster(config, postContent);
    await poster.run();
}

main().catch((error) => {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message: string }).message;
    }

    console.error('💥 FATAL ERROR IN MAIN PROCESS:', errorMessage);
    process.exit(1);
});
