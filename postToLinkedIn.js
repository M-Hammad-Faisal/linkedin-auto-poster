// postToLinkedIn.js

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
    SUCCESS_TOAST: 'p.artdeco-toast-item__message',
    FAILURE_TOAST: 'span.artdeco-inline-feedback__message',
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
            const givenDate = new Date(process.env.SCHEDULE_DATE);
            const givenTimeStr = process.env.SCHEDULE_TIME;

            let finalDate = givenDate;
            let finalTimeStr = givenTimeStr;

            // --- DATE VALIDATION ---
            // If the given date is invalid OR is in the past, default to tomorrow.
            if (isNaN(givenDate.getTime()) || givenDate.getTime() < currentDate.setHours(0, 0, 0, 0)) {
                const tomorrow = new Date();
                tomorrow.setDate(currentDate.getDate() + 1);
                finalDate = tomorrow;
                console.log('⚠️ Provided schedule date is invalid or in the past. Scheduling for tomorrow.');
            }

            // --- TIME VALIDATION ---
            if (!givenTimeStr || !TIME_REGEX.exec(givenTimeStr)?.[0]) {
                finalTimeStr = "10:00 AM"; // Default time if invalid format
                console.log('⚠️ Provided schedule time is invalid format. Using default time (10:00 AM).');
            }

            // --- FUTURE TIME CHECK (Most Important Refinement) ---
            // Check if the final date is today
            const isToday = finalDate.toDateString() === currentDate.toDateString();

            if (isToday) {
                // Combine date and time to check if the combined timestamp is in the past
                const [timePart, meridiem] = finalTimeStr.split(' ');
                let [hours, minutes] = timePart.split(':').map(Number);

                // Convert 12-hour time to 24-hour time
                if (meridiem === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (meridiem === 'AM' && hours === 12) {
                    hours = 0; // 12 AM is midnight (0 hours)
                }

                const scheduledDateTime = new Date(finalDate.getFullYear(), finalDate.getMonth(), finalDate.getDate(), hours, minutes, 0, 0);

                // Add a buffer (e.g., 5 minutes) to the current time for safety
                const fiveMinutesFromNow = new Date(currentDate.getTime() + 5 * 60000);

                if (scheduledDateTime.getTime() < fiveMinutesFromNow.getTime()) {
                    // Time has passed today, so set the schedule to 5 minutes from now.
                    finalDate = fiveMinutesFromNow;
                    // Format the new time back into HH:MM AM/PM
                    const newHours = fiveMinutesFromNow.getHours();
                    const newMinutes = fiveMinutesFromNow.getMinutes().toString().padStart(2, '0');
                    const newMeridiem = newHours >= 12 ? 'PM' : 'AM';
                    const displayHours = (newHours % 12) || 12;

                    finalTimeStr = `${displayHours.toString().padStart(2, '0')}:${newMinutes} ${newMeridiem}`;
                    console.log(`⚠️ Scheduled time is in the past TODAY. Resetting time to 5 minutes from now: ${finalTimeStr}`);
                }
            }


            // --- Apply Final Date and Time ---

            // Re-format the date based on the final determined date
            const formattedDate = new Intl.DateTimeFormat("en-US", {
                year: "numeric", month: "2-digit", day: "2-digit"
            }).format(finalDate);


            const scheduleDate = page.locator(SELECTORS.SHARE_POST_SCHEDULE_DATE)
            await scheduleDate.fill(formattedDate);
            await page.keyboard.press("Tab") // Move focus to the time field

            const scheduleTime = page.locator(SELECTORS.SHARE_POST_SCHEDULE_TIME)
            await scheduleTime.fill(finalTimeStr);
            await page.keyboard.press("Tab") // Move focus away

            // Click "Next" to confirm date/time
            await page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Next"}).first().click();

            // Final button is now "Schedule"
            postButton = page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Schedule"}).first();
            console.log(`Ready to schedule post for ${formattedDate} at ${finalTimeStr}.`);

        } else {
            // Final button is "Post" for immediate publishing
            postButton = page.locator(SELECTORS.POST_BUTTON).filter({hasText: "Post"}).first();
            console.log('Ready to publish post immediately.');
        }

        // 6. Execute Final Action with Retry
        let attempts = 0;
        const maxAttempts = 3;
        let postSuccessful = false;

        while (attempts < maxAttempts) {
            console.log(`Attempting final submission (Attempt ${attempts + 1}/${maxAttempts})...`);

            await postButton.waitFor({state: "visible", timeout: 5000});
            await postButton.click();

            // Wait for either the success or failure toast to appear.
            // Promise.race returns the first promise that settles.
            const toastAppeared = await Promise.race([
                page.waitForSelector(SELECTORS.SUCCESS_TOAST, {state: 'visible', timeout: 10000}),
                page.waitForSelector(SELECTORS.FAILURE_TOAST, {state: 'visible', timeout: 10000}),
                // Optional: Add a timeout to catch cases where neither toast appears
                new Promise(resolve => setTimeout(() => resolve('timeout'), 15000))
            ]);

            if (toastAppeared === 'timeout') {
                console.log('Post submission timed out. Retrying...');
            } else if (await page.locator(SELECTORS.SUCCESS_TOAST).isVisible()) {
                postSuccessful = true;
                break; // Success! Exit the loop.
            } else {
                // If it wasn't the success toast, it was the failure toast (or another error).
                console.log('Submission failed. Waiting 2s before retrying...');
                await page.waitForTimeout(2000); // Wait before next attempt
            }
            attempts += 1;
        }

        if (postSuccessful) {
            console.log('✅ Action completed successfully (Posted or Scheduled)!');
        } else {
            throw new Error(`Post failed after ${maxAttempts} attempts. Check screenshot for details.`);
        }
    } catch (error) {
        console.error('❌ An error occurred during the automation process:', error);
        await page.screenshot({path: 'error_screenshot.png'});
    } finally {
        await browser.close();
        console.log('Browser closed. Script finished.');
    }
}

createLinkedInPost();