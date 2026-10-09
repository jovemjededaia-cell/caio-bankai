const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND = H - 80;
const GRAVITY = 0.7;

// ===== KEY BINDINGS =====
const DEFAULT_BINDINGS = {
  p1: { left:'a', right:'d', up:'w', down:'s', punch:'f', kick:'g', magic:'h', special:'j', breaker:'t' },
  p2: { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown', punch:'k', kick:'l', magic:'o', special:'p', breaker:'i' }
};
let bindings = JSON.parse(localStorage.getItem('resnhaBindings')) || JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
function saveBindings() { localStorage.setItem('resnhaBindings', JSON.stringify(bindings)); }
function resetBindings() { bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS)); saveBindings(); }

// ===== KONAMI CODE =====
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiProgress = 0;
let konamiUnlocked = false;
let konamiFlash = 0;
let unlockedChars = JSON.parse(localStorage.getItem('resnhaUnlocked')) || [];

function checkKonami(key) {
  if (konamiUnlocked) return;
  const k = key.length === 1 ? key.toLowerCase() : key;
  const expected = KONAMI[konamiProgress].length === 1 ? KONAMI[konamiProgress].toLowerCase() : KONAMI[konamiProgress];
  if (k === expected) {
    konamiProgress++;
    if (konamiProgress === KONAMI.length) {
      konamiUnlocked = true;
      konamiFlash = 180;
      const secrets = ['Gojo','Gon','Bolsonaro','Lula'];
      unlockedChars = [...new Set([...unlockedChars, ...secrets])];
      localStorage.setItem('resnhaUnlocked', JSON.stringify(unlockedChars));
    }
  } else {
    konamiProgress = (k === KONAMI[0].toLowerCase() || k === KONAMI[0]) ? 1 : 0;
  }
}

// ===== CHARACTERS =====
const CHARACTERS = [
  { id:'azul', name:'Azul', color:'#4af', locked:false,
    magic:{ color:'#4af', dmg:10, speed:8, size:12 },
    special:{ name:'Explosão', type:'area', dmg:25, radius:120 } },
  { id:'vermelho', name:'Vermelho', color:'#f44', locked:false,
    magic:{ color:'#f80', dmg:10, speed:8, size:14 },
    special:{ name:'Investida', type:'dash', dmg:22, speed:14, duration:20 } },
  { id:'gojo', name:'Gojo', color:'#a0f', locked:true,
    magic:{ color:'#c0f', dmg:12, speed:10, size:16 },
    special:{ name:'Domain Expansion', type:'domain', dmg:35, radius:200 } },
  { id:'gon', name:'Gon', color:'#4f4', locked:true,
    magic:{ color:'#4f4', dmg:10, speed:7, size:12 },
    special:{ name:'Golpe Gigante', type:'bigprojectile', dmg:30, speed:12, size:35 } },
  { id:'bolsonaro', name:'Bolsonaro', color:'#fd0', locked:true,
    magic:{ color:'#fd0', dmg:8, speed:6, size:10 },
    special:{ name:'Discurso', type:'stun', dmg:15, stunDuration:120 } },
  { id:'lula', name:'Lula', color:'#28f', locked:true,
    magic:{ color:'#28f', dmg:10, speed:7, size:11 },
    special:{ name:'Festa', type:'heal', dmg:12, heal:20, radius:100 } }
];

// ===== GAME STATE =====
let gameState = 'SELECT';
let p1Char = 0, p2Char = 1;
let p1Selected = false, p2Selected = false;
let projectiles = [];
let screenShake = 0;

// ===== PROJECTILE =====
class Projectile {
  constructor(x, y, dir, charData, isSpecial) {
    this.x = x; this.y = y;
    this.dir = dir;
    this.color = charData.magic.color;
    this.dmg = charData.magic.dmg;
    this.speed = charData.magic.speed;
    this.size = charData.magic.size;
    this.alive = true;
    if (isSpecial && charData.special.type === 'bigprojectile') {
      this.dmg = charData.special.dmg;
      this.speed = charData.special.speed;
      this.size = charData.special.size;
    }
  }
  update() {
    this.x += this.dir * this.speed;
    if (this.x < -50 || this.x > W + 50) this.alive = false;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '44';
    ctx.fill();
  }
}

