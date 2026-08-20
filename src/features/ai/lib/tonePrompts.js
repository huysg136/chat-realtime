export const getToneMappings = (t) => ({
    default: t('chatInput.tones.default'),
    boss: t('chatInput.tones.boss'),
    lover: t('chatInput.tones.lover'),
    elder: t('chatInput.tones.elder'),
    friend: t('chatInput.tones.friend'),
    client: t('chatInput.tones.client')
});

export const buildPolishPrompt = (t, toneDescription, inputValue) => {
    return t('chatInput.aiPrompt.polish', {
        tone: toneDescription,
        input: inputValue,
        interpolation: { escapeValue: false }
    });
};
