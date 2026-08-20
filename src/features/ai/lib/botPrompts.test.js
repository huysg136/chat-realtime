import { buildBotContextPrompt } from './botPrompts';

describe('AI prompt builder', () => {
  test('includes the current user and question in the prompt', () => {
    const prompt = buildBotContextPrompt({
      displayName: 'Huy',
      userRole: 'user',
      userPlan: 'FREE',
      now: '20:00',
      recentMessages: 'Xin chào',
      replyContext: 'Không có',
      question: 'Quik có những gói nào?',
    });

    expect(prompt).toContain('Huy');
    expect(prompt).toContain('Quik có những gói nào?');
    expect(prompt).toContain('FREE');
  });
});
