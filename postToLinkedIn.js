require('dotenv').config();
const {chromium} = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

// --- Configuration ---
const POST_CONTENT = `
Hello world from my auto poster! 🚀

This is a single post created with Playwright.
No file reading involved! Running directly from the script.

#Playwright #Automation #Coding
`;

const SELECTORS = {
    LOGIN_URL: 'https://www.linkedin.com/login',
    PROFILE_URL: 'https://www.linkedin.com/in/me/',
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

// Regex for validating schedule time format (HH:MM AM/PM)
const TIME_REGEX = /^(([0-1][0-2])|(0[0-9])):([0-5][0-9]) (AM|PM)$/i

/**
 * Main function to log in and create a single post on LinkedIn based on environment variables.
 */
async function createLinkedInPost() {
    console.log('Starting LinkedIn automation script...');
    console.log(`Post content length: ${POST_CONTENT.length} characters.`);
    console.log(`Schedule Post is set to: ${process.env.SCHEDULE_POST}`);

    // 1. Launch Browser
    const browser = await chromium.launch({
        headless: false, // Set to true to run in the background
        channel: "chrome", slowMo: 50, // Slow down operations by 50ms
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
        await page.locator(SELECTORS.USERNAME_FIELD).fill(process.env.LINKEDIN_USERNAME);
        await page.locator(SELECTORS.PASSWORD_FIELD).fill(process.env.LINKEDIN_PASSWORD);

        await page.locator(SELECTORS.SIGNIN_BUTTON).click();

        await page.waitForSelector(SELECTORS.PROFILE_CARD, {state: "visible"});
        console.log('Login successful! Navigated to homepage.');

        // 3. Navigate to Profile and Open Post Modal
        console.log('Navigating to profile page...');
        await page.goto(SELECTORS.PROFILE_URL, {waitUntil: 'domcontentloaded'});

        console.log('Clicking "Start a post" button...');
        await page.locator(SELECTORS.CREATE_A_POST).click();

        await page.waitForSelector(SELECTORS.POST_TEXTAREA, {state: "visible"});
        console.log('Post modal opened.');

        // 4. Type Content
        console.log('Typing post content...');
        await page.locator(SELECTORS.POST_TEXTAREA).fill(POST_CONTENT);

        await page.waitForTimeout(2000); // Wait for input to register

        let postButton;

        // 5. Handle Scheduling Logic
        if (process.env.SCHEDULE_POST === "true") {
            console.log('Scheduling post is enabled. Opening schedule settings...');

            await page.locator(SELECTORS.SCHEDULE_BUTTON).click();

            await page.waitForSelector(SELECTORS.SHARE_POST_SCHEDULE_DATE, {state: "visible"})

            const currentDate = new Date();
            const currentTime = currentDate.getTime();

            const givenDate = new Date(process.env.SCHEDULE_DATE);
            const givenTime = givenDate.getTime();

            let formattedDate;
            // Check if date is valid AND in the future
            if (!isNaN(givenTime) && givenTime > currentTime) {
                formattedDate = new Intl.DateTimeFormat("en-US", {
                    year: "numeric", month: "2-digit", day: "2-digit"
                }).format(givenDate);
            } else {
                // Default to tomorrow
                const tomorrow = new Date();
                tomorrow.setDate(currentDate.getDate() + 1);

                formattedDate = new Intl.DateTimeFormat("en-US", {
                    year: "numeric", month: "2-digit", day: "2-digit"
                }).format(tomorrow);
                console.log('⚠️ Provided schedule date is invalid or in the past. Scheduling for tomorrow.');
            }

            const scheduleDate = page.locator(SELECTORS.SHARE_POST_SCHEDULE_DATE)
            await scheduleDate.fill(formattedDate);
            await page.keyboard.press("Tab") // Move focus to the time field

            let time = "10:00 AM"; // Default time
            // Use provided time if it matches the regex
            if (process.env.SCHEDULE_TIME && TIME_REGEX.exec(process.env.SCHEDULE_TIME)?.[0]) {
                time = process.env.SCHEDULE_TIME;
            } else {
                console.log('⚠️ Provided schedule time is invalid. Using default time (10:00 AM).');
            }

            const scheduleTime = page.locator(SELECTORS.SHARE_POST_SCHEDULE_TIME)
            await scheduleTime.fill(time);
            await page.keyboard.press("Tab") // Move focus away

            // Click "Next" to confirm date/time
            await page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Next"}).first().click();

            // Final button is now "Schedule"
            postButton = page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Schedule"}).first();
            console.log(`Ready to schedule post for ${formattedDate} at ${time}.`);

        } else {
            // Final button is "Post" for immediate publishing
            postButton = page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Post"}).first();
            console.log('Ready to publish post immediately.');
        }

        // 6. Execute Final Action
        await postButton.waitFor({state: "visible"});
        await postButton.click();

        // Wait for the post to be submitted and modal to close
        await page.waitForTimeout(5000)

        console.log('✅ Action completed successfully (Posted or Scheduled)!');
    } catch (error) {
        console.error('❌ An error occurred during the automation process:', error);
        await page.screenshot({path: 'error_screenshot.png'});
    } finally {
        await browser.close();
        console.log('Browser closed. Script finished.');
    }
}

createLinkedInPost();