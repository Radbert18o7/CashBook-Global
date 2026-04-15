import { getCategories, createCategory, updateCategory, deleteCategory, reorderCategories } from '../services/categoryService';
import { firestore } from '../services/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  firestore: {},
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  firestore: {},
}));

jest.mock('@/utils/sanitizeFirestoreData', () => ({
  sanitizeFirestoreData: (data: any) => data,
}));

describe('categoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should fetch categories for a book', async () => {
      const mockCats = [
        { id: 'cat1', name: 'Food', order: 0 },
        { id: 'cat2', name: 'Transport', order: 1 },
      ];
      (collection as jest.Mock).mockReturnValue('coll-ref');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockCats.map(c => ({ id: c.id, data: () => {
          const { id, ...rest } = c;
          return rest;
        } })),
      });

      const categories = await getCategories('book1');

      expect(collection).toHaveBeenCalledWith(firestore, 'books', 'book1', 'categories');
      expect(categories).toHaveLength(2);
      expect(categories[0]).toEqual(mockCats[0]);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      (collection as jest.Mock).mockReturnValue('coll-ref');
      (doc as jest.Mock).mockReturnValue({ id: 'cat-new' });

      const catId = await createCategory('book1', 'Medicine');

      expect(setDoc).toHaveBeenCalledWith(
        { id: 'cat-new' },
        expect.objectContaining({ name: 'Medicine', order: 0 })
      );
      expect(catId).toBe('cat-new');
    });
  });

  describe('reorderCategories', () => {
    it('should update order for multiple categories', async () => {
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      (writeBatch as jest.Mock).mockReturnValue(mockBatch);
      (doc as jest.Mock).mockImplementation((...args) => args.slice(1).join('/'));

      await reorderCategories('book1', ['cat2', 'cat1']);

      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith('books/book1/categories/cat2', { order: 0 });
      expect(mockBatch.update).toHaveBeenCalledWith('books/book1/categories/cat1', { order: 1 });
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

});
