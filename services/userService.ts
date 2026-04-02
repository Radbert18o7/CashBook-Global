import { doc, getDoc } from 'firebase/firestore';

import { firestore } from './firebase';
import { isFirebasePermissionDenied } from '@/utils/firebaseErrors';

export async function getUserDisplay(uid: string): Promise<{ name: string; email: string }> {
  try {
    const s = await getDoc(doc(firestore, 'users', uid));
    const d = s.data();
    return {
      name: typeof d?.name === 'string' ? d.name : uid.slice(0, 6),
      email: typeof d?.email === 'string' ? d.email : '',
    };
  } catch (e) {
    if (isFirebasePermissionDenied(e)) {
      return { name: uid.slice(0, 8), email: '' };
    }
    throw e;
  }
}
