import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

class FishingGame {
    constructor() {
        // Primeiro, configure os tipos de peixes e o inventário
        this.setupFishing();
        
        // Depois, configure a cena e outros elementos
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 15, 20);
        this.camera.lookAt(0, 0, 0);

        const light = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(light);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 15, 5);
        this.scene.add(dirLight);

        this.createEnvironment();
        this.createPlayer();
        this.setupControls();

        this.isFishing = false;
        this.lastSpacePress = 0;

        this.canCatch = false;
        this.currentFish = null;
        this.fishingInterval = null;
        this.catchAttempts = 0;
        this.fishingTimeout = null;

        // Carrega o progresso salvo (opcional)
        this.loadProgress();

        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createEnvironment() {
        const waterGeometry = new THREE.PlaneGeometry(100, 100);
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0077be,
            transparent: true,
            opacity: 0.6,
            metalness: 0.3,
            roughness: 0.2
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);

        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x654321,
            roughness: 0.8
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0.01;
        this.scene.add(this.ground);

        const borderGeometry = new THREE.BoxGeometry(30, 0.2, 30);
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.y = 0;
        this.scene.add(border);
    }

    createPlayer() {
        // Corpo
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
        this.player = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.player.position.set(0, 1, 5);
        this.scene.add(this.player);

        // Cabeça
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcccc });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.4;
        this.player.add(head);

        // Olhos
        const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0, 0.4);
        head.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0, 0.4);
        head.add(rightEye);

        // Boca
        const mouthGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.1);
        const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, -0.2, 0.4);
        head.add(mouth);

        // Braços
        const armGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
        
        // Braço esquerdo
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.65, 0.3, 0);
        this.player.add(leftArm);
        
        // Braço direito (que segura a vara)
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.65, 0.3, 0);
        // Rotaciona levemente o braço direito para frente
        rightArm.rotation.x = Math.PI / 12;
        this.player.add(rightArm);

        // Vara de pesca (anexada ao braço direito)
        this.fishingRod = new THREE.Group();
        
        // Cabo da vara
        const handleGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.5);
        const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const handle = new THREE.Mesh(handleGeometry, rodMaterial);
        handle.rotation.x = Math.PI / 2;
        this.fishingRod.add(handle);

        // Vara principal
        const rodGeometry = new THREE.CylinderGeometry(0.03, 0.05, 2);
        const rod = new THREE.Mesh(rodGeometry, rodMaterial);
        rod.position.z = 1;
        rod.rotation.x = Math.PI / 2;
        this.fishingRod.add(rod);

        // Linha de pesca
        this.fishingLine = new THREE.Group();
        const lineGeometry = new THREE.BoxGeometry(0.01, 2, 0.01);
        const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        this.line = new THREE.Mesh(lineGeometry, lineMaterial);
        
        // Ajusta a posição da linha para sair da ponta da vara
        this.line.position.y = -1;
        this.line.position.x = 0;
        this.line.position.z = 2; // Posiciona na ponta da vara
        
        this.fishingLine.add(this.line);
        this.fishingRod.add(this.fishingLine); // Anexa ao grupo da vara em vez do rod

        // Isca
        const baitGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const baitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.3,
            roughness: 0.7
        });
        this.bait = new THREE.Mesh(baitGeometry, baitMaterial);
        this.bait.position.y = -2; // Posição relativa à linha
        this.fishingLine.add(this.bait);

        // Ajusta a posição da vara no braço direito
        this.fishingRod.position.set(0, -0.3, 0.2); // Movido para baixo e um pouco para frente
        this.fishingRod.rotation.x = Math.PI / 6; // Leve inclinação inicial
        rightArm.add(this.fishingRod);

        // Ajusta a rotação inicial da linha
        this.fishingLine.rotation.x = Math.PI / 2; // Ajusta para apontar para baixo

        // Após criar a linha e a isca, deixe-as invisíveis inicialmente
        this.line.visible = false;
        this.bait.visible = false;

        this.playerDirection = new THREE.Vector3(0, 0, -1);
    }

    setupControls() {
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = true;
            }
            
            // Tecla espaço para jogar/retirar vara
            if (e.code === 'Space') {
                const currentTime = Date.now();
                if (currentTime - this.lastSpacePress > 500) {
                    this.lastSpacePress = currentTime;
                    if (this.isFishing) {
                        this.endFishing(false, 'Vara retirada da água');
                    } else {
                        this.startFishing();
                    }
                }
            }

            // Tecla F para fisgar
            if (e.code === 'KeyF' && this.isFishing) {
                this.attemptCatch();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = false;
            }
        });
    }

    setupFishing() {
        this.fishTypes = [
            { 
                name: 'Sardinha', 
                difficulty: 0.5,
                timeWindow: 1000,
                catchWindow: 15,
                points: 10,
                price: 50,        // 50 moedas
                color: 0x87CEEB,
                icon: '🐟'
            },
            { 
                name: 'Atum', 
                difficulty: 1,
                timeWindow: 800,
                catchWindow: 12,
                points: 20,
                price: 120,       // 120 moedas
                color: 0x4169E1,
                icon: '🐠'
            },
            { 
                name: 'Salmão', 
                difficulty: 1.5,
                timeWindow: 600,
                catchWindow: 10,
                points: 30,
                price: 200,       // 200 moedas
                color: 0xFF6B6B,
                icon: '🐡'
            }
        ];

        this.inventory = {
            'Sardinha': 0,
            'Atum': 0,
            'Salmão': 0
        };

        this.money = 0;  // Adiciona dinheiro ao jogador
        this.fishCount = 0;
        this.totalPoints = 0;
        
        this.updateInventoryDisplay();
    }

    updateInventoryDisplay() {
        const fishList = document.getElementById('fishList');
        fishList.innerHTML = '';

        this.fishTypes.forEach(fishType => {
            const count = this.inventory[fishType.name];
            const totalValue = count * fishType.price;
            const fishDiv = document.createElement('div');
            fishDiv.className = 'fish-item';
            fishDiv.innerHTML = `
                <span>${fishType.icon} ${fishType.name}:</span>
                <span class="fish-details">
                    <span class="fish-count">${count}</span>
                    <span class="fish-price">(${fishType.price} 💰)</span>
                </span>
            `;
            fishList.appendChild(fishDiv);
        });

        // Adiciona o valor total do inventário
        const totalValue = this.fishTypes.reduce((total, fishType) => {
            return total + (this.inventory[fishType.name] * fishType.price);
        }, 0);

        const totalDiv = document.createElement('div');
        totalDiv.className = 'inventory-total';
        totalDiv.innerHTML = `
            <span>Valor total:</span>
            <span class="total-value">${totalValue} 💰</span>
        `;
        fishList.appendChild(totalDiv);

        document.getElementById('totalPoints').textContent = this.totalPoints;
    }

    handleFishing() {
        if (!this.isFishing) {
            this.startFishing();
        }
    }

    startFishing() {
        if (!this.isFishing) {
            this.isFishing = true;
            this.canCatch = false;
            this.catchAttempts = 0;
            
            // Torna a linha e a isca visíveis
            this.line.visible = true;
            this.bait.visible = true;
            
            // Animação de jogar a vara
            const throwAnimation = {
                start: this.fishingRod.rotation.x,
                end: -Math.PI / 2.5, // Ajustado para um ângulo mais natural
                duration: 500,
                startTime: Date.now()
            };

            const animate = () => {
                const now = Date.now();
                const elapsed = now - throwAnimation.startTime;
                const progress = Math.min(elapsed / throwAnimation.duration, 1);

                const eased = 1 - Math.pow(1 - progress, 3);
                
                this.fishingRod.rotation.x = throwAnimation.start + 
                    (throwAnimation.end - throwAnimation.start) * eased;

                this.fishingLine.scale.y = 1 + progress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            animate();
            
            this.showMessage('Vara lançada! Aguarde um peixe...', '#4169E1');
            
            // Escolhe um peixe aleatório
            this.currentFish = this.fishTypes[Math.floor(Math.random() * this.fishTypes.length)];
            
            // Tempo aleatório até o peixe morder
            setTimeout(() => {
                if (this.isFishing) {
                    this.showMessage('Um peixe mordeu! Pressione F quando a barra estiver verde!', '#ff9800');
                    this.triggerFishingMinigame();
                }
            }, Math.random() * 2000 + 1000);
        }
    }

    triggerFishingMinigame() {
        if (!this.currentFish) {
            this.currentFish = this.fishTypes[0];
        }

        const fishingBar = document.getElementById('fishingBar');
        const progressBar = document.getElementById('fishingProgress');
        
        fishingBar.style.display = 'block';
        progressBar.style.width = '50%';
        
        let progress = 50;
        this.canCatch = false;

        if (this.fishingInterval) {
            clearInterval(this.fishingInterval);
        }

        progressBar.style.backgroundColor = '#4CAF50';
        
        const updateProgress = () => {
            if (!this.isFishing || !this.currentFish) {
                clearInterval(this.fishingInterval);
                return;
            }

            const fishMovement = Math.sin(Date.now() * 0.003) * this.currentFish.difficulty;
            progress = 50 + fishMovement * 25;
            progressBar.style.width = `${progress}%`;
            
            const catchZone = 50;
            this.canCatch = Math.abs(progress - catchZone) <= this.currentFish.catchWindow;
            
            progressBar.style.backgroundColor = this.canCatch ? '#4CAF50' : '#ff6b6b';
        };

        this.fishingInterval = setInterval(updateProgress, 16);

        if (this.fishingTimeout) {
            clearTimeout(this.fishingTimeout);
        }
        this.fishingTimeout = setTimeout(() => {
            if (this.isFishing && this.fishingInterval) {
                clearInterval(this.fishingInterval);
                this.endFishing(false, 'Tempo esgotado!');
            }
        }, 20000);
    }

    attemptCatch() {
        if (!this.currentFish || !this.isFishing) return;
        
        this.catchAttempts++;
        
        if (this.canCatch) {
            if (this.fishingInterval) {
                clearInterval(this.fishingInterval);
            }
            
            // Atualiza o inventário
            this.inventory[this.currentFish.name]++;
            this.fishCount++;
            this.totalPoints += this.currentFish.points;
            
            // Atualiza os displays
            this.updateInventoryDisplay();
            document.getElementById('fishCount').textContent = this.fishCount;
            
            this.showMessage(
                `Pegou um ${this.currentFish.name}! ${this.currentFish.icon} +${this.currentFish.points} pontos`, 
                '#4CAF50'
            );
            this.endFishing(true);
        } else {
            this.showMessage('O peixe escapou! Timing errado!', '#ff6b6b');
            this.endFishing(false);
        }
    }

    showMessage(text, color) {
        let messageEl = document.getElementById('fishingMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'fishingMessage';
            messageEl.style.position = 'absolute';
            messageEl.style.top = '60%';
            messageEl.style.left = '50%';
            messageEl.style.transform = 'translate(-50%, -50%)';
            messageEl.style.padding = '10px';
            messageEl.style.borderRadius = '5px';
            messageEl.style.fontFamily = 'Arial, sans-serif';
            messageEl.style.fontWeight = 'bold';
            messageEl.style.transition = 'opacity 0.3s';
            messageEl.style.zIndex = '1000';
            document.body.appendChild(messageEl);
        }

        messageEl.style.backgroundColor = color;
        messageEl.style.color = 'white';
        messageEl.textContent = text;
        messageEl.style.opacity = '1';

        setTimeout(() => {
            messageEl.style.opacity = '0';
        }, 3000);
    }

    endFishing(success, message = '') {
        if (this.fishingTimeout) {
            clearTimeout(this.fishingTimeout);
            this.fishingTimeout = null;
        }

        if (this.fishingInterval) {
            clearInterval(this.fishingInterval);
        }

        this.isFishing = false;
        this.canCatch = false;
        
        const fishingBar = document.getElementById('fishingBar');
        const progressBar = document.getElementById('fishingProgress');
        
        if (fishingBar && progressBar) {
            fishingBar.style.display = 'none';
            progressBar.style.width = '0%';
        }
        
        // Animação de retirar a vara
        const retrieveAnimation = {
            start: this.fishingRod.rotation.x,
            end: Math.PI / 6, // Volta para a posição inicial ajustada
            duration: 300,
            startTime: Date.now()
        };

        const animate = () => {
            const now = Date.now();
            const elapsed = now - retrieveAnimation.startTime;
            const progress = Math.min(elapsed / retrieveAnimation.duration, 1);

            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.fishingRod.rotation.x = retrieveAnimation.start + 
                (retrieveAnimation.end - retrieveAnimation.start) * eased;

            this.fishingLine.scale.y = 2 - progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Esconde a linha e a isca quando a animação terminar
                this.line.visible = false;
                this.bait.visible = false;
            }
        };

        animate();
        
        if (success && this.bait) {
            this.bait.visible = false;
            setTimeout(() => {
                if (this.bait) {
                    this.bait.visible = true;
                }
            }, 500);
        }
        
        if (message) {
            this.showMessage(message, success ? '#4CAF50' : '#ff6b6b');
        }

        this.currentFish = null;
    }

    update() {
        const speed = 0.1;
        let moved = false;
        let newDirection = new THREE.Vector3(0, 0, 0);

        if (this.keys.w) {
            this.player.position.z -= speed;
            newDirection.z = -1;
            moved = true;
        }
        if (this.keys.s) {
            this.player.position.z += speed;
            newDirection.z = 1;
            moved = true;
        }
        if (this.keys.a) {
            this.player.position.x -= speed;
            newDirection.x = -1;
            moved = true;
        }
        if (this.keys.d) {
            this.player.position.x += speed;
            newDirection.x = 1;
            moved = true;
        }

        if (moved && (newDirection.x !== 0 || newDirection.z !== 0)) {
            newDirection.normalize();
            const angle = Math.atan2(newDirection.x, newDirection.z);
            this.player.rotation.y = angle;
        }

        if (this.isFishing) {
            this.fishingLine.rotation.x = Math.sin(Date.now() * 0.003) * 0.1;
            this.bait.position.y = -2 + Math.sin(Date.now() * 0.003) * 0.2;

            const intensity = (Math.sin(Date.now() * 0.005) + 1) / 2;
            this.bait.material.emissive.setRGB(intensity * 0.5, 0, 0);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Método para salvar o progresso (opcional)
    saveProgress() {
        const gameData = {
            inventory: this.inventory,
            totalPoints: this.totalPoints,
            fishCount: this.fishCount
        };
        localStorage.setItem('fishingGameSave', JSON.stringify(gameData));
    }

    // Método para carregar o progresso (opcional)
    loadProgress() {
        const savedData = localStorage.getItem('fishingGameSave');
        if (savedData) {
            const gameData = JSON.parse(savedData);
            this.inventory = gameData.inventory;
            this.totalPoints = gameData.totalPoints;
            this.fishCount = gameData.fishCount;
            this.updateInventoryDisplay();
        }
    }

    // Adicione estes métodos à classe FishingGame
    sellFish(fishName, amount = 1) {
        if (this.inventory[fishName] >= amount) {
            const fishType = this.fishTypes.find(f => f.name === fishName);
            const value = fishType.price * amount;
            
            this.inventory[fishName] -= amount;
            this.money += value;
            
            this.updateInventoryDisplay();
            this.showMessage(`Vendeu ${amount}x ${fishName} por ${value} 💰`, '#ffd700');
            
            return true;
        }
        return false;
    }

    sellAllFish() {
        let totalValue = 0;
        this.fishTypes.forEach(fishType => {
            const count = this.inventory[fishType.name];
            if (count > 0) {
                const value = count * fishType.price;
                totalValue += value;
                this.inventory[fishType.name] = 0;
            }
        });
        
        if (totalValue > 0) {
            this.money += totalValue;
            this.updateInventoryDisplay();
            this.showMessage(`Vendeu todo o inventário por ${totalValue} 💰`, '#ffd700');
        }
    }
}

window.addEventListener('load', () => {
    const game = new FishingGame();
}); 