<script>
  // @ts-nocheck
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import axios from "axios";
  import CryptoJS from "crypto-js"; // Importar la librería

  let rating = 0;
  let userRole;
  let slug;
  let obra = {};
  let animate = false; // Control de animación
  let mostrandoCarga = true;
  let email;

  $: slug = $page.url.searchParams.get("slug");
  $: [name, code] = slug ? slug.replace(/\/$/, "").split("-") : [null, null];

  function decodificarToken(token) {
    try {
      const payload = token.split(".")[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error("Error al decodificar el token:", error);
      return null;
    }
  }
  function obtenerCodigoValido() {
    // Generar un token único que cambia cada minuto
    const timestamp = Math.floor(Date.now() / 60000); // Cada minuto cambia
    // Concatenar con la clave secreta y hashear
    const hashURL = import.meta.env.VITE_HASH_URLS;
    // Concatenar con la clave secreta y hashear
    const hash = CryptoJS.SHA256(`${name}-${timestamp}-${hashURL}`).toString(
      CryptoJS.enc.Base64
    );
    console.log(name);
    console.log(timestamp);
    console.log(hashURL);
    // Tomar los primeros 8 caracteres del hash
    const hashedSlug = hash.substring(0, 8);
    return hashedSlug;
  }

  // Función para actualizar el parámetro basado en la calificación
  /**
   * @param {number} value
   */
  function updateParameter(value) {
    rating = value; // Actualizamos la calificación
  }

  async function fetchVotacion(
    query = name,
    criterio = "promedio",
    orden = "DESC"
  ) {
    mostrandoCarga = true;
    try {
      const res = await axios.get(`http://localhost:3001/api/esculturas`, {
        params: {
          search: query, // Parámetro de búsqueda
          sortBy: criterio, // Criterio de ordenación (nombre, f_creacion, promedio)
          order: orden, // Orden (asc o desc)
        },
      });
      obra = res.data[0];
      const token = localStorage.getItem("token");
      email = token ? decodificarToken(token).correo : "";
      // Activa la animación
      animate = false; // Reinicia la animación
      // Usa setTimeout para permitir el reflow y luego activar la animación
      setTimeout(() => {
        animate = true; // Activa la animación
      }, 0);
    } catch (error) {
      console.log(error);
    }
    mostrandoCarga = false;
  }

  let recaptchaVerified = false;
  let recaptchaToken = "";

  // Función para verificar el captcha
  function onCaptchaSuccess() {
    recaptchaToken = token;
    recaptchaVerified = true;
  }

  async function votar(nombre) {
    if (rating === 0) {
      alert("Por favor, ingrese un puntaje");
      return;
    }

    if (!recaptchaVerified) {
      alert("Por favor, verifica el captcha antes de enviar tu votación.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/votacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          nombre,
          email,
          recaptchaToken, // Envía el token del captcha
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("¡Voto registrado correctamente!");
      } else {
        alert("Error al registrar el voto: " + data.message);
      }
    } catch (error) {
      console.error("Error al enviar la votación:", error);
      alert("Hubo un error al procesar tu votación.");
    }
  }

  function goObras() {
    window.location.href = "/obras"; // Redirigir a obras
  }

  onMount(() => {
    // Verifica el rol del usuario
    // userRole = localStorage.getItem("role");
    // if (!userRole || userRole !== "usuario") {
    //   alert("Acceso denegado. Redirigiendo a la página principal.");
    //   window.location.href = "/inicio";
    // } else {
    //   let codigoValido = obtenerCodigoValido();
    //   console.log(codigoValido);
    //   console.log(code);
    //   if (codigoValido != code) {
    //     alert(
    //       "Tiempo de votación fuera de término. Por favor volver a escanear el QR"
    //     );
    //     window.location.href = "/inicio";
    //   } else {
    //     fetchVotacion();
    //   }
    // }
    fetchVotacion();
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
</script>

<!-- Mostrar el ícono de carga solo cuando mostrandoCarga es true -->
{#if mostrandoCarga}
  <div class="loading-icon"></div>
{/if}

{#if !mostrandoCarga}
  <div class="centered-container">
    <p class="rating-text">Obra que se votará: {obra.obraName}</p>
    <div class="contenedor">
      <div class="galeria">
        {#each obra.obraImage as imagen}
          <img src={imagen} alt="Imagen" class="imagen" />
        {/each}
      </div>
    </div>
  </div>
  <div class="centered-container">
    <div>
      {#each Array(5).fill(0) as _, i}
        <button
          type="button"
          class="star {i < rating ? 'selected' : ''}"
          aria-label="Rate {i + 1} star{i === 0 ? '' : 's'}"
          on:click={() => updateParameter(i + 1)}
          on:keydown={(e) =>
            (e.key === "Enter" || e.key === " ") && updateParameter(i + 1)}
        >
          ★
        </button>
      {/each}
    </div>

    <p class="rating-text">Puntaje seleccionado: {rating}</p>

    <!-- Agregar el captcha -->
    <div
      class="g-recaptcha"
      data-sitekey="6Leb_JIqAAAAADKbaSrXx0_5F0Gb6uOlR4TqhUtY"
      data-callback="onCaptchaSuccess"
    ></div>

    <div>
      <button class="button" on:click={votar(obra.obraName)}
        >Realizar votación</button
      >
      <button class="buttonCancelar" on:click={goObras}>Cancelar</button>
    </div>
  </div>
{/if}

<style>
  .buttonCancelar {
    padding: 12px 24px;
    background-color: #ae0202; /* Color de fondo verde */
    border: none;
    border-radius: 8px; /* Bordes redondeados */
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease; /* Transición suave */
  }

  .buttonCancelar:hover {
    background-color: #86512c; /* Color más oscuro al pasar el mouse */
    transform: scale(1.05); /* Escala ligera al pasar el mouse */
  }

  .buttonCancelar:active {
    background-color: #9f6134; /* Color aún más oscuro al hacer clic */
    transform: scale(0.98); /* Efecto de reducción al hacer clic */
  }
  .button {
    padding: 12px 24px;
    background-color: #713307; /* Color de fondo verde */
    border: none;
    border-radius: 8px; /* Bordes redondeados */
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease; /* Transición suave */
  }

  .button:hover {
    background-color: #86512c; /* Color más oscuro al pasar el mouse */
    transform: scale(1.05); /* Escala ligera al pasar el mouse */
  }

  .button:active {
    background-color: #9f6134; /* Color aún más oscuro al hacer clic */
    transform: scale(0.98); /* Efecto de reducción al hacer clic */
  }

  .button:focus {
    outline: none; /* Quita el contorno por defecto */
  }

  .contenedor {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 20px; /* Padding superior adicional */
  }

  /* Contenedor de las imágenes, con flexbox */
  .galeria {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center; /* Centrar las imágenes */
  }

  /* Estilo de las imágenes */
  .imagen {
    width: 100%;
    max-width: 250px; /* Ancho máximo para que las imágenes sean responsivas */
    height: auto; /* Mantener la relación de aspecto */
    object-fit: cover;
    border-radius: 8px;
  }

  /* Contenedor principal centrado */
  .centered-container {
    display: flex;
    justify-content: center; /* Centrado horizontal */
    align-items: center; /* Centrado vertical */
    flex-direction: column; /* Asegura que los elementos se apilen verticalmente */
  }

  .star {
    font-size: 4rem;
    color: gray;
    border: none;
    background: none;
    cursor: pointer;
  }

  .star.selected {
    background: linear-gradient(
      45deg,
      rgb(255, 230, 0),
      rgb(255, 157, 0)
    ); /* Gradient from gold to orange */
    background-clip: text; /* Standard property */
    -webkit-background-clip: text; /* Webkit-prefixed for older versions of Chrome and Safari */
    -moz-background-clip: text; /* Moz-prefixed for compatibility with older Firefox versions */
    -webkit-text-fill-color: transparent; /* Webkit-prefixed for text fill compatibility */
    color: transparent; /* Fallback for browsers that don't support text fill or background-clip */
  }

  .rating-text {
    font-size: 2rem; /* Cambia el tamaño del texto */
    font-weight: bold; /* Puedes hacer el texto más grueso si lo deseas */
  }

  /* Estilos para el ícono de carga */
  .loading-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    border: 6px solid #f3f3f3;
    border-top: 6px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    z-index: 1000;
  }

  /* Animación de giro */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
