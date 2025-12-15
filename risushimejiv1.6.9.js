//@name desktoppet
//@display-name 🍄RisuShimeji v1.5.9

// ============================================
// Desktop Pet Plugin for RisuAI
// A Shimeji-inspired companion that roams your screen
// ============================================

class PetManager {
    constructor() {
        this.pets = [];
        this.maxPets = 10;
        this.enabled = true;
        this.petConfigs = [];
        this.modal = null;
        this.modalOverlay = null;
        this.floatingBtn = null;
        this.createFloatingButton();
    }

    createFloatingButton() {
        this.floatingBtn = document.createElement('div');
        this.floatingBtn.className = 'pet-floating-btn';
        this.floatingBtn.innerHTML = '🐾';
        this.floatingBtn.title = 'Pet Manager';

        const savedPos = localStorage.getItem('petBtnPos');
        if (savedPos) {
            const { x, y } = JSON.parse(savedPos);
            this.floatingBtn.style.left = `${x}px`;
            this.floatingBtn.style.top = `${y}px`;
        } else {
            this.floatingBtn.style.right = '20px';
            this.floatingBtn.style.bottom = '80px';
        }

        let isDragging = false;
        let wasDragged = false;
        let startX, startY, btnX, btnY;

        this.floatingBtn.addEventListener('mousedown', (e) => {
            isDragging = true;
            wasDragged = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.floatingBtn.getBoundingClientRect();
            btnX = rect.left;
            btnY = rect.top;
            this.floatingBtn.style.right = 'auto';
            this.floatingBtn.style.bottom = 'auto';
            this.floatingBtn.style.left = `${btnX}px`;
            this.floatingBtn.style.top = `${btnY}px`;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDragged = true;
            this.floatingBtn.style.left = `${btnX + dx}px`;
            this.floatingBtn.style.top = `${btnY + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                const rect = this.floatingBtn.getBoundingClientRect();
                localStorage.setItem('petBtnPos', JSON.stringify({ x: rect.left, y: rect.top }));
            }
        });

        this.floatingBtn.addEventListener('click', (e) => {
            if (!wasDragged) {
                this.openManagerModal();
            }
        });

        document.body.appendChild(this.floatingBtn);
    }

    openManagerModal() {
        if (this.modal) return;

        const overlay = document.createElement('div');
        overlay.className = 'pet-config-overlay';
        overlay.addEventListener('click', () => this.closeManagerModal());

        const modal = document.createElement('div');
        modal.className = 'pet-config-modal';
        modal.addEventListener('click', (e) => e.stopPropagation());

        modal.innerHTML = `
            <h2>🐾 Pet Manager</h2>

            <div class="pet-toggle-row">
                <span>Enable Pets</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="pets-enabled" ${this.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <h3>Pet Types</h3>
            <div id="pet-types-list"></div>

            <div style="margin: 10px 0;">
                <button class="btn-secondary" id="add-pet-type-btn">+ Add New Pet Type</button>
                <button class="btn-secondary" id="import-pet-btn">📁 Import Config</button>
            </div>

            <h3>Active Pets (<span id="active-pet-count">${this.pets.length}</span>)</h3>
            <div id="active-pets-list"></div>

            <div class="button-row">
                <button class="btn-secondary" id="remove-all-pets-btn">Remove All Pets</button>
                <button class="btn-primary" id="close-manager-btn">Close</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        this.modal = modal;
        this.modalOverlay = overlay;

        modal.querySelector('#pets-enabled').addEventListener('change', (e) => {
            this.enabled = e.target.checked;
            this.pets.forEach(p => p.element.style.display = this.enabled ? 'block' : 'none');
            localStorage.setItem('petsEnabled', this.enabled);
        });

        this.renderPetTypes();
        this.renderActivePets();

        modal.querySelector('#add-pet-type-btn').addEventListener('click', () => {
            this.addPetTypeDialog();
        });

        modal.querySelector('#import-pet-btn').addEventListener('click', () => {
            this.importPetConfig();
        });

        modal.querySelector('#remove-all-pets-btn').addEventListener('click', () => {
            [...this.pets].forEach(p => this.removePet(p));
            this.renderActivePets();
        });

        modal.querySelector('#close-manager-btn').addEventListener('click', () => {
            this.closeManagerModal();
        });
    }

    renderPetTypes() {
        const list = this.modal.querySelector('#pet-types-list');
        list.innerHTML = '';

        if (this.petConfigs.length === 0) {
            list.innerHTML = '<p style="color: #888; font-size: 13px;">No pet types yet. Add one below!</p>';
            return;
        }

        this.petConfigs.forEach((cfg, index) => {
            const item = document.createElement('div');
            item.className = 'pet-type-item';
            item.innerHTML = `
                <span class="pet-type-icon">${cfg.emojis?.idle?.[0] || '🐱'}</span>
                <span class="pet-type-name">${cfg.meta?.name || 'Unnamed Pet'}</span>
                <button class="btn-small btn-spawn" data-index="${index}">Spawn</button>
                <button class="btn-small" data-index="${index}" title="Export">📤</button>
                <button class="btn-small btn-remove-type" data-index="${index}" title="Delete">🗑️</button>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('.btn-spawn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                this.spawnPetOfType(idx);
                this.renderActivePets();
            });
        });

        list.querySelectorAll('button[title="Export"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                this.exportPetConfig(idx);
            });
        });

        list.querySelectorAll('.btn-remove-type').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (confirm(`Delete "${this.petConfigs[idx].meta?.name}"?`)) {
                    this.petConfigs.splice(idx, 1);
                    this.savePetConfigs();
                    this.renderPetTypes();
                }
            });
        });
    }

    renderActivePets() {
        const list = this.modal.querySelector('#active-pets-list');
        const count = this.modal.querySelector('#active-pet-count');
        list.innerHTML = '';
        count.textContent = this.pets.length;

        if (this.pets.length === 0) {
            list.innerHTML = '<p style="color: #888; font-size: 13px;">No active pets. Spawn one above!</p>';
            return;
        }

        this.pets.forEach((pet, index) => {
            const item = document.createElement('div');
            item.className = 'pet-type-item';
            item.innerHTML = `
                <span class="pet-type-icon">${pet.config.emojis?.idle?.[0] || '🐱'}</span>
                <span class="pet-type-name">${pet.config.meta?.name || 'Pet'} #${index + 1}</span>
                <button class="btn-small btn-remove-pet" data-index="${index}">❌</button>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('.btn-remove-pet').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                this.removePet(this.pets[idx]);
                this.renderActivePets();
            });
        });
    }

    spawnPetOfType(configIndex) {
        if (this.pets.length >= this.maxPets) {
            alert(`Maximum ${this.maxPets} pets allowed!`);
            return null;
        }

        const config = this.petConfigs[configIndex];
        if (!config) return null;

        const pet = new DesktopPet({
            preloadedConfig: JSON.parse(JSON.stringify(config)),
            size: 64,
            manager: this,
            id: Date.now() + Math.random()
        });

        this.pets.push(pet);

        if (!this.enabled) {
            pet.element.style.display = 'none';
        }

        return pet;
    }
    
    clonePetWithConfig(sourcePet) {
        if (this.pets.length >= this.maxPets) {
            console.warn(`Maximum pets (${this.maxPets}) reached!`);
            return null;
        }

        const pet = new DesktopPet({
            size: sourcePet.size,
            enableSounds: sourcePet.enableSounds,
            preloadedConfig: JSON.parse(JSON.stringify(sourcePet.config)),
            manager: this,
            id: Date.now() + Math.random()
        });

        this.pets.push(pet);

        if (!this.enabled) {
            pet.element.style.display = 'none';
        }

        return pet;
    }

    addPetTypeDialog() {
        const name = prompt('Pet type name:', 'New Pet');
        if (!name) return;

        const config = this.getDefaultPetConfig();
        config.meta.name = name;

        this.petConfigs.push(config);
        this.savePetConfigs();
        this.renderPetTypes();
    }

    importPetConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);
                    if (!config.meta) config.meta = { name: file.name.replace('.json', '') };
                    this.petConfigs.push(config);
                    this.savePetConfigs();
                    this.renderPetTypes();
                    alert(`Imported "${config.meta.name}"!`);
                } catch (err) {
                    alert('Invalid config file!');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    savePetConfigs() {
        localStorage.setItem('petConfigs', JSON.stringify(this.petConfigs));
    }

    loadPetConfigs() {
        const saved = localStorage.getItem('petConfigs');
        if (saved) {
            try {
                this.petConfigs = JSON.parse(saved);
            } catch (e) {
                this.petConfigs = [];
            }
        }

        if (this.petConfigs.length === 0) {
            const defaultCfg = this.getDefaultPetConfig();
            defaultCfg.meta.name = 'Default Cat';
            this.petConfigs.push(defaultCfg);
            this.savePetConfigs();
        }
    }

    getDefaultPetConfig() {
        return {
            meta: { name: "Default Pet", author: "Anonymous", version: "1.0.0", description: "A cute pet" },
            spritesheetUrl: "", // A pet with a spritesheet should have a URL here.
            spriteSize: 128, // The size of a single frame in the spritesheet.
		 spriteColumns: 8, // The number of columns in the spritesheet.
            physics: { gravity: 0.5, walkSpeed: { min: 2, max: 4 }, jumpForce: 10, climbSpeed: 2 },
            behaviors: {
                idle: { duration: [2000, 5000], next: ['walk', 'sit', 'jump', 'idle'], weights: [0.3, 0.2, 0.1, 0.4] },
                walk: { duration: [3000, 6000], next: ['idle', 'sit', 'walk'], weights: [0.4, 0.2, 0.4] },
                sit: { duration: [4000, 8000], next: ['idle', 'walk'], weights: [0.6, 0.4] },
                jump: { duration: [500, 500], next: ['idle'], weights: [1.0] },
                fall: { duration: [100, 100], next: ['idle'], weights: [1.0] },
                climb: { duration: [2000, 5000], next: ['idle', 'climb'], weights: [0.7, 0.3] },
                sleep: { duration: [8000, 15000], next: ['idle'], weights: [1.0] },
                drag: { duration: [100, 100], next: ['fall'], weights: [1.0] },
                platformIdle: { duration: [3000, 7000], next: ['platformIdle', 'platformWalk', 'jump'], weights: [0.4, 0.4, 0.2] },
                platformWalk: { duration: [2000, 4000], next: ['platformIdle', 'platformWalk', 'jump'], weights: [0.4, 0.4, 0.2] }
            },
            sprites: {
                idle: { frames: 2, speed: 500, row: 0 }, walk: { frames: 4, speed: 150, row: 1 },
                sit: { frames: 2, speed: 800, row: 2 }, jump: { frames: 2, speed: 200, row: 3 },
                fall: { frames: 2, speed: 100, row: 4 }, climb: { frames: 4, speed: 200, row: 5 },
                sleep: { frames: 2, speed: 1000, row: 6 }, drag: { frames: 1, speed: 100, row: 7 },
                platformIdle: { frames: 2, speed: 500, row: 0 }, platformWalk: { frames: 4, speed: 150, row: 1 },
                petted: { frames: 2, speed: 200, row: 0 }, pettedHappy: { frames: 2, speed: 150, row: 0 },
                pettedEcstatic: { frames: 4, speed: 100, row: 0 }
            },
            emojis: {
                idle: ['🐱', '😺'], walk: ['🐱', '🐈', '🐱', '🐈'], sit: ['😸', '😺'],
                jump: ['🙀', '😺'], fall: ['🙀', '😿'], climb: ['🐱', '🐈', '🐱', '🐈'],
                sleep: ['😴', '💤'], drag: ['😾'], platformIdle: ['🐱', '😺'],
                platformWalk: ['🐱', '🐈', '🐱', '🐈'], petted: ['😊', '😌'],
                pettedHappy: ['😸', '😻', '😸', '😻'], pettedEcstatic: ['😻', '💕', '🥰', '💖']
            },
            phrases: {
                idle: ['...', '♪', 'Hmm~'], walk: ['Walking~', '♪♪'], sit: ['Rest time~'],
                jump: ['Wheee!'], fall: ['Aaah!'], drag: ['Nyaa!?', 'Hey!'],
                happy: ['Yay!', '♥'], platform: ['Nice view~'], petted: ['Oh!', 'Nice...'],
                pettedHappy: ['Purrr~', '♥'], pettedEcstatic: ['PURRRR!', '♥♥♥'], pettedEnd: ['More pets?']
            },
            reactions: {
                happy: { triggers: ['happy', 'love'], action: 'happy', phrases: ['♥', 'Yay!'] },
                greeting: { triggers: ['hello', 'hi '], action: 'wave', phrases: ['Hello!', 'Hi!'] }
            },
            platformBehavior: { enabled: true, preferPlatforms: true, platformJumpChance: 0.3, edgePadding: 10 },
            pettingConfig: { strokeThreshold: 20, directionChangeThreshold: 3, happyThreshold: 5, ecstaticThreshold: 12, decayRate: 500, particlesEnabled: true }
        };
    }

    addPet(options = {}) {
        if (this.pets.length >= this.maxPets) return null;

        const pet = new DesktopPet({
            ...options,
            manager: this,
            id: Date.now() + Math.random()
        });

        this.pets.push(pet);
        return pet;
    }

    removePet(pet) {
        const index = this.pets.indexOf(pet);
        if (index > -1) {
            pet.destroy();
            this.pets.splice(index, 1);
        }
    }

    checkPetInteractions() {
        for (let i = 0; i < this.pets.length; i++) {
            for (let j = i + 1; j < this.pets.length; j++) {
                const pet1 = this.pets[i];
                const pet2 = this.pets[j];

                const distance = Math.sqrt(
                    Math.pow(pet1.x - pet2.x, 2) + Math.pow(pet1.y - pet2.y, 2)
                );

                if (distance < 80) {
                    this.handlePetMeeting(pet1, pet2);
                }
            }
        }
    }

    handlePetMeeting(pet1, pet2) {
        if (pet1.isDragging || pet2.isDragging) return;
        if (pet1.petting.active || pet2.petting.active) return;

        const now = Date.now();
        if (pet1.lastInteraction && now - pet1.lastInteraction < 5000) return;
        if (Math.random() > 0.3) return;

        pet1.lastInteraction = now;
        pet2.lastInteraction = now;

        const phrases = [['Hello!', 'Hi!'], ['*sniff*', '*sniff*'], ['♥', '♥'], ['Play?', 'Okay!']];
        const [p1, p2] = phrases[Math.floor(Math.random() * phrases.length)];
        pet1.say(p1);
        setTimeout(() => pet2.say(p2), 500);
    }

    broadcastReaction(content) {
        this.pets.forEach(pet => pet.reactToContent(content));
    }
    
    exportPetConfig(configIndex) {
        const config = this.petConfigs[configIndex];
        if (!config) return;

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(config.meta?.name || 'pet').toLowerCase().replace(/\s+/g, '-')}-config.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    closeManagerModal() {
        if (this.modal) this.modal.remove();
        if (this.modalOverlay) this.modalOverlay.remove();
        this.modal = null;
        this.modalOverlay = null;
    }

    destroy() {
        [...this.pets].forEach(p => this.removePet(p));
        if (this.floatingBtn) this.floatingBtn.remove();
        this.closeManagerModal();
        // Also remove the stylesheet for full cleanup
        const style = document.getElementById('desktop-pet-styles');
        if (style) style.remove();
    }
}

