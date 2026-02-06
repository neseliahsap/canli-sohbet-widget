// ============================================
// FIREBASE YAPILANDIRMA DOSYASI
// ============================================
// Firebase Console'dan aldığınız bilgileri buraya yapıştırın

const firebaseConfig = {
  apiKey: "AIzaSyBGtJpTk7TtDD4vFr-wn3uip8KKs2yn-LQ",
  authDomain: "canli-sohbet-a99d2.firebaseapp.com",
  databaseURL: "https://canli-sohbet-a99d2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "canli-sohbet-a99d2",
  storageBucket: "canli-sohbet-a99d2.firebasestorage.app",
  messagingSenderId: "872359561023",
  appId: "1:872359561023:web:41b70d016a0757d469b58a"
};

// ============================================
// ÖRNEK (Sizinki farklı olacak):
// ============================================
// const firebaseConfig = {
//   apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxx",
//   authDomain: "canli-sohbet-12345.firebaseapp.com",
//   databaseURL: "https://canli-sohbet-12345.firebaseio.com",
//   projectId: "canli-sohbet-12345",
//   storageBucket: "canli-sohbet-12345.appspot.com",
//   messagingSenderId: "123456789012",
//   appId: "1:123456789012:web:abcdef123456"
// };

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
