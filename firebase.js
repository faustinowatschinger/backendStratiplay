const admin = require('firebase-admin');
const serviceAccount = require('./config/ordo-62889-firebase-adminsdk-zl2wb-dd93e17d22.json'); // Asegúrate de proporcionar la ruta correcta a tu archivo de clave de cuenta de servicio

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://Ordo.firebaseio.com' // Reemplaza <your-database-name> con el nombre de tu base de datos
});

module.exports = admin;