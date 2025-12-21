import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWz81cj7Q-us7_ncsMuDinL0axlD6uygk",
  authDomain: "rdr2-map-1689b.firebaseapp.com",
  projectId: "rdr2-map-1689b",
  storageBucket: "rdr2-map-1689b.appspot.com",
  messagingSenderId: "989899961814",
  appId: "1:989899961814:web:c1497eaef343fea1d32077",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
