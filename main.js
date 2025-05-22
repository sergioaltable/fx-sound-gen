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
const MAX_HISTORY_MESSAGES = 4;

const playStopButton = document.getElementById('playStopButton');
const playStopIconContainer = document.getElementById('playStopIconContainer');
const playStopButtonText = document.getElementById('playStopButtonText');
const resetButton = document.getElementById('resetButton');

let isPlaying = false;
let initialControlValues = {};
let loadedPresets = []; // NUEVO: Para guardar los presets cargados de JSON
const presetSelect = document.getElementById('presetSelect'); // NUEVO: Referencia al selector

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
    historyMessagesArray.push(fullMessage);
    if (historyMessagesArray.length > MAX_HISTORY_MESSAGES) {
        historyMessagesArray.shift();
    }
    renderHistory();
}

function renderHistory() {
    if (!statusHistory) return;
    statusHistory.innerHTML = '';
    historyMessagesArray.forEach(msg => {
        const historyEntry = document.createElement('div');
        historyEntry.textContent = msg;
        statusHistory.appendChild(historyEntry);
    });
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
}

function resetToInitialValues() {
    Object.entries(initialControlValues).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === "checkbox" && el.classList.contains('toggle-checkbox')) {
                el.checked = (typeof value === 'boolean' ? value : value === 'true');
                const targetSelectId = el.dataset.targetSelect;
                 if (targetSelectId) {
                    const targetSelect = document.getElementById(targetSelectId);
                    if (targetSelect) targetSelect.value = el.checked ? "1" : "0";
                }
            } else if (el.tagName === 'SELECT') {
                 el.value = value;
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
    setupAudioChain();
    statusMessage.textContent = "Valores restaurados.";
    addMessageToHistory("Valores restaurados a iniciales.");
    if (isPlaying) {
        stopSound();
    }
    presetSelect.value = ""; // Resetear selector de presets predefinidos
}

// --- Funciones de Presets Predefinidos --- NUEVO ---
async function loadAndPopulatePresets() {
    try {
        const response = await fetch('presets.json');
        if (!response.ok && response.status !== 404) { // Controlar error 404 (no encontrado)
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        loadedPresets = await response.json();

        // Limpiar opciones existentes (excepto la primera "Cargar Preset...")
        presetSelect.options.length = 1;

        // Poblar el selector
        loadedPresets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = index; // Usar índice como valor
            option.textContent = preset.name;
            presetSelect.appendChild(option);
        });
        console.log("Presets predefinidos cargados.");
        // addMessageToHistory("Presets listos."); // Opcional

    } catch (error) {
        if (error.message.includes('404')) {
            console.warn("presets.json no encontrado, continuando sin presets predefinidos.");
            addMessageToHistory("presets.json no encontrado.");
                    } else {
            console.error("Error al cargar presets.json:", error);
            statusMessage.textContent = "Error cargando presets.";
            addMessageToHistory("Fallo al cargar presets predefinidos.");
        }
        presetSelect.disabled = true;
        presetSelect.title = "Error al cargar presets";
    }
}

