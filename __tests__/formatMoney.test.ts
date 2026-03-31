import { formatMoney } from '@/utils/formatMoney';

describe('formatMoney', () => {
  it('formats with Intl when available', () => {
    const s = formatMoney(1234.5, 'USD', 'en-US');
    expect(s).toMatch(/1/);
    expect(s).toMatch(/234/);
  });
});
