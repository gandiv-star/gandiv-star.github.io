// =============================================================
//  ગાંડિવ એકેડેમી — સેટિંગ્સ (ફક્ત આ ફાઇલમાં ફેરફાર કરવો)
// =============================================================

// 1) Firebase Console → Project settings → Your apps → firebaseConfig
//    ત્યાંથી આખું કોપી કરીને નીચે બદલો.
export const firebaseConfig = {
  apiKey: "AIzaSyAJfS23XNLbNLaKPvsdoY79Ce0APtC6Oyk",
  authDomain: "gandiv-academy-6d5b6.firebaseapp.com",
  projectId: "gandiv-academy-6d5b6",
  storageBucket: "gandiv-academy-6d5b6.firebasestorage.app",
  messagingSenderId: "577855749294",
  appId: "1:577855749294:web:5c89e4381d988daf71813f"
};

// 2) એડમિન ઇમેઇલ (firestore.rules માં પણ આ જ ઇમેઇલ હોવો જોઈએ)
export const ADMIN_EMAILS = ["gandivacademy@gmail.com"];

// 3) એકેડેમીની માહિતી
export const ACADEMY = {
  name: "ગાંડિવ એકેડેમી",
  nameEn: "Gandiv Academy",
  city: "મહુવા",
  phone: "9974788382",
  whatsapp: "919974788382",
  address: "ભાસ્કરરાવ ઠાકર કોમ્પલેક્ષ, પહેલો માળ, ગાંધીબાગ રોડ, મહુવા",
  instagram: "gandivacademy",
  upiId: "",            // ઉદા. "gandivacademy@upi" — ભરશો તો ફી રસીદ/રીમાઇન્ડરમાં UPI દેખાશે
  receiptPrefix: "GA"
};

// વિદ્યાર્થી/વાલી લોગિન માટેનું આંતરિક ડોમેન (બદલવું નહીં)
export const LOGIN_DOMAIN = "login.gandiv-academy.in";

export const isConfigured = () => !firebaseConfig.apiKey.startsWith("PASTE");