// ===== FIGHTER =====
class Fighter {
  constructor(charIndex, playerIndex, x) {
    const ch = CHARACTERS[charIndex];
    this.charIndex = charIndex;
    this.charData = ch;
    this.x = x; this.y = GROUND;
    this.w = 50; this.h = 90;
    this.vx = 0; this.vy = 0;
    this.color = ch.color;
    this.name = ch.name;
    this.hp = 100; this.maxHp = 100;
    this.facing = 1;
    this.attacking = false;
    this.attackType = null;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.hitFlash = 0;
    this.playerIndex = playerIndex;
    this.blocking = false;
    this.alive = true;
    this.superMeter = 0;
    this.maxSuper = 100;
    this.parryTimer = 0;
    this.parryCooldown = 0;
    this.stunTimer = 0;
    this.dashTimer = 0;
    this.dashDir = 0;
  }

  get controls() { return bindings[this.playerIndex]; }

  update(keys, opponent) {
    if (!this.alive) return;

    if (this.stunTimer > 0) { this.stunTimer--; return; }

    if (this.dashTimer > 0) {
      this.dashTimer--;
      this.x += this.dashDir * this.charData.special.speed;
      this.x = Math.max(0, Math.min(W - this.w, this.x));
      const oppBox = { x: opponent.x, y: opponent.y - opponent.h, w: opponent.w, h: opponent.h };
      const myBox = { x: this.x, y: this.y - this.h, w: this.w, h: this.h };
      if (rectsOverlap(myBox, oppBox)) {
        dealDamage(this, opponent, this.charData.special.dmg, this.dashDir);
        this.dashTimer = 0;
      }
      return;
    }

    this.facing = opponent.x > this.x ? 1 : -1;
    this.vx = 0;

    if (keys[this.controls.left])  this.vx = -5;
    if (keys[this.controls.right]) this.vx = 5;
    if (keys[this.controls.up] && this.y >= GROUND) this.vy = -15;
    this.blocking = keys[this.controls.down] && this.y >= GROUND;

    if (keys[this.controls.breaker] && this.parryCooldown <= 0 && this.parryTimer <= 0) {
      this.parryTimer = 12;
      this.parryCooldown = 45;
    }
    if (this.parryTimer > 0) this.parryTimer--;
    if (this.parryCooldown > 0) this.parryCooldown--;

    if (this.attackCooldown <= 0 && !this.blocking) {
      if (keys[this.controls.punch] && !this.attacking) {
        this.attacking = true; this.attackType = 'punch'; this.attackTimer = 12; this.attackCooldown = 25;
      } else if (keys[this.controls.kick] && !this.attacking) {
        this.attacking = true; this.attackType = 'kick'; this.attackTimer = 18; this.attackCooldown = 35;
      } else if (keys[this.controls.magic] && !this.attacking) {
        this.attacking = true; this.attackType = 'magic'; this.attackTimer = 15; this.attackCooldown = 40;
      } else if (keys[this.controls.special] && this.superMeter >= this.maxSuper && !this.attacking) {
        this.performSpecial(opponent);
        this.superMeter = 0;
        this.attacking = true; this.attackType = 'special'; this.attackTimer = 25; this.attackCooldown = 60;
      }
    }

    if (this.attacking) { this.attackTimer--; if (this.attackTimer <= 0) this.attacking = false; }
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hitFlash > 0) this.hitFlash--;

    if (this.attackType === 'magic' && this.attackTimer === 8) {
      const px = this.facing === 1 ? this.x + this.w : this.x;
      const py = this.y - this.h + 30;
      projectiles.push(new Projectile(px, py, this.facing, this.charData, false));
    }

    this.x += this.vx;
    this.vy += GRAVITY;
    this.y += this.vy;
    if (this.y > GROUND) { this.y = GROUND; this.vy = 0; }
    this.x = Math.max(0, Math.min(W - this.w, this.x));

