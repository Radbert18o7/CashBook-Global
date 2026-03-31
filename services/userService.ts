import { doc, getDoc } from 'firebase/firestore';

import { firestore } from './firebase';

export async function getUserDisplay(uid: string): Promise<{ name: string; email: string }> {
  const s = await getDoc(doc(firestore, 'users', uid));
  const d = s.data();
  return {
    name: typeof d?.name === 'string' ? d.name : uid.slice(0, 6),
    email: typeof d?.email === 'string' ? d.email : '',
  };
}
