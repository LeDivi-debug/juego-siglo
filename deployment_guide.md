# 🚀 Guía de Despliegue: Juego Siglo

Sigue estos pasos para poner tu juego online y compartirlo con el mundo.

## Paso 1: Crear una cuenta en GitHub
1. Ve a [GitHub](https://github.com/) y regístrate.
2. Crea un **Nuevo Repositorio** (New Repository).
3. Ponle un nombre (ej: `juego-siglo`) y déjalo como **Público**.
4. Dale a "Create repository".

## Paso 2: Subir tus archivos
Como no tienes experiencia con comandos de consola, usaremos la opción más fácil:
1. En la página de tu nuevo repositorio, haz clic en **"uploading an existing file"**.
2. **Arrastra y suelta** todos los archivos de tu carpeta `Juego Siglo` (excepto la carpeta `node_modules` si la ves, aunque el archivo `.gitignore` que creamos evitará que se suba).
3. Haz clic en **"Commit changes"**. Ya tienes tu código en la nube.

## Paso 3: Conectar a Render (Hosting Gratis)
1. Ve a [Render.com](https://render.com/) y crea una cuenta (puedes usar tu cuenta de GitHub para entrar rápido).
2. Haz clic en **"New +"** y elige **"Web Service"**.
3. Conecta tu cuenta de GitHub y selecciona el repositorio `juego-siglo`.
4. En la configuración:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (o déjalo vacío, Render leerá tu `package.json`).
5. Elige el plan **Free** y dale a **"Create Web Service"**.

## Paso 4: ¡A Jugar!
Render tardará unos minutos en "cocinar" tu juego. Cuando termine, te dará una URL (ej: `https://juego-siglo.onrender.com`).

**¡Esa es la URL que puedes pasarle a tus amigos para jugar desde cualquier lugar!** 🌍