    if (this.attacking && (this.attackType === 'punch' || this.attackType === 'kick')) {
      const activeFrame = this.attackType === 'punch' ? 4 : 6;
      if (this.attackTimer > activeFrame) {
        const range = this.attackType === 'punch' ? 55 : 75;
        const hitX = this.facing === 1 ? this.x + this.w : this.x - range;
        const hitBox = { x: hitX, y: this.y - 20, w: range, h: 40 };
        const oppBox = { x: opponent.x, y: opponent.y - opponent.h, w: opponent.w, h: opponent.h };
        if (rectsOverlap(hitBox, oppBox)) {
          const dmg = this.attackType === 'punch' ? 8 : 14;
          dealDamage(this, opponent, dmg, this.facing);
        }
      }
    }
  }

  performSpecial(opponent) {
    const sp = this.charData.special;
    switch(sp.type) {
      case 'area': case 'domain': {
        const dist = Math.abs(this.x - opponent.x);
        if (dist < sp.radius) { dealDamage(this, opponent, sp.dmg, this.facing); screenShake = 15; }
        break;
      }
      case 'dash': { this.dashTimer = sp.duration; this.dashDir = this.facing; break; }
      case 'bigprojectile': {
        const px = this.facing === 1 ? this.x + this.w : this.x;
        const py = this.y - this.h + 30;
        projectiles.push(new Projectile(px, py, this.facing, this.charData, true));
        break;
      }
      case 'stun': {
        const dist = Math.abs(this.x - opponent.x);
        if (dist < 200) { dealDamage(this, opponent, sp.dmg, this.facing); opponent.stunTimer = sp.stunDuration; }
        break;
      }
      case 'heal': {
        this.hp = Math.min(this.maxHp, this.hp + sp.heal);
        const dist = Math.abs(this.x - opponent.x);
        if (dist < sp.radius) dealDamage(this, opponent, sp.dmg, this.facing);
        screenShake = 10;
        break;
      }
    }
  }

  draw() {
    ctx.save();
    const c = this.hitFlash > 0 ? '#fff' : (this.stunTimer > 0 ? '#ff0' : this.color);
    ctx.fillStyle = c;
    ctx.fillRect(this.x, this.y - this.h, this.w, this.h);
    ctx.beginPath();
    ctx.arc(this.x + this.w / 2, this.y - this.h - 12, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x + this.w / 2, this.y - this.h - 30);
    ctx.textAlign = 'left';

    if (this.stunTimer > 0) {
      ctx.fillStyle = '#ff0'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
      ctx.fillText('★ ★ ★', this.x + this.w / 2, this.y - this.h - 45);
      ctx.textAlign = 'left';
    }

    if (this.attacking && (this.attackType === 'punch' || this.attackType === 'kick')) {
      ctx.fillStyle = this.attackType === 'punch' ? '#ff0' : '#f80';
      const range = this.attackType === 'punch' ? 45 : 65;
      const limbY = this.y - this.h + 20;
      if (this.facing === 1) ctx.fillRect(this.x + this.w, limbY, range, 12);
      else ctx.fillRect(this.x - range, limbY, range, 12);
    }

    if (this.attacking && this.attackType === 'magic') {
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y - this.h + 30, 20, 0, Math.PI * 2);
      ctx.fillStyle = this.charData.magic.color + '66';
      ctx.fill();
    }

    if (this.blocking) {
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 3;
      ctx.strokeRect(this.x - 5, this.y - this.h - 5, this.w + 10, this.h + 10);
    }

    if (this.parryTimer > 0) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y - this.h / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.dashTimer > 0) {
      ctx.fillStyle = this.color + '44';
      ctx.fillRect(this.x - this.dashDir * 30, this.y - this.h, this.w, this.h);
    }
    ctx.restore();
  }
}