function applyPreset(presetIndex) {
    if (presetIndex === "" || presetIndex === null || !loadedPresets[presetIndex]) {
        return; // No hacer nada si no es un índice válido
    }

    if (isPlaying) stopSound(); // Detener sonido actual

    const preset = loadedPresets[presetIndex];
    const settings = preset.settings;

    console.log(`Aplicando preset: ${preset.name}`);
    addMessageToHistory(`Cargando preset: ${preset.name.substring(0,25)}...`);

    try {
        Object.entries(settings).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                 if (el.tagName === 'SELECT' && el.classList.contains('hidden-select')) {
                    // Es un select oculto (controlado por un toggle)
                    el.value = String(value); // Asegurar que sea string "0" o "1"
                    const checkbox = document.querySelector(`.toggle-checkbox[data-target-select="${id}"]`);
                    if (checkbox) {
                        checkbox.checked = (el.value === "1");
                    }
                 } else if (el.type === "checkbox" && el.classList.contains('toggle-checkbox')) {
                    // Es el checkbox directamente (si no se usaran hidden selects)
                    el.checked = Boolean(value === "1" || value === true);
                    const targetSelectId = el.dataset.targetSelect;
                     if (targetSelectId) {
                        const targetSelect = document.getElementById(targetSelectId);
                        if (targetSelect) targetSelect.value = el.checked ? "1" : "0";
                    }
                 }
                 else {
                    // Input range, select normal, etc.
                    el.value = value;
                 }
            } else {
                console.warn(`Elemento con ID "${id}" no encontrado para el preset "${preset.name}".`);
            }
        });

        updateUIValues(); // Actualizar los spans de valores
        initializeControlStates(); // Habilitar/deshabilitar controles según los toggles
        setupAudioChain(); // Reconstruir la cadena de audio
        statusMessage.textContent = `Preset '${preset.name}' cargado.`;
        addMessageToHistory(`Preset '${preset.name}' cargado.`);

    } catch (err) {
        console.error(`Error aplicando el preset ${preset.name}:`, err);
        statusMessage.textContent = "Error al aplicar preset.";
        addMessageToHistory(`Error cargando ${preset.name.substring(0,15)}.`);
        showModalMessage(`Error al aplicar el preset '${preset.name}': ${err.message}`);
    } finally {
        // Resetear el selector a la opción por defecto ("Cargar Preset...") después de cargar
        presetSelect.value = "";
    }
}
// --- FIN Funciones de Presets Predefinidos ---

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
            if (inputElement.tagName === 'SELECT' && id.endsWith('Value')) { // Actualizado para delayTime
                 span.textContent = inputElement.options[inputElement.selectedIndex].text;
            }
        }
    });
}

function setupValueListeners() {
    const elements = document.querySelectorAll('input[type="range"], select');
    elements.forEach(el => {
        el.addEventListener('input', updateUIValues);
        // Si se selecciona un valor manual, resetear el selector de presets
        if(el.id !== 'presetSelect') {
           el.addEventListener('input', () => {
               if (presetSelect.value !== "") presetSelect.value = "";
           });
        }
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
            // Only remove group-disabled if the parent panel/subgroup is NOT disabled
            const parentGroup = group.closest('.eq-panel.group-disabled, .effect-subgroup.group-disabled');
            if(!parentGroup) {
                 group.classList.remove("group-disabled");
            }
        }
    });
}


function disposeAudioNodes() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active');
    }
    if (currentSynth) {
        currentSynth.triggerRelease();
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
            wet: 1 // Wet is controlled by connection, not parameter here
        }).start(); // Start the chorus LFO
    }
    if (document.getElementById("distortionEnabled").value === "1") {
        distortionEffect = new Tone.Distortion({
            distortion: parseFloat(document.getElementById("distortionLevel").value),
            wet: 1 // Wet is controlled by connection
        });
    }
    if (document.getElementById("phaserEnabled").value === "1") {
        phaserEffect = new Tone.Phaser({
            frequency: parseFloat(document.getElementById("phaserFreq").value),
            octaves: parseInt(document.getElementById("phaserOctaves").value),
            stages: parseInt(document.getElementById("phaserStages").value),
            wet: 1 // Wet is controlled by connection
        });
    }

    // Reverb and Delay are always created, wet level controls if they are heard
    reverbEffect = new Tone.Reverb({
        decay: 1.5, // Example decay, could be made adjustable
        preDelay: 0.01,
        wet: document.getElementById("reverbEnabled").value === "1" ? parseFloat(document.getElementById("reverbWet").value) : 0
    });
    delayEffect = new Tone.PingPongDelay({
        delayTime: document.getElementById("delayTime").value,
        feedback: parseFloat(document.getElementById("delayFeedback").value),
        wet: document.getElementById("delayEnabled").value === "1" ? parseFloat(document.getElementById("delayWet").value) : 0
    });

    // Build the chain
    let currentNode = currentSynth;
    currentNode.connect(vibratoEffect); currentNode = vibratoEffect;
    currentNode.connect(filter); currentNode = filter;
    if (eq1) { currentNode.connect(eq1); currentNode = eq1; }
    if (eq2) { currentNode.connect(eq2); currentNode = eq2; }
    if (chorusEffect) { currentNode.connect(chorusEffect); currentNode = chorusEffect; }
    if (distortionEffect) { currentNode.connect(distortionEffect); currentNode = distortionEffect; }
    if (phaserEffect) { currentNode.connect(phaserEffect); currentNode = phaserEffect; }
    // Reverb and Delay are connected last as send/parallel effects (conceptually) or just end of chain
    currentNode.connect(reverbEffect); currentNode = reverbEffect;
    currentNode.connect(delayEffect); currentNode = delayEffect;
    currentNode.toDestination();

    updateAllEffectParameters(); // Ensure parameters match UI after rebuilding
}

