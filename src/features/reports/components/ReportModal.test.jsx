import ReportModal from './ReportModal';

describe('reports module', () => {
  test('exports the report modal', () => {
    expect(typeof ReportModal).toBe('function');
  });
});
