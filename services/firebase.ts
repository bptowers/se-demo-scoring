import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// NOTE: In a real production app, you would plug in your Firebase config here.
// For this demo, we are checking if config exists. If not, we use a "Simulation Mode".
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.REACT_APP_FIREBASE_APP_ID,
};

let auth: any = null;
let db: any = null;
let functions: any = null;
let isConfigured = false;

// Initialize only if keys are present (or if you paste your keys above)
if (firebaseConfig.apiKey && !getApps().length) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, 'us-central1');
    isConfigured = true;
  } catch (e) {
    console.warn("Firebase initialization failed, falling back to demo mode.", e);
  }
}

// --- Auth Functions ---

export const signInWithGoogle = async (forceDemo: boolean = false) => {
  if (forceDemo) {
    console.log("Using Demo Login");
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      user: {
        uid: "demo-user-123",
        displayName: "Demo User",
        email: "user@simpro.co",
        photoURL: null
      }
    };
  }

  if (isConfigured && auth) {
    const provider = new GoogleAuthProvider();

    // Explicitly request profile and email scopes to ensure photoURL is included
    provider.addScope('profile');
    provider.addScope('email');

    // Note: Google's 'hd' parameter is a hint for UI, but doesn't enforce restrictions
    // We'll validate the domain after sign-in
    const result = await signInWithPopup(auth, provider);

    // Validate email domain
    const allowedDomains = ['bigchange.com', 'clockshark.com', 'simprogroup.com', 'simpro.co.uk', 'simpro.com', 'simpro.com.au', 'simpro.us'];
    const userEmail = result.user.email;
    const userDomain = userEmail?.split('@')[1];

    if (!userDomain || !allowedDomains.includes(userDomain)) {
      // Sign out the user immediately
      await firebaseSignOut(auth);
      throw new Error('Access is restricted to authorized company domains. Please sign in with your company email.');
    }

    return result;
  } else {
    // DEMO MODE: Simulate a successful login delay
    console.log("Using Demo Login (No Firebase Config Found)");
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return a mock user object
    return {
      user: {
        uid: "demo-user-123",
        displayName: "Demo User",
        email: "user@simpro.co",
        photoURL: null // Use default avatar
      }
    };
  }
};

export const signOut = async () => {
  if (isConfigured && auth) {
    return firebaseSignOut(auth);
  } else {
    // Demo Mode
    return Promise.resolve();
  }
};

export const getFirebaseAuth = () => auth;
export const getFirebaseFirestore = () => db;
export const getFirebaseFunctions = () => functions;
export const isFirebaseConfigured = () => isConfigured;