function dealDamage(attacker, defender, dmg, dir) {
  if (defender.parryTimer > 0) {
    defender.parryTimer = 0;
    defender.superMeter = Math.min(defender.maxSuper, defender.superMeter + 20);
    screenShake = 5;
    return;
  }
  const actualDmg = defender.blocking ? Math.floor(dmg * 0.3) : dmg;
  defender.hp -= actualDmg;
  defender.hitFlash = 8;
  if (!defender.blocking) { defender.x += dir * 15; screenShake = 4; }
  attacker.superMeter = Math.min(attacker.maxSuper, attacker.superMeter + 10);
  defender.superMeter = Math.min(defender.maxSuper, defender.superMeter + 5);
  if (defender.hp <= 0) { defender.hp = 0; defender.alive = false; }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== OPTIONS MENU =====
let optionsOpen = false;
let optionsPlayer = 'p1';
let remappingKey = null;
const ACTION_LABELS = { left:'Esquerda', right:'Direita', up:'Pular', down:'Defesa', punch:'Soco', kick:'Chute', magic:'Magia', special:'Especial', breaker:'Breaker' };
const ACTION_KEYS = ['left','right','up','down','punch','kick','magic','special','breaker'];

function drawOptions() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RESNHA FIGHT - OPÇÕES', W / 2, 40);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = optionsPlayer === 'p1' ? '#4af' : '#666';
  ctx.fillText('P1', W / 2 - 80, 68);
  ctx.fillStyle = optionsPlayer === 'p2' ? '#f44' : '#666';
  ctx.fillText('P2', W / 2 + 80, 68);

  const startY = 90, rowH = 36;
  ctx.textAlign = 'left';
  ACTION_KEYS.forEach((action, i) => {
    const y = startY + i * rowH;
    const key = bindings[optionsPlayer][action];
    ctx.fillStyle = remappingKey === action ? '#ff0' : '#fff';
    ctx.font = remappingKey === action ? 'bold 14px monospace' : '14px monospace';
    ctx.fillText(ACTION_LABELS[action] + ':', 280, y);
    ctx.fillStyle = remappingKey === action ? '#ff0' : '#0f0';
    ctx.fillText(remappingKey === action ? '>>> PRESSIONE TECLA <<<' : key.toUpperCase(), 460, y);
  });

  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#f0f';
  const charY = startY + ACTION_KEYS.length * rowH + 15;
  if (konamiUnlocked) {
    ctx.fillText('DESBLOQUEADOS:', W / 2, charY);
    ctx.font = '12px monospace'; ctx.fillStyle = '#ff0';
    ctx.fillText(unlockedChars.join('  |  '), W / 2, charY + 18);
  } else {
    ctx.fillStyle = '#555';
    ctx.fillText('??? (código secreto...)', W / 2, charY);
  }
  ctx.font = '12px monospace'; ctx.fillStyle = '#888';
  ctx.fillText('[1] P1  [2] P2  [ESC] Fechar  [R] Resetar', W / 2, H - 20);
  ctx.textAlign = 'left';
}

// ===== CHARACTER SELECT =====
function drawCharSelect() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RESNHA FIGHT', W / 2, 45);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('ESCOLHA SEU PERSONAGEM', W / 2, 70);

  const cols = 3, boxW = 140, boxH = 160;
  const startX = W / 2 - (cols * (boxW + 20)) / 2 + 10;
  const startY = 90;

  CHARACTERS.forEach((ch, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (boxW + 20);
    const y = startY + row * (boxH + 30);

    const isLocked = ch.locked && !unlockedChars.includes(ch.name);
    const isP1 = p1Char === i && p1Selected;
    const isP2 = p2Char === i && p2Selected;
    const isP1Cur = p1Char === i && !p1Selected;
    const isP2Cur = p2Char === i && !p2Selected;

    ctx.fillStyle = isLocked ? '#1a1a1a' : '#1a1a2e';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = isP1 ? '#4af' : isP2 ? '#f44' : isP1Cur ? '#4af8' : isP2Cur ? '#f448' : '#333';
    ctx.lineWidth = isP1 || isP2 ? 4 : 2;
    ctx.strokeRect(x, y, boxW, boxH);

    if (!isLocked) {
      ctx.fillStyle = ch.color;
      ctx.fillRect(x + boxW/2 - 20, y + 40, 40, 70);
      ctx.beginPath();
      ctx.arc(x + boxW/2, y + 30, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(ch.name, x + boxW/2, y + boxH - 25);
      ctx.font = '10px monospace'; ctx.fillStyle = '#aaa';
      ctx.fillText(ch.special.name, x + boxW/2, y + boxH - 10);
    } else {
      ctx.fillStyle = '#444';
      ctx.font = 'bold 40px monospace';
      ctx.fillText('?', x + boxW/2, y + boxH/2);
      ctx.font = '11px monospace';
      ctx.fillText('???', x + boxW/2, y + boxH - 15);
    }

    if (isP1 || isP1Cur) { ctx.fillStyle = '#4af'; ctx.font = 'bold 12px monospace'; ctx.fillText('P1', x + 12, y + 16); }
    if (isP2 || isP2Cur) { ctx.fillStyle = '#f44'; ctx.font = 'bold 12px monospace'; ctx.fillText('P2', x + boxW - 28, y + 16); }
  });

  ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
  ctx.fillText(p1Selected ? 'P1: ✓ ' + CHARACTERS[p1Char].name : 'P1: A/D + F', W / 2 - 220, H - 40);
  ctx.fillText(p2Selected ? 'P2: ✓ ' + CHARACTERS[p2Char].name : 'P2: ←/→ + K', W / 2 + 220, H - 40);

  if (p1Selected && p2Selected) {
    ctx.fillStyle = '#0f0'; ctx.font = 'bold 20px monospace';
    ctx.fillText('LUTAAAA!', W / 2, H - 15);
  }
  ctx.textAlign = 'left';
}

