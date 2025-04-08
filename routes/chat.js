import express from 'express';
import axios from 'axios';
import admin from 'firebase-admin';
import winston from 'winston';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();
const upload = multer();
const router = express.Router();

import serviceAccount from '../config/ordo-62889-firebase-adminsdk-zl2wb-dd93e17d22.json' assert { type: 'json' };
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

// Logger de errores
const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});


const actualizarEstadoTarea = async (uid, planId, diaIndex, tareaIndex, nuevoEstado, nuevaPrioridad) => {
    try {
        const userRef = db.collection('usuarios').doc(uid);
        const planRef = userRef.collection('planesEstudio').doc(planId);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            throw new Error('El plan de estudio no existe');
        }

        const planData = planDoc.data();
        if (nuevoEstado) {
            planData.planEstudio[diaIndex].tareas[tareaIndex].estado = nuevoEstado;
        }
        if (nuevaPrioridad) {
            planData.planEstudio[diaIndex].tareas[tareaIndex].prioridad = nuevaPrioridad;
        }

        await planRef.update(planData);
        logger.info('Estado y/o prioridad de la tarea actualizados exitosamente');
    } catch (error) {
        logger.error('Error al actualizar el estado y/o prioridad de la tarea:', error);
        throw new Error('Error al actualizar el estado y/o prioridad de la tarea');
    }
};

const actualizarEstadoObjetivo = async (uid, planId, objetivoIndex, nuevoEstado) => {
    try {
        const userRef = db.collection('usuarios').doc(uid);
        const planRef = userRef.collection('planesEstudio').doc(planId);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            throw new Error('El plan de estudio no existe');
        }

        const planData = planDoc.data();
        if (nuevoEstado) {
            planData.objetivos[objetivoIndex].estado = nuevoEstado;
        }

        await planRef.update(planData);
        logger.info('Estado del objetivo actualizado exitosamente');
    } catch (error) {
        logger.error('Error al actualizar el estado del objetivo:', error);
        throw new Error('Error al actualizar el estado del objetivo');
    }
};
// Función para truncar el string
const truncateString = (str, maxLength) => {
    if (!str) return "";
    if (str.length <= maxLength) return str;
    const truncated = str.slice(0, maxLength).split(" ").slice(0, -1).join(" ");
    logger.warn("Prompt truncado:", truncated);
    return truncated + "...";
};

// Función para guardar los datos en Firestore
const guardarPlanEstudio = async (uid, planEstudio) => {
    try {
        const userRef = db.collection('usuarios').doc(uid);
        const planRef = userRef.collection('planesEstudio').doc();
        const createdAt = new Date().toISOString();
        // Combina el plan original con el campo createdAt
        const planConFecha = {
            ...planEstudio,
            createdAt
        };
        await planRef.set(planConFecha);
        logger.info('Plan de estudio guardado exitosamente en la subcolección del usuario');
        // Retornamos el id del plan y el objeto completo (incluyendo createdAt)
        return { id: planRef.id, ...planConFecha };
    } catch (error) {
        logger.error('Error al guardar el plan de estudio en la subcolección:', error);
        throw new Error('Error al guardar el plan de estudio');
    }
};


const eliminarPlanEstudio = async (uid, planId) => {
    try {
        const userRef = db.collection('usuarios').doc(uid);
        const planRef = userRef.collection('planesEstudio').doc(planId);
        await planRef.delete();
        logger.info('Plan de estudio eliminado exitosamente');
    } catch (error) {
        logger.error('Error al eliminar el plan de estudio:', error);
        throw new Error('Error al eliminar el plan de estudio');
    }
};


// ...existing code...

