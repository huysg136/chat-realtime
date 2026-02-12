import { checkLiteUser } from "./checkLite";
import { checkProUser } from "./checkPro";
import { checkMaxUser } from "./checkMax";

export function getPremiumLevel(user) {
  if (!user) return "free";

  if (checkMaxUser(user)) return "max";
  if (checkProUser(user)) return "pro";
  if (checkLiteUser(user)) return "lite";

  return "free";
}