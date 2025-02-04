const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const db = getFirestore();
const axios = require('axios');

async function progressPlan(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { userId, planId, informacionTema } = req.body; // Cambiar "progreso" por "informacionTema"

  // Validación de campos requeridos
  if (!userId || !planId || !informacionTema) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
  }

  try {
    // Paso 1: Eliminar el plan anterior
    await db.collection('planesEstudio').doc(planId).delete();

    // Paso 2: Generar nuevo plan con ChatGPT
    const responseIA = await axios.post('https://api.stratiplay.com/api/chat/custom-prompt', {
      informacionTema: {
        ...informacionTema,
        progreso: 'avanzado' // Añadir progreso actualizado
      }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const nuevoPlan = responseIA.data;

    // Paso 3: Guardar nuevo plan en Firestore
    const planRef = await db.collection('planesEstudio').add({
      ...nuevoPlan,
      userId,
      fechaCreacion: new Date()
    });

    res.status(200).json({ 
      success: true, 
      message: 'Plan actualizado exitosamente',
      nuevoPlanId: planRef.id 
    });

  } catch (error) {
    console.error('Error al progresar el plan:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

module.exports = { progressPlan };