import { db } from "./config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef;
  } catch (error) {
    console.error("Error adding document: ", error);
  }
};
