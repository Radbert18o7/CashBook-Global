import { getBooks, getBook, createBook, updateBook, deleteBook } from '../services/bookService';
import { firestore } from '../services/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  getDoc, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  firestore: {},
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('../services/firebase', () => ({
  firestore: {},
}));

jest.mock('@/utils/sanitizeFirestoreData', () => ({
  sanitizeFirestoreData: (data: any) => data,
}));

describe('bookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBooks', () => {
    it('should fetch books for a given businessId', async () => {
      const mockBooks = [
        { id: 'book1', name: 'Book 1', business_id: 'biz123' },
        { id: 'book2', name: 'Book 2', business_id: 'biz123' },
      ];
      (query as jest.Mock).mockReturnValue('query-ref');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockBooks.map(b => ({ id: b.id, data: () => {
          const { id, ...rest } = b;
          return rest;
        } })),
      });

      const books = await getBooks('biz123');

      expect(collection).toHaveBeenCalledWith(firestore, 'books');
      expect(where).toHaveBeenCalledWith('business_id', '==', 'biz123');
      expect(books).toHaveLength(2);
      expect(books[0]).toEqual(mockBooks[0]);
    });
  });

  describe('getBook', () => {
    it('should fetch a single book by id', async () => {
      const mockBook = { name: 'Book 1', business_id: 'biz123' };
      (doc as jest.Mock).mockReturnValue('doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'book1',
        data: () => mockBook,
      });

      const book = await getBook('book1');

      expect(doc).toHaveBeenCalledWith(firestore, 'books', 'book1');
      expect(book).toEqual({ id: 'book1', ...mockBook });
    });

    it('should return null if book does not exist', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const book = await getBook('book-none');
      expect(book).toBeNull();
    });
  });

  describe('createBook', () => {
    it('should create a book and its initial members, categories and payment modes', async () => {
      (collection as jest.Mock).mockReturnValue('coll-ref');
      (addDoc as jest.Mock).mockResolvedValue({ id: 'book-new' });
      (doc as jest.Mock).mockReturnValue('doc-ref');

      const bookId = await createBook('biz123', 'My New Book', 'user456');

      expect(addDoc).toHaveBeenCalledWith(
        'coll-ref',
        expect.objectContaining({
          business_id: 'biz123',
          name: 'My New Book',
          created_by: 'user456',
        })
      );
      expect(bookId).toBe('book-new');
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('updateBook', () => {
    it('should update book details', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      await updateBook('book1', { name: 'Updated Name' });
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', { name: 'Updated Name' });
    });
  });

  describe('deleteBook', () => {
    it('should delete a book', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      await deleteBook('book1');
      expect(deleteDoc).toHaveBeenCalledWith('doc-ref');
    });
  });
});
