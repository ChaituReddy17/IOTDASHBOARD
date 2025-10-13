import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClgJN4WswqknaQ__sekMGtV1ydOWNLH6o",
  authDomain: "college-automation-6b895.firebaseapp.com",
  databaseURL: "https://college-automation-6b895-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "college-automation-6b895",
  storageBucket: "college-automation-6b895.firebasestorage.app",
  messagingSenderId: "859647653063",
  appId: "1:859647653063:web:b5b6f9b98364d625e4bae2",
  measurementId: "G-XFBHVK2V0X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and Auth
export const database = getDatabase(app);
export const auth = getAuth(app);
