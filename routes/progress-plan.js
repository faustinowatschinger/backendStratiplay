const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const db = getFirestore();

async function progressPlan(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { userId, planId, progreso } = req.body;

  if (!userId || !planId) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('Usuario no encontrado');
    }

    const userData = userDoc.data();
    const userPlan = userData.plan || 'free';
    const maxProgresses = userPlan === 'pro' ? Infinity : userPlan === 'basic' ? 3 : 1;

    const planDoc = await db.collection('plans').doc(planId).get();
    if (!planDoc.exists) {
      throw new Error('Plan no encontrado');
    }

    const planData = planDoc.data();
    const progressCount = planData.progressCount || 0;

    if (progressCount >= maxProgresses) {
      return res.status(403).json({ success: false, message: 'Límite de progresos alcanzado' });
    }

    await db.collection('plans').doc(planId).update({
      progressCount: progressCount + 1,
      progreso,
    });

    res.status(200).json({ success: true, message: 'Plan progresado correctamente' });
  } catch (error) {
    console.error('Error al progresar el plan:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

module.exports = { progressPlan };