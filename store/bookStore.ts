import { create } from 'zustand';

import type { Book } from '@/utils/models';

type BookState = {
  books: Book[];
  currentBook: Book | null;
  setBooks: (books: Book[]) => void;
  setCurrentBook: (book: Book | null) => void;
  addBook: (b: Book) => void;
  updateBook: (id: string, data: Partial<Book>) => void;
  removeBook: (id: string) => void;
};

export const useBookStore = create<BookState>((set) => ({
  books: [],
  currentBook: null,
  setBooks: (books) => set(() => ({ books })),
  setCurrentBook: (book) => set(() => ({ currentBook: book })),
  addBook: (b) =>
    set((state) => ({
      books: [b, ...state.books],
    })),
  updateBook: (id, data) =>
    set((state) => {
      const books = state.books.map((b) => (b.id === id ? { ...b, ...data } : b));
      const currentBook = state.currentBook?.id === id ? { ...state.currentBook, ...data } : state.currentBook;
      return { books, currentBook };
    }),
  removeBook: (id) =>
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
      currentBook: state.currentBook?.id === id ? null : state.currentBook,
    })),
}));

