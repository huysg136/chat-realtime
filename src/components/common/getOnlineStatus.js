import { differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

export function getOnlineStatus(lastOnline, t) {
  if (!lastOnline) {
    return { text: t('status.activeLongAgo') };
  }

  const lastDate = lastOnline.toDate ? lastOnline.toDate() : new Date(lastOnline);
  const now = new Date();

  const minutesDiff = differenceInMinutes(now, lastDate);
  const hoursDiff = differenceInHours(now, lastDate);
  const daysDiff = differenceInDays(now, lastDate);

  // Đang hoạt động (< 1 phút)
  if (minutesDiff < 1) {
    return { text: t('status.activeNow') };
  }

  // Trong vòng 24 giờ
  if (hoursDiff < 24) {
    if (minutesDiff < 60) {
      return { text: t('status.activeMinutes', { count: minutesDiff }) };
    } else {
      return { text: t('status.activeHours', { count: hoursDiff }) };
    }
  }

  // Hoạt động hôm qua
  if (daysDiff === 1) {
    return { text: t('status.activeYesterday') };
  }

  // Trong vòng 7 ngày
  if (daysDiff <= 7) {
    return { text: t('status.activeDays', { count: daysDiff }) };
  }

  // Mặc định
  return { text: t('status.activeLongAgo') };
}