router.post('/custom-prompt', async (req, res) => {
    let informacionTema;
    try {
        informacionTema = req.body.informacionTema;
        console.log('Received informacionTema:', informacionTema);
    } catch (error) {
        logger.error('Error al analizar informacionTema:', error.message);
        return res.status(400).json({ error: 'informacionTema no es un JSON válido' });
    }

    if (!informacionTema || !informacionTema.campo || !informacionTema.nivelIntensidad) {
        logger.error('Campos obligatorios faltantes: campoEstudio y nivelIntensidad.');
        return res.status(400).json({ error: 'Campos obligatorios faltantes: campoEstudio y nivelIntensidad.' });
    }

    let uid;
    try {
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            throw new Error('Token no proporcionado');
        }
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;
        if (!uid) {
            throw new Error('El token no contiene un UID');
        }
    } catch (error) {
        logger.error('Error al verificar el token:', error.message);
        return res.status(401).json({ error: 'Autenticación fallida: ' + error.message });
    }

    try {

        // Convierte una cadena del formato "lunes: 1, miercoles: 1, martes: 1, jueves: 1, viernes: 1" en un objeto
const parseHorasString = (horasStr) => {
    if (typeof horasStr !== 'string' || horasStr.trim() === '') {
      return {};
    }
    const obj = {};
    // Separa cada par "día: valor" usando la coma
    const pairs = horasStr.split(',').map(item => item.trim());
    pairs.forEach(pair => {
      const parts = pair.split(':');
      if (parts.length === 2) {
        const dia = parts[0].trim();
        const valor = parts[1].trim();
        obj[dia] = valor;
      }
    });
    return obj;
  };
  
        // Eliminar solo el plan cuyo ID se envíe
        if (req.body.eliminarAnterior) {
            const planId = req.body.planId;
            if (!planId) {
                throw new Error('planId no proporcionado');
            }
            try {
                const userRef = db.collection('usuarios').doc(uid);
                const planRef = userRef.collection('planesEstudio').doc(planId);
                const doc = await planRef.get();
                if (!doc.exists) {
                    logger.warn(`El documento con id ${planId} no existe en planesEstudio para el usuario ${uid}`);
                } else {
                    await planRef.delete();
                    logger.info(`Plan de estudio con id ${planId} eliminado exitosamente para el usuario: ${uid}`);
                }
            } catch (error) {
                logger.error('Error al eliminar el plan de estudio:', error);
                throw new Error('Error al eliminar el plan de estudio');
            }
        }

        // Construir el prompt usando los nombres de campos correctos
        let contentSystem = `Eres un asistente que genera planes de estudio personalizados y adaptados a la informacion proporcionada por el usuario:
                        -Campo a estudiar
                        -Nivel intensidad
                        -Horas de estudio por dia
                        -Días de estudio
                        -Objetivos completados
                        -Tareas completadas
                        -Progreso`;
        if (informacionTema.campo === 'Ajedrez') {
            contentSystem += `
            -Experiencia del jugador 
            -Tiempo de juego preferido
            -Elo (Ten muy en cuenta el elo del jugador para crear tareas a acorde a su nivel)
            -Conocimientos previos (Ten muy en cuenta los conocimientos previos del jugador para crear tareas a acorde a sus conocimientos y reforzarlos)`;
        } else if (informacionTema.campo === 'Poker Texas Holdem') {
            contentSystem += `
            -Tipo de Poker
            -Límite de mesas`;
        }

        // Procesar días: Si ya es cadena, se convierte en array
let diasArray = Array.isArray(informacionTema.diasEstudio)
? informacionTema.diasEstudio
: (typeof informacionTema.diasEstudio === 'string'
    ? informacionTema.diasEstudio.split(',').map(dia => dia.trim())
    : []);

// Procesar horas: Si es objeto, se usa tal cual; si es cadena, se parsea
let horasEstudioObj;
if (typeof informacionTema.horasEstudio === 'object' && informacionTema.horasEstudio !== null) {
horasEstudioObj = informacionTema.horasEstudio;
} else if (typeof informacionTema.horasEstudio === 'string') {
horasEstudioObj = parseHorasString(informacionTema.horasEstudio);
} else {
horasEstudioObj = {};
}

let promptContent = `
  uid del usuario: ${uid}
  Campo a estudiar: ${informacionTema.campo}, 
  Nivel intensidad: ${informacionTema.nivelIntensidad},
  Días de estudio: ${diasArray.length > 0 ? diasArray.join(', ') : 'No especificado'},
  Horas de estudio por día: ${diasArray.length > 0 ? diasArray.map(dia => `${dia}: ${horasEstudioObj[dia] || 'No especificado'}`).join(', ') : 'No especificado'},
  Tareas completadas: ${Array.isArray(informacionTema.tareasCompletadas) ? informacionTema.tareasCompletadas.map(t => t.titulo).join(', ') : 'Ninguna'},
  Objetivos completados: ${Array.isArray(informacionTema.objetivosCompletados) ? informacionTema.objetivosCompletados.map(o => o.titulo).join(', ') : 'Ninguno'},
  Necesito un plan de estudio detallado teniendo en cuenta toda la información proporcionada, organizando días, incluyendo objetivos claros y tareas específicas. Cada tarea debe tener:
  - Descripción detallada de lo que se debe estudiar.
  - Fuentes recomendadas (libros, videos, blogs, herramientas, etc.).
  - Ejercicios prácticos y evaluaciones para medir el progreso.
  - Debe poder realizarse en el tiempo disponible y ser realista.
  Para realizar las tareas y los objetivos, adapta el plan al nivel y experiencia del usuario.
`;


        if (informacionTema.campo === 'Ajedrez') {
            promptContent += `
            Información específica para Ajedrez:
            - Experiencia del jugador: ${informacionTema.experienciaAjedrez || 'No especificado'}.
            - Quiero que tengas en cuenta esta lista de elo:
            Principiante: ELO inferior a 1200
            (Se asume que aún está aprendiendo conceptos básicos como la mecánica de las aperturas, movimientos y tácticas elementales.)

            Intermedio: ELO entre 1200 y 1600
            (El jugador ya domina las tácticas básicas, conoce varias aperturas y tiene una comprensión general de la estrategia, pero aún puede mejorar en aspectos más complejos.)

            Avanzado: ELO entre 1600 y 2000
            (El jugador tiene un buen conocimiento de la estrategia, sabe planificar en el medio juego y manejar situaciones de presión, pero aún puede pulir ciertos detalles.)

            Experto: ELO superior a 2000
            (El jugador posee un dominio considerable del juego, entiende profundamente la estrategia, la táctica y tiene una alta capacidad para el análisis de partidas.)
            ${informacionTema.experienciaAjedrez === 'Elo online' ? `- Elo chess.com/lichess del jugador: ${informacionTema.elo || 'No especificado'}.` : `- Elo fide del jugador: ${informacionTema.elo || 'No especificado'}.`}
            - Tiempo de juego preferido: ${informacionTema.tiempo || 'No especificado'}.
            - Conocimientos previos: ${informacionTema.conocimientosAjedrez || 'No especificado'}.
            
            Crea un plan para mejorar el rendimiento en ajedrez considerando:
            1. Aperturas.
            2. Táctica.
            3. Estrategia y planes en el medio juego.
            4. Finales.
            5. Análisis de partidas.
            
            Recursos sugeridos:
            - Chess.com, Lichess.org, Chessable.
            - Libros: "100 Finales que debes saber", "Mi sistema".
            - Videos y herramientas de análisis.`;
        } else if (informacionTema.campo === 'Poker Texas Holdem') {
            promptContent += `
            Información específica para Poker Texas Holdem:
            - Tipo de Poker: ${informacionTema.tipoPoker || 'No especificado'}.
            - Límite de mesas: ${informacionTema.limiteMesa || 'No especificado'}.
            - Conocimientos previos: ${informacionTema.conocimientosPoker || 'No especificado'}.
            
            Crea un plan para mejorar habilidades en Poker Texas Holdem considerando:
            1. Juego Preflop.
            2. Juego Postflop.
            3. Probabilidades y cálculos.
            4. Estrategias avanzadas.
            5. Análisis de manos.
            
            Recursos sugeridos:
            - PokerStars School, Upswing Poker, Run It Once.
            - Libros y videos especializados.`;
        }
        promptContent += `Por favor, asegúrate de que el plan de estudio sea claro, detallado, fácil de seguir y contenga pasos accionables para que el usuario pueda mejorar continuamente.`;

        logger.info('Prompt content:', promptContent);

        const openAIResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {  
                model: "gpt-4o",
                messages: [
                    { role: 'system', content: contentSystem },
                    { role: 'user', content: truncateString(promptContent, 1000) }
                ],
                functions: [
                    {
                        name: "generate_study_plan",
                        description: "Genera un plan de estudio personalizado basado en los datos proporcionados.",
                        parameters: {
                            type: "object",
                            properties: {
                                planEstudio: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            descripcion: { type: "string", description: "Descripción general." },
                                            dia: { type: "string", description: "Día de la semana." },
                                            tareas: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        titulo: { type: "string", description: "Título de la tarea." },
                                                        descripcion: { type: "string", description: "Descripción detallada de la tarea." },
                                                        contenido: { type: "string", description: "Fuentes de información para realizar la tarea." },
                                                        tiempo: { type: "number", description: "Tiempo estimado en minutos." },
                                                        estado: { type: "string", enum: ["esperando", "enProceso", "finalizado"], description: "Estado de la tarea." },
                                                        prioridad: { type: "string", enum: ["baja", "media", "alta"], description: "Prioridad de la tarea." }
                                                    }
                                                }
                                            }
                                        },
                                        required: ["descripcion", "dia", "tareas"]
                                    }
                                },
                                objetivos: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            titulo: { type: "string", description: "Título del objetivo." },
                                            descripcion: { type: "string", description: "Descripción del objetivo." },
                                            estado: { type: "string", enum: ["esperando", "enProceso", "finalizado"], description: "Estado del objetivo." },
                                        },
                                        required: ["titulo", "descripcion"]
                                    }
                                }
                            },
                            required: ["campoEstudio", "nivelIntensidad", "diasEstudio", "horasEstudio", "planEstudio", "objetivos"]
                        }
                    }
                ],
                function_call: { name: "generate_study_plan" },
                max_tokens: 3000,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000
            }
        );

        logger.info('Response from OpenAI:', openAIResponse.data);

        let responseData;
        try {
            const functionCall = openAIResponse.data.choices[0].message.function_call;
            if (functionCall && functionCall.arguments) {
                responseData = JSON.parse(functionCall.arguments);
                logger.info('Response data:', responseData);
            } else {
                throw new Error('La respuesta de OpenAI no contiene una llamada a función válida');
            }
        } catch (parseError) {
            logger.error('Error al analizar la respuesta de OpenAI:', parseError.message);
            // Fallback: devolver un objeto con valores predeterminados para evitar que la UI falle
            responseData = { planEstudio: [], objetivos: [] };
        }

        // Agregar datos adicionales a la respuesta
        const processedDias = typeof informacionTema.diasEstudio === 'string'
  ? informacionTema.diasEstudio
  : Array.isArray(informacionTema.diasEstudio)
    ? informacionTema.diasEstudio.join(', ')
    : 'No especificado';

