import { parseCapture } from '@/utils/capture-parser';

describe('parseCapture', () => {
  it('detects task and date from free text', () => {
    const result = parseCapture('Comprar ração amanhã às 18h');
    expect(result?.type).toBe('task');
    expect(result?.title).toContain('Comprar ração');
    expect(result?.scheduledAt).toBeTruthy();
  });

  it('detects reminder language', () => {
    expect(parseCapture('Me lembrar de entregar o trabalho sexta às 22h')?.type).toBe('reminder');
  });

  it('leaves ordinary ideas in inbox', () => {
    expect(parseCapture('Ideia: sistema financeiro')).toBeNull();
  });
});
