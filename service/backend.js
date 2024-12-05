import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });
import { ArtistasConsulta, EsculturasConsulta, EventosConsulta, login, ObrasdeUnEvento, ObrasdeUnArtista, EventosYEsculturasDeObra, insertarEvento, insertarArtista, register, registrar_voto } from './conexiondb.js';
import { ordenarEsculturas, buscarEsculturas, ordenarEventos, buscarEventos, ordenarArtistas, buscarArtistas } from './filtrosObjetos.js';


//Clave para el captcha

import axios from 'axios';


const app = express();
app.use(express.json());

async function verificarCaptcha(token) {
    const secretKey = import.meta.env.VITE_RECAPTCHA_SECRET_KEY;; // Sustituye con tu clave secreta de reCAPTCHA
    const url = `https://www.google.com/recaptcha/api/siteverify`;

    try {
        const response = await axios.post(url, null, {
            params: {
                secret: secretKey,
                response: token,
            },
        });

        return response.data.success; // Devuelve true si el captcha es válido
    } catch (error) {
        console.error('Error al verificar el captcha:', error);
        return false;
    }
}

// Endpoint de votación
app.post('/api/votacion', async (req, res) => {
    const { recaptchaToken, rating, nombre, email } = req.body;

    // Llama a la función para verificar el captcha
    const captchaValido = await verificarCaptcha(recaptchaToken);
    if (!captchaValido) {
        return res.status(400).json({ success: false, message: "Captcha inválido" });
    }

    // Continúa procesando la votación si el captcha es válido
    // Ejemplo de lógica de registro de voto:
    try {
        // Simula guardar el voto en la base de datos
        console.log('Voto registrado:', { rating, nombre, email });
        res.json({ success: true, message: "Voto registrado correctamente" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

// Iniciar el servidor
app.listen(3001, () => {
    console.log("Servidor escuchando en el puerto 3001");
});



// Clave secreta para firmar el token (debería ser almacenada de forma segura, como en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET; // Cambir por algo más seguro
// const app = express();
const port = 3001;

const cache = new NodeCache();
const ttl = 1800; // 30 minutos en segundos

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Multer para manejar la carga de archivos
const storage = multer.memoryStorage(); // Guardar archivo en memoria (como buffer)
const upload = multer({ storage: storage });

// Lista de correos electrónicos de administradores
const adminEmails = ['admin1@example.com', 'admin2@example.com'];

app.use(cors()); // Permitir CORS
// Middleware para analizar el cuerpo de la solicitud (JSON)
app.use(bodyParser.json());

// Crear una función asincrónica para manejar las consultas a la base de datos
const obtenerArtistas = async (busqueda, criterio, orden) => {
  try {
    let artistasCache = cache.get('artistas');
    if (!artistasCache) {
      artistasCache = await ArtistasConsulta();
      cache.set('artistas', artistasCache, ttl);
    }

    const artistasFiltrados = buscarArtistas(artistasCache, busqueda);
    const ArtistasOrdenados = ordenarArtistas(artistasFiltrados, criterio, orden);

    const cards = [];
    for (const [index, artista] of ArtistasOrdenados.entries()) {
      // Accede a los métodos de la clase Esculturas
      const nombre = artista.getNyA();
      const imagen = artista.getURL_foto();
      const biografia = artista.getRes_biografia();
      const contacto = artista.getContacto();
      const promedio = artista.getPromedio();

      cards.push({
        id: index + 1,
        escultorPantalla: nombre.replace(/ /g, ''), 
        content: biografia,
        escultorName: nombre,
        escultorFoto: imagen,
        contactoEmail: contacto,
        promedio: promedio
      });
    }
    return cards;

  } catch (error) {
    console.error('Error al obtener artistas:', error);
    return [];
  }
};

const obtenerEsculturas = async (busqueda, criterio, orden) => {
  try {
    let esculturasCache = cache.get('esculturas');
    if (!esculturasCache) {
      esculturasCache = await EsculturasConsulta();
      cache.set('esculturas', esculturasCache, ttl);
    }

    const esculturasFiltradas = buscarEsculturas(esculturasCache, busqueda);
    const esculturasOrdenadas = ordenarEsculturas(esculturasFiltradas, criterio, orden);
    const cards = [];
    for (const [index, escultura] of esculturasOrdenadas.entries()) {
      // Accede a los métodos de la clase Esculturas
      const listaObraImagenes = escultura.getImagenes();
      const obraImagen = listaObraImagenes.map((imagen) => imagen.getURL());
      const tecnica = escultura.getTecnica();
      const obraNombre = escultura.getNombre();
      const obraArtistas = escultura.getArtistas();
      const obraArtista = obraArtistas.map((artista) => artista.getNyA());
      const obraEscultorFoto = obraArtistas.map((artista) => artista.getURL_foto());
      const obraEscultor = {
        escultoresFotos: obraEscultorFoto,
        escultoresNombre: obraArtista
      }
      const average = escultura.getPromedio();
      const fecha_creacion = escultura.getFechaCreacion();
      const promedioEstrellas = escultura.getPromedio();
      const antecedente = escultura.getAntecedente();

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedFecha_creacion = fecha_creacion.toLocaleDateString('es-ES', options);

      cards.push({
        id: index + 1,
        title: 'Carta' + (index + 1),
        obraPantalla: obraNombre.replace(/ /g, ''),
        obraImage: obraImagen,
        content: tecnica,
        obraName: obraNombre,
        obraEscultor: obraEscultor,
        promedio: average,
        f_creacion: formattedFecha_creacion,
        promedio: promedioEstrellas,
        antecedente: antecedente
      });
    }

    return cards;

  } catch (error) {
    console.error('Error al obtener esculturas:', error);
    return [];  // Retornar un array vacío en caso de error
  }
};

const obtenerEventos = async (busqueda, criterio, orden) => {
  try {
    let eventosCache = cache.get('eventos');
    if (!eventosCache) {
      eventosCache = await EventosConsulta();
      cache.set('eventos', eventosCache, ttl);
    }

    const eventosFiltrados = buscarEventos(eventosCache, busqueda);
    const eventosOrdenados = ordenarEventos(eventosFiltrados, criterio, orden);

    const cards = [];
    for (const [index, evento] of eventosOrdenados.entries()) {
      // Accede a los métodos de la clase Eventos
      const titulo = evento.getNombre();
      const fechaInicio = new Date(evento.getFechaInicio());
      const fechaFin = new Date(evento.getFechaFin());
      const tematica = evento.getTematica();
      const lugar = evento.getLugar();
      const horaInicio = evento.getHoraInicio();
      const horaFin = evento.getHoraFin();
      const promedio = evento.getPromedio();
      const options = {month: 'long', day: 'numeric' };
      const formattedFechaInicio = fechaInicio.toLocaleDateString('es-ES', options);
      const formattedFechaFin = fechaFin.toLocaleDateString('es-ES', options);

      const formattedHoraInicio = horaInicio.split(':').slice(0, 2).join(':');  // De "09:30:00" a "09:30"
      const formattedHoraFin = horaFin.split(':').slice(0, 2).join(':');        // De "15:00:00" a "15:00"


      cards.push({
        title: 'evento' + (index + 1),
        eventName: titulo,
        eventoPantalla: titulo.replace(/ /g, ''),
        eventStartDate: formattedFechaInicio,
        eventFinishDate: formattedFechaFin,
        startTime: formattedHoraInicio,
        finishTime: formattedHoraFin,
        location: lugar,
        content: tematica,
        promedio: promedio
      });
    }

    return cards;

  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return [];  // Retornar un array vacío en caso de error
  }
};

const obtenerObrasdeEvento = async (evento) => {
  try {
    const esculturasEvento = await ObrasdeUnEvento(evento);
    const esculturasOrdenadas = ordenarEsculturas(esculturasEvento, 'promedio', 'DESC');

    const cards = [];
    for (const [index, escultura] of esculturasOrdenadas.entries()) {
      // Accede a los métodos de la clase Esculturas
      const listaObraImagenes = escultura.getImagenes();
      const obraImagen = listaObraImagenes.map((imagen) => imagen.getURL());
      const tecnica = escultura.getTecnica();
      const obraNombre = escultura.getNombre();
      const obraArtistas = escultura.getArtistas();
      const obraArtista = obraArtistas.map((artista) => artista.getNyA());
      const obraEscultorFoto = obraArtistas.map((artista) => artista.getURL_foto());
      const obraEscultor = {
        escultoresFotos: obraEscultorFoto,
        escultoresNombre: obraArtista
      }
      const average = escultura.getPromedio();
      const fecha_creacion = escultura.getFechaCreacion();
      const promedioEstrellas = escultura.getPromedio();
      const antecedente = escultura.getAntecedente();

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedFecha_creacion = fecha_creacion.toLocaleDateString('es-ES', options);

      cards.push({
        id: index + 1,
        title: 'Carta' + (index + 1),
        obraPantalla: obraNombre.replace(/ /g, ''),
        obraImage: obraImagen,
        content: tecnica,
        obraName: obraNombre,
        obraEscultor: obraEscultor,
        promedio: average,
        f_creacion: formattedFecha_creacion,
        promedio: promedioEstrellas,
        antecedente: antecedente
      });
    }

    return cards;

  } catch (error) {
    console.error('Error al obtener esculturas:', error);
    return [];  // Retornar un array vacío en caso de error
  }
}

const obtenerObrasdeArtista = async (artista) => {
  try {
    const esculturasArtista = await ObrasdeUnArtista(artista);
    const esculturasOrdenadas = ordenarEsculturas(esculturasArtista, 'promedio', 'DESC');

    const cards = [];
    for (const [index, escultura] of esculturasOrdenadas.entries()) {
      // Accede a los métodos de la clase Esculturas
      const listaObraImagenes = escultura.getImagenes();
      const obraImagen = listaObraImagenes.map((imagen) => imagen.getURL());
      const tecnica = escultura.getTecnica();
      const obraNombre = escultura.getNombre();
      const average = escultura.getPromedio();
      const fecha_creacion = escultura.getFechaCreacion();
      const promedioEstrellas = escultura.getPromedio();
      const antecedente = escultura.getAntecedente();

      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedFecha_creacion = fecha_creacion.toLocaleDateString('es-ES', options);

      cards.push({
        id: index + 1,
        title: 'Carta' + (index + 1),
        obraPantalla: obraNombre.replace(/ /g, ''),
        obraImage: obraImagen,
        content: tecnica,
        obraName: obraNombre,
        promedio: average,
        f_creacion: formattedFecha_creacion,
        promedio: promedioEstrellas,
        antecedente: antecedente
      });
    }

    return cards;

  } catch (error) {
    console.error('Error al obtener esculturas:', error);
    return [];  // Retornar un array vacío en caso de error
  }
}

const obtenerArtistasyEventosdeObra = async (obra) => {
  try {
    const listas = await EventosYEsculturasDeObra(obra);

    const obraEventos = listas.listaEventos;
    const obraArtistas = listas.listaArtistas;

    const ArtistasOrdenados = ordenarArtistas(obraArtistas, 'promedio', 'DESC');
    const eventosOrdenados = ordenarEventos(obraEventos, 'promedio', 'DESC');

    const cardsArtistas = [];
    for (const [index, artista] of ArtistasOrdenados.entries()) {
      // Accede a los métodos de la clase Esculturas
      const nombre = artista.getNyA();
      const imagen = artista.getURL_foto();
      const biografia = artista.getRes_biografia();
      const contacto = artista.getContacto();
      const promedio = artista.getPromedio();

      cardsArtistas.push({
        id: index + 1,
        escultorPantalla: nombre.replace(/ /g, ''),
        content: biografia,
        escultorName: nombre,
        escultorFoto: imagen,
        contactoEmail: contacto,
        promedio: promedio
      });
    }

    const cardsEventos = [];
    for (const [index, evento] of eventosOrdenados.entries()) {
      // Accede a los métodos de la clase Eventos
      const titulo = evento.getNombre();
      const fechaInicio = new Date(evento.getFechaInicio());
      const fechaFin = new Date(evento.getFechaFin());
      const tematica = evento.getTematica();
      const lugar = evento.getLugar();
      const horaInicio = evento.getHoraInicio();
      const horaFin = evento.getHoraFin();
      const promedio = evento.getPromedio();
      const options = { month: 'long', day: 'numeric' };
      const formattedFechaInicio = fechaInicio.toLocaleDateString('es-ES', options);
      const formattedFechaFin = fechaFin.toLocaleDateString('es-ES', options);

      const formattedHoraInicio = horaInicio.split(':').slice(0, 2).join(':');  // De "09:30:00" a "09:30"
      const formattedHoraFin = horaFin.split(':').slice(0, 2).join(':');        // De "15:00:00" a "15:00"


      cardsEventos.push({
        title: 'evento' + (index + 1),
        eventName: titulo,
        eventoPantalla: titulo.replace(/ /g, ''),
        eventStartDate: formattedFechaInicio,
        eventFinishDate: formattedFechaFin,
        startTime: formattedHoraInicio,
        finishTime: formattedHoraFin,
        location: lugar,
        content: tematica,
        promedio: promedio
      });
    }

    const cards = {
      cardsArtistas: cardsArtistas, // Artistas únicos
      cardsEventos: cardsEventos  // Eventos únicos
    };

    return cards;

  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return [];  // Retornar un array vacío en caso de error
  }
};

app.get('/api/escultores/:nombre', async (req, res) => {
  const nombre = req.params.nombre; // Obtiene el nombre del parámetro de la URL
  const cards = await obtenerArtistas(nombre, 'nombre', 'DESC');; // Función para obtener un escultor específico
  const cardsObras = await obtenerObrasdeArtista(nombre)
  const respuesta = {
    escultor: cards[0],
    obras: cardsObras
  };
  res.json(respuesta);
});

// Endpoint para obtener escultores
app.get('/api/escultores', async (req, res) => {
  const searchQuery = req.query.search;
  const criterio = req.query.sortBy;
  const orden = req.query.order;
  const cards = await obtenerArtistas(searchQuery, criterio, orden);  // Esperamos a que se procesen todas las consultas
  res.json(cards);
});

// Endpoint para obtener esculturas
app.get('/api/esculturas', async (req, res) => {
  const searchQuery = req.query.search;
  const criterio = req.query.sortBy;
  const orden = req.query.order;
  const cards = await obtenerEsculturas(searchQuery, criterio, orden);  // Esperamos a que se procesen todas las consultas
  res.json(cards);
});

app.get('/api/obras/:nombre', async (req, res) => {
  const nombre = req.params.nombre; // Obtiene el nombre del parámetro de la URL
  const cardsEscultura = await obtenerEsculturas(nombre, 'nombre', 'DESC');
  const cardsArtistasYEventos = await obtenerArtistasyEventosdeObra(nombre);
  const cards = {
    cardsEscultura: cardsEscultura[0],
    cardsArtistas: cardsArtistasYEventos.cardsArtistas, // Artistas únicos
    cardsEventos: cardsArtistasYEventos.cardsEventos  // Eventos únicos
  };
  res.json(cards);
});

app.get('/api/eventos', async (req, res) => {
  const searchQuery = req.query.search;
  const criterio = req.query.sortBy;
  const orden = req.query.order;
  const cards = await obtenerEventos(searchQuery, criterio, orden);  // Esperamos a que se procesen todas las consultas
  res.json(cards);
});

app.get('/api/eventos/:nombre', async (req, res) => {
  const nombre = req.params.nombre;
  const cards = await obtenerEventos(nombre, 'nombre', 'DESC');
  const cardsObras = await obtenerObrasdeEvento(nombre);
  const respuesta = {
    evento: cards[0],
    obras: cardsObras
  };
  res.json(respuesta);
});


app.post('/api/login', (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ message: 'Por favor ingrese correo y contraseña' });
  }

  login(correo, contraseña)
    .then(conexion => {
      if (conexion && conexion.length > 0) {
        // Determinar el rol del usuario
        let role;
        if (adminEmails.includes(correo)) {
          role = 'admin';
        } else if (conexion[0].permisos === 'escultor') { // Si 'permisos' indica que es un artista
          role = 'escultor';
        } else {
          role = 'usuario';
        }

        // Crear el token con el correo y el rol determinado
        const token = jwt.sign({ correo: conexion[0].email, permisos: conexion[0].permisos,nombre:conexion[0].NyA }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ success: true, message: 'Inicio de sesión exitoso', token, role});
      } else {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
      }
    })
    .catch(error => {
      console.error('Error en la conexión:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    });
});



// Middleware para verificar token y rol
const verificarTokenYRol = (rolesPermitidos) => (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(403).json({ success: false, message: 'Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: 'Token inválido' });

    if (!rolesPermitidos.includes(decoded.role)) {
      return res.status(403).json({ success: false, message: 'No tiene permisos para acceder a esta ruta' });
    }

    req.user = decoded; // Guarda la información del usuario decodificada en la solicitud
    next();
  });
};




// Endpoint para verificar el token y obtener el correo
app.get('/api/verificar', verificarTokenYRol, (req, res) => {
    const correo = req.user.correo; // Suponiendo que el correo está en el payload del token
    res.json({ success: true, correo });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Ruta solo para administradores
app.get('/api/admin', verificarTokenYRol(['admin']), (req, res) => {
  res.json({ message: 'Acceso permitido solo para administradores' });
});

// Ruta solo para escultores
app.get('/api/escultor', verificarTokenYRol(['escultor']), (req, res) => {
  res.json({ message: 'Acceso permitido solo para escultores' });
});

// Ruta accesible tanto para escultores como para administradores
app.get('/api/escultores-y-admins', verificarTokenYRol(['escultor', 'admin']), (req, res) => {
  res.json({ message: 'Acceso permitido para escultores y administradores' });
});

app.get('/api/artista/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const artistaObra = await obtenerArtistaYObraReciente(email);

    if (!artistaObra) {
      return res.status(404).json({ success: false, message: 'Artista no encontrado o sin obras recientes' });
    }

    res.json({
      success: true,
      artista: {
        nombre: artistaObra.artistaNombre,
        dni: artistaObra.artistaDNI,
        biografia: artistaObra.biografia,
        contacto: email, // Puede que quieras incluir el contacto o eliminar este campo
      },
      obraReciente: {
        nombre: artistaObra.obraNombre,
        fechaCreacion: artistaObra.obraFechaCreacion,
        tecnica: artistaObra.tecnica,
        imagenURL: artistaObra.imagen_url
      }
    });
  } catch (error) {
    console.error("Error en el endpoint de artista:", error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


app.post('/api/registro', (req, res) => {
  const { nombreapellido, correo, contraseña } = req.body;

  if (!nombreapellido || !correo || !contraseña) {
    return res.status(400).json({ message: 'Por favor ingrese todos los campos' });
  }

  register(nombreapellido, correo, contraseña)
  .then(conexion => {
    if (conexion == 'hecho') {
      const token = jwt.sign({correo: correo, permisos: 'visitante', nombreapellido}, JWT_SECRET, {expiresIn: '1h'});
      return res.status(200).json({ success: true, message: 'Registro correcto', token});
    } else {
      return res.status(401).json({ success: false, message: 'Registro invalido'});
    }

  })
  .catch(error => {
    console.error('Error en la conexión:', error);
    if (error.code == 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'El correo ya está en uso. Por favor use uno diferente' });	
    }
    return res.status(500).json({ success: false, message: 'Error en el servidor' });
  });
});

app.post('/api/votacion', (req, res) => {
  const { rating, nombre, email } = req.body;

  if (!rating || rating == 0) {
    return res.status(400).json({ message: 'Por favor, ingrese un puntaje' });
  }

  registrar_voto(rating, nombre, email)
    .then(conexion => {
      if (conexion == 'hecho') {
        cache.del(['artistas', 'esculturas', 'eventos']);
        return res.status(200).json({ success: true, message: 'Voto realizado correctamente'});
      } else {
        return res.status(401).json({ success: false, message: 'Voto no realizado' });
      }

    })
    .catch(error => {
      console.error('Error en la conexión:', error);
      if (error.code == 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Ya votaste esta obra' });
      }
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    });
});

//InsertarEventos
app.post('/api/eventoNuevo', async (req, res) => {
  //console.log("Se llamó al insertar evento")
  const { nombre, lugar, tematica, fecha_inicio, fecha_fin, hora_inicio, hora_fin } = req.body;

  try {
    const resultado = await insertarEvento({ nombre, lugar, tematica, fecha_inicio, fecha_fin, hora_inicio, hora_fin });
    res.json({ mensaje: 'Evento creado con éxito', resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al insertar el evento en la base de datos' });
  }
});

// Endpoint para registrar un nuevo artista
app.post('/api/artistaNuevo', upload.single('imagenPerfil'), async (req, res) => {
  console.log(req.body)
  const { dni, nombre, apellido, biografia, telefono, email } = req.body;
  const imagenPerfil = req.file; // La imagen viene en 'imagenPerfil' debido a 'upload.single('imagenPerfil')'
  // Verifica si la imagen fue cargada
  if (!imagenPerfil) {
    return res.status(400).json({ error: 'La imagen de perfil es requerida' });
  }
  // Llamar a la función insertarArtista para subir la imagen y registrar al artista
  try {
    const artista = {
      DNI: dni,           // Asignar los valores con los nombres que espera tu función
      NyA: `${nombre} ${apellido}`,
      res_biografia: biografia,
      contacto: telefono,
      contrasena: email,  // Suponiendo que la contraseña es el email en este caso (deberías verificarlo)
    };
    const artistaId = await insertarArtista(artista, imagenPerfil);
    res.status(200).json({ mensaje: 'Artista registrado con éxito', artistaId });
  } catch (error) {
    console.error('Error al registrar artista:', error);
    res.status(500).json({ error: 'Hubo un error al registrar el artista' });
  }
});
