// --- Variables Globales ---
let currentSynth = null;
let filter = null;
let eq1 = null;
let eq2 = null;
let vibratoEffect = null;
let reverbEffect = null;
let delayEffect = null;
let chorusEffect = null;
let distortionEffect = null;
let phaserEffect = null;

const oscilloscopeCanvas = document.getElementById("oscilloscope");
const oscilloscopeCtx = oscilloscopeCanvas.getContext("2d");
let animationFrameId = null;

const themeToggleButton = document.getElementById('themeToggleButton');
const themeIconContainer = document.getElementById('themeIconContainer');
const bodyElement = document.body;
const statusMessage = document.getElementById('statusMessage');
const statusHistory = document.getElementById('statusHistory');
const MAX_HISTORY_MESSAGES = 4; // Aumentado un poco, ajusta según veas

const playStopButton = document.getElementById('playStopButton'); // Referencia al botón Play/Stop
const playStopIconContainer = document.getElementById('playStopIconContainer');
const playStopButtonText = document.getElementById('playStopButtonText');
const resetButton = document.getElementById('resetButton'); // Referencia al botón Reset

let isPlaying = false; // Estado de reproducción
let initialControlValues = {}; // Para guardar valores iniciales para el reset

const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const stopIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>`;


// --- Funciones de Tema ---
function applyTheme(theme) {
    if (theme === 'light') {
        bodyElement.classList.add('light-theme');
        themeIconContainer.innerHTML = sunIcon;
        localStorage.setItem('synthTheme', 'light');
    } else {
        bodyElement.classList.remove('light-theme');
        themeIconContainer.innerHTML = moonIcon;
        localStorage.setItem('synthTheme', 'dark');
    }
}

function toggleTheme() {
    if (bodyElement.classList.contains('light-theme')) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('synthTheme') || 'dark';
    applyTheme(savedTheme);
}

// --- Funciones de Historial de Estado ---
let historyMessagesArray = [];

function addMessageToHistory(message) {
    if (!statusHistory) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullMessage = `[${timestamp}] ${message}`;

    historyMessagesArray.push(fullMessage); // Añade al final

    if (historyMessagesArray.length > MAX_HISTORY_MESSAGES) {
        historyMessagesArray.shift(); // Elimina el más antiguo (del principio) si se excede el límite
    }

    renderHistory();
}

function renderHistory() {
    if (!statusHistory) return;
    statusHistory.innerHTML = '';
    historyMessagesArray.forEach(msg => {
        const historyEntry = document.createElement('div');
        historyEntry.textContent = msg;
        statusHistory.appendChild(historyEntry); // Se añadirán en orden, y CSS (flex-direction: column-reverse) los mostrará invertidos
    });
    // Para asegurar que el scroll esté abajo con column-reverse, el overflow natural lo hará.
    // Si no, se puede forzar con: statusHistory.scrollTop = statusHistory.scrollHeight;
}

// --- Funciones de Reset ---
function storeInitialValues() {
    const elements = document.querySelectorAll('input[data-initial-value], select[data-initial-value], input.toggle-checkbox[data-initial-checked]');
    elements.forEach(el => {
        if (el.type === 'checkbox' && el.classList.contains('toggle-checkbox')) {
            initialControlValues[el.id] = el.dataset.initialChecked === 'true';
            const targetSelectId = el.dataset.targetSelect;
            if (targetSelectId && document.getElementById(targetSelectId)) {
                 initialControlValues[targetSelectId] = el.dataset.initialChecked === 'true' ? "1" : "0";
            }
        } else {
            initialControlValues[el.id] = el.dataset.initialValue;
        }
    });
    // console.log("Valores iniciales almacenados:", initialControlValues);
}

function resetToInitialValues() {
    Object.entries(initialControlValues).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === "checkbox" && el.classList.contains('toggle-checkbox')) {
                el.checked = (typeof value === 'boolean' ? value : value === 'true'); // value ya es boolean de storeInitialValues
                const targetSelectId = el.dataset.targetSelect;
                 if (targetSelectId) {
                    const targetSelect = document.getElementById(targetSelectId);
                    if (targetSelect) targetSelect.value = el.checked ? "1" : "0";
                }
            } else if (el.tagName === 'SELECT') {
                 el.value = value;
                 // Si es un hidden select, actualiza su checkbox correspondiente
                if(el.classList.contains('hidden-select')) {
                    const checkbox = document.querySelector(`.toggle-checkbox[data-target-select="${id}"]`);
                    if(checkbox) checkbox.checked = (value === "1");
                }
            }
            else {
                el.value = value;
            }
        }
    });
    updateUIValues();
    initializeControlStates();
    setupAudioChain(); // Reconstruir cadena de audio con valores reseteados
    statusMessage.textContent = "Valores restaurados.";
    addMessageToHistory("Valores restaurados a iniciales.");
    if (isPlaying) { // Si estaba sonando, detenerlo
        stopSound();
    }
}

// --- Fin Funciones de Reset ---

function adjustLayout() {
    const topBar = document.getElementById('top-fixed-area');
    if (topBar) {
        const topBarHeight = topBar.offsetHeight;
        document.body.style.paddingTop = `${topBarHeight + 20}px`;
    }
    if (oscilloscopeCanvas) {
        if (oscilloscopeCanvas.offsetWidth > 0 && oscilloscopeCanvas.offsetHeight > 0) {
            oscilloscopeCanvas.width = oscilloscopeCanvas.offsetWidth * window.devicePixelRatio;
            oscilloscopeCanvas.height = oscilloscopeCanvas.offsetHeight * window.devicePixelRatio;
            oscilloscopeCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }
}

function updateUIValues() {
    const ids = [
        "frequencyValue", "durationValue", "volumeValue", "cutoffValue", "filterQValue",
        "attackValue", "decayValue", "sustainValue", "releaseValue",
        "detuneValue", "vibratoFreqValue", "vibratoDepthValue",
        "eq1LowFreqValue", "eq1LowGainValue",
        "eq1MidFreqValue", "eq1MidGainValue",
        "eq1HighFreqValue", "eq1HighGainValue",
        "eq2FreqValue", "eq2GainValue", "eq2QValue",
        "reverbWetValue",
        "delayWetValue", "delayFeedbackValue", "delayTimeValue",
        "chorusFreqValue", "chorusDelayValue", "chorusDepthValue",
        "distortionLevelValue",
        "phaserFreqValue", "phaserOctavesValue", "phaserStagesValue"
    ];

    ids.forEach(id => {
        const span = document.getElementById(id);
        const inputId = id.replace("Value", "");
        const inputElement = document.getElementById(inputId);
        if (span && inputElement) {
            span.textContent = inputElement.value;
            if (inputElement.tagName === 'SELECT' && id.endsWith('Value')) {
                 span.textContent = inputElement.options[inputElement.selectedIndex].text;
            }
        }
    });
}

function setupValueListeners() {
    const elements = document.querySelectorAll('input[type="range"], select');
    elements.forEach(el => {
        el.addEventListener('input', updateUIValues);
    });
}


function setControlsDisabledState(panelOrGroupId, isDisabled) {
    const element = document.getElementById(panelOrGroupId);
    if (!element) {
        console.warn("Element not found for setControlsDisabledState:", panelOrGroupId);
        return;
    }
    const controls = element.querySelectorAll('input[type="range"], select:not(.hidden-select):not([data-target-select])');

    controls.forEach(control => {
        control.disabled = isDisabled;
        const controlGroupDiv = control.closest('.control-group');
        if (controlGroupDiv) {
            if (isDisabled) {
                controlGroupDiv.classList.add("control-disabled");
            } else {
                controlGroupDiv.classList.remove("control-disabled");
            }
        }
    });

    if (element.classList.contains('eq-panel') || element.classList.contains('effect-subgroup')) {
        if (isDisabled) {
            element.classList.add("group-disabled");
        } else {
            element.classList.remove("group-disabled");
        }
    }
    const nestedGroups = element.querySelectorAll('.eq-group, .effect-subgroup');
    nestedGroups.forEach(group => {
        if (isDisabled) {
            group.classList.add("group-disabled");
        } else {
            if(!element.classList.contains("group-disabled")) {
                 group.classList.remove("group-disabled");
            }
        }
    });
}


function disposeAudioNodes() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active'); // Asegurar que se quita al desechar
    }
    if (currentSynth) {
        currentSynth.triggerRelease(); // Asegurarse de que el sonido se detiene antes de desechar
        currentSynth.dispose();
    }
    if (vibratoEffect) vibratoEffect.dispose();
    if (filter) filter.dispose();
    if (eq1) eq1.dispose();
    if (eq2) eq2.dispose();
    if (chorusEffect) chorusEffect.dispose();
    if (distortionEffect) distortionEffect.dispose();
    if (phaserEffect) phaserEffect.dispose();
    if (reverbEffect) reverbEffect.dispose();
    if (delayEffect) delayEffect.dispose();

    currentSynth = filter = eq1 = eq2 = vibratoEffect = reverbEffect = delayEffect = chorusEffect = distortionEffect = phaserEffect = null;
}

function setupAudioChain() {
    disposeAudioNodes();

    const synthType = document.getElementById("synthType").value;
    const waveform = document.getElementById("waveform").value;
    const synthOptions = {
        volume: parseFloat(document.getElementById("volume").value),
        detune: parseInt(document.getElementById("detune").value),
        envelope: {
            attack: parseFloat(document.getElementById("attack").value),
            decay: parseFloat(document.getElementById("decay").value),
            sustain: parseFloat(document.getElementById("sustain").value),
            release: parseFloat(document.getElementById("release").value)
        },
        oscillator: { type: waveform }
    };

    switch (synthType) {
        case "fm": currentSynth = new Tone.FMSynth(synthOptions); break;
        case "membrane": currentSynth = new Tone.MembraneSynth(synthOptions); break;
        default: currentSynth = new Tone.Synth(synthOptions); break;
    }

    vibratoEffect = new Tone.Vibrato(
        parseFloat(document.getElementById("vibratoFreq").value),
        parseFloat(document.getElementById("vibratoDepth").value)
    );
    filter = new Tone.Filter({
        frequency: parseFloat(document.getElementById("cutoff").value),
        type: document.getElementById("filterType").value,
        Q: parseFloat(document.getElementById("filterQ").value)
    });

    if (document.getElementById("eq1Enabled").value === "1") {
        eq1 = new Tone.EQ3({
           low: parseFloat(document.getElementById("eq1LowGain").value),
           mid: parseFloat(document.getElementById("eq1MidGain").value),
           high: parseFloat(document.getElementById("eq1HighGain").value),
           lowFrequency: parseFloat(document.getElementById("eq1LowFreq").value),
           highFrequency: parseFloat(document.getElementById("eq1HighFreq").value)
        });
    }

    if (document.getElementById("eq2Enabled").value === "1") {
        eq2 = new Tone.Filter({
            type: 'peaking',
            frequency: parseFloat(document.getElementById("eq2Freq").value),
            gain: parseFloat(document.getElementById("eq2Gain").value),
            Q: parseFloat(document.getElementById("eq2Q").value)
        });
    }

    if (document.getElementById("chorusEnabled").value === "1") {
        chorusEffect = new Tone.Chorus({
            frequency: parseFloat(document.getElementById("chorusFreq").value),
            delayTime: parseFloat(document.getElementById("chorusDelay").value),
            depth: parseFloat(document.getElementById("chorusDepth").value),
            wet: 1
        }).start();
    }
    if (document.getElementById("distortionEnabled").value === "1") {
        distortionEffect = new Tone.Distortion({
            distortion: parseFloat(document.getElementById("distortionLevel").value),
            wet: 1
        });
    }
    if (document.getElementById("phaserEnabled").value === "1") {
        phaserEffect = new Tone.Phaser({
            frequency: parseFloat(document.getElementById("phaserFreq").value),
            octaves: parseInt(document.getElementById("phaserOctaves").value),
            stages: parseInt(document.getElementById("phaserStages").value),
            wet: 1
        });
    }
    reverbEffect = new Tone.Reverb({
        decay: 1.5,
        preDelay: 0.01,
        wet: document.getElementById("reverbEnabled").value === "1" ? parseFloat(document.getElementById("reverbWet").value) : 0
    });
    delayEffect = new Tone.PingPongDelay({
        delayTime: document.getElementById("delayTime").value,
        feedback: parseFloat(document.getElementById("delayFeedback").value),
        wet: document.getElementById("delayEnabled").value === "1" ? parseFloat(document.getElementById("delayWet").value) : 0
    });

    let currentNode = currentSynth;
    currentNode.connect(vibratoEffect); currentNode = vibratoEffect;
    currentNode.connect(filter); currentNode = filter;
    if (eq1) { currentNode.connect(eq1); currentNode = eq1; }
    if (eq2) { currentNode.connect(eq2); currentNode = eq2; }
    if (chorusEffect) { currentNode.connect(chorusEffect); currentNode = chorusEffect; }
    if (distortionEffect) { currentNode.connect(distortionEffect); currentNode = distortionEffect; }
    if (phaserEffect) { currentNode.connect(phaserEffect); currentNode = phaserEffect; }
    currentNode.connect(reverbEffect); currentNode = reverbEffect;
    currentNode.connect(delayEffect); currentNode = delayEffect;
    currentNode.toDestination();

    updateAllEffectParameters();
}

function updateAllEffectParameters() {
    if (!currentSynth) return;

    currentSynth.volume.value = parseFloat(document.getElementById("volume").value);
    if (currentSynth.detune) currentSynth.detune.value = parseInt(document.getElementById("detune").value);
    if (currentSynth.envelope) {
        currentSynth.envelope.attack = parseFloat(document.getElementById("attack").value);
        currentSynth.envelope.decay = parseFloat(document.getElementById("decay").value);
        currentSynth.envelope.sustain = parseFloat(document.getElementById("sustain").value);
        currentSynth.envelope.release = parseFloat(document.getElementById("release").value);
    }
    if (currentSynth.oscillator) currentSynth.oscillator.type = document.getElementById("waveform").value;

    if (vibratoEffect) {
        vibratoEffect.frequency.value = parseFloat(document.getElementById("vibratoFreq").value);
        vibratoEffect.depth.value = parseFloat(document.getElementById("vibratoDepth").value);
    }
    if (filter) {
        filter.frequency.value = parseFloat(document.getElementById("cutoff").value);
        filter.type = document.getElementById("filterType").value;
        filter.Q.value = parseFloat(document.getElementById("filterQ").value);
    }

    const eq1Enabled = document.getElementById("eq1Enabled").value === "1";
    if (eq1) {
        if (eq1Enabled) {
            eq1.low.value = parseFloat(document.getElementById("eq1LowGain").value);
            eq1.mid.value = parseFloat(document.getElementById("eq1MidGain").value);
            eq1.high.value = parseFloat(document.getElementById("eq1HighGain").value);
            eq1.lowFrequency.value = parseFloat(document.getElementById("eq1LowFreq").value);
            eq1.highFrequency.value = parseFloat(document.getElementById("eq1HighFreq").value);
        }
    }

    const eq2Enabled = document.getElementById("eq2Enabled").value === "1";
    if (eq2) {
        if (eq2Enabled) {
            eq2.frequency.value = parseFloat(document.getElementById("eq2Freq").value);
            eq2.gain.value = parseFloat(document.getElementById("eq2Gain").value);
            eq2.Q.value = parseFloat(document.getElementById("eq2Q").value);
        }
    }

    const chorusEnabled = document.getElementById("chorusEnabled").value === "1";
    if (chorusEffect) {
        chorusEffect.wet.value = chorusEnabled ? 1 : 0;
        if (chorusEnabled) {
            chorusEffect.frequency.value = parseFloat(document.getElementById("chorusFreq").value);
            chorusEffect.delayTime = parseFloat(document.getElementById("chorusDelay").value);
            chorusEffect.depth.value = parseFloat(document.getElementById("chorusDepth").value);
        }
    } else if (chorusEnabled) {
        setupAudioChain();
        return;
    }

    const distortionEnabled = document.getElementById("distortionEnabled").value === "1";
    if (distortionEffect) {
        distortionEffect.wet.value = distortionEnabled ? 1 : 0;
        if (distortionEnabled) {
            distortionEffect.distortion = parseFloat(document.getElementById("distortionLevel").value);
        }
    } else if (distortionEnabled) {
        setupAudioChain();
        return;
    }

    const phaserEnabled = document.getElementById("phaserEnabled").value === "1";
    if (phaserEffect) {
        phaserEffect.wet.value = phaserEnabled ? 1 : 0;
        if (phaserEnabled) {
            phaserEffect.frequency.value = parseFloat(document.getElementById("phaserFreq").value);
            phaserEffect.octaves = parseInt(document.getElementById("phaserOctaves").value);
            phaserEffect.stages = parseInt(document.getElementById("phaserStages").value);
        }
    } else if (phaserEnabled) {
        setupAudioChain();
        return;
    }

    if (reverbEffect) {
        reverbEffect.wet.value = document.getElementById("reverbEnabled").value === "1" ? parseFloat(document.getElementById("reverbWet").value) : 0;
    }
    if (delayEffect) {
        const delayEnabled = document.getElementById("delayEnabled").value === "1";
        delayEffect.wet.value = delayEnabled ? parseFloat(document.getElementById("delayWet").value) : 0;
        if (delayEnabled) {
            delayEffect.delayTime.value = document.getElementById("delayTime").value;
            delayEffect.feedback.value = parseFloat(document.getElementById("delayFeedback").value);
        }
    }
}

function updatePlayStopButton(playing) {
    isPlaying = playing;
    if (playing) {
        playStopIconContainer.innerHTML = stopIcon;
        playStopButtonText.textContent = "Detener";
        playStopButton.classList.add('playing');
        playStopButton.title = "Detener";
    } else {
        playStopIconContainer.innerHTML = playIcon;
        playStopButtonText.textContent = "Reproducir";
        playStopButton.classList.remove('playing');
        playStopButton.title = "Reproducir";
        if (statusMessage.textContent.startsWith("Reproduciendo") || statusMessage.textContent.startsWith("Configurando")) {
            statusMessage.textContent = "Listo.";
        }
    }
}

function stopSound() {
    if (currentSynth) {
        currentSynth.triggerRelease(Tone.now()); // Detener la nota actual
    }
    if (animationFrameId) { // Detener visualización
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active'); // <<< REMOVE ACTIVE CLASS

        if (oscilloscopeCtx) { // Limpiar osciloscopio
             oscilloscopeCtx.fillStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-bg').trim();
             oscilloscopeCtx.fillRect(0, 0, oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / window.devicePixelRatio);
             // Optionally draw a flat line when stopped explicitly <<< DRAW FLAT LINE
             oscilloscopeCtx.beginPath();
             oscilloscopeCtx.moveTo(0, oscilloscopeCanvas.height / (2 * window.devicePixelRatio));
             oscilloscopeCtx.lineTo(oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / (2* window.devicePixelRatio));
             oscilloscopeCtx.strokeStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-line-color').trim();
             oscilloscopeCtx.lineWidth = 1;
             oscilloscopeCtx.stroke();
        }
    }
    updatePlayStopButton(false);
    addMessageToHistory("Sonido detenido.");
}


async function handlePlayStopClick() {
    if (isPlaying) {
        stopSound();
    } else {
        // Lógica de Play
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
                addMessageToHistory("AudioContext iniciado.");
                console.log("AudioContext started by user interaction.");
            }
            statusMessage.textContent = "Configurando...";
            addMessageToHistory("Reproduciendo sonido...");
            updatePlayStopButton(true); // Actualizar botón a estado "Stop"

            if(!currentSynth) {
                 setupAudioChain();
            } else {
                updateAllEffectParameters();
            }
            updateUIValues();

            const freq = document.getElementById("frequency").value;
            const duration = parseFloat(document.getElementById("duration").value);
            const now = Tone.now();

            if (!currentSynth) {
                console.error("currentSynth no está inicializado.");
                statusMessage.textContent = "Error: Sintetizador no listo.";
                addMessageToHistory("Error: Sintetizador no listo.");
                updatePlayStopButton(false);
                return;
            }

            currentSynth.triggerAttackRelease(freq, duration, now);
            statusMessage.textContent = `Reproduciendo... ${freq}Hz`;
            visualize(currentSynth); // This now adds the 'active' class

            // El tiempo total incluye la release del envolvente
            const releaseTime = currentSynth.envelope && typeof currentSynth.envelope.release === 'number'
                                ? currentSynth.envelope.release
                                : (currentSynth.envelope && currentSynth.envelope.release && typeof currentSynth.envelope.release.value === 'number'
                                    ? currentSynth.envelope.release.value
                                    : 0.5); // Fallback a 0.5s si no se puede determinar

            const totalEffectiveTime = duration + releaseTime;

            // Programar el cambio de estado del botón después de que el sonido DEBERÍA haber terminado
            setTimeout(() => {
                // Solo cambiar si todavía está en estado 'playing' y no fue detenido manualmente
                if (isPlaying) {
                    updatePlayStopButton(false);
                    oscilloscopeCanvas.classList.remove('active'); // <<< REMOVE ACTIVE CLASS
                    // Optionally clear canvas or draw flat line here too if desired after natural stop
                     if (oscilloscopeCtx) { // Limpiar osciloscopio al finalizar naturalmente
                        oscilloscopeCtx.fillStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-bg').trim();
                        oscilloscopeCtx.fillRect(0, 0, oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / window.devicePixelRatio);
                        oscilloscopeCtx.beginPath();
                        oscilloscopeCtx.moveTo(0, oscilloscopeCanvas.height / (2 * window.devicePixelRatio));
                        oscilloscopeCtx.lineTo(oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / (2* window.devicePixelRatio));
                        oscilloscopeCtx.strokeStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-line-color').trim();
                        oscilloscopeCtx.lineWidth = 1;
                        oscilloscopeCtx.stroke();
                    }
                }
            }, totalEffectiveTime * 1000 + 300); // +300ms de buffer

        } catch (err) {
            console.error("Error al reproducir:", err);
            statusMessage.textContent = "Error: " + err.message.substring(0,50);
            addMessageToHistory("Error reproducción: " + err.message.substring(0,30));
            oscilloscopeCanvas.classList.remove('active'); // <<< REMOVE ACTIVE CLASS ON ERROR
            updatePlayStopButton(false);
        }
    }
}

function visualize(sourceNode) {
    if (!oscilloscopeCtx) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active'); // Ensure removal if context lost
        return;
    }
    if (!sourceNode || typeof sourceNode.connect !== 'function' || oscilloscopeCanvas.width === 0 || oscilloscopeCanvas.height === 0) {
        console.warn("Fuente de visualización no válida o canvas no listo/visible.");
        oscilloscopeCtx.clearRect(0, 0, oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / window.devicePixelRatio);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active'); // Ensure removal
        return;
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    const analyser = new Tone.Analyser('waveform', 1024);
    let nodeToVisualize = sourceNode;

    // Intentar conectar al final de la cadena de efectos si es posible
    if (delayEffect && delayEffect.connected) nodeToVisualize = delayEffect;
    else if (reverbEffect && reverbEffect.connected) nodeToVisualize = reverbEffect;
    else if (phaserEffect && phaserEffect.connected && document.getElementById("phaserEnabled").value === "1") nodeToVisualize = phaserEffect;
    else if (distortionEffect && distortionEffect.connected && document.getElementById("distortionEnabled").value === "1") nodeToVisualize = distortionEffect;
    else if (chorusEffect && chorusEffect.connected && document.getElementById("chorusEnabled").value === "1") nodeToVisualize = chorusEffect;
    else if (eq2 && eq2.connected && document.getElementById("eq2Enabled").value === "1") nodeToVisualize = eq2;
    else if (eq1 && eq1.connected && document.getElementById("eq1Enabled").value === "1") nodeToVisualize = eq1;
    else if (filter && filter.connected) nodeToVisualize = filter;
    else if (vibratoEffect && vibratoEffect.connected) nodeToVisualize = vibratoEffect;

    try {
        nodeToVisualize.connect(analyser);
    } catch (e) {
        console.warn("No se pudo conectar el analizador al nodo: ", nodeToVisualize, e);
        // Si falla, intentar conectar directamente del synth
        if (sourceNode !== nodeToVisualize) {
            try {
                sourceNode.connect(analyser);
            } catch (e2) {
                console.error("Fallo al conectar analizador incluso al sourceNode", e2);
                oscilloscopeCanvas.classList.remove('active'); // Ensure removal
                return; // No se puede visualizar
            }
        } else {
             oscilloscopeCanvas.classList.remove('active'); // Ensure removal
            return; // No se puede visualizar
        }
    }

    // ---> ADD ACTIVE CLASS HERE <---
    oscilloscopeCanvas.classList.add('active');

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        if (!analyser || !analyser.getValue) { // Asegurarse que el analizador sigue siendo válido
             if (animationFrameId) cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
             oscilloscopeCanvas.classList.remove('active'); // Ensure removal
             return;
        }
        const dataArray = analyser.getValue();

        // Check if sound has effectively stopped (all zeros) while still marked as playing
        const isSilent = Array.isArray(dataArray) && dataArray.every(v => Math.abs(v) < 0.01); // Threshold for silence

        if (!dataArray || dataArray.length === 0 || (isSilent && isPlaying)) {
             // Draw flat line if silent but technically still "playing" (e.g., during release tail)
            oscilloscopeCtx.fillStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-bg').trim();
            oscilloscopeCtx.fillRect(0, 0, oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / window.devicePixelRatio);
            oscilloscopeCtx.beginPath();
            oscilloscopeCtx.moveTo(0, oscilloscopeCanvas.height / (2 * window.devicePixelRatio));
            oscilloscopeCtx.lineTo(oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / (2* window.devicePixelRatio));
            oscilloscopeCtx.strokeStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-line-color').trim();
            oscilloscopeCtx.lineWidth = 1;
            oscilloscopeCtx.stroke();
             // Do NOT return here if you want the glow to persist during release tail
            // If you want glow to stop exactly when waveform goes flat, uncomment below
            // if (isSilent) {
            //     oscilloscopeCanvas.classList.remove('active');
            // }
            // return; // If uncommented above, this return stops drawing waveform
        }

        // Continue drawing the waveform if data is present
        if (dataArray && dataArray.length > 0 && !isSilent) {
            const canvasWidth = oscilloscopeCanvas.width / window.devicePixelRatio;
            const canvasHeight = oscilloscopeCanvas.height / window.devicePixelRatio;

            oscilloscopeCtx.fillStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-bg').trim();
            oscilloscopeCtx.fillRect(0, 0, canvasWidth, canvasHeight);

            oscilloscopeCtx.lineWidth = 2;
            oscilloscopeCtx.strokeStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-line-color').trim();
            oscilloscopeCtx.beginPath();

            const sliceWidth = canvasWidth / dataArray.length;
            let x = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const v = (dataArray[i] + 1) / 2;
                const y = v * canvasHeight;
                if (i === 0) oscilloscopeCtx.moveTo(x, y);
                else oscilloscopeCtx.lineTo(x, y);
                x += sliceWidth;
            }
            oscilloscopeCtx.stroke();
        }
    }
    draw();
}

function generateRandom() {
    document.getElementById("frequency").value = Math.floor(Math.random() * 1980) + 20;
    document.getElementById("duration").value = (Math.random() * 2.5 + 0.5).toFixed(1);
    document.getElementById("volume").value = Math.floor(Math.random() * 25) - 25;

    const waveforms = ["sine", "square", "triangle", "sawtooth", "pwm"];
    document.getElementById("waveform").value = waveforms[Math.floor(Math.random() * waveforms.length)];
    const synthTypes = ["synth", "fm", "membrane"];
    document.getElementById("synthType").value = synthTypes[Math.floor(Math.random() * synthTypes.length)];

    const filterTypes = ["lowpass", "highpass", "bandpass", "notch", "allpass"];
    document.getElementById("filterType").value = filterTypes[Math.floor(Math.random() * filterTypes.length)];
    document.getElementById("cutoff").value = Math.floor(Math.random() * 19980) + 20;
    document.getElementById("filterQ").value = (Math.random() * 19.9 + 0.1).toFixed(1);

    document.getElementById("attack").value = (Math.random() * 1.5).toFixed(2);
    document.getElementById("decay").value = (Math.random() * 1.5).toFixed(2);
    document.getElementById("sustain").value = (Math.random()).toFixed(2);
    document.getElementById("release").value = (Math.random() * 2.5).toFixed(2);

    ['eq1', 'eq2', 'reverb', 'delay', 'chorus', 'distortion', 'phaser'].forEach(effectIdBase => {
        const checkbox = document.getElementById(`${effectIdBase}EnabledToggle`);
        const select = document.getElementById(`${effectIdBase}Enabled`);
        const enabled = Math.random() > 0.5;

        if (checkbox && select) {
            checkbox.checked = enabled;
            select.value = enabled ? "1" : "0";
            let panelId;
            if (effectIdBase.startsWith('eq')) {
                panelId = `${effectIdBase}PanelContainer`;
            } else {
                panelId = `effect${effectIdBase.charAt(0).toUpperCase() + effectIdBase.slice(1)}Panel`;
            }
            setControlsDisabledState(panelId, !enabled);
        }

        if (enabled) {
            switch (effectIdBase) {
                case 'eq1':
                    document.getElementById("eq1LowFreq").value = Math.floor(Math.random() * 480) + 20;
                    document.getElementById("eq1LowGain").value = Math.floor(Math.random() * 24) - 12;
                    document.getElementById("eq1MidFreq").value = Math.floor(Math.random() * 4800) + 200;
                    document.getElementById("eq1MidGain").value = Math.floor(Math.random() * 24) - 12;
                    document.getElementById("eq1HighFreq").value = Math.floor(Math.random() * 19000) + 1000;
                    document.getElementById("eq1HighGain").value = Math.floor(Math.random() * 24) - 12;
                    break;
                case 'eq2':
                    document.getElementById("eq2Freq").value = Math.floor(Math.random() * 19980) + 20;
                    document.getElementById("eq2Gain").value = Math.floor(Math.random() * 24) - 12;
                    document.getElementById("eq2Q").value = (Math.random() * 19.9 + 0.1).toFixed(1);
                    break;
                case 'reverb':
                    document.getElementById("reverbWet").value = (Math.random()).toFixed(2);
                    break;
                case 'delay':
                    document.getElementById("delayWet").value = (Math.random()).toFixed(2);
                    const delayTimes = ["8n", "4n", "2n", "1n", "8t", "16n"];
                    document.getElementById("delayTime").value = delayTimes[Math.floor(Math.random() * delayTimes.length)];
                    document.getElementById("delayFeedback").value = (Math.random() * 0.8).toFixed(2);
                    break;
                case 'chorus':
                    document.getElementById('chorusFreq').value = (Math.random() * 5 + 0.5).toFixed(1);
                    document.getElementById('chorusDelay').value = (Math.random() * 8 + 1).toFixed(1);
                    document.getElementById('chorusDepth').value = (Math.random() * 0.8 + 0.1).toFixed(2);
                    break;
                case 'distortion':
                     document.getElementById('distortionLevel').value = (Math.random() * 0.8 + 0.1).toFixed(2);
                    break;
                case 'phaser':
                    document.getElementById('phaserFreq').value = (Math.random() * 2 + 0.1).toFixed(2);
                    document.getElementById('phaserOctaves').value = Math.floor(Math.random() * 5) + 1;
                    document.getElementById('phaserStages').value = Math.floor(Math.random() * 18) + 2;
                    break;
            }
        }
    });

    document.getElementById("detune").value = Math.floor(Math.random() * 200) - 100;
    document.getElementById("vibratoFreq").value = (Math.random() * 19.9 + 0.1).toFixed(1);
    document.getElementById("vibratoDepth").value = (Math.random()).toFixed(2);

    updateUIValues();
    setupAudioChain();
    addMessageToHistory("Valores aleatorios generados.");
    if (isPlaying) stopSound(); // Detener si estaba sonando
    handlePlayStopClick(); // Iniciar reproducción con nuevos valores
}

async function handleExportClick() {
     try {
        if (isPlaying) stopSound(); // Detener reproducción si está activa
        if (Tone.context.state !== 'running') await Tone.start();
        statusMessage.textContent = "Exportando WAV...";
        addMessageToHistory("Exportando WAV...");
        await new Promise(resolve => setTimeout(resolve, 50));
        await exportWav();
        statusMessage.textContent = "WAV exportado.";
        addMessageToHistory("WAV exportado con éxito.");
    } catch (err) {
        console.error("Error al exportar:", err);
        statusMessage.textContent = "Error en exportación.";
        addMessageToHistory("Error exportación WAV.");
        showModalMessage("Error al exportar el archivo WAV: " + err.message);
    }
}

async function exportWav() {
    const duration = parseFloat(document.getElementById("duration").value);
    const releaseTime = parseFloat(document.getElementById("release").value) || 0;
    const totalDuration = duration + releaseTime + 0.2;

    const buffer = await Tone.Offline(async (offlineContext) => {
        const synthType = document.getElementById("synthType").value;
        const waveform = document.getElementById("waveform").value;
        const synthOptions = {
            context: offlineContext,
            volume: parseFloat(document.getElementById("volume").value),
            detune: parseInt(document.getElementById("detune").value),
            envelope: {
                attack: parseFloat(document.getElementById("attack").value),
                decay: parseFloat(document.getElementById("decay").value),
                sustain: parseFloat(document.getElementById("sustain").value),
                release: parseFloat(document.getElementById("release").value)
            },
            oscillator: { type: waveform }
        };
        let offlineSynth;
        switch (synthType) {
            case "fm": offlineSynth = new Tone.FMSynth(synthOptions); break;
            case "membrane": offlineSynth = new Tone.MembraneSynth(synthOptions); break;
            default: offlineSynth = new Tone.Synth(synthOptions); break;
        }

        const offlineVibrato = new Tone.Vibrato({ context: offlineContext, frequency: parseFloat(document.getElementById("vibratoFreq").value), depth: parseFloat(document.getElementById("vibratoDepth").value) });
        const offlineFilter = new Tone.Filter({ context: offlineContext, frequency: parseFloat(document.getElementById("cutoff").value), type: document.getElementById("filterType").value, Q: parseFloat(document.getElementById("filterQ").value) });

        let offlineEq1, offlineEq2, offlineChorus, offlineDistortion, offlinePhaser, offlineReverb, offlineDelay;

        if (document.getElementById("eq1Enabled").value === "1") {
            offlineEq1 = new Tone.EQ3({ context: offlineContext, low: parseFloat(document.getElementById("eq1LowGain").value), mid: parseFloat(document.getElementById("eq1MidGain").value), high: parseFloat(document.getElementById("eq1HighGain").value), lowFrequency: parseFloat(document.getElementById("eq1LowFreq").value), highFrequency: parseFloat(document.getElementById("eq1HighFreq").value) });
        }
        if (document.getElementById("eq2Enabled").value === "1") {
            offlineEq2 = new Tone.Filter({ context: offlineContext, type: 'peaking', frequency: parseFloat(document.getElementById("eq2Freq").value), gain: parseFloat(document.getElementById("eq2Gain").value), Q: parseFloat(document.getElementById("eq2Q").value) });
        }
        if (document.getElementById("chorusEnabled").value === "1") {
            offlineChorus = new Tone.Chorus({ context: offlineContext, frequency: parseFloat(document.getElementById("chorusFreq").value), delayTime: parseFloat(document.getElementById("chorusDelay").value), depth: parseFloat(document.getElementById("chorusDepth").value), wet: 1 }).start(0);
        }
        if (document.getElementById("distortionEnabled").value === "1") {
            offlineDistortion = new Tone.Distortion({ context: offlineContext, distortion: parseFloat(document.getElementById("distortionLevel").value), wet: 1 });
        }
        if (document.getElementById("phaserEnabled").value === "1") {
            offlinePhaser = new Tone.Phaser({ context: offlineContext, frequency: parseFloat(document.getElementById("phaserFreq").value), octaves: parseInt(document.getElementById("phaserOctaves").value), stages: parseInt(document.getElementById("phaserStages").value), wet: 1 });
        }

        offlineReverb = new Tone.Reverb({ context: offlineContext, decay: 1.5, preDelay: 0.01, wet: document.getElementById("reverbEnabled").value === "1" ? parseFloat(document.getElementById("reverbWet").value) : 0 });
        offlineDelay = new Tone.PingPongDelay({ context: offlineContext, delayTime: document.getElementById("delayTime").value, feedback: parseFloat(document.getElementById("delayFeedback").value), wet: document.getElementById("delayEnabled").value === "1" ? parseFloat(document.getElementById("delayWet").value) : 0 });

        let currentOfflineNode = offlineSynth;
        currentOfflineNode.connect(offlineVibrato); currentOfflineNode = offlineVibrato;
        currentOfflineNode.connect(offlineFilter); currentOfflineNode = offlineFilter;
        if (offlineEq1) { currentOfflineNode.connect(offlineEq1); currentOfflineNode = offlineEq1; }
        if (offlineEq2) { currentOfflineNode.connect(offlineEq2); currentOfflineNode = offlineEq2; }
        if (offlineChorus) { currentOfflineNode.connect(offlineChorus); currentOfflineNode = offlineChorus; }
        if (offlineDistortion) { currentOfflineNode.connect(offlineDistortion); currentOfflineNode = offlineDistortion; }
        if (offlinePhaser) { currentOfflineNode.connect(offlinePhaser); currentOfflineNode = offlinePhaser; }
        currentOfflineNode.connect(offlineReverb); currentOfflineNode = offlineReverb;
        currentOfflineNode.connect(offlineDelay); currentOfflineNode = offlineDelay;
        currentOfflineNode.toDestination();

        offlineSynth.triggerAttackRelease(document.getElementById("frequency").value, duration, 0);

    }, totalDuration);

    const wavBlob = bufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement("a");
    a.style.display = 'none'; a.href = url; a.download = `sonido_generado_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
}

