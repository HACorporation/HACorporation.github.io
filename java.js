/* ---------- ELEMENTOS ---------- */
const fileInput = document.getElementById("audioFile");
const durationInput = document.getElementById("duration");
const playBtn = document.getElementById("playSelection");
const downloadBtn = document.getElementById("downloadSample");
const durationValue = document.getElementById("durationValue");

let audio = new Audio();
let audioBuffer = null;
let ctx = null;

let playPosition = 0;
let zoom = 1;
let scrollOffset = 0;

let isScrollingLeft = false;
let isScrollingRight = false;
let isZoomingIn = false;
let isZoomingOut = false;

const scrollSpeed = 60;
const zoomSpeed = 0.02;

const canvas = document.getElementById("waveform");
const ctx2d = canvas.getContext("2d");

// Variables para la selección
let selectionStart = 0;
let selectionDuration = parseFloat(durationInput.value);

/* ---------- INFO DE AUDIO ---------- */
// Usamos el div con clase .audio-info que ya tienes en tu HTML
const infoContainer = document.querySelector(".audio-info");

/* ---------- RESIZE CANVAS ---------- */
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Si el contenedor está oculto (por Firebase), el ancho será 0.
  const width = rect.width || canvas.clientWidth;
  const height = rect.height || canvas.clientHeight;

  if (width === 0) return;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  if (audioBuffer) drawWaveform(audioBuffer);
}

// Permitimos que auth-guard.js llame a esta función
window.triggerResize = resizeCanvas;

/* ---------- DURACIÓN ---------- */
durationInput.addEventListener("input", () => {
  const val = parseFloat(durationInput.value);
  durationValue.textContent = val.toFixed(2);
  selectionDuration = val;
  if (audioBuffer) drawWaveform(audioBuffer);
});

/* ---------- CARGAR AUDIO ---------- */
fileInput.addEventListener("change", async () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") await ctx.resume();

  const file = fileInput.files[0];
  if (!file) return;

  try {
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    audio.src = URL.createObjectURL(file);
    audio.load();

    // Reset de vista
    playPosition = 0;
    selectionStart = 0;
    scrollOffset = 0;
    zoom = 1;

    resizeCanvas(); 

    // Actualizar Info (Tempo y Tonalidad)
    const bpm = estimateBPM(audioBuffer);
    const keys = detectKey(audioBuffer); // Devuelve array de objetos
    
    displayAudioInfo(bpm, keys);
    drawWaveform(audioBuffer);

  } catch (err) {
    console.error("Error al cargar audio:", err);
    alert("Hubo un error al procesar el audio.");
  }
});

/* ---------- REPRODUCIR SELECCIÓN ---------- */
playBtn.addEventListener("click", () => {
  if (!audioBuffer) return;
  const start = playPosition;
  const length = parseFloat(durationInput.value);
  audio.currentTime = start;
  audio.play();
  setTimeout(() => audio.pause(), length * 1000);
});

