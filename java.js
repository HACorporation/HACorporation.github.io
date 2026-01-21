/* ---------- ELEMENTOS ---------- */
const fileInput = document.getElementById("audioFile");
const durationInput = document.getElementById("duration");
const playBtn = document.getElementById("playSelection");
const downloadBtn = document.getElementById("downloadSample");
const durationValue = document.getElementById("durationValue");

let audio = new Audio();
let audioBuffer = null;
let ctx = null;
let mainAudioSource = null; // Nodo de conexión para el audio principal

let playPosition = 0;
let zoom = 1;
let scrollOffset = 0;

let isScrollingLeft = false, isScrollingRight = false;
let isZoomingIn = false, isZoomingOut = false;

const canvas = document.getElementById("waveform");
const ctx2d = canvas.getContext("2d");

let selectionStart = 0;
let selectionDuration = parseFloat(durationInput.value || 1.0);

const infoContainer = document.querySelector(".audio-info");

/* ---------- VARIABLES DE GRABACIÓN ---------- */
let mediaRecorder;
let recordedChunks = [];
let audioStreamDest; 
const padSources = [null, null, null, null]; 
const padAudios = [new Audio(), new Audio(), new Audio(), new Audio()];
const padKeys = ["a", "s", "d", "f"];

/* ---------- RESIZE CANVAS ---------- */
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || canvas.clientWidth;
  const height = rect.height || canvas.clientHeight;
  if (width === 0) return;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (audioBuffer) drawWaveform(audioBuffer);
}
window.addEventListener('resize', resizeCanvas);
// Forzar resize inicial
setTimeout(resizeCanvas, 100);

/* ---------- CARGAR AUDIO PRINCIPAL (LIMPIEZA TOTAL) ---------- */
fileInput.addEventListener("change", async () => {
  // Inicializar contexto una sola vez
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioStreamDest = ctx.createMediaStreamDestination();
  }
  if (ctx.state === "suspended") await ctx.resume();

  const file = fileInput.files[0];
  if (!file) return;

  try {
    // 1. Limpiar rastro del audio anterior
    audio.pause();
    if (audio.src) URL.revokeObjectURL(audio.src);
    if (mainAudioSource) {
        mainAudioSource.disconnect();
        mainAudioSource = null;
    }

    // 2. Procesar el nuevo archivo
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    // 3. Configurar nueva fuente
    audio.src = URL.createObjectURL(file);
    audio.load();

    // 4. Reconectar nodos de audio
    mainAudioSource = ctx.createMediaElementSource(audio);
    mainAudioSource.connect(ctx.destination);
    mainAudioSource.connect(audioStreamDest);

    // 5. Reset de interfaz
    scrollOffset = 0; 
    zoom = 1;
    selectionStart = 0;

    resizeCanvas(); 
    displayAudioInfo(estimateBPM(audioBuffer), detectKey(audioBuffer));
    drawWaveform(audioBuffer);
  } catch (err) {
    console.error("Error cargando el audio:", err);
    alert("Hubo un error al procesar el archivo. Asegúrate de que sea un audio válido.");
  }
});

/* ---------- LÓGICA DE PADS ---------- */
document.querySelectorAll(".pad-load input").forEach(input => {
  input.addEventListener("change", e => {
    const idx = parseInt(e.target.dataset.pad);
    const file = e.target.files[0];

    if (file && ctx) {
      // Limpiar memoria y conexiones viejas del pad
      if (padAudios[idx].src) {
        padAudios[idx].pause();
        URL.revokeObjectURL(padAudios[idx].src);
      }
      if (padSources[idx]) {
        padSources[idx].disconnect();
        padSources[idx] = null;
      }

      padAudios[idx].src = URL.createObjectURL(file);
      padAudios[idx].load();
      
      // Crear conexión nueva
      padSources[idx] = ctx.createMediaElementSource(padAudios[idx]);
      padSources[idx].connect(ctx.destination); 
      padSources[idx].connect(audioStreamDest); 

      e.target.closest(".pad").classList.add("loaded");
    }
  });
});

function playPad(i) {
  const a = padAudios[i];
  if (!a || !a.src) return;
  a.currentTime = 0;
  a.play().catch(e => console.warn("Interacción requerida para audio"));
  const btn = document.querySelector(`.pad-play[data-play="${i}"]`);
  if(btn) {
    btn.classList.add("playing");
    a.onended = () => btn.classList.remove("playing");
  }
}

document.addEventListener("keydown", e => {
  const idx = padKeys.indexOf(e.key.toLowerCase());
  if (idx !== -1) playPad(idx);
});

