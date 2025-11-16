import { differenceInMinutes, differenceInHours, differenceInDays, format } from "date-fns";
import { vi } from "date-fns/locale";

export function getOnlineStatus(lastOnline) {
  if (!lastOnline) {
    return { text: "Hoạt động hơn 1 ngày trước", isOnline: false };
  }

  // Chuyển lastOnline về Date nếu là Firestore Timestamp
  const lastDate = lastOnline.toDate ? lastOnline.toDate() : new Date(lastOnline);
  const now = new Date();

  const minutesDiff = differenceInMinutes(now, lastDate);
  const hoursDiff = differenceInHours(now, lastDate);
  const daysDiff = differenceInDays(now, lastDate);

  // Chấm xanh nếu <5 phút
  if (minutesDiff < 5) {
    return { text: "Đang hoạt động", isOnline: true };
  }

  // Hoạt động trong ngày (<24h)
  if (hoursDiff < 24) {
    if (minutesDiff < 60) {
      return { text: `Hoạt động ${minutesDiff} phút trước`, isOnline: false };
    } else {
      return { text: `Hoạt động ${hoursDiff} giờ trước`, isOnline: false };
    }
  }

  // Hôm qua
  if (daysDiff === 1) {
    return { text: "Hoạt động hôm qua", isOnline: false };
  }

  // Cũ hơn 2 ngày
  return {
    text: `Hoạt động ${format(lastDate, "HH:mm dd/MM", { locale: vi })}`,
    isOnline: false,
  };
}