// ===== GAME =====
let p1, p2, gameOver = false, winner = '';

function startFight() {
  p1 = new Fighter(p1Char, 'p1', 150);
  p2 = new Fighter(p2Char, 'p2', W - 200);
  projectiles = []; gameOver = false; winner = '';
  gameState = 'FIGHTING';
}

function resetFight() {
  p1 = new Fighter(p1Char, 'p1', 150);
  p2 = new Fighter(p2Char, 'p2', W - 200);
  projectiles = []; gameOver = false; winner = '';
}

function drawHUD() {
  ctx.fillStyle = '#333';
  ctx.fillRect(20, 20, 300, 22);
  ctx.fillRect(W - 320, 20, 300, 22);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(20, 20, 300 * (p1.hp / p1.maxHp), 22);
  ctx.fillRect(W - 320, 20, 300 * (p2.hp / p2.maxHp), 22);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, 300, 22);
  ctx.strokeRect(W - 320, 20, 300, 22);

  ctx.fillStyle = '#333';
  ctx.fillRect(20, 48, 200, 10);
  ctx.fillRect(W - 220, 48, 200, 10);
  ctx.fillStyle = p1.superMeter >= p1.maxSuper ? '#ff0' : '#f80';
  ctx.fillRect(20, 48, 200 * (p1.superMeter / p1.maxSuper), 10);
  ctx.fillStyle = p2.superMeter >= p2.maxSuper ? '#ff0' : '#f80';
  ctx.fillRect(W - 220, 48, 200 * (p2.superMeter / p2.maxSuper), 10);

  ctx.fillStyle = '#fff'; ctx.font = '13px monospace';
  ctx.fillText(p1.name, 20, 72);
  ctx.fillText(p2.name, W - 60, 72);
  ctx.font = 'bold 18px monospace';
  ctx.fillText('VS', W / 2 - 14, 40);

  if (p1.superMeter >= p1.maxSuper) { ctx.fillStyle = '#ff0'; ctx.font = '11px monospace'; ctx.fillText('ESPECIAL PRONTO!', 20, 88); }
  if (p2.superMeter >= p2.maxSuper) { ctx.fillStyle = '#ff0'; ctx.font = '11px monospace'; ctx.fillText('ESPECIAL PRONTO!', W - 130, 88); }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#16213e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(0, GROUND + 14, W, H - GROUND);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND + 14); ctx.lineTo(W, GROUND + 14); ctx.stroke();
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(winner + ' VENCEU!', W / 2, H / 2 - 30);
  ctx.font = '18px monospace';
  ctx.fillText('R = Lutar de novo  |  ESC = Trocar personagem', W / 2, H / 2 + 20);
  ctx.textAlign = 'left';
}