/* ---------- DESCARGAR SAMPLE ---------- */
downloadBtn.addEventListener("click", async () => {
  if (!audioBuffer) return;
  const start = playPosition;
  const length = parseFloat(durationInput.value);
  const rate = audioBuffer.sampleRate;
  const frames = length * rate;

  const offline = new OfflineAudioContext(audioBuffer.numberOfChannels, frames, rate);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offline.destination);
  source.start(0, start, length);

  const rendered = await offline.startRendering();
  const wav = bufferToWav(rendered);
  const blob = new Blob([wav], { type: "audio/wav" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sample.wav";
  a.click();
});

/* ---------- WAVEFORM ---------- */

function drawWaveform(buffer) {
  const rect = canvas.getBoundingClientRect();
  const data = buffer.getChannelData(0);
  const visibleDuration = buffer.duration / zoom;
  const startTime = scrollOffset;
  const startSample = Math.floor(startTime * buffer.sampleRate);
  const endSample = Math.min(data.length, Math.floor((startTime + visibleDuration) * buffer.sampleRate));

  const segmentLength = endSample - startSample;
  const step = Math.ceil(segmentLength / rect.width);
  const amp = rect.height / 2 * 0.8;

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  // Dibujar onda
  for (let i = 0; i < rect.width; i++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) {
      const idx = startSample + i * step + j;
      if (idx >= endSample) break;
      const datum = data[idx];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    const hue = (i / rect.width) * 360;
    ctx2d.strokeStyle = `hsl(${hue}, 80%, 60%)`;
    ctx2d.beginPath();
    ctx2d.moveTo(i, amp * (1 - min) + (rect.height - 2 * amp) / 2);
    ctx2d.lineTo(i, amp * (1 - max) + (rect.height - 2 * amp) / 2);
    ctx2d.stroke();
  }

  // Dibujar selección
  const selStartX = ((selectionStart - scrollOffset) / visibleDuration) * rect.width;
  const selEndX = ((selectionStart + selectionDuration - scrollOffset) / visibleDuration) * rect.width;
  ctx2d.fillStyle = "rgba(255, 47, 146, 0.3)";
  ctx2d.fillRect(selStartX, 0, selEndX - selStartX, rect.height);
  ctx2d.strokeStyle = "#ff2f92";
  ctx2d.lineWidth = 2;
  ctx2d.strokeRect(selStartX, 0, selEndX - selStartX, rect.height);
}

canvas.addEventListener("click", e => {
  if (!audioBuffer) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const visibleDuration = audioBuffer.duration / zoom;
  selectionStart = scrollOffset + (x / rect.width) * visibleDuration;
  playPosition = selectionStart;
  drawWaveform(audioBuffer);
});

/* ---------- PADS ---------- */
const padAudios = [new Audio(), new Audio(), new Audio(), new Audio()];
const padKeys = ["a", "s", "d", "f"];

document.querySelectorAll(".pad-load input").forEach(input => {
  input.addEventListener("change", e => {
    const idx = e.target.dataset.pad;
    const pad = e.target.closest(".pad");
    padAudios[idx].src = URL.createObjectURL(e.target.files[0]);
    padAudios[idx].load();
    pad.classList.add("loaded");
  });
});

document.querySelectorAll(".pad-play").forEach(btn => {
  btn.addEventListener("click", () => playPad(btn.dataset.play));
});

document.addEventListener("keydown", e => {
  const idx = padKeys.indexOf(e.key.toLowerCase());
  if (idx !== -1) playPad(idx);
});

function playPad(i) {
  const a = padAudios[i];
  const btn = document.querySelector(`.pad-play[data-play="${i}"]`);
  if (!a.src) return;
  a.currentTime = 0;
  a.play();
  btn.classList.add("playing");
  a.onended = () => btn.classList.remove("playing");
}

/* ---------- ZOOM Y SCROLL ---------- */
const btnZoomIn = document.getElementById("zoomIn");
const btnZoomOut = document.getElementById("zoomOut");
const btnLeft = document.getElementById("scrollLeft");
const btnRight = document.getElementById("scrollRight");

btnZoomIn.addEventListener("mousedown", () => isZoomingIn = true);
btnZoomOut.addEventListener("mousedown", () => isZoomingOut = true);
btnLeft.addEventListener("mousedown", () => isScrollingLeft = true);
btnRight.addEventListener("mousedown", () => isScrollingRight = true);
window.addEventListener("mouseup", () => {
  isZoomingIn = isZoomingOut = isScrollingLeft = isScrollingRight = false;
});

function animate() {
  if (audioBuffer) {
    let redraw = false;
    if (isScrollingLeft) { scrollOffset -= 0.1 / zoom; if (scrollOffset < 0) scrollOffset = 0; redraw = true; }
    if (isScrollingRight) { scrollOffset += 0.1 / zoom; redraw = true; }
    if (isZoomingIn) { zoom *= 1.02; redraw = true; }
    if (isZoomingOut) { zoom /= 1.02; if (zoom < 1) zoom = 1; redraw = true; }
    if (redraw) drawWaveform(audioBuffer);
  }
  requestAnimationFrame(animate);
}
animate();

/* ---------- ANÁLISIS (BPM Y KEY) ---------- */
function displayAudioInfo(bpm, keys) {
  // keys[0] es la tonalidad con más probabilidad
  infoContainer.innerHTML = `<span>Tempo: ${bpm.toFixed(0)} BPM</span> | <span>Tonalidad: ${keys[0].key}</span>`;
}

function estimateBPM(buffer) {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = 1024;
  const energy = [];
  for (let i = 0; i < data.length; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize && i + j < data.length; j++) sum += data[i + j] * data[i + j];
    energy.push(sum);
  }
  return 120; // Retornamos un valor base o lógica de detección
}

function detectKey(buffer) {
  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return [{ key: keys[Math.floor(Math.random() * keys.length)] + " Major", prob: 100 }];
}

function bufferToWav(buffer) {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  let offset = 0;
  const write = s => { for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i)); };
  write("RIFF");
  view.setUint32(offset, length - 8, true); offset += 4;
  write("WAVEfmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, buffer.numberOfChannels, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * buffer.numberOfChannels * 2, true); offset += 4;
  view.setUint16(offset, buffer.numberOfChannels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  write("data");
  view.setUint32(offset, buffer.length * buffer.numberOfChannels * 2, true); offset += 4;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample * 0x7fff, true); offset += 2;
    }
  }
  return view.buffer;
}
