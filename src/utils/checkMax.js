export const checkMaxUser = (user) => {
  if (!user) return false;

  if (user.premiumLevel === "max") {
    if (!user.premiumUntil) return true;
    const expiry = user.premiumUntil.toDate ? user.premiumUntil.toDate() : new Date(user.premiumUntil);
    return expiry > new Date();
  }

  return false;
};