const processedHoras = typeof informacionTema.horasEstudio === 'string'
  ? informacionTema.horasEstudio
  : (Array.isArray(informacionTema.diasEstudio)
      ? informacionTema.diasEstudio.map(dia => `${dia}: ${informacionTema.horasEstudio[dia] || 'No especificado'}`).join(', ')
      : 'No especificado');

const additionalData = {
  campo: informacionTema.campo, 
  nivelIntensidad: informacionTema.nivelIntensidad,
  diasEstudio: processedDias,
  horasEstudio: processedHoras,
  tareasCompletadas: Array.isArray(informacionTema.tareasCompletadas) ? informacionTema.tareasCompletadas.map(t => t.titulo).join(', ') : 'Ninguna',
  objetivosCompletados: Array.isArray(informacionTema.objetivosCompletados) ? informacionTema.objetivosCompletados.map(o => o.titulo).join(', ') : 'Ninguno',
};

        if (informacionTema.campo === 'Ajedrez') {
            additionalData.experienciaAjedrez = informacionTema.experienciaAjedrez;
            additionalData.elo = informacionTema.elo;
            additionalData.tiempo = informacionTema.tiempo;
            additionalData.conocimientosAjedrez = informacionTema.conocimientosAjedrez;
        } else if (informacionTema.campo === 'Poker Texas Holdem') {
            additionalData.tipoPoker = informacionTema.tipoPoker;
            additionalData.limiteMesa = informacionTema.limiteMesa;
            additionalData.conocimientosPoker = informacionTema.conocimientosPoker;
        }

        // Combina la respuesta de OpenAI con los datos adicionales
        const planNuevo = {
            ...responseData,
            ...additionalData,
        };

        await guardarPlanEstudio(uid, planNuevo);

        return res.json(planNuevo);
    } catch (error) {
        logger.error('Error al procesar el plan de estudio:', error.message);
        return res.status(500).json({ error: 'Error al generar el plan de estudio', details: error.message });
    }
});