function updateAllEffectParameters() {
    if (!currentSynth) return;

    // Synth basic params
    currentSynth.volume.value = parseFloat(document.getElementById("volume").value);
    if (currentSynth.detune) currentSynth.detune.value = parseInt(document.getElementById("detune").value);

    // Envelope (check if exists on the specific synth type)
    if (currentSynth.envelope) {
        currentSynth.envelope.attack = parseFloat(document.getElementById("attack").value);
        currentSynth.envelope.decay = parseFloat(document.getElementById("decay").value);
        currentSynth.envelope.sustain = parseFloat(document.getElementById("sustain").value);
        currentSynth.envelope.release = parseFloat(document.getElementById("release").value);
    }
    // Oscillator type (check if exists)
    if (currentSynth.oscillator) {
        currentSynth.oscillator.type = document.getElementById("waveform").value;
    }
    // FM Synth specific params (example, add if needed)
    // if (currentSynth instanceof Tone.FMSynth) { /* update FM params */ }
     // Membrane Synth specific params (example, add if needed)
    // if (currentSynth instanceof Tone.MembraneSynth) { /* update Membrane params */ }


    // Effects
    if (vibratoEffect) {
        vibratoEffect.frequency.value = parseFloat(document.getElementById("vibratoFreq").value);
        vibratoEffect.depth.value = parseFloat(document.getElementById("vibratoDepth").value);
    }
    if (filter) {
        filter.frequency.value = parseFloat(document.getElementById("cutoff").value);
        filter.type = document.getElementById("filterType").value;
        filter.Q.value = parseFloat(document.getElementById("filterQ").value);
    }

    // EQs (only update if they exist)
    const eq1Enabled = document.getElementById("eq1Enabled").value === "1";
    if (eq1) {
        // EQ params should only be updated if it's supposed to be enabled
        // The connection itself handles enabling/disabling in setupAudioChain
         if (eq1Enabled) {
            eq1.low.value = parseFloat(document.getElementById("eq1LowGain").value);
            eq1.mid.value = parseFloat(document.getElementById("eq1MidGain").value);
            eq1.high.value = parseFloat(document.getElementById("eq1HighGain").value);
            eq1.lowFrequency.value = parseFloat(document.getElementById("eq1LowFreq").value);
            eq1.highFrequency.value = parseFloat(document.getElementById("eq1HighFreq").value);
         }
    } else if (eq1Enabled) {
        // If it should be enabled but doesn't exist, rebuild chain
        setupAudioChain();
        return; // Exit early as chain is rebuilt
    }

    const eq2Enabled = document.getElementById("eq2Enabled").value === "1";
    if (eq2) {
        if (eq2Enabled) {
            eq2.frequency.value = parseFloat(document.getElementById("eq2Freq").value);
            eq2.gain.value = parseFloat(document.getElementById("eq2Gain").value);
            eq2.Q.value = parseFloat(document.getElementById("eq2Q").value);
        }
    } else if (eq2Enabled) {
        setupAudioChain();
        return;
    }

    // Chorus (update params if enabled and exists, rebuild if should exist but doesn't)
    const chorusEnabled = document.getElementById("chorusEnabled").value === "1";
    if (chorusEffect) {
        if (chorusEnabled) {
            chorusEffect.frequency.value = parseFloat(document.getElementById("chorusFreq").value);
            chorusEffect.delayTime = parseFloat(document.getElementById("chorusDelay").value);
            chorusEffect.depth.value = parseFloat(document.getElementById("chorusDepth").value);
        }
    } else if (chorusEnabled) {
        setupAudioChain(); // Rebuild to add the effect
        return;
    }

    // Distortion
    const distortionEnabled = document.getElementById("distortionEnabled").value === "1";
    if (distortionEffect) {
        if (distortionEnabled) {
            distortionEffect.distortion = parseFloat(document.getElementById("distortionLevel").value);
        }
    } else if (distortionEnabled) {
        setupAudioChain();
        return;
    }

    // Phaser
    const phaserEnabled = document.getElementById("phaserEnabled").value === "1";
    if (phaserEffect) {
        if (phaserEnabled) {
            phaserEffect.frequency.value = parseFloat(document.getElementById("phaserFreq").value);
            phaserEffect.octaves = parseInt(document.getElementById("phaserOctaves").value);
            phaserEffect.stages = parseInt(document.getElementById("phaserStages").value);
        }
    } else if (phaserEnabled) {
        setupAudioChain();
        return;
    }

    // Reverb and Delay wet levels (always exist, just adjust wet)
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
        currentSynth.triggerRelease(Tone.now());
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active');

        if (oscilloscopeCtx) {
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
    updatePlayStopButton(false);
    addMessageToHistory("Sonido detenido.");
}


async function handlePlayStopClick() {
    if (isPlaying) {
        stopSound();
    } else {
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
                addMessageToHistory("AudioContext iniciado.");
                console.log("AudioContext started by user interaction.");
            }
            statusMessage.textContent = "Configurando...";
            addMessageToHistory("Reproduciendo sonido...");
            updatePlayStopButton(true);

            // Ensure chain is up-to-date, rebuild if necessary (e.g., synth type changed)
            // Or just update parameters if chain structure is assumed correct
            // updateAllEffectParameters(); // Might be sufficient if chain structure is stable

            // For safety, let's rebuild if synthType changed or effects were toggled
            // A simpler approach for now: assume setupAudioChain handles necessary updates
             if(!currentSynth) { // Always setup if not existing
                 setupAudioChain();
             } else {
                // Optionally check if critical things like synthType changed
                // If not, just updating parameters might be faster
                updateAllEffectParameters();
             }

            // updateUIValues(); // Ensure UI reflects current state

            const freq = document.getElementById("frequency").value;
            const duration = parseFloat(document.getElementById("duration").value);
            const now = Tone.now();

            if (!currentSynth) {
                console.error("currentSynth no está inicializado después de setup.");
                statusMessage.textContent = "Error: Sintetizador no listo.";
                addMessageToHistory("Error: Sintetizador no listo.");
                updatePlayStopButton(false);
                return;
            }

            currentSynth.triggerAttackRelease(freq, duration, now);
            statusMessage.textContent = `Reproduciendo... ${freq}Hz`;
            visualize(currentSynth);

            // Determine total effective time including release
            let releaseTime = 0.5; // Default fallback
            if (currentSynth.envelope) {
                 if(typeof currentSynth.envelope.release === 'number') {
                    releaseTime = currentSynth.envelope.release;
                 } else if (currentSynth.envelope.release && typeof currentSynth.envelope.release.value === 'number') {
                     releaseTime = currentSynth.envelope.release.value;
                 }
            }
            const totalEffectiveTime = duration + releaseTime;

            // Schedule UI update after sound finishes
            setTimeout(() => {
                if (isPlaying) { // Only update if not manually stopped
                    updatePlayStopButton(false);
                    oscilloscopeCanvas.classList.remove('active');
                     if (oscilloscopeCtx) {
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
            }, totalEffectiveTime * 1000 + 300); // +300ms buffer

        } catch (err) {
            console.error("Error al reproducir:", err);
            statusMessage.textContent = "Error: " + err.message.substring(0,50);
            addMessageToHistory("Error reproducción: " + err.message.substring(0,30));
            oscilloscopeCanvas.classList.remove('active');
            updatePlayStopButton(false);
        }
    }
}

function visualize(sourceNode) {
    if (!oscilloscopeCtx) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active');
        return;
    }
    if (!sourceNode || typeof sourceNode.connect !== 'function' || oscilloscopeCanvas.width === 0 || oscilloscopeCanvas.height === 0) {
        console.warn("Fuente de visualización no válida o canvas no listo/visible.");
        oscilloscopeCtx.clearRect(0, 0, oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / window.devicePixelRatio);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        oscilloscopeCanvas.classList.remove('active');
        return;
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    const analyser = new Tone.Analyser('waveform', 1024);
    let nodeToVisualize = sourceNode;

    // Try connecting analyser to the end of the *current* chain
    // Use the actual effect variables
     if (delayEffect && typeof delayEffect.connect === 'function') nodeToVisualize = delayEffect;
     else if (reverbEffect && typeof reverbEffect.connect === 'function') nodeToVisualize = reverbEffect;
     else if (phaserEffect && typeof phaserEffect.connect === 'function' && document.getElementById("phaserEnabled").value === "1") nodeToVisualize = phaserEffect;
     else if (distortionEffect && typeof distortionEffect.connect === 'function' && document.getElementById("distortionEnabled").value === "1") nodeToVisualize = distortionEffect;
     else if (chorusEffect && typeof chorusEffect.connect === 'function' && document.getElementById("chorusEnabled").value === "1") nodeToVisualize = chorusEffect;
     else if (eq2 && typeof eq2.connect === 'function' && document.getElementById("eq2Enabled").value === "1") nodeToVisualize = eq2;
     else if (eq1 && typeof eq1.connect === 'function' && document.getElementById("eq1Enabled").value === "1") nodeToVisualize = eq1;
     else if (filter && typeof filter.connect === 'function') nodeToVisualize = filter;
     else if (vibratoEffect && typeof vibratoEffect.connect === 'function') nodeToVisualize = vibratoEffect;
     // else defaults to sourceNode (currentSynth)

    try {
        // Connect the chosen node to the analyser
        nodeToVisualize.connect(analyser);
    } catch (e) {
        console.warn("No se pudo conectar el analizador al nodo final, intentando desde el sinte:", nodeToVisualize, e);
        // Fallback: If connection failed, try connecting directly from the synth source
        if (sourceNode !== nodeToVisualize) {
            try {
                sourceNode.connect(analyser);
            } catch (e2) {
                console.error("Fallo al conectar analizador incluso al sourceNode", e2);
                oscilloscopeCanvas.classList.remove('active');
                return; // Cannot visualize
            }
        } else {
             oscilloscopeCanvas.classList.remove('active'); // Already tried source node
            return; // Cannot visualize
        }
    }

    oscilloscopeCanvas.classList.add('active');

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        if (!analyser || typeof analyser.getValue !== 'function') {
             if (animationFrameId) cancelAnimationFrame(animationFrameId);
             animationFrameId = null;
             oscilloscopeCanvas.classList.remove('active');
             return;
        }
        const dataArray = analyser.getValue();
        const isSilent = Array.isArray(dataArray) && dataArray.every(v => Math.abs(v) < 0.01);

        if (!dataArray || dataArray.length === 0 || isSilent ) { // Draw flat line if silent
            oscilloscopeCtx.fillStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-bg').trim();
            oscilloscopeCtx.fillRect(0, 0, oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / window.devicePixelRatio);
            oscilloscopeCtx.beginPath();
            oscilloscopeCtx.moveTo(0, oscilloscopeCanvas.height / (2 * window.devicePixelRatio));
            oscilloscopeCtx.lineTo(oscilloscopeCanvas.width / window.devicePixelRatio, oscilloscopeCanvas.height / (2* window.devicePixelRatio));
            oscilloscopeCtx.strokeStyle = getComputedStyle(oscilloscopeCanvas).getPropertyValue('--oscilloscope-line-color').trim();
            oscilloscopeCtx.lineWidth = 1;
            oscilloscopeCtx.stroke();
             // Optionally remove active class if completely silent
             // if (isSilent) oscilloscopeCanvas.classList.remove('active');
             // Keep drawing flat line until explicitly stopped or animation cancelled
             return; // Stop drawing waveform if silent
        }

        // Draw the waveform
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
            const v = (dataArray[i] + 1) / 2; // Normalize to 0-1 range
            const y = v * canvasHeight;
            if (i === 0) oscilloscopeCtx.moveTo(x, y);
            else oscilloscopeCtx.lineTo(x, y);
            x += sliceWidth;
        }
        oscilloscopeCtx.stroke();
    }
    draw();
}

