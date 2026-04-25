import React from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { AuthContext } from "../context/authProvider";

export const useFirestore = (collectionName, condition) => {
  const [documents, setDocuments] = React.useState([]);
  const { user } = React.useContext(AuthContext);

  React.useEffect(() => {
    if (!user?.uid) {
      setDocuments([]);
      return;
    }

    let collectionRef = collection(db, collectionName);

    let q = query(collectionRef, orderBy("createdAt", "desc"));

    if (condition) {
      if (condition.fieldName && condition.operator && condition.compareValue) {
        q = query(
          collectionRef,
          where(condition.fieldName, condition.operator, condition.compareValue),
          orderBy("createdAt", "desc")
        );
      }
    }

    // // Limit to 50 documents for messages collection
    // if (collectionName === "messages") {
    //   q = query(q, limit(25));
    // }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setDocuments(docs);
    });

    return () => unsubscribe();
  }, [collectionName, condition, user?.uid]);

  return documents;
};

export default useFirestore;
