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
const infoContainer = document.createElement("div");
infoContainer.classList.add("audio-info");
document.querySelector(".analyzer").appendChild(infoContainer);

/* ---------- RESIZE CANVAS ---------- */
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  if (audioBuffer) drawWaveform(audioBuffer);
});

resizeCanvas();

/* ---------- DURACIÓN ---------- */
durationInput.addEventListener("input", () => {
  const val = parseFloat(durationInput.value);
  durationValue.textContent = val.toFixed(2);
  selectionDuration = val;
  if (audioBuffer) drawWaveform(audioBuffer);
});

/* ---------- CARGAR AUDIO ---------- */
fileInput.addEventListener("change", async () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const file = fileInput.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  audio.src = URL.createObjectURL(file);
  audio.load();

  playPosition = 0;
  selectionStart = 0;
  drawWaveform(audioBuffer);

  // ✅ Actualizar info de audio
  const bpm = estimateBPM(audioBuffer);
  const keys = detectKey(audioBuffer);
  displayAudioInfo(bpm, keys);
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
canvas.addEventListener("click", e => {
  if (!audioBuffer) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;

  const visibleDuration = audioBuffer.duration / zoom;
  const clickTime = scrollOffset + (x / rect.width) * visibleDuration;

  selectionStart = clickTime;
  playPosition = clickTime;

  drawWaveform(audioBuffer);
});

function drawWaveform(buffer) {
  resizeCanvas();

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

  // ---- 1️⃣ Dibujar forma de onda ----
  for (let i = 0; i < rect.width; i++) {
    let min = 1;
    let max = -1;

    for (let j = 0; j < step; j++) {
      const idx = startSample + i * step + j;
      if (idx >= endSample) break;
      const datum = data[idx];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    const hue = (i / rect.width) * 360;
    ctx2d.strokeStyle = 'hsl(' + hue + ', 80%, 60%)';

    ctx2d.beginPath();
    ctx2d.moveTo(i, amp * (1 - min) + (rect.height - 2 * amp) / 2);
    ctx2d.lineTo(i, amp * (1 - max) + (rect.height - 2 * amp) / 2);
    ctx2d.stroke();
  }

  // ---- 2️⃣ Dibujar grid estilo DAW (picos locales) ----
  const gridThreshold = 0.7; // ajusta sensibilidad (0-1)
  const minSpacing = 10; // mínimo espacio entre líneas (en píxeles)
  let lastLineX = -minSpacing;

  ctx2d.strokeStyle = "rgba(255,255,255,0.2)";
  ctx2d.lineWidth = 1;

  for (let i = 0; i < rect.width; i++) {
    let maxSample = -1;
    for (let j = 0; j < step; j++) {
      const idx = startSample + i * step + j;
      if (idx >= endSample) break;
      const datum = Math.abs(data[idx]);
      if (datum > maxSample) maxSample = datum;
    }

    if (maxSample >= gridThreshold && i - lastLineX >= minSpacing) {
      ctx2d.beginPath();
      ctx2d.moveTo(i, 0);
      ctx2d.lineTo(i, rect.height);
      ctx2d.stroke();
      lastLineX = i;
    }
  }

  // ---- 3️⃣ Dibujar selección ----
  const selStartX = ((selectionStart - scrollOffset) / visibleDuration) * rect.width;
  const selEndX = ((selectionStart + selectionDuration - scrollOffset) / visibleDuration) * rect.width;

  ctx2d.fillStyle = "rgba(255, 47, 146, 0.3)";
  ctx2d.fillRect(selStartX, 0, selEndX - selStartX, rect.height);

  ctx2d.strokeStyle = "#ff2f92";
  ctx2d.lineWidth = 2;
  ctx2d.strokeRect(selStartX, 0, selEndX - selStartX, rect.height);
}

/* ---------- WAV EXPORT ---------- */
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
      let sample = buffer.getChannelData(ch)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }
  }
  return view.buffer;
}

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

/* ---------- BOTONES ZOOM Y SCROLL ---------- */
const btnZoomIn = document.getElementById("zoomIn");
const btnZoomOut = document.getElementById("zoomOut");
const btnLeft = document.getElementById("scrollLeft");
const btnRight = document.getElementById("scrollRight");

btnZoomIn.addEventListener("mousedown", () => isZoomingIn = true);
btnZoomIn.addEventListener("mouseup", () => isZoomingIn = false);
btnZoomIn.addEventListener("mouseleave", () => isZoomingIn = false);

btnZoomOut.addEventListener("mousedown", () => isZoomingOut = true);
btnZoomOut.addEventListener("mouseup", () => isZoomingOut = false);
btnZoomOut.addEventListener("mouseleave", () => isZoomingOut = false);

btnLeft.addEventListener("mousedown", () => isScrollingLeft = true);
btnLeft.addEventListener("mouseup", () => isScrollingLeft = false);
btnLeft.addEventListener("mouseleave", () => isScrollingLeft = false);