function generateRandom() {
    if (isPlaying) stopSound();

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
             // Find the panel/subgroup to disable/enable controls within
             let panelId;
             if (effectIdBase.startsWith('eq')) {
                 panelId = `${effectIdBase}PanelContainer`;
             } else {
                  panelId = `effect${effectIdBase.charAt(0).toUpperCase() + effectIdBase.slice(1)}Panel`;
             }
             // Need to call setControlsDisabledState *after* all values are set potentially
             // We will call initializeControlStates() after the loop which handles this
        }

        // Set random values even if disabled, so they are ready if enabled
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
    });

    document.getElementById("detune").value = Math.floor(Math.random() * 200) - 100;
    document.getElementById("vibratoFreq").value = (Math.random() * 19.9 + 0.1).toFixed(1);
    document.getElementById("vibratoDepth").value = (Math.random()).toFixed(2);

    updateUIValues();
    initializeControlStates(); // Apply disabled states based on new toggle values
    setupAudioChain(); // Build audio chain with new random values
    addMessageToHistory("Valores aleatorios generados.");
    presetSelect.value = ""; // Reset preset selector
    handlePlayStopClick(); // Play the new random sound
}


async function handleExportClick() {
     try {
        if (isPlaying) stopSound();
        if (Tone.context.state !== 'running') await Tone.start();
        statusMessage.textContent = "Exportando WAV...";
        addMessageToHistory("Exportando WAV...");
        presetSelect.value = ""; // Ensure no preset is selected visually during export
        await new Promise(resolve => setTimeout(resolve, 50)); // Short delay
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
    // Recalculate release time based on current value
    let releaseTime = 0.5; // fallback
    const releaseInput = document.getElementById("release");
    if (releaseInput) releaseTime = parseFloat(releaseInput.value) || 0.5;
    const totalDuration = duration + releaseTime + 0.2; // Add buffer

    const buffer = await Tone.Offline(async (offlineContext) => {
        // Create offline synth instance
        const synthType = document.getElementById("synthType").value;
        const waveform = document.getElementById("waveform").value;
        const synthOptions = {
            context: offlineContext, // IMPORTANT: Use offline context
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

        // Create offline versions of all effects
        const offlineVibrato = new Tone.Vibrato({ context: offlineContext, frequency: parseFloat(document.getElementById("vibratoFreq").value), depth: parseFloat(document.getElementById("vibratoDepth").value) });
        const offlineFilter = new Tone.Filter({ context: offlineContext, frequency: parseFloat(document.getElementById("cutoff").value), type: document.getElementById("filterType").value, Q: parseFloat(document.getElementById("filterQ").value) });

        let offlineEq1 = null, offlineEq2 = null, offlineChorus = null, offlineDistortion = null, offlinePhaser = null;

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

        // Reverb and Delay with offline context and wet control
        const offlineReverb = new Tone.Reverb({ context: offlineContext, decay: 1.5, preDelay: 0.01, wet: document.getElementById("reverbEnabled").value === "1" ? parseFloat(document.getElementById("reverbWet").value) : 0 });
        const offlineDelay = new Tone.PingPongDelay({ context: offlineContext, delayTime: document.getElementById("delayTime").value, feedback: parseFloat(document.getElementById("delayFeedback").value), wet: document.getElementById("delayEnabled").value === "1" ? parseFloat(document.getElementById("delayWet").value) : 0 });

        // Connect the offline chain
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
        currentOfflineNode.toDestination(); // Connect final node to offline destination

        // Trigger the sound in the offline context
        offlineSynth.triggerAttackRelease(document.getElementById("frequency").value, duration, 0); // Start at time 0

    }, totalDuration); // Render for the calculated total duration

    // Convert buffer to WAV and trigger download
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
        length = buffer.length * numOfChan * 2 + 44, // 2 bytes per sample (16-bit)
        bufferArray = new ArrayBuffer(length),
        view = new DataView(bufferArray),
        channels = [],
        sampleRate = buffer.sampleRate;
    let offset = 0;
    const writeString = (str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i)); };

    // RIFF header
    writeString("RIFF");
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4; // chunk size
    writeString("WAVE");

    // fmt subchunk
    writeString("fmt ");
    view.setUint32(offset, 16, true); offset += 4; // subchunk1 size (16 for PCM)
    view.setUint16(offset, 1, true); offset += 2; // audio format (1 for PCM)
    view.setUint16(offset, numOfChan, true); offset += 2; // num channels
    view.setUint32(offset, sampleRate, true); offset += 4; // sample rate
    view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4; // byte rate
    view.setUint16(offset, numOfChan * 2, true); offset += 2; // block align
    view.setUint16(offset, 16, true); offset += 2; // bits per sample

    // data subchunk
    writeString("data");
    view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4; // subchunk2 size

    // Write interleaved audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numOfChan; c++) {
            const sample = Math.max(-1, Math.min(1, channels[c][i])); // Clamp sample
            // Convert to 16-bit signed integer
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
    }
    return new Blob([view], { type: "audio/wav" });
}

