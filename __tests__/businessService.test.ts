import { 
  getBusinesses, 
  createBusiness, 
  updateBusiness, 
  getBusiness, 
  deleteBusiness, 
  addMember, 
  removeMember, 
  updateMemberRole, 
  getBusinessMembers, 
  getBusinessOwner 
} from '../services/businessService';
import { firestore } from '../services/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  firestore: {},
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('../services/firebase', () => ({
  firestore: {},
}));

jest.mock('@/utils/sanitizeFirestoreData', () => ({
  sanitizeFirestoreData: (data: any) => data,
}));

describe('businessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBusinesses', () => {
    it('should fetch businesses for a user', async () => {
      const mockBiz = { id: 'biz1', name: 'Biz 1', owner_id: 'user123' };
      (query as jest.Mock).mockReturnValue('query-ref');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [{ id: 'biz1', data: () => ({ name: 'Biz 1', owner_id: 'user123' }) }],
      });

      const businesses = await getBusinesses('user123');

      expect(collection).toHaveBeenCalledWith(firestore, 'businesses');
      expect(where).toHaveBeenCalledWith('owner_id', '==', 'user123');
      expect(businesses).toHaveLength(1);
      expect(businesses[0]).toEqual({ id: 'biz1', name: 'Biz 1', owner_id: 'user123' });
    });
  });

  describe('createBusiness', () => {
    it('should create a business and set the owner as a member', async () => {
      (collection as jest.Mock).mockReturnValue('coll-ref');
      (addDoc as jest.Mock).mockResolvedValue({ id: 'biz-new' });
      (doc as jest.Mock).mockReturnValue('doc-ref');

      const bizId = await createBusiness({ name: 'New Biz' }, 'user123');

      expect(addDoc).toHaveBeenCalledWith(
        'coll-ref',
        expect.objectContaining({ name: 'New Biz', owner_id: 'user123' })
      );
      expect(bizId).toBe('biz-new');
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ user_id: 'user123', role: 'PRIMARY_ADMIN' })
      );
    });
  });

  describe('updateBusiness', () => {
    it('should update business details', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      await updateBusiness('biz1', { name: 'Updated Biz' });
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({ name: 'Updated Biz' }));
    });
  });

  describe('addMember', () => {
    it('should add a member to the business', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      await addMember('biz1', 'user456', 'EMPLOYEE');
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ user_id: 'user456', role: 'EMPLOYEE' })
      );
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      await updateMemberRole('biz1', 'user456', 'PRIMARY_ADMIN');
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', { role: 'PRIMARY_ADMIN' });
    });
  });

  describe('getBusiness', () => {
    it('should fetch a business by id', async () => {
      const mockBiz = { name: 'Biz 1', owner_id: 'user123' };
      (doc as jest.Mock).mockReturnValue('doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'biz1',
        data: () => mockBiz,
      });

      const biz = await getBusiness('biz1');
      expect(biz).toEqual({ id: 'biz1', ...mockBiz });
    });
  });

  describe('getBusinessOwner', () => {
    it('should return the owner id', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ owner_id: 'user123' }),
      });

      const ownerId = await getBusinessOwner('biz1');
      expect(ownerId).toBe('user123');
    });
  });
});
