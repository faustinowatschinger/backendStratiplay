import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const router = express.Router();
const db = getFirestore();

router.post('/progress-plan', async (req, res) => {
  console.log("Datos recibidos:", req.body); // ✅ Verifica userId, planId, informacionTema

  const { userId, planId, informacionTema } = req.body;

  // Validación de campos requeridos
  if (!userId || !planId || !informacionTema) {
    console.error("Faltan parámetros requeridos:", { userId, planId, informacionTema });
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
        Authorization: req.headers.authorization, // Usa el mismo token del usuario
      }
    });

    const nuevoPlan = responseIA.data;

    // Paso 3: Guardar nuevo plan en Firestore
    const planRef = await db.collection('planesEstudio').add({
      ...nuevoPlan,
      userId,
      fechaCreacion: new Date()
    });

    res.status(200).json({ success: true, message: 'Plan progresado correctamente' });
  } catch (error) {
    console.error('Error al progresar el plan:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export default router;