function exportPreset() {
    if (isPlaying) stopSound();
    const preset = {};
    const elements = document.querySelectorAll('input[type="range"], input[type="number"], select'); // Include hidden selects
    elements.forEach(el => {
        if (el.id) {
            // Store value based on element type
            if (el.type === "range" || el.type === "number") {
                preset[el.id] = parseFloat(el.value);
            } else if (el.tagName === 'SELECT') {
                preset[el.id] = el.value; // Store the actual value ("0", "1", "sine", etc.)
            }
             // We don't need to store the checkbox state separately if we store the hidden select's state
        }
    });

    // Remove the presetSelect value itself if it got included
    delete preset.presetSelect;

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
            // Apply the loaded preset values
            Object.entries(preset).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) {
                    // Handle applying values similar to applyPreset function
                    if (el.tagName === 'SELECT' && el.classList.contains('hidden-select')) {
                        el.value = String(value);
                        const checkbox = document.querySelector(`.toggle-checkbox[data-target-select="${id}"]`);
                        if (checkbox) checkbox.checked = (el.value === "1");
                    } else {
                        el.value = value;
                    }
                } else {
                     console.warn(`Elemento con ID "${id}" del preset cargado no encontrado en la UI.`);
                }
            });

            updateUIValues();
            initializeControlStates();
            setupAudioChain();
            statusMessage.textContent = "Preset cargado.";
            addMessageToHistory("Preset cargado: " + file.name.substring(0, 20) + (file.name.length > 20 ? "..." : ""));
            presetSelect.value = ""; // Reset built-in preset selector

        } catch (err) {
            console.error("Error al importar preset:", err);
            statusMessage.textContent = "Error al cargar preset.";
            addMessageToHistory("Error al cargar preset.");
            showModalMessage("Error al cargar el preset: " + err.message);
        } finally {
            // Reset file input value to allow loading the same file again
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
    // Simple alert for now, replace with a proper modal if needed
    alert(message);
    /*
    const modal = document.createElement('div');
    modal.style.position = 'fixed'; ... (rest of modal styling) ...
    document.body.appendChild(modal);
    document.getElementById('modalCloseButton').focus();
    document.getElementById('modalCloseButton').onclick = () => {
        document.body.removeChild(modal);
    };
    */
}

