export const checkLiteUser = (user) => {
    if (!user) return false;

    if (user.premiumLevel === "lite") {
        if (!user.premiumUntil) return true;
        return new Date(user.premiumUntil) > new Date();
    }

    return false;
};
