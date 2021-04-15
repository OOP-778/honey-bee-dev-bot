export const multipliers: Map<string, number> = new Map()
    .set("s", 1)
    .set("m", 60)
    .set("h", 3600)
    .set("d", 86400)
    .set("w", 604800)
    .set("M", 2592000)
    .set("y", 31557600)

export function parseTimeFromXtoY(paramTime: number, current: string, want: string): number {
    return Math.floor((paramTime * multipliers.get(current)) / multipliers.get(want));
}

export function toMillis(seconds: number): number {
    return seconds * 1000
}

export function parseTimeToSeconds(paramString: string): number {
    let total = 0;

    for (const o of multipliers.keys()) {
        const matcher = paramString.match(new RegExp("(\\d+(?=" + o + "))", "g"));
        if (matcher) total += matcher.map(v => parseInt(v)).reduce((a, b) => a + b) * multipliers.get(o);
    }
    if (total === 0) return undefined;
    return total;
}

export function parseTimeToMillis(paramString: string): number {
    const secs = parseTimeToSeconds(paramString);
    return secs === undefined ? undefined : secs * 1000;
}

export function parseMillisToTime(paramTime: number): string {
    if (Math.floor(paramTime / (multipliers.get("y") * 1000)) >= 1) return `${(paramTime / (multipliers.get("y") * 1000)).toPrecision(2)}y`;
    if (Math.floor(paramTime / (multipliers.get("M") * 1000)) >= 1) return `${(paramTime / (multipliers.get("M") * 1000)).toPrecision(2)}M`;
    if (Math.floor(paramTime / (multipliers.get("d") * 1000)) >= 1) return `${(paramTime / (multipliers.get("d") * 1000)).toPrecision(2)}d`;
    if (Math.floor(paramTime / (multipliers.get("h") * 1000)) >= 1) return `${(paramTime / (multipliers.get("h") * 1000)).toPrecision(2)}h`;
    if (Math.floor(paramTime / (multipliers.get("m") * 1000)) >= 1) return `${(paramTime / (multipliers.get("m") * 1000)).toPrecision(2)}m`;
    if (Math.floor(paramTime / (multipliers.get("s") * 1000)) >= 1) return `${(paramTime / (multipliers.get("s") * 1000)).toPrecision(2)}s`;
}