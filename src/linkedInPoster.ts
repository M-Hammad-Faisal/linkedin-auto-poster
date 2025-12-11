import {chromium} from 'playwright-extra';
import {Browser, Locator, Page} from 'playwright/test';
import stealth from 'puppeteer-extra-plugin-stealth';
import {SELECTORS} from './config/selectors.js';
import {IPostConfig} from './config/types.js';
import {validateAndAdjustSchedule} from './utils/time.js';
import {SecondsInMilliseconds} from "./config/timeouts.js";

chromium.use(stealth());

export class LinkedInPoster {
    private config: IPostConfig;
    private readonly postContent: string;
    private browser!: Browser;
    private page!: Page;

    constructor(config: IPostConfig, postContent: string) {
        this.config = config;
        this.postContent = postContent;
    }

    /**
     * Public method to run the entire posting process.
     */
    public async run(): Promise<void> {
        console.log('Starting LinkedIn automation script...');
        console.log(`Post content length: ${this.postContent.length} characters.`);
        console.log(`Schedule Post is set to: ${this.config.schedulePost}`);

        await this.initBrowser();

        try {
            await this.login();
            await this.openPostModal();
            const postButton = await this.handleScheduling();
            await this.executePost(postButton);
        } catch (error) {
            console.error('❌ An error occurred during the automation process:', error);
            await this.page.screenshot({path: 'error_screenshot.png'});
        } finally {
            await this.browser.close();
            console.log('Browser closed. Script finished.');
        }
    }

    /**
     * Initializes the browser and page instance.
     * @private
     */
    private async initBrowser(): Promise<void> {
        this.browser = await chromium.launch({
            headless: this.config.headless,
            channel: 'chrome',
            slowMo: 50,
            args: ['--start-maximized'],
        });
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(SecondsInMilliseconds.OneHundredAndTwenty);
        this.page.setDefaultNavigationTimeout(SecondsInMilliseconds.OneHundredAndTwenty);
    }

    /**
     * Handles the login sequence.
     * @private
     */
    private async login(): Promise<void> {
        console.log('Navigating to login page...');
        await this.page.goto(SELECTORS.LOGIN_URL, {waitUntil: 'domcontentloaded'});

        console.log('Entering credentials...');
        await this.page.locator(SELECTORS.USERNAME_FIELD).fill(this.config.username);
        await this.page.locator(SELECTORS.PASSWORD_FIELD).fill(this.config.password);

        await this.page.locator(SELECTORS.SIGN_IN_BUTTON).click();

        await this.page.waitForSelector(SELECTORS.PROFILE_CARD, {state: 'visible'});
        console.log('Login successful! Navigated to homepage.');
    }

    /**
     * Navigates to the profile and opens the post modal.
     * @private
     */
    private async openPostModal(): Promise<void> {
        console.log('Navigating to profile page...');
        await this.page.goto(SELECTORS.PROFILE_URL, {waitUntil: 'domcontentloaded'});

        console.log('Clicking "Start a post" button...');
        await this.page.locator(SELECTORS.CREATE_A_POST).click();

        await this.page.waitForSelector(SELECTORS.POST_TEXTAREA, {state: 'visible'});
        console.log('Post modal opened.');

        console.log('Typing post content...');
        await this.page.locator(SELECTORS.POST_TEXTAREA).fill(this.postContent);

        await this.page.waitForTimeout(SecondsInMilliseconds.Two); // Wait for input to register
    }

    /**
     * Handles the complex scheduling logic if schedulePost is true.
     * @private
     * @returns {Locator} The final submit button (Post or Schedule).
     */
    private async handleScheduling(): Promise<Locator> {
        if (!this.config.schedulePost) {
            console.log('Ready to publish post immediately.');
            return this.page.locator(SELECTORS.POST_BUTTON).filter({hasText: 'Post'}).first();
        }

        console.log('Scheduling post is enabled. Opening schedule settings...');
        await this.page.locator(SELECTORS.SCHEDULE_BUTTON).click();

        await this.page.waitForSelector(SELECTORS.SHARE_POST_SCHEDULE_DATE, {state: 'visible'});

        const {finalDate, finalTimeStr} = validateAndAdjustSchedule(
            this.config.scheduleDateEnv,
            this.config.scheduleTimeEnv
        );

        const formattedDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(finalDate);

        const scheduleDateLocator = this.page.locator(SELECTORS.SHARE_POST_SCHEDULE_DATE);
        await scheduleDateLocator.fill(formattedDate);
        await this.page.keyboard.press('Tab');

        const scheduleTimeLocator = this.page.locator(SELECTORS.SHARE_POST_SCHEDULE_TIME);
        await scheduleTimeLocator.fill(finalTimeStr);
        await this.page.keyboard.press('Tab');

        await this.page.locator(SELECTORS.POST_BUTTON).filter({hasText: 'Next'}).first().click();

        console.log(`Ready to schedule post for ${formattedDate} at ${finalTimeStr}.`);
        return this.page.locator(SELECTORS.POST_BUTTON).filter({hasText: 'Schedule'}).first();
    }

    /**
     * Executes the final post/schedule action with retry logic.
     * @private
     * @param postButton The Locator for the final button (Post or Schedule).
     */
    private async executePost(postButton: Locator): Promise<void> {
        let attempts = 0;
        const maxAttempts = 3;
        let postSuccessful = false;

        while (attempts < maxAttempts) {
            console.log(`Attempting final submission (Attempt ${attempts + 1}/${maxAttempts})...`);

            await postButton.waitFor({state: 'visible', timeout: SecondsInMilliseconds.Five});
            await postButton.click();

            const toastAppeared = await Promise.race([
                this.page.waitForSelector(SELECTORS.SUCCESS_TOAST, {
                    state: 'visible',
                    timeout: SecondsInMilliseconds.Ten,
                }),
                this.page.waitForSelector(SELECTORS.FAILURE_TOAST, {
                    state: 'visible',
                    timeout: SecondsInMilliseconds.Ten,
                }),
                new Promise((resolve) => setTimeout(() => resolve('timeout'), SecondsInMilliseconds.Fifteen)),
            ]);

            if (toastAppeared === 'timeout') {
                console.log('Post submission timed out. Retrying...');
            } else if (await this.page.locator(SELECTORS.SUCCESS_TOAST).isVisible()) {
                postSuccessful = true;
                break;
            } else {
                console.log('Submission failed. Waiting 2s before retrying...');
                await this.page.waitForTimeout(SecondsInMilliseconds.Two);
            }
            attempts += 1;
        }

        if (postSuccessful) {
            console.log('✅ Action completed successfully (Posted or Scheduled)!');
        } else {
            throw new Error(
                `Post failed after ${maxAttempts} attempts. Check screenshot for details.`
            );
        }
    }
}
