export const checkProUser = (user) => {
  if (!user) return false;
  
  if (user.premiumLevel === "pro") {
    if (!user.premiumUntil) return true;
    return new Date(user.premiumUntil) > new Date();
  }
  
  return false;
};