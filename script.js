const imageInput = document.getElementById('imageInput');
const fileNameDisplay = document.getElementById('fileName');
const canvas = document.getElementById('stageCanvas');
const ctx = canvas.getContext('2d');
const stageControlGroup = document.getElementById('stageControlGroup');
const calcControlGroup = document.getElementById('calcControlGroup');
const resetRectBtn = document.getElementById('resetRectBtn');

const angleSlider = document.getElementById('angleSlider');
const angleValue = document.getElementById('angleValue');
const reflectCountSlider = document.getElementById('reflectCountSlider');
const reflectCountValue = document.getElementById('reflectCountValue');
const ringSizeSlider = document.getElementById('ringSizeSlider');
const ringSizeValue = document.getElementById('ringSizeValue');
const stepButtons = document.querySelectorAll('.step-btn');

let loadedImage = null;
let stageRect = { x: 0, y: 0, width: 0, height: 0 };
let launchPoint = null; 
let ringRadius = 45;    

let isDragging = false;
let activeHandle = null;

canvas.width = 600;
canvas.height = 800;
drawPlaceholder();

imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  fileNameDisplay.textContent = file.name;
  stageControlGroup.style.display = 'flex';
  calcControlGroup.style.display = 'flex';

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      canvas.width = img.width;
      canvas.height = img.height;

      initDefaultStageRect();
      launchPoint = {
        x: stageRect.x + stageRect.width / 2,
        y: stageRect.y + stageRect.height * 0.8
      };

      redraw();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function initDefaultStageRect() {
  if (!loadedImage) return;
  
  // 【iPhone17完全対応・あなたの黄金比率】
  const w = loadedImage.width * 0.994;      
  const h = loadedImage.height * 0.500;     
  const x = (loadedImage.width - w) / 2 + (loadedImage.width * -0.001); 
  const y = loadedImage.height * 0.192;     

  stageRect = { x, y, width: w, height: h };
}

resetRectBtn.addEventListener('click', () => {
  initDefaultStageRect();
  launchPoint = {
    x: stageRect.x + stageRect.width / 2,
    y: stageRect.y + stageRect.height * 0.8
  };
  redraw();
});

angleSlider.addEventListener('input', (e) => {
  angleValue.textContent = parseFloat(e.target.value).toFixed(1);
  redraw();
});

reflectCountSlider.addEventListener('input', (e) => {
  reflectCountValue.textContent = e.target.value;
  redraw();
});

ringSizeSlider.addEventListener('input', (e) => {
  ringRadius = parseInt(e.target.value, 10);
  ringSizeValue.textContent = ringRadius;
  redraw();
});

stepButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const step = parseFloat(btn.dataset.step);
    let currentAngle = parseFloat(angleSlider.value);
    currentAngle = (currentAngle + step + 360) % 360;
    
    angleSlider.value = currentAngle;
    angleValue.textContent = currentAngle.toFixed(1);
    redraw();
  });
});

