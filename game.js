import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

class FishingGame {
    constructor() {
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
        this.setupFishing();

        this.isFishing = false;
        this.lastSpacePress = 0;

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
        const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.player = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.player.position.set(0, 1, 5);
        this.scene.add(this.player);

        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcccc });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.4;
        this.player.add(head);

        this.fishingRod = new THREE.Group();
        const rodGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const rod = new THREE.Mesh(rodGeometry, rodMaterial);
        rod.rotation.x = Math.PI / 4;
        rod.position.set(0.5, 1, 0);
        this.fishingRod.add(rod);

        this.fishingLine = new THREE.Group();
        const lineGeometry = new THREE.BoxGeometry(0.01, 1.5, 0.01);
        const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        this.line = new THREE.Mesh(lineGeometry, lineMaterial);
        this.line.position.y = -1;
        this.fishingLine.add(this.line);
        rod.add(this.fishingLine);

        const baitGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const baitMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.bait = new THREE.Mesh(baitGeometry, baitMaterial);
        this.bait.position.y = -2;
        this.fishingLine.add(this.bait);

        this.player.add(this.fishingRod);
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
            
            if (e.code === 'Space') {
                const currentTime = Date.now();
                if (currentTime - this.lastSpacePress > 500) {
                    this.lastSpacePress = currentTime;
                    this.handleFishing();
                }
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
            { name: 'Sardinha', difficulty: 1, timeWindow: 1000 },
            { name: 'Atum', difficulty: 2, timeWindow: 800 },
            { name: 'Salmão', difficulty: 3, timeWindow: 600 }
        ];
        this.fishCount = 0;
    }

    handleFishing() {
        if (!this.isFishing) {
            this.startFishing();
        } else {
            const progressBar = document.getElementById('fishingProgress');
            const progress = parseInt(progressBar.style.width) || 0;
            
            if (progress >= 45 && progress <= 55) {
                this.catchFish();
            }
        }
    }

    startFishing() {
        if (!this.isFishing) {
            this.isFishing = true;
            
            this.fishingRod.rotation.x = -Math.PI / 4;
            this.fishingLine.scale.y = 2;
            this.bait.visible = true;

            const fishingBar = document.getElementById('fishingBar');
            fishingBar.style.display = 'block';
            
            setTimeout(() => {
                this.triggerFishingMinigame();
            }, Math.random() * 2000 + 1000);
        }
    }

    triggerFishingMinigame() {
        const randomFish = this.fishTypes[Math.floor(Math.random() * this.fishTypes.length)];
        const progressBar = document.getElementById('fishingProgress');
        let progress = 0;
        
        const updateProgress = () => {
            progress += 1;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                this.endFishing(false);
            }
        };

        const progressInterval = setInterval(updateProgress, randomFish.timeWindow / 100);

        const catchFish = (e) => {
            if (e.key === ' ' && progress >= 45 && progress <= 55) {
                clearInterval(progressInterval);
                this.fishCount++;
                document.getElementById('fishCount').textContent = this.fishCount;
                this.endFishing(true);
            }
        };

        window.addEventListener('keydown', catchFish);
        setTimeout(() => {
            window.removeEventListener('keydown', catchFish);
        }, 10000);
    }

    endFishing(success) {
        this.isFishing = false;
        document.getElementById('fishingBar').style.display = 'none';
        document.getElementById('fishingProgress').style.width = '0%';
        
        this.fishingRod.rotation.x = 0;
        this.fishingLine.scale.y = 1;
        
        if (success) {
            console.log('Peixe capturado!');
            this.bait.visible = false;
            setTimeout(() => {
                this.bait.visible = true;
            }, 500);
        } else {
            console.log('O peixe escapou!');
        }
    }

    update() {
        const speed = 0.1;
        if (this.keys.w) this.player.position.z -= speed;
        if (this.keys.s) this.player.position.z += speed;
        if (this.keys.a) this.player.position.x -= speed;
        if (this.keys.d) this.player.position.x += speed;

        if (this.isFishing) {
            this.fishingLine.rotation.x = Math.sin(Date.now() * 0.003) * 0.1;
            this.bait.position.y = -2 + Math.sin(Date.now() * 0.003) * 0.1;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    const game = new FishingGame();
}); 