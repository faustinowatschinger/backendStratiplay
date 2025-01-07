import express from 'express';
import axios from 'axios';
import admin from 'firebase-admin';
import winston from 'winston';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();
const upload = multer();
const router = express.Router();

// Inicialización de Firebase
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
        await planRef.set(planEstudio);
        logger.info('Plan de estudio guardado exitosamente en la subcolección del usuario');
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
        informacionTema = req.body.informacionTema; // Asegúrate de acceder correctamente a informacionTema
    } catch (error) {
        logger.error('Error al analizar informacionTema:', error.message);
        return res.status(400).json({ error: 'informacionTema no es un JSON válido' });
    }

    if (!informacionTema || !informacionTema.campo || !informacionTema.nivelIntensidad) {
        logger.error('Campos obligatorios faltantes: campo y nivelIntensidad.');
        return res.status(400).json({ error: 'Campos obligatorios faltantes: campo y nivelIntensidad.' });
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
            -Elo (Ten muy en cuenta el elo del jugador para crear tareas a corde a su nivel)
            -Conocimientos previos (Ten muy en cuenta los conocimientos previos del jugador para crear tareas a corde a sus conocimientos y reforzarlos)`
        } 
        else if (informacionTema.campo === 'Poker Texas Holdem') {
            contentSystem += `
            -Tipo de Poker
            -Límite de mesas`
        }               
        let promptContent = `uid del usuario: ${uid}
        Campo a estudiar: ${informacionTema.campo}, 
        Nivel intensidad: ${informacionTema.nivelIntensidad},
        Días de estudio: ${informacionTema.diasEstudio?.length > 0 ? informacionTema.diasEstudio.join(', ') : 'No especificado'},
        Horas de estudio por dia: ${informacionTema.diasEstudio?.length > 0 ? informacionTema.diasEstudio.map(dia => `${dia}: ${informacionTema.horasEstudio?.[dia] || 'No especificado'}`).join(', ') : 'No especificado'},
        Tareas completadas: ${informacionTema.tareasCompletadas?.map(tarea => tarea.titulo).join(', ') || 'Ninguna'},
        Objetivos completados: ${informacionTema.objetivosCompletados?.map(objetivo => objetivo.titulo).join(', ') || 'Ninguno'},
        Progreso del usuario: ${informacionTema.progreso},
        Necesito un plan de estudio detallado teniendo en cuenta toda la informacion proporcionada, organizando días, incluyendo objetivos claros y tareas específicas. Cada tarea debe tener:
        - Descripción detallada de lo que se debe estudiar.
        - Fuentes recomendadas (libros, videos, blogs, herramientas, etc.).
        - Ejercicios prácticos y evaluaciones para medir el progreso.
        - Tiene que poder realizarse en el tiempo disponible y ser realista.
        Para realizar las tareas y los objetivos debes tener en cuenta la experiencia, conocimientos del usuario y adaptar el plan a su nivel.`;

        if (informacionTema.campo === 'Ajedrez') {
            console.log(`Informacion de ajedrez enviada por el usuario: - Experiencia del jugador: ${informacionTema.experienciaAjedrez || 'No especificado'}.
            ${informacionTema.experienciaAjedrez === 'Elo online' ? `- Elo chess.com/lichess del jugador: ${informacionTema.elo || 'No especificado'}.` : `- Elo fide del jugador: ${informacionTema.elo || 'No especificado'}.`}
            - Tiempo de juego preferido: ${informacionTema.tiempo || 'No especificado'}.
            - Conocimientos previos: ${informacionTema.conocimientosAjedrez || 'No especificado'}.`)
            promptContent += `
            Información específica para Ajedrez:
            - Experiencia del jugador: ${informacionTema.experienciaAjedrez || 'No especificado'}.
            ${informacionTema.experienciaAjedrez === 'Elo online' ? `- Elo chess.com/lichess del jugador: ${informacionTema.elo || 'No especificado'}.` : `- Elo fide del jugador: ${informacionTema.elo || 'No especificado'}.`}
            - Tiempo de juego preferido: ${informacionTema.tiempo || 'No especificado'}.
            - Conocimientos previos: ${informacionTema.conocimientosAjedrez || 'No especificado'}.

            Crea un plan para mejorar el rendimiento en ajedrez considerando:
            1. Aperturas: Estudios específicos como Apertura Española, Defensa Siciliana, etc., alineados al elo y tiempo del usuario.
            2. Táctica: Ejercicios para mejorar combinaciones y cálculos rápidos.
            3. Estrategia y planes en el medio juego.
            4. Finales: Estudios de finales esenciales como rey y peones, torres, y finales complejos.
            5. Análisis de partidas propias y ajenas para identificar patrones y errores.

            Recursos sugeridos:
            - Chess.com, Lichess.org, Chessable.
            - Libros: "100 Finales que debes saber", "Mi sistema".
            - Videos de instructores reconocidos.
            - Herramientas como Stockfish y Lichess Analysis Board.`;
        } else if (informacionTema.campo === 'Poker Texas Holdem') {
            promptContent += `
            Información específica para Poker Texas Holdem:
            - Tipo de Poker: ${informacionTema.tipoPoker || 'No especificado'}.
            - Límite de mesas: ${informacionTema.limiteMesa || 'No especificado'}.
        
            Crea un plan para mejorar habilidades en Poker Texas Holdem considerando:
            1. Juego Preflop: Rangos de manos iniciales y estrategias óptimas.
            2. Juego Postflop: Conceptos como continuation bets, apuestas de valor, faroles y control del bote.
            3. Probabilidades y cálculos: Práctica con herramientas como Flopzilla y Equilab.
            4. Estrategias avanzadas: Adaptación en torneos, cash games y Sit and Go.
            5. Análisis de manos jugadas: Evaluaciones para corregir errores y optimizar decisiones futuras.
        
            Recursos sugeridos:
            - PokerStars School, Upswing Poker, Run It Once.
            - Libros como "The Theory of Poker" y "Harrington on Hold'em".
            - Videos y simulaciones.
            - Herramientas como PioSolver y GTO+.`;
        }
        promptContent += `Por favor, asegúrate de que el plan de estudio sea claro, detallado, fácil de seguir y contenga pasos accionables para que el usuario pueda mejorar continuamente.`;

        logger.info('Prompt content:', promptContent);

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {  
                model: "gpt-4o",
                messages: [
                    {
                        role: 'system',
                        content: contentSystem
                        
                    },
                    {
                        role: 'user',
                        content: truncateString(promptContent, 1000),
                    }
                ],
                functions: [
                    {
                        name: "generate_study_plan",
                        description: "Genera un plan de estudio personalizado basado en los datos proporcionados.",
                        parameters: {
                            type: "object",
                            properties: {
                                campoEstudio: { type: "string", description: "El campo de estudio." },
                                subCampoEstudio: { type: "string", description: "El subcampo de estudio." },
                                nivelExperiencia: { type: "string", description: "Nivel de experiencia en el tema." },
                                experiencia: { type: "string", description: "Experiencia previa del usuario." },
                                nivelIntensidad: { type: "string", description: "Nivel de intensidad del plan de estudio." },
                                diasEstudio: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Días disponibles para estudiar."
                                },
                                horasEstudio: {
                                    type: "object",
                                    additionalProperties: { type: "number" },
                                    description: "Horas de estudio por día."
                                },
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
                                                        contenido: { type: "string", description: "Fuentes de información para realizar la tarea (libros, videos, blogs, etc.)." },
                                                        tiempo: { type: "number", description: "Tiempo estimado para completar la tarea en minutos." },
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
            }
        );

        logger.info('Response from OpenAI:', response.data);

        let responseData;
        try {
            const functionCall = response.data.choices[0].message.function_call;
            if (functionCall && functionCall.arguments) {
                responseData = JSON.parse(functionCall.arguments);
                logger.info('Response data:', responseData);

                await guardarPlanEstudio(uid, {
                    ...responseData,
                });

                return res.json({
                    ...responseData,
                });
            } else {
                throw new Error('La respuesta de OpenAI no contiene una llamada a función válida');
            }
        } catch (parseError) {
            logger.error('Error al analizar la respuesta de OpenAI:', parseError.message);
            return res.status(500).json({ error: 'Error al analizar la respuesta de OpenAI', details: parseError.message });
        }
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

router.get('/obtener-plan/:planId', async (req, res) => {
    const { planId } = req.params;

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
        const planRef = userRef.collection('planesEstudio').doc(planId);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            throw new Error('El plan de estudio no existe');
        }

        const planData = planDoc.data();
        return res.json(planData);
    } catch (error) {
        logger.error('Error al obtener el plan de estudio:', error.message);
        return res.status(500).json({ error: 'Error al obtener el plan de estudio', details: error.message });
    }
});

export default router;
