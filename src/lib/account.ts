import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Deleting a user's data is a client-side sweep because Firestore has no
 * "delete this subtree" operation: removing a document does not remove its
 * subcollections, so every collection has to be enumerated explicitly.
 *
 * Keep these lists in sync with whatever the contexts write. If a new collection
 * is added and forgotten here, deleting an account would silently orphan it.
 */
const USER_COLLECTIONS = ['workout_days', 'exercises', 'templates', 'body_entries'] as const;

const USER_DOCUMENTS = [
  'profile/settings',
  'profile/meta',
  // Pre-migration documents, harmless if they no longer exist.
  'profile/stats',
  'workout_logs/all',
] as const;

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 400;

/**
 * Removes everything stored under `users/{uid}`. Security rules restrict this to
 * the owner, so it runs with the signed-in user's own credentials.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  for (const name of USER_COLLECTIONS) {
    const snapshot = await getDocs(collection(db, `users/${uid}/${name}`));

    for (let index = 0; index < snapshot.docs.length; index += BATCH_LIMIT) {
      const batch = writeBatch(db);
      snapshot.docs.slice(index, index + BATCH_LIMIT).forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    }
  }

  const batch = writeBatch(db);
  USER_DOCUMENTS.forEach((path) => batch.delete(doc(db, `users/${uid}/${path}`)));
  await batch.commit();
}