function redraw() {
  if (!loadedImage) {
    drawPlaceholder();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);

  // 1. ステージ枠描画
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 4;
  ctx.strokeRect(stageRect.x, stageRect.y, stageRect.width, stageRect.height);

  // 2. キャラ判定円（点線廃止・クッキリ実線＋くっきり背景影＋強力な中心黒丸）
  if (launchPoint) {
    ctx.save();
    
    // ① 【点線なし・クッキリ実線】外枠の黒い影（どんな背景でも浮き出させる）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.setLineDash([]); // 実線にする
    ctx.beginPath();
    ctx.arc(launchPoint.x, launchPoint.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // ② 外枠のメインカラー（鮮やかなネオンシアン・水色）
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(launchPoint.x, launchPoint.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // ③ 中心の強力なターゲット黒丸（白フチ＋黒ドット）
    // 白いフチ
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(launchPoint.x, launchPoint.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // 中心の黒丸
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(launchPoint.x, launchPoint.y, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    drawReflectionPath();
  }

  // 3. 枠調整ハンドル描画
  const handles = getHandlePositions();
  for (let key in handles) {
    const h = handles[key];
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawReflectionPath() {
  const angleDeg = parseFloat(angleSlider.value);
  const maxReflections = parseInt(reflectCountSlider.value, 10);
  const rad = (angleDeg - 90) * (Math.PI / 180);

  let currentX = launchPoint.x;
  let currentY = launchPoint.y;
  let dirX = Math.cos(rad);
  let dirY = Math.sin(rad);

  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(currentX, currentY);

  for (let i = 0; i < maxReflections; i++) {
    let tMin = Infinity;
    let hitNormal = null;

    if (dirX < 0) {
      let t = (stageRect.x - currentX) / dirX;
      if (t > 0.001 && t < tMin) {
        let intersectY = currentY + t * dirY;
        if (intersectY >= stageRect.y && intersectY <= stageRect.y + stageRect.height) {
          tMin = t;
          hitNormal = 'left';
        }
      }
    }

    if (dirX > 0) {
      let t = ((stageRect.x + stageRect.width) - currentX) / dirX;
      if (t > 0.001 && t < tMin) {
        let intersectY = currentY + t * dirY;
        if (intersectY >= stageRect.y && intersectY <= stageRect.y + stageRect.height) {
          tMin = t;
          hitNormal = 'right';
        }
      }
    }

    if (dirY < 0) {
      let t = (stageRect.y - currentY) / dirY;
      if (t > 0.001 && t < tMin) {
        let intersectX = currentX + t * dirX;
        if (intersectX >= stageRect.x && intersectX <= stageRect.x + stageRect.width) {
          tMin = t;
          hitNormal = 'top';
        }
      }
    }

    if (dirY > 0) {
      let t = ((stageRect.y + stageRect.height) - currentY) / dirY;
      if (t > 0.001 && t < tMin) {
        let intersectX = currentX + t * dirX;
        if (intersectX >= stageRect.x && intersectX <= stageRect.x + stageRect.width) {
          tMin = t;
          hitNormal = 'bottom';
        }
      }
    }

    if (tMin === Infinity) break;

    currentX += dirX * tMin;
    currentY += dirY * tMin;
    ctx.lineTo(currentX, currentY);

    if (hitNormal === 'left' || hitNormal === 'right') {
      dirX = -dirX;
    } else if (hitNormal === 'top' || hitNormal === 'bottom') {
      dirY = -dirY;
    }
  }

  ctx.stroke();
}

function getHandlePositions() {
  return {
    tl: { x: stageRect.x, y: stageRect.y },
    tr: { x: stageRect.x + stageRect.width, y: stageRect.y },
    bl: { x: stageRect.x, y: stageRect.y + stageRect.height },
    br: { x: stageRect.x + stageRect.width, y: stageRect.y + stageRect.height }
  };
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('touchstart', startDrag, { passive: false });

function startDrag(e) {
  if (!loadedImage) return;
  
  const pos = getCanvasPos(e);
  const handles = getHandlePositions();
  const hitRadius = 45 * (canvas.width / canvas.getBoundingClientRect().width); 
  
  activeHandle = null;

  for (let key in handles) {
    const h = handles[key];
    if (Math.hypot(pos.x - h.x, pos.y - h.y) < hitRadius) {
      if (e.cancelable) e.preventDefault();
      activeHandle = key;
      isDragging = true;
      return;
    }
  }

  const distToLaunch = launchPoint ? Math.hypot(pos.x - launchPoint.x, pos.y - launchPoint.y) : Infinity;
  if (distToLaunch < ringRadius * 1.5 || 
     (pos.x >= stageRect.x && pos.x <= stageRect.x + stageRect.width &&
      pos.y >= stageRect.y && pos.y <= stageRect.y + stageRect.height)) {
    if (e.cancelable) e.preventDefault();
    launchPoint = { x: pos.x, y: pos.y };
    activeHandle = 'launch';
    isDragging = true;
    redraw();
    return;
  }
}

window.addEventListener('mousemove', drag);
window.addEventListener('touchmove', drag, { passive: false });

function drag(e) {
  if (!isDragging || !loadedImage) return;
  if (e.cancelable) e.preventDefault();

  const pos = getCanvasPos(e);

  if (activeHandle === 'tl') {
    const right = stageRect.x + stageRect.width;
    const bottom = stageRect.y + stageRect.height;
    stageRect.x = Math.min(pos.x, right - 50);
    stageRect.y = Math.min(pos.y, bottom - 50);
    stageRect.width = right - stageRect.x;
    stageRect.height = bottom - stageRect.y;
  } else if (activeHandle === 'tr') {
    const left = stageRect.x;
    const bottom = stageRect.y + stageRect.height;
    stageRect.width = Math.max(pos.x - left, 50);
    stageRect.y = Math.min(pos.y, bottom - 50);
    stageRect.height = bottom - stageRect.y;
  } else if (activeHandle === 'bl') {
    const right = stageRect.x + stageRect.width;
    const top = stageRect.y;
    stageRect.x = Math.min(pos.x, right - 50);
    stageRect.width = right - stageRect.x;
    stageRect.height = Math.max(pos.y - top, 50);
  } else if (activeHandle === 'br') {
    const left = stageRect.x;
    const top = stageRect.y;
    stageRect.width = Math.max(pos.x - left, 50);
    stageRect.height = Math.max(pos.y - top, 50);
  } else if (activeHandle === 'launch') {
    launchPoint.x = Math.max(stageRect.x, Math.min(pos.x, stageRect.x + stageRect.width));
    launchPoint.y = Math.max(stageRect.y, Math.min(pos.y, stageRect.y + stageRect.height));
  }

  redraw();
}

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

function endDrag() {
  isDragging = false;
  activeHandle = null;
}

function drawPlaceholder() {
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#888888';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('スクショ画像を選択してください', canvas.width / 2, canvas.height / 2);
}