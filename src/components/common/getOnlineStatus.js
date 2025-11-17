import { differenceInMinutes, differenceInHours, differenceInDays, format } from "date-fns";
import { vi } from "date-fns/locale";

export function getOnlineStatus(lastOnline) {
  if (!lastOnline) {
    return { text: "Hoạt động lâu rồi" };
  }

  const lastDate = lastOnline.toDate ? lastOnline.toDate() : new Date(lastOnline);
  const now = new Date();

  const minutesDiff = differenceInMinutes(now, lastDate);
  const hoursDiff = differenceInHours(now, lastDate);
  const daysDiff = differenceInDays(now, lastDate);

  if (minutesDiff < 1) {
    return { text: "Đang hoạt động" };
  }

  if (hoursDiff < 24) {
    if (minutesDiff < 60) {
      return { text: `Hoạt động ${minutesDiff} phút trước` };
    } else {
      return { text: `Hoạt động ${hoursDiff} giờ trước` };
    }
  }

  if (daysDiff === 1) {
    return { text: "Hoạt động hôm qua" };
  }

  if (daysDiff <= 7) {
    return { text: `Hoạt động ${daysDiff} ngày trước` };
  }

  return { text: "Hoạt động lâu rồi" };
}
