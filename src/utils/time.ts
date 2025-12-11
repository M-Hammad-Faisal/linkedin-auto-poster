export const TIME_REGEX = /^(([0-1][0-2])|(0[0-9])):([0-5][0-9]) (AM|PM)$/i;

interface IDateValidationResult {
    finalDate: Date;
    finalTimeStr: string;
}

/**
 * Validates and adjusts the scheduled date and time to ensure it is in the future
 * and in the correct format.
 */
export function validateAndAdjustSchedule(
    scheduleDateEnv: string,
    scheduleTimeEnv: string
): IDateValidationResult {
    const currentDate = new Date();
    const givenDate = new Date(scheduleDateEnv);
    let finalDate = givenDate;
    let finalTimeStr = scheduleTimeEnv;

    if (isNaN(givenDate.getTime()) || givenDate.getTime() < currentDate.setHours(0, 0, 0, 0)) {
        const tomorrow = new Date();
        tomorrow.setDate(currentDate.getDate() + 1);
        finalDate = tomorrow;
        console.log(
            '⚠️ Provided schedule date is invalid or in the past. Scheduling for tomorrow.'
        );
    }

    if (!finalTimeStr || !TIME_REGEX.exec(finalTimeStr)?.[0]) {
        finalTimeStr = '10:00 AM';
        console.log('⚠️ Provided schedule time is invalid format. Using default time (10:00 AM).');
    }

    const isToday = finalDate.toDateString() === new Date().toDateString();

    if (isToday) {
        const [timePart, meridiem] = finalTimeStr.split(' ');
        const timeSplitParts = timePart.split(':');
        let hours = Number(timeSplitParts[0]);
        const minutes = Number(timeSplitParts[1]);

        if (meridiem === 'PM' && hours !== 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }

        const scheduledDateTime = new Date(
            finalDate.getFullYear(),
            finalDate.getMonth(),
            finalDate.getDate(),
            hours,
            minutes,
            0,
            0
        );

        const fiveMinutesFromNow = new Date(new Date().getTime() + 5 * 60000);

        if (scheduledDateTime.getTime() < fiveMinutesFromNow.getTime()) {
            finalDate = fiveMinutesFromNow;

            const newHours = fiveMinutesFromNow.getHours();
            const newMinutes = fiveMinutesFromNow.getMinutes().toString().padStart(2, '0');
            const newMeridiem = newHours >= 12 ? 'PM' : 'AM';
            const displayHours = newHours % 12 || 12;

            finalTimeStr = `${displayHours.toString().padStart(2, '0')}:${newMinutes} ${newMeridiem}`;
            console.log(
                `⚠️ Scheduled time is in the past TODAY. Resetting time to 5 minutes from now: ${finalTimeStr}`
            );
        }
    }

    return { finalDate, finalTimeStr };
}