class DesktopPet {
    constructor(options = {}) {
        // REMOVED: `this.config=config;` was a syntax error.
        this.id = options.id || Date.now();
        this.manager = options.manager || null;
        // REMOVED: `this.spriteUrl` property. It was redundant and the source of the main bug.
        // The URL is now always read from `this.config.spritesheetUrl`.
        this.size = options.size || 64;
        this.enableSounds = options.enableSounds || false;
        this.externalConfigUrl = options.behaviorFile || '';

        // Position and physics
        this.x = Math.random() * (window.innerWidth - this.size);
        this.y = window.innerHeight - this.size;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.5;
        this.grounded = true;

        // Platform detection
        this.platforms = [];
        this.currentPlatform = null;
        this.platformCheckInterval = null;

        // State machine
        this.state = 'idle';
        this.direction = 1;
        this.stateTimer = null;
        this.animationFrame = 0;
        this.frameTimer = 0;

        // Dragging
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        // Petting system
        this.petting = {
            active: false,
            strokes: 0,
            lastX: 0,
            lastY: 0,
            direction: 0,
            directionChanges: 0,
            lastDirectionChangeTime: 0,
            strokeTimeout: null,
            happinessLevel: 0
        };

        // Interaction cooldowns
        this.lastInteraction = 0;

        // Config - use preloaded if provided, otherwise default
        this.config = options.preloadedConfig || this.getDefaultConfig();

        this.element = null;
        this.spriteElement = null;
        this.speechBubble = null;
        this.speechText = null;
        this.pettingEffects = null;
        this.animationId = null;
        this.lastTime = 0;
        this.speechTimeout = null;
        this.configModal = null;
        this.configOverlay = null;

        this.init(options);
    }

