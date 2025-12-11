require('dotenv').config();
const {chromium} = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

// --- Configuration ---
const POST_CONTENT = `
Hello world from my auto poster! 🚀

This is a test post created with Playwright.
If you can see this, automation works! 🤖

#Playwright #Automation #Coding
`;

const SELECTORS = {
    LOGIN_URL: 'https://www.linkedin.com/login',
    PROFILE_URL: 'https://www.linkedin.com/in/m-hammad-faisal/',
    USERNAME_FIELD: 'input#username',
    PASSWORD_FIELD: 'input#password',
    SIGNIN_BUTTON: 'button[data-litms-control-urn="login-submit"]',
    PROFILE_CARD: 'div.profile-card-member-details',
    CREATE_A_POST: 'a[href*="/create-post"]',
    POST_TEXTAREA: 'div[aria-placeholder="What do you want to talk about?"]',
    SCHEDULE_BUTTON: 'button[aria-label="Schedule post"]',
    SHARE_POST_SCHEDULE_DATE: 'input#share-post__scheduled-date',
    SHARE_POST_SCHEDULE_TIME: 'input#share-post__scheduled-time',
    POST_BUTTON: 'button:not([disabled]) span.artdeco-button__text',
};

const TIME_REGEX = /^(([0-1][0-2])|(0[0-9])):([0-5][0-9]) (AM|PM)$/i

/**
 * Main function to log in and create a post on LinkedIn.
 */
async function createLinkedInPost() {
    console.log('Starting LinkedIn automation script...');

    // 1. Launch Browser
    const browser = await chromium.launch({
        headless: false, // Set to true to run in the background
        channel: "chrome", slowMo: 50, // Slow down operations by 50ms to mimic human behavior
        args: ['--start-maximized'] // Start with maximized window
    });

    const page = await browser.newPage();

    try {
        page.setDefaultTimeout(120000);
        page.setDefaultNavigationTimeout(120000);

        // 2. Navigate and Login
        console.log('Navigating to login page...');
        await page.goto(SELECTORS.LOGIN_URL, {waitUntil: 'domcontentloaded'});

        console.log('Entering credentials...');
        await page.locator(SELECTORS.USERNAME_FIELD).click()
        await page.keyboard.type(process.env.LINKEDIN_USERNAME);

        await page.locator(SELECTORS.PASSWORD_FIELD).click()
        await page.keyboard.type(process.env.LINKEDIN_PASSWORD);

        await page.locator(SELECTORS.SIGNIN_BUTTON).click();

        await page.waitForSelector(SELECTORS.PROFILE_CARD, {state: "visible"});
        console.log('Login successful! Navigated to homepage.');

        console.log('Navigating to profile page...');
        await page.goto(SELECTORS.PROFILE_URL, {waitUntil: 'domcontentloaded'});

        console.log('Clicking "Start a post" button...');
        await page.locator(SELECTORS.CREATE_A_POST).click();

        await page.waitForSelector(SELECTORS.POST_TEXTAREA, {state: "visible"});
        console.log('Post modal opened.');

        let postButton;

        if (process.env.SCHEDULE_POST === "true") {
            console.log('Typing post content...');
            await page.locator(SELECTORS.SCHEDULE_BUTTON).click();

            await page.waitForSelector(SELECTORS.SHARE_POST_SCHEDULE_DATE, {state: "visible"})

            const currentDate = new Date();
            const currentTime = currentDate.getTime();

            const givenDate = new Date(process.env.SCHEDULE_DATE);
            const givenTime = givenDate.getTime();

            let formattedDate;
            if (!isNaN(givenTime) || givenTime > currentTime) {
                formattedDate = new Intl.DateTimeFormat("en-US", {
                    year: "numeric", month: "2-digit", day: "2-digit"
                }).format(givenDate);
            } else {
                const utcDate = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getDate() + 1);

                formattedDate = new Intl.DateTimeFormat("en-US", {
                    year: "numeric", month: "2-digit", day: "2-digit"
                }).format(utcDate);
            }

            const scheduleDate = page.locator(SELECTORS.SHARE_POST_SCHEDULE_DATE)

            await scheduleDate.fill(formattedDate);

            await page.keyboard.press("Tab")

            let time = "10:00 AM";

            if (TIME_REGEX.exec(process.env.SCHEDULE_TIME)?.[0]) {
                time = process.env.SCHEDULE_TIME;
            }

            const scheduleTime = page.locator(SELECTORS.SHARE_POST_SCHEDULE_TIME)

            await scheduleTime.fill(time);

            await page.keyboard.press("Tab")


            await page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Next"}).first().click();

            console.log('Clicking "Schedule" button to publish...');

            postButton = page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Schedule"}).first();
        } else {
            console.log('Clicking "Post" button to publish...');
            postButton = page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Post"}).first();
        }

        await page.waitForSelector(SELECTORS.POST_TEXTAREA, {state: "visible"});
        console.log('Post modal opened.');

        console.log('Typing post content...');
        await page.locator(SELECTORS.POST_TEXTAREA).click();
        await page.keyboard.type(POST_CONTENT);

        await postButton.waitFor({state: "visible"});

        await postButton.click();

        await page.waitForTimeout(5000)

        console.log('✅ Post published successfully!');
    } catch (error) {
        console.error('❌ An error occurred during the automation process:', error);
        await page.screenshot({path: 'error_screenshot.png'});
    } finally {
        await browser.close();
        console.log('Browser closed. Script finished.');
    }
}

createLinkedInPost();