import { differenceInMinutes, differenceInHours, format } from "date-fns";
import { vi } from "date-fns/locale";

export function getOnlineStatus(lastOnline) {
  if (!lastOnline) {
    return { text: "Hoạt động hơn 1 ngày trước", isOnline: false };
  }

  const lastDate = lastOnline.toDate ? lastOnline.toDate() : new Date(lastOnline);
  const now = new Date();

  const minutesDiff = differenceInMinutes(now, lastDate);

  if (minutesDiff < 1) {
    return { text: "Đang hoạt động", isOnline: true };
  } else if (minutesDiff < 60) {
    return { text: `Hoạt động ${minutesDiff} phút trước`, isOnline: false };
  } else {
    const hoursDiff = differenceInHours(now, lastDate);
    if (hoursDiff < 24) {
      return { text: `Hoạt động ${hoursDiff} giờ trước`, isOnline: false };
    } else {
      return {
        text: `Hoạt động ${format(lastDate, "HH:mm dd/MM", { locale: vi })}`,
        isOnline: false,
      };
    }
  }
}
