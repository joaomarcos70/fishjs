import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';
import { CONTROLS } from '../utils/Constants.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.createModel();
        this.setupControls();
    }

    createModel() {
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
        rightArm.rotation.x = Math.PI / 12; // Leve rotação para frente
        this.player.add(rightArm);

        // Agora a vara será filha do braço direito
        this.setupFishingRod(rightArm);
    }

    setupFishingRod(rightArm) {
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
        this.line.position.y = -1;
        this.line.position.z = 2; // Move para a ponta da vara
        this.fishingLine.add(this.line);
        this.fishingRod.add(this.fishingLine);

        // Isca
        const baitGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const baitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.3,
            roughness: 0.7
        });
        this.bait = new THREE.Mesh(baitGeometry, baitMaterial);
        this.bait.position.y = -2;
        this.fishingLine.add(this.bait);

        // Inicialmente invisíveis
        this.line.visible = false;
        this.bait.visible = false;

        // Posiciona a vara no braço direito
        this.fishingRod.position.set(0, -0.3, 0.2);
        this.fishingRod.rotation.x = Math.PI / 6;
        rightArm.add(this.fishingRod);
    }

    startFishingAnimation() {
        this.line.visible = true;
        this.bait.visible = true;

        const throwAnimation = {
            start: this.fishingRod.rotation.x,
            end: -Math.PI / 3,
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
    }

    endFishingAnimation() {
        const retrieveAnimation = {
            start: this.fishingRod.rotation.x,
            end: Math.PI / 6,
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
    }

    setupControls() {
        this.keys = {
            [CONTROLS.MOVE_FORWARD]: false,
            [CONTROLS.MOVE_BACKWARD]: false,
            [CONTROLS.MOVE_LEFT]: false,
            [CONTROLS.MOVE_RIGHT]: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key.toLowerCase())) {
                this.keys[e.key.toLowerCase()] = false;
            }
        });
    }

    update() {
        const speed = 0.1;
        let moved = false;
        let newDirection = new THREE.Vector3(0, 0, 0);

        if (this.keys[CONTROLS.MOVE_FORWARD]) {
            this.player.position.z -= speed;
            newDirection.z = -1;
            moved = true;
        }
        if (this.keys[CONTROLS.MOVE_BACKWARD]) {
            this.player.position.z += speed;
            newDirection.z = 1;
            moved = true;
        }
        if (this.keys[CONTROLS.MOVE_LEFT]) {
            this.player.position.x -= speed;
            newDirection.x = -1;
            moved = true;
        }
        if (this.keys[CONTROLS.MOVE_RIGHT]) {
            this.player.position.x += speed;
            newDirection.x = 1;
            moved = true;
        }

        // Rotação do personagem
        if (moved && (newDirection.x !== 0 || newDirection.z !== 0)) {
            newDirection.normalize();
            const angle = Math.atan2(newDirection.x, newDirection.z);
            this.player.rotation.y = angle;
        }
    }
} 