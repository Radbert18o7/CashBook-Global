import { getEntry, getEntries, createEntry, getBookAllTimeSummary, updateEntry, deleteEntry } from '../services/entryService';
import { firestore } from '../services/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  runTransaction, 
  Timestamp, 
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { getBook } from '../services/bookService';
import { getBusiness } from '../services/businessService';

jest.mock('firebase/firestore', () => ({
  firestore: {},
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  increment: jest.fn((val) => `increment(${val})`),
  Timestamp: {
    fromDate: jest.fn((d) => ({ toDate: () => d, seconds: d.getTime() / 1000 })),
  },
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('../services/firebase', () => ({
  firestore: {},
}));

jest.mock('../services/bookAuditService', () => ({
  appendBookAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/bookService', () => ({
  getBook: jest.fn(),
}));

jest.mock('../services/businessService', () => ({
  getBusiness: jest.fn(),
}));

jest.mock('@/utils/sanitizeFirestoreData', () => ({
  sanitizeFirestoreData: (data: any) => data,
}));

describe('entryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEntry', () => {
    it('should fetch a single active entry', async () => {
      const mockEntry = {
        id: 'entry1',
        data: () => ({
          entry_date: '2026-04-13',
          deleted_at: null,
          type: 'CASH_IN',
          amount: 100,
        }),
        exists: () => true,
      };
      (doc as jest.Mock).mockReturnValue('entry-ref');
      (getDoc as jest.Mock).mockResolvedValue(mockEntry);

      const entry = await getEntry('book1', 'entry1');

      expect(doc).toHaveBeenCalledWith(firestore, 'books', 'book1', 'entries', 'entry1');
      expect(entry).toEqual(expect.objectContaining({
        id: 'entry1',
        amount: 100,
        type: 'CASH_IN',
      }));
    });

    it('should return null if entry is soft-deleted', async () => {
      const mockEntry = {
        exists: () => true,
        data: () => ({ deleted_at: '2026-04-13' }),
      };
      (getDoc as jest.Mock).mockResolvedValue(mockEntry);
      const entry = await getEntry('book1', 'entry1');
      expect(entry).toBeNull();
    });
  });

  describe('getEntries', () => {
    it('should fetch filtered active entries', async () => {
      const mockDocs = [
        { id: 'e1', data: () => ({ deleted_at: null, amount: 100 }), exists: () => true },
        { id: 'e2', data: () => ({ deleted_at: null, amount: 200 }), exists: () => true },
      ];
      (collection as jest.Mock).mockReturnValue('entries-ref');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
      });

      const result = await getEntries('book1', { type: 'CASH_IN' });

      expect(collection).toHaveBeenCalledWith(firestore, 'books', 'book1', 'entries');
      expect(where).toHaveBeenCalledWith('deleted_at', '==', null);
      expect(where).toHaveBeenCalledWith('type', '==', 'CASH_IN');
      expect(result.entries).toHaveLength(2);
    });
  });

  describe('createEntry', () => {
    it('should create an entry and update summary using transaction', async () => {
      (collection as jest.Mock).mockReturnValue('entries-coll');
      (doc as jest.Mock).mockReturnValue({ id: 'new-entry-id' });
      
      // Mock runTransaction to execute the callback
      (runTransaction as jest.Mock).mockImplementation(async (fs, callback) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          get: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({}) }),
        };
        return await callback(tx);
      });
      
      (getBook as jest.Mock).mockResolvedValue({ business_id: 'biz1' });
      (getBusiness as jest.Mock).mockResolvedValue({ currency_code: 'USD' });
      
      const entryId = await createEntry(
        'book1', 
        { type: 'CASH_IN', amount: 100, entry_date: new Date() }, 
        'user1'
      );
      
      expect(entryId).toBe('new-entry-id');
      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe('updateEntry', () => {
    it('should update an entry and adjust summaries', async () => {
      (doc as jest.Mock).mockReturnValue('entry-ref');
      (runTransaction as jest.Mock).mockImplementation(async (fs, callback) => {
        const tx = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              type: 'CASH_IN',
              amount: 100,
              entry_date: new Date(),
            }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return await callback(tx);
      });

      await updateEntry('book1', 'entry1', { amount: 200 }, 'user1');

      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe('deleteEntry', () => {
    it('should soft-delete an entry and adjust summary', async () => {
      (doc as jest.Mock).mockReturnValue('entry-ref');
      (runTransaction as jest.Mock).mockImplementation(async (fs, callback) => {
        const tx = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              deleted_at: null,
              type: 'CASH_IN',
              amount: 100,
              entry_date: new Date(),
            }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        return await callback(tx);
      });

      await deleteEntry('book1', 'entry1', 'user1');

      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe('getBookAllTimeSummary', () => {
    it('should calculate total in, out and net balance correctly', async () => {
      const mockDocs = [
        { id: 'm1', data: () => ({ total_in: 1000, total_out: 400, entry_count: 10 }) },
        { id: 'm2', data: () => ({ total_in: 500, total_out: 200, entry_count: 5 }) },
      ];
      (collection as jest.Mock).mockReturnValue('sum-coll');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
        forEach: (cb) => mockDocs.forEach(cb),
      });

      const summary = await getBookAllTimeSummary('book1');

      expect(summary).toEqual({
        total_in: 1500,
        total_out: 600,
        net_balance: 900,
        entry_count: 15,
      });
    });

    it('should return empty summary if permission denied', async () => {
      (getDocs as jest.Mock).mockRejectedValue({ code: 'permission-denied' });
      
      const summary = await getBookAllTimeSummary('book1');
      expect(summary.total_in).toBe(0);
    });
  });
});
