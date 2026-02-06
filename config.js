// ============================================
// FIREBASE YAPILANDIRMA DOSYASI
// ============================================
// Firebase Console'dan aldığınız bilgileri buraya yapıştırın

const firebaseConfig = {
  apiKey: "BURAYA_API_KEY_GELECEK",
  authDomain: "BURAYA_AUTH_DOMAIN_GELECEK",
  databaseURL: "BURAYA_DATABASE_URL_GELECEK",
  projectId: "BURAYA_PROJECT_ID_GELECEK",
  storageBucket: "BURAYA_STORAGE_BUCKET_GELECEK",
  messagingSenderId: "BURAYA_MESSAGING_SENDER_ID_GELECEK",
  appId: "BURAYA_APP_ID_GELECEK"
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
