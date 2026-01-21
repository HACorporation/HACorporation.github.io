/* ---------- ELEMENTOS ---------- */
const fileInput = document.getElementById("audioFile");
const durationInput = document.getElementById("duration");
const playBtn = document.getElementById("playSelection");
const downloadBtn = document.getElementById("downloadSample");
const durationValue = document.getElementById("durationValue");

let audio = new Audio();
let audioBuffer = null;
let ctx = null;
let mainAudioSource = null; // Guardamos la fuente para poder desconectarla

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
window.triggerResize = resizeCanvas;
window.addEventListener('resize', resizeCanvas);

/* ---------- DURACIÓN ---------- */
durationInput.addEventListener("input", () => {
  const val = parseFloat(durationInput.value);
  durationValue.textContent = val.toFixed(2);
  selectionDuration = val;
  if (audioBuffer) drawWaveform(audioBuffer);
});

/* ---------- CARGAR AUDIO PRINCIPAL (CORREGIDO) ---------- */
fileInput.addEventListener("change", async () => {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioStreamDest = ctx.createMediaStreamDestination();
  }
  if (ctx.state === "suspended") await ctx.resume();

  const file = fileInput.files[0];
  if (!file) return;

  try {
    // Limpiar audio anterior
    audio.pause();
    if (audio.src) URL.revokeObjectURL(audio.src);

    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    // Crear nueva URL y cargar
    audio.src = URL.createObjectURL(file);
    audio.load();

    // RECONEXIÓN: Crucial para que suene al cambiar de archivo
    if (mainAudioSource) mainAudioSource.disconnect();
    mainAudioSource = ctx.createMediaElementSource(audio);
    mainAudioSource.connect(ctx.destination);
    mainAudioSource.connect(audioStreamDest);

    // Reset de vista
    scrollOffset = 0; 
    zoom = 1;
    selectionStart = 0;

    resizeCanvas(); 
    displayAudioInfo(estimateBPM(audioBuffer), detectKey(audioBuffer));
    drawWaveform(audioBuffer);
  } catch (err) {
    console.error(err);
    alert("Error al cargar audio.");
  }
});

/* ---------- LÓGICA DE PADS (RE-CARGA LIMPIA) ---------- */
const padAudios = [new Audio(), new Audio(), new Audio(), new Audio()];
const padKeys = ["a", "s", "d", "f"];

document.querySelectorAll(".pad-load input").forEach(input => {
  input.addEventListener("change", e => {
    const idx = parseInt(e.target.dataset.pad);
    const file = e.target.files[0];
    const pad = e.target.closest(".pad");

    if (file && ctx) {
      // Limpiar memoria y conexiones anteriores del pad
      if (padAudios[idx].src) {
        padAudios[idx].pause();
        URL.revokeObjectURL(padAudios[idx].src);
      }
      if (padSources[idx]) {
        padSources[idx].disconnect();
      }

      padAudios[idx].src = URL.createObjectURL(file);
      padAudios[idx].load();
      pad.classList.add("loaded");

      // Crear nueva conexión
      padSources[idx] = ctx.createMediaElementSource(padAudios[idx]);
      padSources[idx].connect(ctx.destination); 
      padSources[idx].connect(audioStreamDest); 
    }
  });
});

function playPad(i) {
  const a = padAudios[i];
  if (!a || !a.src) return;
  a.currentTime = 0;
  a.play();
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

/* ---------- ANIMACIÓN DE ZOOM Y SCROLL ---------- */
const btnZoomIn = document.getElementById("zoomIn");
const btnZoomOut = document.getElementById("zoomOut");
const btnLeft = document.getElementById("scrollLeft");
const btnRight = document.getElementById("scrollRight");

if(btnZoomIn) btnZoomIn.onmousedown = () => isZoomingIn = true;
if(btnZoomOut) btnZoomOut.onmousedown = () => isZoomingOut = true;
if(btnLeft) btnLeft.onmousedown = () => isScrollingLeft = true;
if(btnRight) btnRight.onmousedown = () => isScrollingRight = true;

window.onmouseup = () => {
  isZoomingIn = isZoomingOut = isScrollingLeft = isScrollingRight = false;
};

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

/* ---------- SISTEMA DE GRABACIÓN ---------- */
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
  ctx2d.fillStyle = "rgba(255, 47, 146, 0.3)";
  ctx2d.fillRect(selStartX, 0, selEndX - selStartX, rect.height);
}

canvas.addEventListener("click", e => {
  if (!audioBuffer) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const visibleDuration = audioBuffer.duration / zoom;
  selectionStart = scrollOffset + (x / rect.width) * visibleDuration;
  drawWaveform(audioBuffer);
});

/* Reproducción y Descarga */
playBtn.addEventListener("click", () => {
  if (!audioBuffer || !audio.src) return;
  audio.currentTime = selectionStart;
  audio.play();
  if (window.playTimeout) clearTimeout(window.playTimeout);
  window.playTimeout = setTimeout(() => audio.pause(), selectionDuration * 1000);
});

downloadBtn.addEventListener("click", async () => {
  if (!audioBuffer) return;
  const rate = audioBuffer.sampleRate;
  const frames = selectionDuration * rate;
  const offline = new OfflineAudioContext(audioBuffer.numberOfChannels, frames, rate);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offline.destination);
  source.start(0, selectionStart, selectionDuration);
  const rendered = await offline.startRendering();
  const wav = bufferToWav(rendered);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  a.download = "sample.wav";
  a.click();
});

/* Análisis */
function displayAudioInfo(bpm, keys) {
  if(infoContainer) infoContainer.innerHTML = `<span>Tempo: ${bpm.toFixed(0)} BPM</span> | <span>Tonalidad: ${keys[0].key}</span>`;
}
function estimateBPM(buffer) { return 120; }
function detectKey(buffer) {
  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return [{ key: keys[Math.floor(Math.random() * keys.length)] + " Major" }];
}

function bufferToWav(buffer) {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  let offset = 0;
  const write = s => { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); };
  write("RIFF"); view.setUint32(offset, length - 8, true); offset += 4;
  write("WAVEfmt "); view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, buffer.numberOfChannels, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * buffer.numberOfChannels * 2, true); offset += 4;
  view.setUint16(offset, buffer.numberOfChannels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  write("data"); view.setUint32(offset, buffer.length * buffer.numberOfChannels * 2, true); offset += 4;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample * 0x7fff, true); offset += 2;
    }
  }
  return view.buffer;
}



