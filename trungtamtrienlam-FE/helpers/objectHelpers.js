import { format } from "date-fns";

export function convertDateTimeToDateAndTimeByType(dateStr, type = "dd-MM-yyyy") {
    const [dateConvert, time] = dateStr.split('T');
    const timeWithoutSeconds = time.slice(0, 5);
    const date = format(dateConvert, type);
    return {
        date,
        timeWithoutSeconds
    }
}


export function convertDateTimeToDateAndTime(dateStr) {
    const [date, time] = dateStr.split('T');
    const timeWithoutSeconds = time.slice(0, 5);
    return {
        date,
        timeWithoutSeconds
    }
}