    getDefaultConfig() {
        // Note: This is now a copy of the manager's default config.
        return new PetManager().getDefaultPetConfig();
    }

    async init(options = {}) {
        // Load from URL only if one is provided AND a specific config wasn't already preloaded.
        if (this.externalConfigUrl && !options.preloadedConfig) {
            await this.loadExternalConfig(this.externalConfigUrl);
        }

        this.gravity = this.config.physics.gravity;

        this.createElement();
		this.updateDisplaySize();
        this.bindEvents();
        this.startPlatformDetection();
        this.startAnimation();
        this.scheduleNextBehavior();
    }

    async loadExternalConfig(url) {
        try {
            let configData;

            if (url.startsWith('data:')) {
                const base64Content = url.split(',')[1];
                const jsonString = atob(base64Content);
                configData = JSON.parse(jsonString);
            } else {
                const response = await nativeFetch(url, { method: 'GET' });
                if (response.ok) {
                    configData = await response.json();
                } else {
                    console.warn('Failed to load pet config, using defaults');
                    return;
                }
            }

            this.config = this.deepMerge(this.getDefaultConfig(), configData);
            console.log(`Loaded pet config: ${this.config.meta.name} v${this.config.meta.version}`);
            this.updateSprite(); // Force a sprite update after loading new config
			this.updateDisplaySize();
        } catch (error) {
            console.error('Error loading pet config:', error);
        }
    }

    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                 if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
                    key in target && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                    result[key] = this.deepMerge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    // ========================================
    // Platform Detection System
    // ========================================

    startPlatformDetection() {
        this.scanForPlatforms();
        this.platformCheckInterval = setInterval(() => {
            this.scanForPlatforms();
        }, 2000);
    }

    scanForPlatforms() {
        this.platforms = [];

        const textareas = document.querySelectorAll('textarea.text-input-area, textarea.peer');
        textareas.forEach(el => this.addPlatformFromElement(el, 'input'));

        const buttons = document.querySelectorAll('button.send-button, .chat-send-button');
        buttons.forEach(el => this.addPlatformFromElement(el, 'button'));

        const cards = document.querySelectorAll('.character-card, .chat-card');
        cards.forEach(el => this.addPlatformFromElement(el, 'card'));
    }

