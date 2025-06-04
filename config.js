const firebaseConfig = {
  apiKey: "AIzaSyD4pX1ktMVlF_LbjrwnFH0rFtQmQ2F_yTQ",
  authDomain: "cbmerj-manutencao.firebaseapp.com",
  projectId: "cbmerj-manutencao",
  storageBucket: "cbmerj-manutencao.firebasestorage.app",
  messagingSenderId: "129732377787",
  appId: "1:129732377787:web:f24ff4eb63b36ee6d1fd9e",
  measurementId: "G-YN5CRPRD7E"
};

const MAINTENANCE_TYPES = {
    diaria: 'Diária',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
    corretiva: 'Corretiva',
    reparo: 'Reparo'
};

const EQUIPMENT_TYPES = {
    viatura: 'Viatura',
    bomba: 'Bomba d\'água',
    gerador: 'Gerador',
    motosserra: 'Motosserra',
    outros: 'Outros'
};

const EQUIPMENT_STATUS = {
    ativo: 'Ativo',
    manutencao: 'Em Manutenção',
    inativo: 'Inativo'
};

const ORGANIZATIONS = {
    gocg: 'GOCG',
    '17gbm': '17° GBM'
};

firebase.initializeApp(firebaseConfig);