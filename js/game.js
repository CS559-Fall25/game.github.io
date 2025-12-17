import * as THREE from 'three';

// --- Configuration ---
const CONFIG = {
    fieldSize: 100, // Size of the play area
    playerSpeed: 0.5,
    playerRotationSpeed: 0.1,
    bulletSpeed: 1.0,
    cowSpeed: 0.2,
    cowSpawnRate: 2000, // ms
};

// --- Global State ---
const state = {
    mode: 'prototype', // 'prototype' or 'full'
    score: 0,
    lives: 3,
    isPlaying: false,
    lastTime: 0,
    keys: {},
    touch: { thrust: false, left: false, right: false, shoot: false }
};

// --- Three.js Setup ---
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Camera positioning (Top-down view)
camera.position.z = 50;
camera.position.y = -20;
camera.lookAt(0, 0, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

// --- Asset Generation (For Full Mode) ---
function createTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (type === 'human') {
        // Draw a simple human face/body
        ctx.fillStyle = '#f0d9b5'; // Skin tone
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'blue'; // Shirt
        ctx.fillRect(20, 80, 88, 48);
        ctx.fillStyle = 'black'; // Eyes
        ctx.beginPath();
        ctx.arc(40, 40, 5, 0, Math.PI * 2);
        ctx.arc(88, 40, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath(); // Smile
        ctx.arc(64, 60, 20, 0, Math.PI, false);
        ctx.stroke();
    } else if (type === 'cow') {
        // Draw cow pattern
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'black';
        // Random spots
        for(let i=0; i<5; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*128, Math.random()*128, 10 + Math.random()*20, 0, Math.PI*2);
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const textures = {
    human: createTexture('human'),
    cow: createTexture('cow')
};

// --- Game Objects ---
const objects = {
    player: null,
    bullets: [],
    cows: []
};

class GameObject {
    constructor() {
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.isDead = false;
        this.radius = 1;
    }

    update(dt) {
        if (!this.mesh) return;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(dt * 60)); // Normalize to 60fps roughly
        
        // Screen wrapping
        const limit = CONFIG.fieldSize / 2;
        if (this.mesh.position.x > limit) this.mesh.position.x = -limit;
        if (this.mesh.position.x < -limit) this.mesh.position.x = limit;
        if (this.mesh.position.y > limit) this.mesh.position.y = -limit;
        if (this.mesh.position.y < -limit) this.mesh.position.y = limit;
    }

    destroy() {
        if (this.mesh) {
            scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            // Don't dispose shared materials/textures usually, but for this simple game it's fine to leave them
        }
    }
}

class Player extends GameObject {
    constructor() {
        super();
        this.radius = 2;
        this.createMesh();
    }

    createMesh() {
        if (this.mesh) scene.remove(this.mesh);

        if (state.mode === 'prototype') {
            // Prototype: Green Cone
            const geometry = new THREE.ConeGeometry(1, 3, 8);
            geometry.rotateX(Math.PI / 2); // Point forward
            const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
            this.mesh = new THREE.Mesh(geometry, material);
        } else {
            // Full: Textured Box (Human)
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshLambertMaterial({ map: textures.human });
            this.mesh = new THREE.Mesh(geometry, material);
        }
        scene.add(this.mesh);
    }

    update(dt) {
        super.update(dt);
        
        // Drag
        this.velocity.multiplyScalar(0.98);

        // Input
        if (state.keys['ArrowLeft'] || state.keys['a'] || state.touch.left) {
            this.mesh.rotation.z += CONFIG.playerRotationSpeed;
        }
        if (state.keys['ArrowRight'] || state.keys['d'] || state.touch.right) {
            this.mesh.rotation.z -= CONFIG.playerRotationSpeed;
        }
        if (state.keys['ArrowUp'] || state.keys['w'] || state.touch.thrust) {
            const direction = new THREE.Vector3(0, 1, 0);
            direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.mesh.rotation.z);
            this.velocity.add(direction.multiplyScalar(CONFIG.playerSpeed * 0.1));
        }
    }

    shoot() {
        const bullet = new Bullet(this.mesh.position, this.mesh.rotation.z);
        objects.bullets.push(bullet);
    }
}

class Cow extends GameObject {
    constructor() {
        super();
        this.radius = 2;
        this.createMesh();
        
        // Random position at edge
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.fieldSize / 2;
        this.mesh.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
        
        // Random velocity towards center-ish
        const target = new THREE.Vector3((Math.random()-0.5)*20, (Math.random()-0.5)*20, 0);
        const dir = new THREE.Vector3().subVectors(target, this.mesh.position).normalize();
        this.velocity = dir.multiplyScalar(CONFIG.cowSpeed * (0.5 + Math.random()));
    }

    createMesh() {
        if (this.mesh) scene.remove(this.mesh);

        if (state.mode === 'prototype') {
            // Prototype: White Sphere
            const geometry = new THREE.SphereGeometry(1.5, 8, 8);
            const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
            this.mesh = new THREE.Mesh(geometry, material);
        } else {
            // Full: Textured Box (Cow)
            const geometry = new THREE.BoxGeometry(3, 2, 2);
            const material = new THREE.MeshLambertMaterial({ map: textures.cow });
            this.mesh = new THREE.Mesh(geometry, material);
        }
        scene.add(this.mesh);
    }
}

class Bullet extends GameObject {
    constructor(position, rotation) {
        super();
        this.radius = 0.5;
        this.life = 2.0; // Seconds
        
        const geometry = new THREE.SphereGeometry(0.3, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        const direction = new THREE.Vector3(0, 1, 0);
        direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation);
        this.velocity = direction.multiplyScalar(CONFIG.bulletSpeed);
        
        scene.add(this.mesh);
    }

    update(dt) {
        super.update(dt);
        this.life -= dt;
        if (this.life <= 0) this.isDead = true;
    }
}

// --- Game Logic ---

function initGame() {
    // Clear existing
    if (objects.player) objects.player.destroy();
    objects.bullets.forEach(b => b.destroy());
    objects.cows.forEach(c => c.destroy());
    objects.bullets = [];
    objects.cows = [];

    objects.player = new Player();
    state.score = 0;
    state.lives = 3;
    updateHUD();
    
    state.isPlaying = true;
    document.getElementById('start-screen').classList.add('hidden');
}

function spawnCow() {
    if (!state.isPlaying) return;
    objects.cows.push(new Cow());
}

setInterval(spawnCow, CONFIG.cowSpawnRate);

function checkCollisions() {
    // Bullets vs Cows
    for (let i = objects.bullets.length - 1; i >= 0; i--) {
        const b = objects.bullets[i];
        for (let j = objects.cows.length - 1; j >= 0; j--) {
            const c = objects.cows[j];
            if (b.mesh.position.distanceTo(c.mesh.position) < (b.radius + c.radius)) {
                // Hit
                b.isDead = true;
                c.isDead = true;
                state.score += 100;
                updateHUD();
                break;
            }
        }
    }

    // Player vs Cows
    if (objects.player && !objects.player.isDead) {
        for (let c of objects.cows) {
            if (objects.player.mesh.position.distanceTo(c.mesh.position) < (objects.player.radius + c.radius)) {
                // Crash
                state.lives--;
                c.isDead = true;
                updateHUD();
                
                // Reset player pos
                objects.player.mesh.position.set(0,0,0);
                objects.player.velocity.set(0,0,0);

                if (state.lives <= 0) {
                    gameOver();
                }
                break;
            }
        }
    }
}

function gameOver() {
    state.isPlaying = false;
    alert(`Game Over! Score: ${state.score}`);
    document.getElementById('start-screen').classList.remove('hidden');
}

function updateHUD() {
    document.getElementById('score').innerText = state.score;
    document.getElementById('lives').innerText = state.lives;
}

function switchMode(newMode) {
    state.mode = newMode;
    if (objects.player) objects.player.createMesh();
    objects.cows.forEach(c => c.createMesh());
}

// --- Main Loop ---
function animate(time) {
    requestAnimationFrame(animate);
    
    const dt = (time - state.lastTime) / 1000;
    state.lastTime = time;

    if (!state.isPlaying) return;

    // Update Player
    if (objects.player) objects.player.update(dt);

    // Update Bullets
    for (let i = objects.bullets.length - 1; i >= 0; i--) {
        const b = objects.bullets[i];
        b.update(dt);
        if (b.isDead) {
            b.destroy();
            objects.bullets.splice(i, 1);
        }
    }

    // Update Cows
    for (let i = objects.cows.length - 1; i >= 0; i--) {
        const c = objects.cows[i];
        c.update(dt);
        if (c.isDead) {
            c.destroy();
            objects.cows.splice(i, 1);
        }
    }

    checkCollisions();
    renderer.render(scene, camera);
}

// --- Input Listeners ---
window.addEventListener('keydown', (e) => {
    state.keys[e.key] = true;
    if (e.key === ' ' && state.isPlaying) {
        objects.player.shoot();
    }
});

window.addEventListener('keyup', (e) => {
    state.keys[e.key] = false;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Controls
document.getElementById('start-btn').addEventListener('click', initGame);

document.getElementById('mode-toggle').addEventListener('change', (e) => {
    switchMode(e.target.value);
    // Refocus game so keyboard works immediately
    window.focus();
});

// Touch Controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnThrust = document.getElementById('btn-thrust');
const btnShoot = document.getElementById('btn-shoot');

const addTouch = (elem, key) => {
    elem.addEventListener('mousedown', () => state.touch[key] = true);
    elem.addEventListener('mouseup', () => state.touch[key] = false);
    elem.addEventListener('mouseleave', () => state.touch[key] = false);
    elem.addEventListener('touchstart', (e) => { e.preventDefault(); state.touch[key] = true; });
    elem.addEventListener('touchend', (e) => { e.preventDefault(); state.touch[key] = false; });
};

// Global safety to prevent stuck controls
window.addEventListener('blur', () => {
    state.keys = {};
    Object.keys(state.touch).forEach(k => state.touch[k] = false);
});
window.addEventListener('mouseup', () => {
    Object.keys(state.touch).forEach(k => state.touch[k] = false);
});

addTouch(btnLeft, 'left');
addTouch(btnRight, 'right');
addTouch(btnThrust, 'thrust');

// Shoot is a trigger, not a hold
btnShoot.addEventListener('mousedown', () => { if(state.isPlaying) objects.player.shoot(); });
btnShoot.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    if(state.isPlaying) objects.player.shoot(); 
});

// Start loop
requestAnimationFrame(animate);