router.delete('/eliminar-plan/:planId', async (req, res) => {
    const { planId } = req.params;

    try {
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        await eliminarPlanEstudio(uid, planId);
        return res.status(200).json({ message: 'Plan de estudio eliminado correctamente.' });
    } catch (error) {
        logger.error('Error al eliminar el plan de estudio:', error.message);
        return res.status(500).json({ error: 'Error al eliminar el plan de estudio', details: error.message });
    }
});

router.get('/campos-estudiados', async (req, res) => {
    let uid;
    try {
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            throw new Error('Token no proporcionado');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;

        if (!uid) {
            throw new Error('El token no contiene un UID');
        }
    } catch (error) {
        logger.error('Error al verificar el token:', error.message);
        return res.status(401).json({ error: 'Autenticación fallida: ' + error.message });
    }

    try {
        const userRef = db.collection('usuarios').doc(uid);
        const planesSnapshot = await userRef.collection('planesEstudio').get();
        const camposEstudiados = planesSnapshot.docs.map(doc => doc.data().campo);

        return res.json(camposEstudiados);
    } catch (error) {
        logger.error('Error al obtener los campos estudiados:', error.message);
        return res.status(500).json({ error: 'Error al obtener los campos estudiados', details: error.message });
    }
});

router.post('/actualizar-estado-tarea', async (req, res) => {
    const { planId, diaIndex, tareaIndex, nuevoEstado, nuevaPrioridad } = req.body;

    let uid;
    try {
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            throw new Error('Token no proporcionado');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;

        if (!uid) {
            throw new Error('El token no contiene un UID');
        }
    } catch (error) {
        logger.error('Error al verificar el token:', error.message);
        return res.status(401).json({ error: 'Autenticación fallida: ' + error.message });
    }

    try {
        await actualizarEstadoTarea(uid, planId, diaIndex, tareaIndex, nuevoEstado, nuevaPrioridad);
        return res.status(200).json({ message: 'Estado y/o prioridad de la tarea actualizados correctamente.' });
    } catch (error) {
        logger.error('Error al actualizar el estado y/o prioridad de la tarea:', error.message);
        return res.status(500).json({ error: 'Error al actualizar el estado y/o prioridad de la tarea', details: error.message });
    }
});

