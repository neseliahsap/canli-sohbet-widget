// ============================================
// FIREBASE YAPILANDIRMA DOSYASI
// ============================================
// Firebase Console'dan aldığınız bilgileri buraya yapıştırın

const firebaseConfig = {
  apiKey: "AIzaSyBgVC1G-wN90fsnTDW4Gp1sEkuNlh7ZRWo",
  authDomain: "canli-sohbet-3d7f5.firebaseapp.com",
  databaseURL: "https://canli-sohbet-3d7f5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "canli-sohbet-3d7f5",
  storageBucket: "canli-sohbet-3d7f5.firebasestorage.app",
  messagingSenderId: "808168120617",
  appId: "1:808168120617:web:a09239c945181abd3ed738"
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