function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArray = new ArrayBuffer(length),
        view = new DataView(bufferArray),
        channels = [],
        sampleRate = buffer.sampleRate;
    let offset = 0;
    const writeString = (str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i)); };

    writeString("RIFF");
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numOfChan, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
    view.setUint16(offset, numOfChan * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString("data");
    view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;

    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
    for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numOfChan; c++) {
            const sample = Math.max(-1, Math.min(1, channels[c][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
    }
    return new Blob([view], { type: "audio/wav" });
}

function exportPreset() {
    if (isPlaying) stopSound();
    const preset = {};
    const elements = document.querySelectorAll('input[type="range"], input[type="number"], input.toggle-checkbox, select');
    elements.forEach(el => {
        if (el.id) {
            if (el.type === "checkbox" && el.classList.contains('toggle-checkbox')) {
                preset[el.id] = el.checked;
                const targetSelectId = el.dataset.targetSelect;
                if (targetSelectId && document.getElementById(targetSelectId)) {
                     preset[targetSelectId] = document.getElementById(targetSelectId).value;
                }
            } else if (el.type === "range" || el.type === "number") {
                preset[el.id] = parseFloat(el.value);
            } else if (el.tagName === 'SELECT') {
                preset[el.id] = el.value;
            }
        }
    });

    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `synth_preset_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    statusMessage.textContent = "Preset guardado.";
    addMessageToHistory("Preset guardado.");
}

function importPreset(event) {
    if (isPlaying) stopSound();
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const preset = JSON.parse(e.target.result);
            Object.entries(preset).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === "checkbox" && el.classList.contains('toggle-checkbox')) {
                        el.checked = value;
                        const targetSelectId = el.dataset.targetSelect;
                        if (targetSelectId) {
                            const targetSelect = document.getElementById(targetSelectId);
                            if (targetSelect) targetSelect.value = el.checked ? "1" : "0";
                        }
                    } else if (el.tagName === 'SELECT') {
                        el.value = value;
                        if (el.classList.contains('hidden-select')) {
                             const checkbox = document.querySelector(`.toggle-checkbox[data-target-select="${id}"]`);
                             if(checkbox) checkbox.checked = (value === "1");
                        }
                    }
                    else {
                        el.value = value;
                    }
                }
            });
            updateUIValues();
            initializeControlStates();
            statusMessage.textContent = "Preset cargado.";
            addMessageToHistory("Preset cargado: " + file.name.substring(0, 20) + (file.name.length > 20 ? "..." : ""));
            setupAudioChain();
        } catch (err) {
            console.error("Error al importar preset:", err);
            statusMessage.textContent = "Error al cargar preset.";
            addMessageToHistory("Error al cargar preset.");
            showModalMessage("Error al cargar el preset: " + err.message);
        } finally {
            event.target.value = null;
        }
    };
    reader.onerror = function() {
        showModalMessage("Error al leer el archivo.");
        statusMessage.textContent = "Error al leer archivo.";
        addMessageToHistory("Error lectura archivo preset.");
    };
    reader.readAsText(file);
}


function showModalMessage(message) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px 30px';
    modal.style.backgroundColor = 'var(--panel-bg)';
    modal.style.color = 'var(--text-color)';
    modal.style.border = '1px solid var(--border-color)';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    modal.style.zIndex = '2000';
    modal.innerHTML = `<p>${message}</p><button id="modalCloseButton" style="margin-top:15px; padding: 8px 15px; background-color: var(--primary-color); color: var(--button-text-color); border:none; border-radius: 5px; cursor:pointer;">Cerrar</button>`;
    document.body.appendChild(modal);
    document.getElementById('modalCloseButton').focus();
    document.getElementById('modalCloseButton').onclick = () => {
        document.body.removeChild(modal);
    };
}

function initializeControlStates() {
    const effectControls = [
        { panelId: 'eq1PanelContainer', toggleId: 'eq1EnabledToggle' },
        { panelId: 'eq2PanelContainer', toggleId: 'eq2EnabledToggle' },
        { panelId: 'effectReverbPanel', toggleId: 'reverbEnabledToggle' },
        { panelId: 'effectDelayPanel', toggleId: 'delayEnabledToggle' },
        { panelId: 'effectChorusPanel', toggleId: 'chorusEnabledToggle' },
        { panelId: 'effectDistortionPanel', toggleId: 'distortionEnabledToggle' },
        { panelId: 'effectPhaserPanel', toggleId: 'phaserEnabledToggle' }
    ];

    effectControls.forEach(control => {
        const checkbox = document.getElementById(control.toggleId);
        const targetSelectId = checkbox ? checkbox.dataset.targetSelect : null;
        const targetSelect = targetSelectId ? document.getElementById(targetSelectId) : null;

        if (checkbox && targetSelect) {
            const isEnabled = targetSelect.value === "1";
            checkbox.checked = isEnabled;
            setControlsDisabledState(control.panelId, !isEnabled);
        } else if (checkbox && !targetSelectId) {
            setControlsDisabledState(control.panelId, !checkbox.checked);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado. Inicializando...");
    setupValueListeners();
    loadTheme();
    storeInitialValues();

    updateUIValues();

    adjustLayout();

    themeToggleButton.addEventListener('click', () => {
        toggleTheme();
        addMessageToHistory(`Tema: ${bodyElement.classList.contains('light-theme') ? 'claro' : 'oscuro'}.`);
    });
    playStopButton.addEventListener('click', handlePlayStopClick); // Botón Play/Stop
    resetButton.addEventListener('click', resetToInitialValues); // Botón Reset
    document.getElementById('randomButton').addEventListener('click', generateRandom);
    document.getElementById('exportWavButton').addEventListener('click', handleExportClick);
    document.getElementById('loadPresetButton').addEventListener('click', () => document.getElementById('presetInput').click());
    document.getElementById('presetInput').addEventListener('change', importPreset);
    document.getElementById('savePresetButton').addEventListener('click', exportPreset);

    const interactiveControls = document.querySelectorAll('input[type="range"], select:not(.hidden-select)');
    interactiveControls.forEach(element => {
        const eventType = (element.tagName === 'SELECT' || element.type === 'range') ? 'change' : 'input';
        element.addEventListener(eventType, () => {
            updateUIValues();
            if (currentSynth && !isPlaying) { // Solo actualizar si no está sonando para evitar clicks/pops
                updateAllEffectParameters();
            } else if (currentSynth && isPlaying && element.type === 'range' && element.closest('.adsr-panel')) {
                // Permitir ajustes de ADSR en tiempo real si se desea (puede ser ruidoso)
                // updateAllEffectParameters();
            }
        });
        if (element.type === 'range') {
            element.addEventListener('input', () => {
                 updateUIValues();
                 if (currentSynth && !isPlaying) { // Evitar cambios bruscos mientras suena
                    updateAllEffectParameters();
                 }
            });
        }
    });

    document.querySelectorAll('.toggle-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (isPlaying) stopSound(); // Detener sonido si se cambia un efecto mientras suena

            const isChecked = e.target.checked;
            const targetSelectId = e.target.dataset.targetSelect;
            const targetSelect = document.getElementById(targetSelectId);
            if (targetSelect) {
                targetSelect.value = isChecked ? "1" : "0";
            }

            let panelIdToToggle;
            let effectName = targetSelectId.replace('Enabled', '');
            if (effectName.startsWith('eq')) effectName = effectName.toUpperCase();
            else effectName = effectName.charAt(0).toUpperCase() + effectName.slice(1);


            if (targetSelectId.startsWith('eq1')) panelIdToToggle = 'eq1PanelContainer';
            else if (targetSelectId.startsWith('eq2')) panelIdToToggle = 'eq2PanelContainer';
            else if (targetSelectId.startsWith('reverb')) panelIdToToggle = 'effectReverbPanel';
            else if (targetSelectId.startsWith('delay')) panelIdToToggle = 'effectDelayPanel';
            else if (targetSelectId.startsWith('chorus')) panelIdToToggle = 'effectChorusPanel';
            else if (targetSelectId.startsWith('distortion')) panelIdToToggle = 'effectDistortionPanel';
            else if (targetSelectId.startsWith('phaser')) panelIdToToggle = 'effectPhaserPanel';

            if (panelIdToToggle) {
                setControlsDisabledState(panelIdToToggle, !isChecked);
                addMessageToHistory(`${effectName} ${isChecked ? 'activado' : 'desactivado'}.`);
            }

            if (targetSelectId.startsWith('eq') || targetSelectId.startsWith('chorus') || targetSelectId.startsWith('distortion') || targetSelectId.startsWith('phaser')) {
                setupAudioChain();
            } else {
                updateAllEffectParameters();
            }
        });
    });

    updateUIValues();
    initializeControlStates();
    setupAudioChain();
    addMessageToHistory("Sintetizador listo.");
    updatePlayStopButton(false); // Estado inicial del botón Play

    window.addEventListener('resize', adjustLayout);

    console.log("Inicialización completa.");
    statusMessage.textContent = "Listo.";
});