router.post('/actualizar-estado-objetivo', async (req, res) => {
    const { planId, objetivoIndex, nuevoEstado } = req.body;

    let uid;
    try {
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            throw new Error('Token no proporcionado');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;

        if (!uid) {
            throw new Error('El token no contiene un UID');
        }
    } catch (error) {
        logger.error('Error al verificar el token:', error.message);
        return res.status(401).json({ error: 'Autenticación fallida: ' + error.message });
    }

    try {
        await actualizarEstadoObjetivo(uid, planId, objetivoIndex, nuevoEstado);
        return res.status(200).json({ message: 'Estado del objetivo actualizado correctamente.' });
    } catch (error) {
        logger.error('Error al actualizar el estado del objetivo:', error.message);
        return res.status(500).json({ error: 'Error al actualizar el estado del objetivo', details: error.message });
    }
});

// In backend/routes/chat.js, modify the /obtener-plan/:planId route
router.get('/obtener-plan/:planId', async (req, res) => {
    const { planId } = req.params;

    let uid;
    try {
        // Verify token and get uid
        const idToken = req.headers.authorization?.split(' ')[1];
        if (!idToken) {
            throw new Error('Token no proporcionado');
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;

        if (!uid) {
            throw new Error('El token no contiene un UID');
        }

        // Get plan data
        const userRef = db.collection('usuarios').doc(uid);
        const planRef = userRef.collection('planesEstudio').doc(planId);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            return res.status(404).json({ error: 'Plan de estudio no encontrado' });
        }

        const planData = planDoc.data();
        return res.json(planData);

    } catch (error) {
        logger.error('Error detallado al obtener plan:', error);
        console.error('Stack trace:', error.stack);
        return res.status(500).json({ 
            error: 'Error al obtener el plan de estudio',
            details: error.message,
            stack: error.stack
        });
    }
});

export default router;