function drawKonamiFlash() {
  if (konamiFlash <= 0) return;
  konamiFlash--;
  const alpha = konamiFlash / 180;
  ctx.fillStyle = `rgba(255,0,255,${alpha * 0.3})`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(255,255,0,${alpha})`;
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('★ KONAMI CODE ATIVADO! ★', W / 2, H / 2 - 40);
  ctx.font = '20px monospace';
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillText('Gojo | Gon | Bolsonaro | Lula', W / 2, H / 2 + 10);
  ctx.font = '14px monospace';
  ctx.fillStyle = `rgba(200,200,200,${alpha})`;
  ctx.fillText('Personagens desbloqueados!', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

// ===== INPUT =====
const keys = {};
document.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  checkKonami(e.key);

  if (optionsOpen) {
    if (e.key === 'Escape') { optionsOpen = false; remappingKey = null; return; }
    if (e.key === '1') { optionsPlayer = 'p1'; return; }
    if (e.key === '2') { optionsPlayer = 'p2'; return; }
    if (e.key === 'r' || e.key === 'R') { resetBindings(); return; }
    if (remappingKey) {
      bindings[optionsPlayer][remappingKey] = k;
      saveBindings(); remappingKey = null; e.preventDefault(); return;
    }
    return;
  }

  if (e.key === 'Escape') {
    if (gameState === 'SELECT') { optionsOpen = true; return; }
    if (gameState === 'GAMEOVER') { gameState = 'SELECT'; p1Selected = false; p2Selected = false; return; }
    optionsOpen = true; return;
  }

  if (gameState === 'SELECT') {
    if (!p1Selected) {
      if (e.key === 'a' || e.key === 'A') p1Char = (p1Char + 5) % 6;
      if (e.key === 'd' || e.key === 'D') p1Char = (p1Char + 1) % 6;
      if (e.key === 'f' || e.key === 'F') {
        const ch = CHARACTERS[p1Char];
        if (!ch.locked || unlockedChars.includes(ch.name)) p1Selected = true;
      }
    }
    if (!p2Selected) {
      if (e.key === 'ArrowLeft') p2Char = (p2Char + 5) % 6;
      if (e.key === 'ArrowRight') p2Char = (p2Char + 1) % 6;
      if (e.key === 'k' || e.key === 'K') {
        const ch = CHARACTERS[p2Char];
        if (!ch.locked || unlockedChars.includes(ch.name)) p2Selected = true;
      }
    }
    if (p1Selected && p2Selected) startFight();
    return;
  }

  if (gameState === 'FIGHTING' && gameOver) {
    if (e.key === 'r' || e.key === 'R') resetFight();
    return;
  }

  keys[k] = true;
  keys[e.key] = true;
  e.preventDefault();
});

document.addEventListener('keyup', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = false;
  keys[e.key] = false;
});

canvas.addEventListener('click', e => {
  if (!optionsOpen) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const startY = 90, rowH = 36;
  ACTION_KEYS.forEach((action, i) => {
    const y = startY + i * rowH;
    if (my > y - 18 && my < y + 8 && mx > 450) remappingKey = action;
  });
});

// ===== MAIN LOOP =====
function loop() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate(Math.random() * screenShake - screenShake/2, Math.random() * screenShake - screenShake/2);
    screenShake--;
  }

  if (gameState === 'SELECT') {
    drawCharSelect();
  } else {
    if (!gameOver && !optionsOpen) {
      p1.update(keys, p2);
      p2.update(keys, p1);

      projectiles.forEach(p => {
        p.update();
        const opp = p.dir === 1 ? p2 : p1;
        const atk = p.dir === 1 ? p1 : p2;
        const oppBox = { x: opp.x, y: opp.y - opp.h, w: opp.w, h: opp.h };
        const projBox = { x: p.x - p.size, y: p.y - p.size, w: p.size * 2, h: p.size * 2 };
        if (rectsOverlap(projBox, oppBox) && p.alive) {
          dealDamage(atk, opp, p.dmg, p.dir);
          p.alive = false;
        }
      });
      projectiles = projectiles.filter(p => p.alive);

      if (!p1.alive) { gameOver = true; winner = p2.name; }
      if (!p2.alive) { gameOver = true; winner = p1.name; }
    }

    drawBackground();
    projectiles.forEach(p => p.draw());
    p1.draw();
    p2.draw();
    drawHUD();
    if (gameOver) drawGameOver();
  }

  drawKonamiFlash();
  if (optionsOpen) drawOptions();

  ctx.restore();
  requestAnimationFrame(loop);
}

loop();   