btnRight.addEventListener("mousedown", () => isScrollingRight = true);
btnRight.addEventListener("mouseup", () => isScrollingRight = false);
btnRight.addEventListener("mouseleave", () => isScrollingRight = false);

/* ---------- ANIMACIÓN FLUIDA ---------- */
function animateWaveform() {
  if (!audioBuffer) {
    requestAnimationFrame(animateWaveform);
    return;
  }

  let needsRedraw = false;

  if (isScrollingLeft) {
    scrollOffset -= scrollSpeed / 60 / zoom;
    if (scrollOffset < 0) scrollOffset = 0;
    needsRedraw = true;
  }

  if (isScrollingRight) {
    const maxOffset = audioBuffer.duration - audioBuffer.duration / zoom;
    scrollOffset += scrollSpeed / 60 / zoom;
    if (scrollOffset > maxOffset) scrollOffset = maxOffset;
    needsRedraw = true;
  }

  if (isZoomingIn) {
    zoom *= 1 + zoomSpeed;
    if (zoom > 32) zoom = 32;
    const maxOffset = audioBuffer.duration - audioBuffer.duration / zoom;
    if (scrollOffset > maxOffset) scrollOffset = maxOffset;
    needsRedraw = true;
  }

  if (isZoomingOut) {
    zoom /= 1 + zoomSpeed;
    if (zoom < 1) zoom = 1;
    const maxOffset = audioBuffer.duration - audioBuffer.duration / zoom;
    if (scrollOffset > maxOffset) scrollOffset = maxOffset;
    needsRedraw = true;
  }

  if (needsRedraw) drawWaveform(audioBuffer);

  requestAnimationFrame(animateWaveform);
}

animateWaveform();

/* ---------- INFO DE AUDIO ---------- */
function displayAudioInfo(bpm, keys) {
  infoContainer.innerHTML = `
    <div><strong>Tempo:</strong> ${bpm.toFixed(0)} BPM</div>
    <div><strong>Tonalidades probables:</strong></div>
    <ul>
      ${keys.map(k => <li>${k.key}: ${k.prob.toFixed(1)}%</li>).join("")}
    </ul>
  `;
}

/* ---------- ESTIMACIÓN DE TEMPO (BPM) MÁS PRECISA ---------- */
function estimateBPM(buffer) {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  // Suavizado de la señal
  const alpha = 0.9;
  let prev = 0;
  const filtered = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    filtered[i] = alpha * prev + (1 - alpha) * data[i];
    prev = filtered[i];
  }

  // Energía por ventana
  const windowSize = 1024;
  const energy = [];
  for (let i = 0; i < filtered.length; i += windowSize) {
    let sum = 0;
    for (let j = 0; j < windowSize && i + j < filtered.length; j++)
      sum += filtered[i + j] * filtered[i + j];
    energy.push(sum);
  }

  // Autocorrelación normalizada
  const ac = [];
  const N = energy.length;
  for (let lag = 1; lag < N / 2; lag++) {
    let sum = 0;
    for (let i = 0; i < N - lag; i++) sum += energy[i] * energy[i + lag];
    ac.push(sum / (N - lag));
  }

  // Pico más prominente
  let peak = 0;
  let max = -Infinity;
  for (let i = 0; i < ac.length; i++) {
    if (ac[i] > max) {
      max = ac[i];
      peak = i + 1;
    }
  }

  const secondsPerWindow = windowSize / sampleRate;
  let bpm = 60 / (peak * secondsPerWindow);

  // Ajustar múltiplos/submúltiplos (60-200 BPM)
  while (bpm < 60) bpm *= 2;
  while (bpm > 200) bpm /= 2;

  return bpm;
}




/* ---------- DETECCIÓN DE TONALIDAD SIMPLIFICADA ---------- */
function detectKey(buffer) {
  const fftSize = 16384;
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  // Acortar señal si es muy larga
  const segment = data.slice(0, Math.min(data.length, fftSize));

  // Calcular magnitud por frecuencia
  const magnitudes = new Array(fftSize / 2).fill(0);
  for (let k = 0; k < fftSize / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < segment.length; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      re += segment[n] * Math.cos(angle);
      im -= segment[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(re*re + im*im);
  }

  // Mapear frecuencias a notas (C, C#, D…)
  const keys = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const keyScores = new Array(keys.length).fill(0);

  for (let k = 1; k < magnitudes.length; k++) {
    const freq = k * sampleRate / fftSize;
    const note = Math.round(12 * (Math.log2(freq / 440))) + 9; // 440 Hz = A4
    if (note < 0) continue;
    const idx = ((note % 12) + 12) % 12;
    keyScores[idx] += magnitudes[k];
  }

  // Ordenar y devolver top 3
  const result = keyScores
    .map((score, idx) => ({ key: keys[idx], prob: score }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);

  // Normalizar probabilidad a %
  const total = result.reduce((a,b) => a+b.prob, 0);
  result.forEach(r => r.prob = (r.prob / total) * 100);

  return result;
}