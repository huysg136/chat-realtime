export const checkMaxUser = (user) => {
  if (!user) return false;
  
  if (user.premiumLevel === "max") {
    if (!user.premiumUntil) return true;
    return new Date(user.premiumUntil) > new Date();
  }
  
  return false;
};