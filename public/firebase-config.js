// TODO: Replace the following config with your Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyBZH6ykfEGRik44qKpc5BcaU6fClB58rIQ",
    authDomain: "project1-5ecc4.firebaseapp.com",
    projectId: "project1-5ecc4",
    storageBucket: "project1-5ecc4.firebasestorage.app",
    messagingSenderId: "686305454324",
    appId: "1:686305454324:web:cd7399df3870a3a058d6a1"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
