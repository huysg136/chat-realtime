import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Convert Firestore timestamp or other date formats to a JavaScript Date object.
 */
export function toTimestamp(date) {
    if (!date) return null;
    if (date.seconds) return new Date(date.seconds * 1000);
    if (date._seconds) return new Date(date._seconds * 1000);
    if (date.toMillis) return new Date(date.toMillis());
    if (date instanceof Date) return date;
    return new Date(date);
}

/**
 * Format date to relative time string (e.g., "1 giờ trước", "2 ngày trước")
 */
export function formatTimeAgo(date) {
    const timestamp = toTimestamp(date);
    if (!timestamp) return "";
    
    let timeAgo = formatDistanceToNow(timestamp, { locale: vi });
    
    // Clean up strings for cleaner UI
    timeAgo = timeAgo.replace("khoảng ", "").replace("dưới ", "").trim();
    
    return timeAgo;
}