    addPlatformFromElement(element, type) {
        const rect = element.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
            this.platforms.push({
                element: element,
                type: type,
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                surfaceY: rect.top,
                surfaceLeft: rect.left,
                surfaceRight: rect.left + rect.width
            });
        }
    }

    updatePlatformPositions() {
        this.platforms.forEach(platform => {
            const rect = platform.element.getBoundingClientRect();
            platform.x = rect.left;
            platform.y = rect.top;
            platform.width = rect.width;
            platform.height = rect.height;
            platform.surfaceY = rect.top;
            platform.surfaceLeft = rect.left;
            platform.surfaceRight = rect.left + rect.width;
        });
    }

    findPlatformBelow() {
        const petBottom = this.y + this.size;
        const petCenterX = this.x + this.size / 2;

        let closestPlatform = null;
        let closestDistance = Infinity;

        for (const platform of this.platforms) {
            if (petCenterX >= platform.surfaceLeft && petCenterX <= platform.surfaceRight) {
                const distance = platform.surfaceY - petBottom;

                if (distance >= -5 && distance < closestDistance) {
                    closestDistance = distance;
                    closestPlatform = platform;
                }
            }
        }

        return closestPlatform;
    }

    isOnPlatform() {
        if (!this.currentPlatform) return false;

        const petCenterX = this.x + this.size / 2;
        const padding = this.config.platformBehavior.edgePadding;

        return petCenterX >= this.currentPlatform.surfaceLeft + padding &&
               petCenterX <= this.currentPlatform.surfaceRight - padding;
    }

    getNearbyPlatform() {
        const petBottom = this.y + this.size;
        const petCenterX = this.x + this.size / 2;

        for (const platform of this.platforms) {
            const verticalDistance = petBottom - platform.surfaceY;
            const horizontalDistance = Math.min(
                Math.abs(petCenterX - platform.surfaceLeft),
                Math.abs(petCenterX - platform.surfaceRight)
            );

            if (verticalDistance > 0 && verticalDistance < 150 && horizontalDistance < 100) {
                return platform;
            }
        }

        return null;
    }

    // ========================================
    // Element Creation
    // ========================================

    createElement() {
		
        this.element = document.createElement('div');
        this.element.className = 'desktop-pet-container';
        this.element.dataset.petId = this.id;
        this.element.innerHTML = `
            <div class="pet-sprite"></div>
            <div class="pet-speech-bubble" style="display: none;">
                <span class="speech-text"></span>
            </div>
            <div class="pet-petting-effects"></div>
            <div class="pet-config-button" title="Pet Settings">⚙️</div>
            <div class="pet-clone-button" title="Clone Pet">✨</div>
            <div class="pet-remove-button" title="Remove Pet">❌</div>
        `;

        if (!document.getElementById('desktop-pet-styles')) {
            const style = document.createElement('style');
            style.id = 'desktop-pet-styles';
            style.textContent = `
                .desktop-pet-container {
                    position: fixed;
                    z-index: 99999;
                    pointer-events: auto;
                    cursor: grab;
                    user-select: none;
                    transition: none;
                }

                .desktop-pet-container:hover .pet-config-button,
                .desktop-pet-container:hover .pet-clone-button,
                .desktop-pet-container:hover .pet-remove-button {
                    opacity: 1;
                }

                .desktop-pet-container.dragging {
                    cursor: grabbing;
                }

                .desktop-pet-container.being-petted {
                    cursor: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text y="24" font-size="24">✋</text></svg>') 16 16, pointer;
                }

                .pet-sprite {
                    width: var(--pet-size, 64px);
                    height: var(--pet-size, 64px);
                    background-size: cover;
                    background-repeat: no-repeat;
                    image-rendering: pixelated;
                    transition: transform 0.1s;
                }

                .pet-sprite.flip {
                    transform: scaleX(-1);
                }

                .pet-speech-bubble {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    border: 2px solid #333;
                    border-radius: 10px;
                    padding: 8px 12px;
                    font-size: 12px;
                    white-space: nowrap;
                    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
                    animation: bubble-pop 0.3s ease-out;
                    z-index: 100001;
                }

                .pet-speech-bubble::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 8px solid transparent;
                    border-top-color: #333;
                }

                .pet-config-button,
                .pet-clone-button,
                .pet-remove-button {
                    position: absolute;
                    font-size: 12px;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s, transform 0.1s;
                    background: rgba(255,255,255,0.9);
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }

                .pet-config-button:hover,
                .pet-clone-button:hover,
                .pet-remove-button:hover {
                    transform: scale(1.2);
                }

                .pet-config-button { top: -20px; right: -5px; }
                .pet-clone-button { top: -20px; right: 18px; }
                .pet-remove-button { top: -20px; left: -5px; }

                .pet-petting-effects {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    overflow: visible;
                }

                .pet-heart {
                    position: absolute;
                    font-size: 16px;
                    animation: heart-float 1s ease-out forwards;
                    pointer-events: none;
                    z-index: 100002;
                }

                .pet-sparkle {
                    position: absolute;
                    font-size: 12px;
                    animation: sparkle-pop 0.6s ease-out forwards;
                    pointer-events: none;
                    z-index: 100002;
                }

                @keyframes bubble-pop {
                    0% { transform: translateX(-50%) scale(0); opacity: 0; }
                    50% { transform: translateX(-50%) scale(1.1); }
                    100% { transform: translateX(-50%) scale(1); opacity: 1; }
                }

                @keyframes pet-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                @keyframes pet-wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-5deg); }
                    75% { transform: rotate(5deg); }
                }

                @keyframes pet-vibrate {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px) rotate(-2deg); }
                    50% { transform: translateX(2px) rotate(2deg); }
                    75% { transform: translateX(-1px) rotate(-1deg); }
                }

                @keyframes heart-float {
                    0% { opacity: 1; transform: translateY(0) scale(0.5); }
                    100% { opacity: 0; transform: translateY(-50px) scale(1.2); }
                }

                @keyframes sparkle-pop {
                    0% { opacity: 1; transform: scale(0) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1.5) rotate(180deg); }
                    100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
                }

                .pet-sprite.happy { animation: pet-bounce 0.5s ease-in-out infinite; }
                .pet-sprite.petted-happy { animation: pet-wiggle 0.5s ease-in-out infinite; }
                .pet-sprite.petted-ecstatic { animation: pet-vibrate 0.2s ease-in-out infinite; }

                .pet-config-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #1a1a2e;
                    border: 2px solid #4a4a6a;
                    border-radius: 12px;
                    padding: 20px;
                    z-index: 100000;
                    min-width: 400px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #e0e0e0;
                    font-family: sans-serif;
                }

                .pet-config-modal h2 { margin-top: 0; color: #fff; border-bottom: 1px solid #4a4a6a; padding-bottom: 10px; }
                .pet-config-modal h3 { color: #aaa; font-size: 14px; margin-bottom: 8px; }
                .pet-config-modal label { display: block; margin: 10px 0 5px; font-size: 13px; }

                .pet-config-modal input[type="text"],
                .pet-config-modal input[type="number"],
                .pet-config-modal textarea {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #4a4a6a;
                    border-radius: 6px;
                    background: #0d0d1a;
                    color: #e0e0e0;
                    font-size: 13px;
                    box-sizing: border-box;
                }

                .pet-config-modal textarea { min-height: 150px; font-family: monospace; font-size: 11px; }

                .pet-config-modal button {
                    padding: 8px 16px;
                    margin: 5px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                }

                .pet-config-modal .btn-primary { background: #6366f1; color: white; }
                .pet-config-modal .btn-primary:hover { background: #4f46e5; }
                .pet-config-modal .btn-secondary { background: #374151; color: white; }
                .pet-config-modal .btn-secondary:hover { background: #4b5563; }

                .pet-config-modal .button-row {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #4a4a6a;
                }

                .pet-config-modal .file-drop-zone {
                    border: 2px dashed #4a4a6a;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 10px 0;
                    cursor: pointer;
                    transition: border-color 0.2s, background 0.2s;
                }

                .pet-config-modal .file-drop-zone:hover,
                .pet-config-modal .file-drop-zone.dragover {
                    border-color: #6366f1;
                    background: rgba(99, 102, 241, 0.1);
                }

                .pet-config-modal .file-drop-zone input { display: none; }

                .pet-config-modal .tabs { display: flex; border-bottom: 1px solid #4a4a6a; margin-bottom: 15px; }

                .pet-config-modal .tab {
                    padding: 10px 20px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }

                .pet-config-modal .tab:hover { background: rgba(255,255,255,0.05); }
                .pet-config-modal .tab.active { border-bottom-color: #6366f1; color: #6366f1; }
                .pet-config-modal .tab-content { display: none; }
                .pet-config-modal .tab-content.active { display: block; }

                .pet-config-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 99999;
                }

                .pet-config-modal .config-info {
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid #6366f1;
                    border-radius: 6px;
                    padding: 10px;
                    margin: 10px 0;
                    font-size: 12px;
                }

                .pet-config-modal .loaded-config-info {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid #22c55e;
                    border-radius: 6px;
                    padding: 10px;
                    margin: 10px 0;
                }

                .pet-config-modal .pet-count-info {
                    background: rgba(251, 191, 36, 0.1);
                    border: 1px solid #fbbf24;
                    border-radius: 6px;
                    padding: 10px;
                    margin: 10px 0;
                }

                .pet-floating-btn {
                    position: fixed;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #222636, #1e204a);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    cursor: grab;
                    z-index: 99998;
                    user-select: none;
                    transition: transform 0.2s;
                }

                .pet-floating-btn:hover {
                    transform: scale(1.1);
                }

                .pet-toggle-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    margin-bottom: 15px;
                }

                .toggle-switch {
                    position: relative;
                    width: 50px;
                    height: 26px;
                }

                .toggle-switch input { opacity: 0; width: 0; height: 0; }

                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #374151;
                    border-radius: 26px;
                    transition: 0.3s;
                }

                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    border-radius: 50%;
                    transition: 0.3s;
                }

                .toggle-switch input:checked + .toggle-slider { background-color: #6366f1; }
                .toggle-switch input:checked + .toggle-slider:before { transform: translateX(24px); }

                .pet-type-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                    margin-bottom: 8px;
                }

                .pet-type-icon { font-size: 24px; }
                .pet-type-name { flex: 1; }

                .btn-small {
                    padding: 4px 8px;
                    font-size: 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: #374151;
                    color: white;
                }

                .btn-small:hover { background: #4b5563; }
                .btn-spawn { background: #6366f1; }
                .btn-spawn:hover { background: #4f46e5; }
            `;
            document.head.appendChild(style);

        }

        this.element.style.setProperty('--pet-size', `${this.size}px`);

        document.body.appendChild(this.element);

        this.spriteElement = this.element.querySelector('.pet-sprite');
        this.speechBubble = this.element.querySelector('.pet-speech-bubble');
        this.speechText = this.element.querySelector('.speech-text');
        this.pettingEffects = this.element.querySelector('.pet-petting-effects');

        this.element.querySelector('.pet-config-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openConfigModal();
        });

        this.element.querySelector('.pet-clone-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.clonePet();
        });

        this.element.querySelector('.pet-remove-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSelf();
        });

        this.updateSprite();
        this.updatePosition();
    }
  
  updateDisplaySize() {
        // Read spriteSize from config, or default to 64
        this.size = this.config.spriteSize || 64;
        if (this.element) {
            this.element.style.setProperty('--pet-size', `${this.size}px`);
        }
    }
	
    clonePet() {
        if (this.manager) {
            const newPet = this.manager.clonePetWithConfig(this);

            if (newPet) {
                newPet.x = this.x + 30 + Math.random() * 20;
                newPet.y = this.y;
                newPet.updatePosition();
                setTimeout(() => {
                    newPet.say("I'm new!");
                    this.say('A friend!');
                }, 100);
            }
        }
    }

    removeSelf() {
        if (this.manager && this.manager.pets.length > 1) {
            this.say('Bye bye!');
            setTimeout(() => {
                this.manager.removePet(this);
            }, 500);
        } else {
            this.say("I'm the last one!");
        }
    }

    // ========================================
    // Petting System
    // ========================================

    startPetting(clientX, clientY) {
        this.petting.active = true;
        this.petting.lastX = clientX;
        this.petting.lastY = clientY;
        this.petting.strokes = 0;
        this.petting.directionChanges = 0;
        this.petting.direction = 0;
        this.petting.happinessLevel = 0;

        this.element.classList.add('being-petted');
        this.spriteElement.classList.add('petted');

        clearTimeout(this.petting.strokeTimeout);
    }

    updatePetting(clientX, clientY) {
        if (!this.petting.active) return;

        const deltaX = clientX - this.petting.lastX;
        const deltaY = clientY - this.petting.lastY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.config.pettingConfig.strokeThreshold) {
            const newDirection = deltaX > 0 ? 1 : -1;

            if (this.petting.direction !== 0 && this.petting.direction !== newDirection) {
                this.petting.directionChanges++;
                this.petting.lastDirectionChangeTime = Date.now();

                if (this.petting.directionChanges >= this.config.pettingConfig.directionChangeThreshold) {
                    this.petting.strokes++;
                    this.petting.directionChanges = 0;
                    this.onSuccessfulStroke();
                }
            }

            this.petting.direction = newDirection;
            this.petting.lastX = clientX;
            this.petting.lastY = clientY;
        }

        clearTimeout(this.petting.strokeTimeout);
        this.petting.strokeTimeout = setTimeout(() => {
            this.petting.directionChanges = 0;
            this.petting.direction = 0;
        }, this.config.pettingConfig.decayRate);
    }

    onSuccessfulStroke() {
        this.petting.happinessLevel++;

        const cfg = this.config.pettingConfig;

        this.spriteElement.classList.remove('petted', 'petted-happy', 'petted-ecstatic');

        if (this.petting.happinessLevel >= cfg.ecstaticThreshold) {
            this.spriteElement.classList.add('petted-ecstatic');

            if (cfg.particlesEnabled) {
                this.spawnHeart();
                this.spawnHeart();
                this.spawnSparkle();
            }

            if (Math.random() < 0.3) {
                this.say(this.getRandomPhrase('pettedEcstatic'));
            }
        } else if (this.petting.happinessLevel >= cfg.happyThreshold) {
            this.spriteElement.classList.add('petted-happy');

            if (cfg.particlesEnabled) {
                this.spawnHeart();
            }

            if (Math.random() < 0.25) {
                this.say(this.getRandomPhrase('pettedHappy'));
            }
        } else {
            this.spriteElement.classList.add('petted');

            if (cfg.particlesEnabled && Math.random() < 0.3) {
                this.spawnSparkle();
            }

            if (Math.random() < 0.2) {
                this.say(this.getRandomPhrase('petted'));
            }
        }
    }

    endPetting() {
        if (!this.petting.active) return;

        this.petting.active = false;
        this.element.classList.remove('being-petted');
        this.spriteElement.classList.remove('petted', 'petted-happy', 'petted-ecstatic');

        clearTimeout(this.petting.strokeTimeout);

        if (this.petting.happinessLevel >= this.config.pettingConfig.ecstaticThreshold) {
            this.say(this.getRandomPhrase('pettedEcstatic'));
            this.spriteElement.classList.add('happy');
            setTimeout(() => this.spriteElement.classList.remove('happy'), 3000);
        } else if (this.petting.happinessLevel >= this.config.pettingConfig.happyThreshold) {
            this.say(this.getRandomPhrase('pettedHappy'));
            this.spriteElement.classList.add('happy');
            setTimeout(() => this.spriteElement.classList.remove('happy'), 2000);
        } else if (this.petting.happinessLevel > 0) {
            this.say(this.getRandomPhrase('pettedEnd'));
        }

        this.petting.happinessLevel = 0;
        this.petting.strokes = 0;
    }

    spawnHeart() {
        const heart = document.createElement('div');
        heart.className = 'pet-heart';
        heart.textContent = ['❤️', '💕', '💖', '💗', '♥'][Math.floor(Math.random() * 5)];
        heart.style.left = `${Math.random() * this.size}px`;
        heart.style.top = `${Math.random() * (this.size / 2)}px`;

        this.pettingEffects.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);
    }

    spawnSparkle() {
        const sparkle = document.createElement('div');
        sparkle.className = 'pet-sparkle';
        sparkle.textContent = ['✨', '⭐', '💫', '✧'][Math.floor(Math.random() * 4)];
        sparkle.style.left = `${Math.random() * this.size}px`;
        sparkle.style.top = `${Math.random() * this.size}px`;

        this.pettingEffects.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 600);
    }

    // ========================================
    // Config Modal
    // ========================================

    openConfigModal() {
        const overlay = document.createElement('div');
        overlay.className = 'pet-config-overlay';
        overlay.addEventListener('click', () => this.closeConfigModal());

        const modal = document.createElement('div');
        modal.className = 'pet-config-modal';
        modal.addEventListener('click', (e) => e.stopPropagation());

        const petCount = this.manager ? this.manager.pets.length : 1;
        const maxPets = this.manager ? this.manager.maxPets : 10;
        const currentSpriteUrl = this.config.spritesheetUrl || "";

        modal.innerHTML = `
            <h2>🐱 Desktop Pet Settings</h2>

            <div class="loaded-config-info" id="config-info-display">
                <strong>${this.config.meta.name}</strong> v${this.config.meta.version}<br>
                <small>by ${this.config.meta.author}</small><br>
                <small>${this.config.meta.description}</small>
            </div>

            <div class="pet-count-info">
                🐾 Active Pets: <strong>${petCount}</strong> / ${maxPets}
                <button class="btn-secondary" id="add-pet-btn" style="margin-left: 10px; padding: 4px 8px;">+ Add Pet</button>
                <button class="btn-secondary" id="remove-all-btn" style="padding: 4px 8px;">Remove All</button>
            </div>

            <div class="tabs">
                <div class="tab active" data-tab="load">Load Config</div>
                <div class="tab" data-tab="create">Create Config</div>
                <div class="tab" data-tab="export">Export</div>
            </div>

            <div class="tab-content active" id="tab-load">
                <h3>Load from File</h3>
                <div class="file-drop-zone" id="file-drop-zone">
                    <p>📁 Drag & drop a .json config file here</p>
                    <p><small>or click to browse</small></p>
                    <input type="file" id="config-file-input" accept=".json">
                </div>

                <h3>Load from URL</h3>
                <label>Config URL:</label>
                <input type="text" id="config-url-input" placeholder="https://example.com/my-pet-config.json">
                <button class="btn-primary" id="load-url-btn">Load from URL</button>

                <div class="config-info">
                    <strong>💡 Tip:</strong> Config files contain behaviors, sprites, and phrases. Share them with friends!
                </div>
            </div>

            <div class="tab-content" id="tab-create">
                <h3>Pet Information</h3>
                <label>Pet Name:</label>
                <input type="text" id="cfg-name" value="${this.config.meta.name}">

                <label>Author:</label>
                <input type="text" id="cfg-author" value="${this.config.meta.author}">

                <label>Description:</label>
                <input type="text" id="cfg-description" value="${this.config.meta.description}">

                <label>Sprite Sheet URL (optional):</label>
                <input type="text" id="cfg-sprite-url" value="${currentSpriteUrl}" placeholder="https://example.com/sprites.png">

                <h3>Advanced: Full Config JSON</h3>
                <textarea id="cfg-full-json">${JSON.stringify(this.config, null, 2)}</textarea>

                <button class="btn-primary" id="apply-config-btn">Apply Changes</button>
            </div>

            <div class="tab-content" id="tab-export">
                <h3>Export Current Config</h3>
                <p>Download your current pet configuration to share with others.</p>

                <button class="btn-primary" id="export-json-btn">📥 Download as JSON</button>
                <button class="btn-secondary" id="copy-json-btn">📋 Copy to Clipboard</button>
            </div>

            <div class="button-row">
                <button class="btn-secondary" id="reset-defaults-btn">Reset to Defaults</button>
                <button class="btn-secondary" id="close-modal-btn">Close</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        this.configModal = modal;
        this.configOverlay = overlay;

        // Tab switching
        modal.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                modal.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
            });
        });

        // File drop zone
        const dropZone = modal.querySelector('#file-drop-zone');
        const fileInput = modal.querySelector('#config-file-input');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.loadConfigFromFile(file);
        });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadConfigFromFile(file);
        });

        // Button handlers
        modal.querySelector('#add-pet-btn').addEventListener('click', () => {
            this.clonePet();
            this.closeConfigModal();
        });

        modal.querySelector('#remove-all-btn').addEventListener('click', () => {
            if (this.manager) {
                const pets = [...this.manager.pets];
                pets.forEach((p, i) => {
                    if (i > 0) this.manager.removePet(p);
                });
            }
            this.closeConfigModal();
        });

        modal.querySelector('#load-url-btn').addEventListener('click', () => {
            const url = modal.querySelector('#config-url-input').value;
            if (url) {
                this.loadExternalConfig(url).then(() => {
                    this.updateConfigInfoDisplay();
                    this.closeConfigModal();
                });
            }
        });

        modal.querySelector('#apply-config-btn').addEventListener('click', () => {
            this.applyConfigFromModal();
            this.closeConfigModal();
        });

        modal.querySelector('#export-json-btn').addEventListener('click', () => {
            this.exportConfigAsFile();
        });

        modal.querySelector('#copy-json-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(JSON.stringify(this.config, null, 2));
            this.say('Copied!');
        });

        modal.querySelector('#reset-defaults-btn').addEventListener('click', () => {
            this.config = this.getDefaultConfig();
            this.updateConfigInfoDisplay();
            this.updateSprite();
            modal.querySelector('#cfg-full-json').value = JSON.stringify(this.config, null, 2);
            this.say('Reset!');
        });

        modal.querySelector('#close-modal-btn').addEventListener('click', () => {
            this.closeConfigModal();
        });
    }

    closeConfigModal() {
        if (this.configModal) {
            this.configModal.remove();
            this.configModal = null;
        }
        if (this.configOverlay) {
            this.configOverlay.remove();
            this.configOverlay = null;
        }
    }

    updateConfigInfoDisplay() {
        const display = document.querySelector('#config-info-display');
        if (display) {
            display.innerHTML = `
                <strong>${this.config.meta.name}</strong> v${this.config.meta.version}<br>
                <small>by ${this.config.meta.author}</small><br>
                <small>${this.config.meta.description}</small>
            `;
        }
    }

    loadConfigFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const configData = JSON.parse(e.target.result);
                this.config = this.deepMerge(this.getDefaultConfig(), configData);
                this.gravity = this.config.physics.gravity;
                this.updateConfigInfoDisplay();
                this.updateSprite();
				this.updateDisplaySize();
                this.say('Loaded!');
                this.closeConfigModal();
            } catch (error) {
                console.error('Invalid config file:', error);
                this.say('Error!');
            }
        };
        reader.readAsText(file);
    }

    applyConfigFromModal() {
        try {
            const fullJson = this.configModal.querySelector('#cfg-full-json').value;
            let newConfig = JSON.parse(fullJson);

            // Override with simple fields from the UI
            newConfig.meta.name = this.configModal.querySelector('#cfg-name').value;
            newConfig.meta.author = this.configModal.querySelector('#cfg-author').value;
            newConfig.meta.description = this.configModal.querySelector('#cfg-description').value;
            newConfig.spritesheetUrl = this.configModal.querySelector('#cfg-sprite-url').value;

            // Apply the new, merged configuration
            this.config = this.deepMerge(this.getDefaultConfig(), newConfig);
            this.gravity = this.config.physics.gravity;

            // Update UI elements to reflect changes
            this.updateConfigInfoDisplay();
            this.updateSprite(); // Immediately update the pet's look
			this.updateDisplaySize();

            this.say('Applied!');
        } catch (error) {
            console.error('Invalid JSON in config modal:', error);
            this.say('JSON Error!');
        }
    }

    exportConfigAsFile() {
        const blob = new Blob([JSON.stringify(this.config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.config.meta.name.toLowerCase().replace(/\s+/g, '-')}-pet-config.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.say('Downloaded!');
    }

    // ========================================
    // Sprite & Animation
    // ========================================
updateSprite() {
    if (!this.spriteElement) return;

    const spriteConfig = this.config.sprites[this.state] || this.config.sprites.idle;
    const spriteSource = this.config.spritesheetUrl || this.config.spritesheet;

    if (spriteSource) {
        // Using a spritesheet
        this.spriteElement.innerHTML = ''; // Clear any emoji text
        this.spriteElement.style.backgroundImage = `url(${spriteSource})`;

        // spriteSize is the size of ONE frame in the source spritesheet
        const spriteSize = this.config.spriteSize || 128;
        
        // Calculate the frame position in the spritesheet
        const frameIndex = this.animationFrame % spriteConfig.frames;
        const xOffset = frameIndex * spriteSize;
        const yOffset = (spriteConfig.row || 0) * spriteSize;
        
        // Get spritesheet dimensions
        const totalColumns = this.config.spriteColumns || Math.max(...Object.values(this.config.sprites).map(s => s.frames || 1));
        const totalRows = Math.max(...Object.values(this.config.sprites).map(s => (s.row || 0) + 1));
        
        // Calculate the scale factor between display size and sprite size
        const scale = this.size / spriteSize;
        
        // Set background size to scale the entire spritesheet proportionally
        const bgWidth = spriteSize * totalColumns * scale;
        const bgHeight = spriteSize * totalRows * scale;
        
        this.spriteElement.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
        this.spriteElement.style.backgroundPosition = `-${xOffset * scale}px -${yOffset * scale}px`;
        
        this.spriteElement.style.width = `${this.size}px`;
        this.spriteElement.style.height = `${this.size}px`;
    } else {
        // Fallback to using emojis
        const emojis = this.config.emojis[this.state] || this.config.emojis.idle;
        const emoji = emojis[this.animationFrame % emojis.length];

        this.spriteElement.style.backgroundImage = 'none';
        this.spriteElement.innerHTML = `<span style="font-size: ${this.size * 0.8}px; display: flex; justify-content: center; align-items: center; height: 100%;">${emoji}</span>`;
    }

    if (this.direction === -1) {
        this.spriteElement.classList.add('flip');
    } else {
        this.spriteElement.classList.remove('flip');
    }
}

    updatePosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }

    // ========================================
    // Event Handlers
    // ========================================

    bindEvents() {
        this.onMouseDownBound = this.onMouseDown.bind(this);
        this.onMouseMoveBound = this.onMouseMove.bind(this);
        this.onMouseUpBound = this.onMouseUp.bind(this);
        this.onMouseEnterBound = this.onMouseEnter.bind(this);
        this.onMouseLeaveBound = this.onMouseLeave.bind(this);
        this.onTouchStartBound = this.onTouchStart.bind(this);
        this.onTouchMoveBound = this.onTouchMove.bind(this);
        this.onTouchEndBound = this.onTouchEnd.bind(this);
        this.onDoubleClickBound = this.onDoubleClick.bind(this);
        this.onResizeBound = this.onResize.bind(this);

        this.element.addEventListener('mousedown', this.onMouseDownBound);
        this.element.addEventListener('mouseenter', this.onMouseEnterBound);
        this.element.addEventListener('mouseleave', this.onMouseLeaveBound);
        document.addEventListener('mousemove', this.onMouseMoveBound);
        document.addEventListener('mouseup', this.onMouseUpBound);
        this.element.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
        document.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
        document.addEventListener('touchend', this.onTouchEndBound);
        this.element.addEventListener('dblclick', this.onDoubleClickBound);
        window.addEventListener('resize', this.onResizeBound);
    }

    onMouseEnter(e) {
        if (e.target.closest('.pet-config-button, .pet-clone-button, .pet-remove-button')) return;
        if (!this.isDragging) {
            this.startPetting(e.clientX, e.clientY);
        }
    }

    onMouseLeave() {
        if (this.petting.active && !this.isDragging) {
            this.endPetting();
        }
    }

    onMouseDown(e) {
        if (e.target.closest('.pet-config-button, .pet-clone-button, .pet-remove-button')) return;

        if (this.petting.active) {
            this.endPetting();
        }

        e.preventDefault();
        this.startDrag(e.clientX, e.clientY);
    }

    onMouseMove(e) {
        if (this.isDragging) {
            this.updateDrag(e.clientX, e.clientY);
        } else if (this.petting.active) {
            this.updatePetting(e.clientX, e.clientY);
        }
    }

    onMouseUp() {
        this.endDrag();
    }

    onTouchStart(e) {
        if (e.target.closest('.pet-config-button, .pet-clone-button, .pet-remove-button')) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY);
    }

    onTouchMove(e) {
        if (this.isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateDrag(touch.clientX, touch.clientY);
        }
    }

    onTouchEnd() {
        this.endDrag();
    }

    startDrag(clientX, clientY) {
        this.isDragging = true;
        this.currentPlatform = null;
        this.dragOffsetX = clientX - this.x;
        this.dragOffsetY = clientY - this.y;
        this.setState('drag');
        this.element.classList.add('dragging');
        this.say(this.getRandomPhrase('drag'));
    }

    updateDrag(clientX, clientY) {
        this.x = clientX - this.dragOffsetX;
        this.y = clientY - this.dragOffsetY;
        this.x = Math.max(0, Math.min(window.innerWidth - this.size, this.x));
        this.y = Math.max(0, Math.min(window.innerHeight - this.size, this.y));
        this.updatePosition();
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.element.classList.remove('dragging');
            this.grounded = false;
            this.velocityY = 0;
            this.setState('fall');
            }
    }

    onDoubleClick() {
        this.say(this.getRandomPhrase('happy'));
        this.spriteElement.classList.add('happy');
        setTimeout(() => {
            this.spriteElement.classList.remove('happy');
        }, 2000);
    }

    onResize() {
        this.x = Math.min(this.x, window.innerWidth - this.size);
        this.y = Math.min(this.y, window.innerHeight - this.size);
        this.updatePosition();
        this.scanForPlatforms();
    }

    // ========================================
    // State Machine
    // ========================================

    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.animationFrame = 0;
            this.frameTimer = 0;
            this.updateSprite();
        }
    }

    scheduleNextBehavior() {
        clearTimeout(this.stateTimer);
        const behavior = this.config.behaviors[this.state];

        // Guard: don't schedule if no behavior defined or if in a non-schedulable state
        if (!behavior || !behavior.duration) return;
        if (this.isDragging || this.state === 'drag' || this.state === 'fall' || this.petting.active) return;

        const [minDuration, maxDuration] = behavior.duration;
        const duration = minDuration + Math.random() * (maxDuration - minDuration);

        this.stateTimer = setTimeout(() => {
            if (!this.isDragging && this.state !== 'drag' && this.state !== 'fall' && !this.petting.active) {
                const nextState = this.selectNextState(behavior);
                this.transitionTo(nextState);
            }
        }, duration);
    }

    selectNextState(behavior) {
        const { next, weights } = behavior;

        if (!next || next.length === 0) {
            return 'idle';
        }

        if (!weights || weights.length !== next.length) {
            return next[Math.floor(Math.random() * next.length)];
        }

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < next.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return next[i];
            }
        }

        return next[next.length - 1];
    }

    transitionTo(newState) {
        clearTimeout(this.stateTimer);

        const physics = this.config.physics;

        if (newState === 'jump' && (this.grounded || this.currentPlatform)) {
            this.velocityY = -physics.jumpForce;
            this.grounded = false;

            if (this.config.platformBehavior.enabled && Math.random() < this.config.platformBehavior.platformJumpChance) {
                const nearbyPlatform = this.getNearbyPlatform();
                if (nearbyPlatform) {
                    const platformCenterX = nearbyPlatform.surfaceLeft + nearbyPlatform.width / 2;
                    const petCenterX = this.x + this.size / 2;
                    this.direction = platformCenterX > petCenterX ? 1 : -1;
                    this.velocityX = this.direction * 4;
                    this.say(this.getRandomPhrase('platformJump'));
                }
            }

            this.currentPlatform = null;
        }

        if (newState === 'walk' || newState === 'platformWalk') {
            if (this.currentPlatform && newState === 'walk') {
                newState = 'platformWalk';
            }

            this.direction = Math.random() > 0.5 ? 1 : -1;
            const { min, max } = physics.walkSpeed;
            this.velocityX = this.direction * (min + Math.random() * (max - min));
        } else if (newState !== 'fall' && newState !== 'jump') {
            this.velocityX = 0;
        }

        if (newState === 'idle' && this.currentPlatform) {
            newState = 'platformIdle';
        }

        if (newState === 'climb') {
            this.x = this.direction === 1 ? window.innerWidth - this.size : 0;
            this.currentPlatform = null;
        }

        if (Math.random() < 0.3) {
            this.say(this.getRandomPhrase(newState));
        }

        this.setState(newState);
        this.scheduleNextBehavior();
    }

    // ========================================
    // Animation Loop
    // ========================================

    startAnimation() {
        const animate = (timestamp) => {
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;
            this.update(deltaTime);
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    update(deltaTime) {
        if (isNaN(deltaTime) || deltaTime > 100) deltaTime = 16.67;

        const spriteConfig = this.config.sprites[this.state] || this.config.sprites.idle;
		
		
    // Debug: Uncomment to verify animation is cycling
     // console.log(`State: ${this.state}, Frame: ${this.animationFrame}, Timer: ${this.frameTimer}`);
	
        this.frameTimer += deltaTime;
        if (this.frameTimer >= spriteConfig.speed) {
            this.frameTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % spriteConfig.frames;
            this.updateSprite();
        }

        if (this.isDragging) return;
        if (this.petting.active) return;

        this.updatePlatformPositions();

        if (!this.grounded && this.state !== 'climb') {
            this.velocityY += this.gravity;
            this.y += this.velocityY;
        }

        if (this.state === 'walk' || this.state === 'platformWalk' || this.state === 'jump' || this.state === 'fall') {
            this.x += this.velocityX;
        }

        if (this.currentPlatform && (this.state === 'platformWalk' || this.state === 'platformIdle')) {
            const padding = this.config.platformBehavior.edgePadding;
            const leftEdge = this.currentPlatform.surfaceLeft + padding;
            const rightEdge = this.currentPlatform.surfaceRight - this.size - padding;

            if (this.x <= leftEdge) {
                this.x = leftEdge;
                this.direction = 1;
                this.velocityX = Math.abs(this.velocityX);
            } else if (this.x >= rightEdge) {
                this.x = rightEdge;
                this.direction = -1;
                this.velocityX = -Math.abs(this.velocityX);
            }
        }

        if (this.state === 'walk' && !this.currentPlatform) {
            if (this.x <= 0 || this.x >= window.innerWidth - this.size) {
                this.direction *= -1;
                this.velocityX *= -1;
                this.x = Math.max(0, Math.min(window.innerWidth - this.size, this.x));
            }
        }

        if (this.state === 'climb') {
            this.y -= this.config.physics.climbSpeed;
            if (this.y <= 0) {
                this.y = 0;
                this.transitionTo('idle');
            }
        }

        this.handleCollisions();

        this.x = Math.max(0, Math.min(window.innerWidth - this.size, this.x));

        this.updatePosition();

        if (this.manager && this.manager.pets[0] === this) {
            this.manager.checkPetInteractions();
        }
    }

    handleCollisions() {
        const groundY = window.innerHeight - this.size;

        if (this.velocityY > 0) {
            const platform = this.findPlatformBelow();

            if (platform) {
                const landingY = platform.surfaceY - this.size;

                if (this.y >= landingY - this.velocityY && this.y <= landingY + 5) {
                    this.y = landingY;
                    this.velocityY = 0;
                    this.grounded = true;
                    this.currentPlatform = platform;

                    if (this.state === 'fall' || this.state === 'jump') {
                        this.say(this.getRandomPhrase('platform'));
                        this.transitionTo('platformIdle');
                    }
                    return;
                }
            }
        }

        if (this.currentPlatform && !this.isOnPlatform()) {
            const petCenterX = this.x + this.size / 2;
            const farFromPlatform =
                petCenterX < this.currentPlatform.surfaceLeft - 20 ||
                petCenterX > this.currentPlatform.surfaceRight + 20;

            if (farFromPlatform) {
                this.currentPlatform = null;
                this.grounded = false;
                if (this.state !== 'jump') {
                    this.setState('fall');
                }
            }
        }

        if (this.y >= groundY) {
            this.y = groundY;
            this.velocityY = 0;
            this.currentPlatform = null;

            if (!this.grounded) {
                this.grounded = true;
                if (this.state === 'fall' || this.state === 'jump') {
                    this.transitionTo('idle');
                }
            }
        }
    }

    // ========================================
    // Speech System
    // ========================================

    say(text, duration = 3000) {
        if (!text) return;

        this.speechText.textContent = text;
        this.speechBubble.style.display = 'block';

        clearTimeout(this.speechTimeout);
        this.speechTimeout = setTimeout(() => {
            this.speechBubble.style.display = 'none';
        }, duration);
    }

    getRandomPhrase(context) {
        const phrases = this.config.phrases[context] || this.config.phrases.idle || ['...'];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    // ========================================
    // Chat Reactions
    // ========================================

    reactToContent(content) {
        const lowerContent = content.toLowerCase();

        for (const [name, reaction] of Object.entries(this.config.reactions)) {
            for (const trigger of reaction.triggers) {
                if (lowerContent.includes(trigger)) {
                    this.performReaction(reaction);
                    return;
                }
            }
        }
    }

    performReaction(reaction) {
        const phrase = reaction.phrases[Math.floor(Math.random() * reaction.phrases.length)];
        this.say(phrase);

        if (reaction.action === 'happy') {
            this.spriteElement.classList.add('happy');
            setTimeout(() => this.spriteElement.classList.remove('happy'), 2000);
        }
    }

    // ========================================
    // Cleanup
    // ========================================

    destroy() {
        cancelAnimationFrame(this.animationId);
        clearTimeout(this.stateTimer);
        clearTimeout(this.speechTimeout);
        clearTimeout(this.petting.strokeTimeout);
        clearInterval(this.platformCheckInterval);

        this.element.removeEventListener('mousedown', this.onMouseDownBound);
        this.element.removeEventListener('mouseenter', this.onMouseEnterBound);
        this.element.removeEventListener('mouseleave', this.onMouseLeaveBound);
        document.removeEventListener('mousemove', this.onMouseMoveBound);
        document.removeEventListener('mouseup', this.onMouseUpBound);
        this.element.removeEventListener('touchstart', this.onTouchStartBound);
        document.removeEventListener('touchmove', this.onTouchMoveBound);
        document.removeEventListener('touchend', this.onTouchEndBound);
        this.element.removeEventListener('dblclick', this.onDoubleClickBound);
        window.removeEventListener('resize', this.onResizeBound);

        this.closeConfigModal();

        if (this.element) this.element.remove();

        // [FIX] Removed logic that deleted the shared stylesheet when the last pet was destroyed.
        // This is now handled by the PetManager's main destroy function on unload.
    }
}

// ============================================
// Plugin Initialization
// ============================================

let petManager = null;

function initPets() {
    // Prevent multiple initializations
    if (petManager) return;
    
    petManager = new PetManager();
    petManager.loadPetConfigs();

    // Restore enabled state
    const wasEnabled = localStorage.getItem('petsEnabled');
    petManager.enabled = wasEnabled !== 'false';

    // Spawn one default pet if enabled and none are active
    if (petManager.enabled && petManager.pets.length === 0 && petManager.petConfigs.length > 0) {
        petManager.spawnPetOfType(0);
    }

    console.log('Pet Manager initialized!');
}

initPets();

onUnload(() => {
    if (petManager) {
        petManager.destroy();
        petManager = null;
        console.log('Desktop Pet Manager destroyed!');
    }
});

const outputHandler = (content) => {
    if (petManager) {
        petManager.broadcastReaction(content);
    }
    return null;
};

addRisuScriptHandler('output', outputHandler);