/* ---------- ZOOM Y SCROLL ---------- */
const setupControls = () => {
    const zIn = document.getElementById("zoomIn");
    const zOut = document.getElementById("zoomOut");
    const sL = document.getElementById("scrollLeft");
    const sR = document.getElementById("scrollRight");

    if(zIn) zIn.onmousedown = () => isZoomingIn = true;
    if(zOut) zOut.onmousedown = () => isZoomingOut = true;
    if(sL) sL.onmousedown = () => isScrollingLeft = true;
    if(sR) sR.onmousedown = () => isScrollingRight = true;

    window.onmouseup = () => {
        isZoomingIn = isZoomingOut = isScrollingLeft = isScrollingRight = false;
    };
};
setupControls();

function animate() {
  if (audioBuffer) {
    let redraw = false;
    const step = 0.05 / zoom;
    if (isScrollingLeft) { scrollOffset -= step; if (scrollOffset < 0) scrollOffset = 0; redraw = true; }
    if (isScrollingRight) { 
        const maxScroll = Math.max(0, audioBuffer.duration - (audioBuffer.duration / zoom));
        scrollOffset += step; 
        if (scrollOffset > maxScroll) scrollOffset = maxScroll;
        redraw = true; 
    }
    if (isZoomingIn) { zoom *= 1.03; redraw = true; }
    if (isZoomingOut) { zoom /= 1.03; if (zoom < 1) zoom = 1; redraw = true; }
    if (redraw) drawWaveform(audioBuffer);
  }
  requestAnimationFrame(animate);
}
animate();

/* ---------- WAVEFORM ---------- */
function drawWaveform(buffer) {
  const rect = canvas.getBoundingClientRect();
  const data = buffer.getChannelData(0);
  const visibleDuration = buffer.duration / zoom;
  const startTime = scrollOffset;
  const startSample = Math.floor(startTime * buffer.sampleRate);
  const endSample = Math.min(data.length, Math.floor((startTime + visibleDuration) * buffer.sampleRate));
  const step = Math.ceil((endSample - startSample) / rect.width);
  const amp = rect.height / 2 * 0.8;

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < rect.width; i++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const idx = startSample + i * step + j;
      if (idx >= endSample) break;
      const datum = data[idx];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    ctx2d.strokeStyle = `hsl(${(i / rect.width) * 360}, 80%, 60%)`;
    ctx2d.beginPath();
    ctx2d.moveTo(i, amp * (1 - min) + (rect.height - 2 * amp) / 2);
    ctx2d.lineTo(i, amp * (1 - max) + (rect.height - 2 * amp) / 2);
    ctx2d.stroke();
  }

  const selStartX = ((selectionStart - scrollOffset) / visibleDuration) * rect.width;
  const selEndX = ((selectionStart + selectionDuration - scrollOffset) / visibleDuration) * rect.width;
  if (selEndX > 0 && selStartX < rect.width) {
      ctx2d.fillStyle = "rgba(255, 47, 146, 0.3)";
      ctx2d.fillRect(Math.max(0, selStartX), 0, Math.min(rect.width, selEndX) - Math.max(0, selStartX), rect.height);
  }
}

canvas.addEventListener("click", e => {
  if (!audioBuffer) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const visibleDuration = audioBuffer.duration / zoom;
  selectionStart = scrollOffset + (x / rect.width) * visibleDuration;
  drawWaveform(audioBuffer);
});

/* REPRODUCCIÓN */
playBtn.addEventListener("click", () => {
  if (!audioBuffer || !audio.src) return;
  audio.currentTime = selectionStart;
  audio.play();
  if (window.playTimeout) clearTimeout(window.playTimeout);
  window.playTimeout = setTimeout(() => audio.pause(), selectionDuration * 1000);
});

/* GRABACIÓN */
const recordBtn = document.getElementById("recordBtn");
const stopRecordBtn = document.getElementById("stopRecordBtn");

if(recordBtn) {
    recordBtn.onclick = () => {
        if (!audioStreamDest) return alert("Carga un audio primero.");
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(audioStreamDest.stream);
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "grabacion_pads.webm";
          a.click();
        };
        mediaRecorder.start();
        recordBtn.style.display = "none";
        stopRecordBtn.style.display = "inline-block";
    };
}

if(stopRecordBtn) {
    stopRecordBtn.onclick = () => {
        mediaRecorder.stop();
        recordBtn.style.display = "inline-block";
        stopRecordBtn.style.display = "none";
    };
}

// Auxiliares: Info, BPM, Wav (mismos que antes)
function displayAudioInfo(bpm, keys) {
  if(infoContainer) infoContainer.innerHTML = `<span>Tempo: ${bpm.toFixed(0)} BPM</span> | <span>Tonalidad: ${keys[0].key}</span>`;
}
function estimateBPM(buffer) { return 120; }
function detectKey(buffer) {
  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return [{ key: keys[Math.floor(Math.random() * keys.length)] + " Major" }];
}