function initializeControlStates() {
    const effectControls = [
        { panelId: 'eq1PanelContainer', selectId: 'eq1Enabled' },
        { panelId: 'eq2PanelContainer', selectId: 'eq2Enabled' },
        { panelId: 'effectReverbPanel', selectId: 'reverbEnabled' },
        { panelId: 'effectDelayPanel', selectId: 'delayEnabled' },
        { panelId: 'effectChorusPanel', selectId: 'chorusEnabled' },
        { panelId: 'effectDistortionPanel', selectId: 'distortionEnabled' },
        { panelId: 'effectPhaserPanel', selectId: 'phaserEnabled' }
    ];

    effectControls.forEach(control => {
        const targetSelect = document.getElementById(control.selectId);
        const checkbox = document.querySelector(`.toggle-checkbox[data-target-select="${control.selectId}"]`);

        if (targetSelect) {
             const isEnabled = targetSelect.value === "1";
            if (checkbox) checkbox.checked = isEnabled; // Sync checkbox with select value
            setControlsDisabledState(control.panelId, !isEnabled);
        } else if (checkbox) {
             // Fallback if only checkbox exists (less likely with current setup)
             setControlsDisabledState(control.panelId, !checkbox.checked);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado. Inicializando...");
    setupValueListeners();
    loadTheme();
    storeInitialValues();
    loadAndPopulatePresets(); // <<< NUEVO: Cargar presets predefinidos

    updateUIValues();
    adjustLayout();

    themeToggleButton.addEventListener('click', () => {
        toggleTheme();
        addMessageToHistory(`Tema: ${bodyElement.classList.contains('light-theme') ? 'claro' : 'oscuro'}.`);
    });
    playStopButton.addEventListener('click', handlePlayStopClick);
    resetButton.addEventListener('click', resetToInitialValues);
    document.getElementById('randomButton').addEventListener('click', generateRandom);
    document.getElementById('exportWavButton').addEventListener('click', handleExportClick);
    document.getElementById('loadPresetButton').addEventListener('click', () => document.getElementById('presetInput').click());
    document.getElementById('presetInput').addEventListener('change', importPreset);
    document.getElementById('savePresetButton').addEventListener('click', exportPreset);

    // <<< NUEVO: Event listener para el selector de presets predefinidos
    presetSelect.addEventListener('change', (event) => {
        applyPreset(event.target.value); // El valor es el índice del preset
    });

    const interactiveControls = document.querySelectorAll('input[type="range"], select:not(.hidden-select)');
    interactiveControls.forEach(element => {
        const eventType = (element.tagName === 'SELECT' || element.type === 'range') ? 'change' : 'input';
         element.addEventListener(eventType, () => {
             updateUIValues();
             if(element.id !== 'presetSelect') presetSelect.value = ""; // Deseleccionar preset si se toca un control
             if (currentSynth && !isPlaying) {
                 // Decide whether to update in real-time or rebuild
                 // For most param changes, update is fine
                 updateAllEffectParameters();
                 // Rebuild only if essential structure changes (e.g., synth type)
                 if(element.id === 'synthType') setupAudioChain();

             }
         });
         if (element.type === 'range') {
             element.addEventListener('input', () => { // Update display smoothly on drag
                  updateUIValues();
                  if(element.id !== 'presetSelect') presetSelect.value = ""; // Deseleccionar preset
                  if (currentSynth && !isPlaying) { // Avoid updates while sound plays
                     updateAllEffectParameters();
                  }
             });
         }
    });

    document.querySelectorAll('.toggle-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (isPlaying) stopSound();

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

            // Determine which panel/subgroup to disable/enable
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
                 presetSelect.value = ""; // Deseleccionar preset si se toca un toggle
            }

            // Rebuild audio chain only if an effect node needs to be added/removed
            if (targetSelectId.startsWith('eq') || targetSelectId.startsWith('chorus') || targetSelectId.startsWith('distortion') || targetSelectId.startsWith('phaser')) {
                 setupAudioChain();
            } else {
                 // For Reverb/Delay, just update parameters (wet level)
                 updateAllEffectParameters();
            }
        });
    });

    initializeControlStates(); // Set initial disabled states based on default values
    setupAudioChain(); // Build the initial audio chain
    addMessageToHistory("Sintetizador listo.");
    updatePlayStopButton(false); // Initial button state

    window.addEventListener('resize', adjustLayout);

    console.log("Inicialización completa.");
    statusMessage.textContent = "Listo.";
});
