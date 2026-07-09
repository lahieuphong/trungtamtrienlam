export function parseTimeToMinutes(time) { // đổi thời gian bắt đầu cho calendar
    if (!time) return 0
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

export function getTopOffset(time) { // đổi thời gian kết thúc cho calendar
    if (!time) return 0
    const [start] = time.split(' - ');
    const minutes = parseTimeToMinutes(start);
    const ratio = 960 / (24 * 60);
    return minutes * ratio;
}