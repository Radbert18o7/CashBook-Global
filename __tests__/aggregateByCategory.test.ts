import { aggregateCashOutByCategory } from '@/utils/aggregateByCategory';
import type { Entry } from '@/utils/models';

function e(partial: Partial<Entry> & Pick<Entry, 'id' | 'book_id' | 'type' | 'amount'>): Entry {
  return {
    created_by: 'u',
    entry_date: new Date(),
    ...partial,
  } as Entry;
}

describe('aggregateCashOutByCategory', () => {
  it('sums cash-out by category_name', () => {
    const entries: Entry[] = [
      e({
        id: '1',
        book_id: 'b',
        type: 'CASH_OUT',
        amount: 10,
        category_name: 'Food',
      }),
      e({
        id: '2',
        book_id: 'b',
        type: 'CASH_OUT',
        amount: 5,
        category_name: 'Food',
      }),
      e({
        id: '3',
        book_id: 'b',
        type: 'CASH_IN',
        amount: 100,
        category_name: 'Salary',
      }),
    ];
    const out = aggregateCashOutByCategory(entries);
    expect(out.find((x) => x.name === 'Food')?.amount).toBe(15);
    expect(out.find((x) => x.name === 'Salary')).toBeUndefined();
  });

  it('uses Other when category missing', () => {
    const entries: Entry[] = [
      e({ id: '1', book_id: 'b', type: 'CASH_OUT', amount: 3, category_name: '' }),
    ];
    const out = aggregateCashOutByCategory(entries);
    expect(out[0]?.name).toBe('Other');
  });
});
