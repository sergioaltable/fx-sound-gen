# Generador de Sonidos Avanzado

Este proyecto es un generador de sonidos Y efectos de audio avanzado, desarrollado en JavaScript, HTML y CSS. Permite crear, modificar y exportar sonidos utilizando diferentes tipos de sintetizadores, filtros, envolventes y efectos, todo desde una interfaz web intuitiva. (Desarrollo en proceso actual) 12-05-2025

## Características

- **Sintetizador configurable:** Básico, FM y Membrane.
- **Selección de forma de onda:** Senoide, cuadrada, triangular, sierra y PWM.
- **Filtros ajustables:** Paso bajo, alto, banda, notch y allpass.
- **Envolvente ADSR:** Control total sobre ataque, decaimiento, sustain y release.
- **Ecualizador de 3 bandas y peaking:** Ajuste fino de frecuencias bajas, medias y altas.
- **Efectos modulares:** Reverb, Delay (PingPong), Chorus, Distorsión, Phaser, Vibrato, Detune.
- **Exportación a WAV:** Guarda tus sonidos generados en formato de audio estándar.
- **Presets:** Guarda y carga configuraciones personalizadas.
- **Interfaz moderna y adaptable:** Compatible con dispositivos móviles y escritorio.
- **Osciloscopio en tiempo real:** Visualiza la forma de onda generada.

## Parámetros y controles

A continuación se describen los principales parámetros y controles disponibles en la aplicación:

### Sintetizador

- **Frecuencia:** Define la frecuencia fundamental del sonido (en Hz).
- **Duración:** Tiempo que dura el sonido generado (en segundos).
- **Volumen:** Nivel de salida del sonido (en decibelios).
- **Tipo de Sintetizador:** Permite elegir entre sintetizador básico, FM o Membrane.
- **Forma de Onda:** Selecciona la forma de onda base (senoide, cuadrada, triangular, sierra, PWM).

### Filtro

- **Tipo de Filtro:** Elige el tipo de filtro (paso bajo, alto, banda, notch, allpass).
- **Corte:** Frecuencia de corte del filtro (en Hz).
- **Resonancia (Q):** Intensidad de la resonancia en la frecuencia de corte.

### Envolvente ADSR

- **Attack:** Tiempo que tarda el sonido en alcanzar su volumen máximo tras pulsar reproducir (en segundos).
- **Decay:** Tiempo que tarda en bajar del máximo al nivel de sustain (en segundos).
- **Sustain:** Nivel de volumen mantenido mientras se sostiene la nota.
- **Release:** Tiempo que tarda el sonido en desaparecer tras soltar la nota (en segundos).

### Ecualizador 1 (3 Bandas)

- **Activar EQ1:** Permite activar o desactivar el ecualizador de 3 bandas.
- **Bajos:** Ajusta la frecuencia y ganancia de las frecuencias bajas.
- **Medios:** Ajusta la frecuencia central y ganancia de las frecuencias medias.
- **Agudos:** Ajusta la frecuencia y ganancia de las frecuencias altas.

### Ecualizador 2 (Peaking)

- **Activar EQ2:** Permite activar o desactivar el ecualizador peaking.
- **Frecuencia:** Frecuencia central del filtro peaking.
- **Ganancia:** Nivel de aumento o reducción en la frecuencia seleccionada.
- **Ancho (Q):** Determina el ancho de la banda afectada.

### Efectos Modulares

- **Reverb:** Añade reverberación al sonido. Controla la mezcla (Wet).
- **Delay (PingPong):** Añade eco estéreo. Controla mezcla, tiempo, feedback.
- **Desafinación (Detune):** Modifica la afinación en centésimas de tono.
- **Vibrato:** Modula la frecuencia del sonido. Controla frecuencia y profundidad.
- **Chorus:** Añade un efecto de coro. Controla frecuencia, delay y profundidad.
- **Distorsión:** Añade distorsión al sonido. Controla el nivel.
- **Phaser:** Añade un efecto de phaser. Controla frecuencia, octavas y etapas.

### Otros controles

- **Aleatorio:** Genera parámetros aleatorios para experimentar nuevos sonidos.
- **Reset:** Restaura todos los parámetros a sus valores iniciales.
- **Exportar:** Permite exportar el sonido generado en formato WAV.
- **Cargar/Guardar Preset:** Permite guardar y cargar configuraciones personalizadas.
- **Tema:** Cambia entre tema claro y oscuro.

## Instalación y uso

1. **Clona el repositorio o descarga los archivos.**
2. Abre el archivo `index.html` en tu navegador favorito.
3. Ajusta los parámetros a tu gusto.
4. Pulsa "Reproducir" para escuchar el sonido generado.
5. Puedes exportar el sonido a WAV o guardar/cargar presets.



## Créditos

- Desarrollado por: **Sergio Altable Duque**
- [Tone.js](https://tonejs.github.io/) para la síntesis y procesamiento de audio.


## Licencia

Este proyecto se distribuye bajo la licencia MIT.

---

¡Siéntete libre de contribuir, reportar problemas o sugerir mejoras!