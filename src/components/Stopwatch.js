import { stopwatchManager } from '../modules/StopwatchManager.js';
import { showAlert } from '../utils/notification.js';

export function Stopwatch() {
  const container = document.createElement('div');
  container.className = 'view-container';

  let intervalId = null;
  let showColorPicker = false;
  let showColorSelection = false;
  let colorPickerTarget = null;
  let isDeletingCustomColors = false;

  // Carrega as cores salvas no localStorage ou usa os valores padrão
  let fastestColor = localStorage.getItem('stopwatch-fastest-color') || '#30d158';
  let slowestColor = localStorage.getItem('stopwatch-slowest-color') || '#ff453a';

  // Handler da modal do ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      if (showColorPicker) {
        showColorPicker = false;
        render();
      } else if (showColorSelection) {
        showColorSelection = false;
        render();
      }
    }
  };

  window.addEventListener('keydown', handleEsc);

  // Carrega as cores personalizadas do localStorage (até 10)
  let customColors = JSON.parse(localStorage.getItem('stopwatch-custom-colors')) || [];

  function formatTime(ms) {
    const date = new Date(ms);
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    const s = String(date.getUTCSeconds()).padStart(2, '0');
    const cs = String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0');
    return `${m}:${s}.${cs}`;
  }

  function getLapStats(laps) {
    if (laps.length < 2) return { fastestIndex: -1, slowestIndex: -1 };

    let fastestIndex = 0;
    let slowestIndex = 0;
    let fastestTime = laps[0].lapTime;
    let slowestTime = laps[0].lapTime;

    laps.forEach((lap, index) => {
      if (lap.lapTime < fastestTime) {
        fastestTime = lap.lapTime;
        fastestIndex = index;
      }
      if (lap.lapTime > slowestTime) {
        slowestTime = lap.lapTime;
        slowestIndex = index;
      }
    });

    return { fastestIndex, slowestIndex };
  }

  function renderColorSelection() {
    return `
            <div class="modal-overlay" id="color-selection-overlay">
                <div class="modal-content" style="max-width: 280px;">
                    <h2>Lap Colors</h2>
                    <div class="color-selection-options">
                        <div class="color-selection-item" id="select-fastest">
                            <span class="color-dot" style="background-color: ${fastestColor}"></span>
                            <span>Fastest lap</span>
                        </div>
                        <div class="color-selection-item" id="select-slowest">
                            <span class="color-dot" style="background-color: ${slowestColor}"></span>
                            <span>Slowest lap</span>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="modal-btn cancel" id="close-selection">Close</button>
                    </div>
                </div>
            </div>
        `;
  }

  function renderColorPicker() {
    const currentColor = colorPickerTarget === 'fastest' ? fastestColor : slowestColor;
    const targetLabel = colorPickerTarget === 'fastest' ? 'Fastest Lap' : 'Slowest Lap';
    const rgb = hexToRgb(currentColor);

    return `
            <div class="modal-overlay" id="color-picker-overlay">
                <div class="color-picker-modal">
                    <div class="color-picker-header">
                        <h2>Edit ${targetLabel} Color</h2>
                        <button class="color-picker-close" id="close-picker">×</button>
                    </div>
                    <div class="color-picker-body">
                        <div class="color-picker-left">
                            <div class="color-spectrum-container">
                                <canvas id="color-spectrum" width="220" height="200"></canvas>
                                <div class="spectrum-cursor" id="spectrum-cursor"></div>
                            </div>
                            <div class="brightness-slider-container">
                                <canvas id="brightness-slider" width="20" height="200"></canvas>
                                <div class="brightness-cursor" id="brightness-cursor"></div>
                            </div>
                        </div>
                        <div class="color-picker-right">
                            <div class="color-preview-box" id="color-preview" style="background-color: ${currentColor}"></div>
                            <div class="color-input-group">
                                <input type="text" class="hex-input" id="hex-input" value="${currentColor}" maxlength="7">
                            </div>
                            <div class="color-input-group">
                                <label>RGB</label>
                            </div>
                            <div class="rgb-inputs">
                                <div class="rgb-input-row">
                                    <input type="number" class="rgb-input" id="rgb-r" min="0" max="255" value="${rgb.r}">
                                    <span>Red</span>
                                </div>
                                <div class="rgb-input-row">
                                    <input type="number" class="rgb-input" id="rgb-g" min="0" max="255" value="${rgb.g}">
                                    <span>Green</span>
                                </div>
                                <div class="rgb-input-row">
                                    <input type="number" class="rgb-input" id="rgb-b" min="0" max="255" value="${rgb.b}">
                                    <span>Blue</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="colors-container">
                        <div class="basic-colors-section">
                            <span class="section-label">Basic colors</span>
                            <div class="basic-colors-grid" id="basic-colors">
                                ${getBasicColorsHTML()}
                            </div>
                        </div>
                        
                        <div class="custom-colors-section">
                            <div class="section-header">
                                <span class="section-label">Custom colors</span>
                                <div class="custom-colors-actions">
                                    <button class="custom-action-btn ${isDeletingCustomColors ? 'active' : ''}" id="toggle-delete-custom" title="Delete custom colors">🗑️</button>
                                    <button class="custom-action-btn" id="add-custom-color" title="Save current color">+</button>
                                </div>
                            </div>
                            <div class="custom-colors-grid ${isDeletingCustomColors ? 'deleting' : ''}" id="custom-colors">
                                ${getCustomColorsHTML()}
                            </div>
                        </div>
                    </div>

                    <div class="color-picker-actions">
                        <button class="modal-btn save" id="save-color">OK</button>
                        <button class="modal-btn cancel" id="cancel-color">Cancel</button>
                    </div>
                </div>
            </div>
        `;
  }

  function getBasicColorsHTML() {
    const basicColors = [
      '#ff8080', '#ff0000', '#c00000', '#ff80c0', '#ff00ff', '#c000c0', '#8080ff', '#0000ff', '#0000c0', '#00c0ff', '#00ffff', '#00c0c0',
      '#ffc000', '#ff8000', '#c08000', '#ffff00', '#c0c000', '#808000', '#80ff00', '#00ff00', '#00c000', '#00ff80', '#00c080', '#008080',
      '#80ff80', '#80c080', '#408040', '#00c040', '#008040', '#004040', '#80ffff', '#80c0c0', '#408080', '#0080c0', '#004080', '#000080',
      '#8080c0', '#4040c0', '#000040', '#804080', '#400040', '#c080c0', '#c0c0c0', '#808080', '#404040', '#000000', '#ffffff', '#c0c0ff'
    ];

    return basicColors.map(color =>
      `<div class="basic-color-swatch" data-color="${color}" style="background-color: ${color}"></div>`
    ).join('');
  }

  function getCustomColorsHTML() {
    const slots = [];
    for (let i = 0; i < 10; i++) {
      if (i < customColors.length) {
        slots.push(`
                    <div class="custom-color-swatch-container">
                        <div class="custom-color-swatch" data-color="${customColors[i]}" data-index="${i}" style="background-color: ${customColors[i]}"></div>
                        ${isDeletingCustomColors ? '<div class="delete-overlay">×</div>' : ''}
                    </div>
                `);
      } else {
        slots.push(`<div class="custom-color-slot-empty"></div>`);
      }
    }
    return slots.join('');
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function initColorPicker() {
    const spectrum = container.querySelector('#color-spectrum');
    const brightnessSlider = container.querySelector('#brightness-slider');
    const spectrumCursor = container.querySelector('#spectrum-cursor');
    const brightnessCursor = container.querySelector('#brightness-cursor');
    const hexInput = container.querySelector('#hex-input');
    const rgbR = container.querySelector('#rgb-r');
    const rgbG = container.querySelector('#rgb-g');
    const rgbB = container.querySelector('#rgb-b');
    const preview = container.querySelector('#color-preview');
    const addCustomBtn = container.querySelector('#add-custom-color');
    const toggleDeleteBtn = container.querySelector('#toggle-delete-custom');

    let currentHue = 0;
    let currentSat = 100;
    let currentLight = 50;

    // Inicializa com a cor atual
    const currentColor = colorPickerTarget === 'fastest' ? fastestColor : slowestColor;
    const rgb = hexToRgb(currentColor);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    currentHue = hsl.h;
    currentSat = hsl.s;
    currentLight = hsl.l;

    // Desenha o espectro
    function drawSpectrum() {
      const ctx = spectrum.getContext('2d');
      const width = spectrum.width;
      const height = spectrum.height;

      for (let x = 0; x < width; x++) {
        const hue = (x / width) * 360;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `hsl(${hue}, 100%, 100%)`);
        gradient.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`);
        gradient.addColorStop(1, `hsl(${hue}, 100%, 0%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, 1, height);
      }
    }

    // Desenha o slider de brilho
    function drawBrightnessSlider() {
      const ctx = brightnessSlider.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, brightnessSlider.height);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, `hsl(${currentHue}, ${currentSat}%, 50%)`);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, brightnessSlider.width, brightnessSlider.height);
    }

    function updateFromHSL() {
      const rgb = hslToRgb(currentHue, currentSat, currentLight);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      hexInput.value = hex;
      rgbR.value = rgb.r;
      rgbG.value = rgb.g;
      rgbB.value = rgb.b;
      preview.style.backgroundColor = hex;

      // Atualiza a posição do cursor
      const spectrumX = (currentHue / 360) * spectrum.width;
      const spectrumY = (1 - currentLight / 100) * spectrum.height;
      spectrumCursor.style.left = `${spectrumX}px`;
      spectrumCursor.style.top = `${spectrumY}px`;

      const brightnessY = (1 - currentLight / 100) * brightnessSlider.height;
      brightnessCursor.style.top = `${brightnessY}px`;
    }

    function updateFromRGB(r, g, b) {
      const hsl = rgbToHsl(r, g, b);
      currentHue = hsl.h;
      currentSat = hsl.s;
      currentLight = hsl.l;
      updateFromHSL();
      drawBrightnessSlider();
    }

    drawSpectrum();
    drawBrightnessSlider();
    updateFromHSL();

    // Interação com o espectro
    let isDraggingSpectrum = false;

    function handleSpectrumInteraction(e) {
      const rect = spectrum.getBoundingClientRect();
      const x = Math.max(0, Math.min(spectrum.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(spectrum.height, e.clientY - rect.top));

      currentHue = (x / spectrum.width) * 360;
      currentLight = (1 - y / spectrum.height) * 100;

      drawBrightnessSlider();
      updateFromHSL();
    }

    spectrum.addEventListener('mousedown', (e) => {
      isDraggingSpectrum = true;
      handleSpectrumInteraction(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingSpectrum) handleSpectrumInteraction(e);
    });

    document.addEventListener('mouseup', () => {
      isDraggingSpectrum = false;
    });

    // Interação com o slider de brilho
    let isDraggingBrightness = false;

    function handleBrightnessInteraction(e) {
      const rect = brightnessSlider.getBoundingClientRect();
      const y = Math.max(0, Math.min(brightnessSlider.height, e.clientY - rect.top));
      currentLight = (1 - y / brightnessSlider.height) * 100;
      updateFromHSL();
    }

    brightnessSlider.addEventListener('mousedown', (e) => {
      isDraggingBrightness = true;
      handleBrightnessInteraction(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingBrightness) handleBrightnessInteraction(e);
    });

    document.addEventListener('mouseup', () => {
      isDraggingBrightness = false;
    });

    // Manipuladores de entrada
    hexInput.addEventListener('input', (e) => {
      const hex = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        const rgb = hexToRgb(hex);
        updateFromRGB(rgb.r, rgb.g, rgb.b);
      }
    });

    [rgbR, rgbG, rgbB].forEach(input => {
      input.addEventListener('input', () => {
        const r = parseInt(rgbR.value) || 0;
        const g = parseInt(rgbG.value) || 0;
        const b = parseInt(rgbB.value) || 0;
        updateFromRGB(r, g, b);
      });
    });

    // Seleção de cores básicas
    container.querySelectorAll('.basic-color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        const rgb = hexToRgb(color);
        updateFromRGB(rgb.r, rgb.g, rgb.b);
      });
    });

    // Seleção e exclusão de cores personalizadas
    function attachCustomColorListeners() {
      container.querySelectorAll('.custom-color-swatch').forEach(swatch => {
        swatch.onclick = (e) => {
          if (isDeletingCustomColors) {
            const index = parseInt(swatch.dataset.index);
            customColors.splice(index, 1);
            localStorage.setItem('stopwatch-custom-colors', JSON.stringify(customColors));
            refreshCustomColors();
          } else {
            const color = swatch.dataset.color;
            const rgb = hexToRgb(color);
            updateFromRGB(rgb.r, rgb.g, rgb.b);
          }
        };
      });
    }

    function refreshCustomColors() {
      container.querySelector('#custom-colors').innerHTML = getCustomColorsHTML();
      attachCustomColorListeners();
    }

    attachCustomColorListeners();

    // Adiciona uma nova cor personalizada
    addCustomBtn.addEventListener('click', () => {
      if (customColors.length >= 10) {
        showAlert('Maximum 10 custom colors reached.', 'Limit Reached');
        return;
      }
      const color = hexInput.value;
      if (!customColors.includes(color)) {
        customColors.push(color);
        localStorage.setItem('stopwatch-custom-colors', JSON.stringify(customColors));
        refreshCustomColors();
      }
    });

    // Ativa o modo de exclusão de cores personalizadas
    toggleDeleteBtn.addEventListener('click', () => {
      isDeletingCustomColors = !isDeletingCustomColors;
      toggleDeleteBtn.classList.toggle('active', isDeletingCustomColors);
      container.querySelector('#custom-colors').classList.toggle('deleting', isDeletingCustomColors);
      refreshCustomColors();
    });

    // Botões de ação
    container.querySelector('#save-color').addEventListener('click', () => {
      const hex = hexInput.value;
      if (colorPickerTarget === 'fastest') {
        fastestColor = hex;
        localStorage.setItem('stopwatch-fastest-color', hex);
      } else {
        slowestColor = hex;
        localStorage.setItem('stopwatch-slowest-color', hex);
      }
      showColorPicker = false;
      colorPickerTarget = null;
      isDeletingCustomColors = false;
      render();
    });

    container.querySelector('#cancel-color').addEventListener('click', () => {
      showColorPicker = false;
      colorPickerTarget = null;
      isDeletingCustomColors = false;
      render();
    });

    container.querySelector('#close-picker').addEventListener('click', () => {
      showColorPicker = false;
      colorPickerTarget = null;
      isDeletingCustomColors = false;
      render();
    });

    container.querySelector('#color-picker-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'color-picker-overlay') {
        showColorPicker = false;
        colorPickerTarget = null;
        isDeletingCustomColors = false;
        render();
      }
    });
  }

  function downloadResults() {
    const state = stopwatchManager.getState();
    if (state.laps.length === 0 && state.elapsed === 0) {
      showAlert('No data to download.', 'Empty Stopwatch');
      return;
    }

    const { fastestIndex, slowestIndex } = getLapStats(state.laps);
    const now = new Date();
    const dateStr = now.toLocaleString();

    let content = `STOPWATCH RESULTS\n`;
    content += `Date: ${dateStr}\n`;
    content += `Total Time: ${formatTime(state.elapsed)}\n`;
    content += `-------------------------------------------\n`;
    content += `LAP      LAP TIME      TOTAL TIME\n`;
    content += `-------------------------------------------\n`;

    state.laps.reverse().forEach((lap, revIndex) => {
      const originalIndex = state.laps.length - 1 - revIndex;
      const lapNum = String(revIndex + 1).padEnd(8);
      const lapTime = formatTime(lap.lapTime).padEnd(14);
      const totalTime = formatTime(lap.totalTime);

      let line = `${lapNum}${lapTime}${totalTime}`;

      if (originalIndex === fastestIndex && state.laps.length >= 2) {
        line += `  [FASTEST]`;
      } else if (originalIndex === slowestIndex && state.laps.length >= 2) {
        line += `  [SLOWEST]`;
      }

      content += line + `\n`;
    });

    // Reverte de volta para não quebrar o estado interno se laps for por referência
    state.laps.reverse();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stopwatch_results_${now.getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function initColorSelection() {
    const overlay = container.querySelector('#color-selection-overlay');

    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'color-selection-overlay') {
        showColorSelection = false;
        render();
      }
    });

    container.querySelector('#select-fastest').onclick = () => {
      showColorSelection = false;
      colorPickerTarget = 'fastest';
      showColorPicker = true;
      render();
    };

    container.querySelector('#select-slowest').onclick = () => {
      showColorSelection = false;
      colorPickerTarget = 'slowest';
      showColorPicker = true;
      render();
    };

    container.querySelector('#close-selection').onclick = () => {
      showColorSelection = false;
      render();
    };
  }

  function render() {
    const state = stopwatchManager.getState();
    const { fastestIndex, slowestIndex } = getLapStats(state.laps);

    container.innerHTML = `
            <div class="header">
                <h1>Stopwatch</h1>
                <div class="add-btn-container">
                    <button class="add-btn" id="download-btn" style="font-size: 14px; width: auto; padding: 0 10px; display: ${state.laps.length > 0 || state.elapsed > 0 ? 'inline-block' : 'none'}">Download</button>
                    <button class="add-btn" id="colors-btn" style="font-size: 14px; width: auto; padding: 0 10px;">Colors</button>
                </div>
            </div>
            <div class="stopwatch-display">${formatTime(state.elapsed)}</div>
            <div class="controls">
                <button class="control-btn ${state.isRunning ? 'stop' : 'start'}" id="toggle-btn">
                    ${state.isRunning ? 'Stop' : 'Start'}
                </button>
                <button class="control-btn reset" id="lap-reset-btn">
                    ${state.isRunning ? 'Lap' : 'Reset'}
                </button>
            </div>
            <div class="laps-list">
                ${state.laps.map((lap, index) => {
      let lapClass = 'lap-item';
      let lapStyle = '';
      if (index === fastestIndex) {
        lapClass += ' lap-fastest';
        lapStyle = `style="color: ${fastestColor}"`;
      } else if (index === slowestIndex) {
        lapClass += ' lap-slowest';
        lapStyle = `style="color: ${slowestColor}"`;
      }
      return `
                        <div class="${lapClass}" ${lapStyle}>
                            <span>Lap ${state.laps.length - index}</span>
                            <span>${formatTime(lap.lapTime)}</span>
                        </div>
                    `;
    }).join('')}
            </div>
            ${showColorSelection ? renderColorSelection() : ''}
            ${showColorPicker ? renderColorPicker() : ''}
        `;

    attachListeners();
    if (showColorSelection) {
      initColorSelection();
    }
    if (showColorPicker) {
      initColorPicker();
    }

    if (state.isRunning) {
      startInterval();
    }
  }

  function attachListeners() {
    container.querySelector('#toggle-btn').onclick = toggle;
    container.querySelector('#lap-reset-btn').onclick = lapOrReset;

    const colorsBtn = container.querySelector('#colors-btn');
    if (colorsBtn) {
      colorsBtn.onclick = () => {
        showColorSelection = true;
        render();
      };
    }

    const downloadBtn = container.querySelector('#download-btn');
    if (downloadBtn) {
      downloadBtn.onclick = downloadResults;
    }
  }

  function toggle() {
    const state = stopwatchManager.getState();
    if (state.isRunning) {
      stopwatchManager.stop();
      stopInterval();
    } else {
      stopwatchManager.start();
      startInterval();
    }
    render();
  }

  function startInterval() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      const display = container.querySelector('.stopwatch-display');
      if (display) display.textContent = formatTime(stopwatchManager.getElapsed());
    }, 10);
  }

  function stopInterval() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function lapOrReset() {
    const state = stopwatchManager.getState();
    if (state.isRunning) {
      stopwatchManager.lap();
    } else {
      stopwatchManager.reset();
    }
    render();
  }

  render();

  return {
    element: container,
    cleanup: () => {
      stopInterval();
      window.removeEventListener('keydown', handleEsc);
    }
  };
}
