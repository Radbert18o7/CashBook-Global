import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestore } from './firebase';

import type { Business, BookMemberRole } from '@/utils/models';

export async function getBusinesses(userId: string): Promise<Business[]> {
  const q = query(collection(firestore, 'businesses'), where('owner_id', '==', userId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Business, 'id'>),
  }));
}

export async function createBusiness(data: { name: string; logo_url?: string }, userId: string) {
  const businessDoc = await addDoc(collection(firestore, 'businesses'), {
    name: data.name,
    owner_id: userId,
    logo_url: data.logo_url ?? null,
    created_at: serverTimestamp(),
  });

  const businessId = businessDoc.id;
  await setDoc(doc(firestore, 'businesses', businessId, 'members', userId), {
    user_id: userId,
    business_id: businessId,
    role: 'PRIMARY_ADMIN' satisfies BookMemberRole,
    created_at: serverTimestamp(),
  });

  return businessId;
}

export async function updateBusiness(
  businessId: string,
  data: Partial<Pick<Business, 'name' | 'logo_url' | 'address' | 'currency_code' | 'timezone'>>,
) {
  await updateDoc(doc(firestore, 'businesses', businessId), data);
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const s = await getDoc(doc(firestore, 'businesses', businessId));
  if (!s.exists()) return null;
  return { id: s.id, ...(s.data() as Omit<Business, 'id'>) };
}

export async function deleteBusiness(businessId: string) {
  await deleteDoc(doc(firestore, 'businesses', businessId));
}

export async function addMember(
  businessId: string,
  userId: string,
  role: BookMemberRole,
  permissions: Record<string, unknown> = {},
) {
  await setDoc(doc(firestore, 'businesses', businessId, 'members', userId), {
    user_id: userId,
    business_id: businessId,
    role,
    permissions,
    created_at: serverTimestamp(),
  });
}

export async function removeMember(businessId: string, userId: string) {
  await deleteDoc(doc(firestore, 'businesses', businessId, 'members', userId));
}

export async function updateMemberRole(businessId: string, userId: string, role: BookMemberRole) {
  await updateDoc(doc(firestore, 'businesses', businessId, 'members', userId), { role });
}

export async function getBusinessMembers(
  businessId: string,
): Promise<{ id: string; user_id: string; role: BookMemberRole; created_at?: unknown }[]> {
  const snap = await getDocs(collection(firestore, 'businesses', businessId, 'members'));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { user_id: string; role: BookMemberRole; created_at?: unknown }),
  }));
}

export async function getBusinessOwner(businessId: string): Promise<string | null> {
  const s = await getDoc(doc(firestore, 'businesses', businessId));
  if (!s.exists()) return null;
  return (s.data().owner_id as string) ?? null;
}

