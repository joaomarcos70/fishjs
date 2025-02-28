import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';
import { CONTROLS } from '../utils/Constants.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.createModel();
        this.setupControls();
    }

    createModel() {
        const player = new THREE.Group();

        // Corpo
        const bodyGeometry = new THREE.BoxGeometry(1, 1.2, 0.6);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.6;
        player.add(this.body);

        // Cabeça
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6b6 });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 2.3;
        player.add(this.head);

        // Olhos
        const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0, 0.4);
        this.head.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0, 0.4);
        this.head.add(rightEye);

        // Pernas
        const legGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x4444ff });
        
        // Perna esquerda
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(0.2, 0.8, 0);
        player.add(this.leftLeg);
        
        // Perna direita
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(-0.2, 0.8, 0);
        player.add(this.rightLeg);

        // Braços
        const armGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
        
        // Braço direito (que segura a vara)
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(-0.625, 1.6, 0);
        player.add(this.rightArm);
        
        // Braço esquerdo
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(0.625, 1.6, 0);
        player.add(this.leftArm);

        this.player = player;
        this.scene.add(this.player);

        // Variáveis para animação
        this.walkCycle = 0;
        this.walkSpeed = 0.15;
        this.legRotationMax = Math.PI / 4;

        // Adiciona a vara de pesca ao braço direito
        this.setupFishingRod(this.rightArm);
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

        // Linha de pesca - ajustada para cima e direita
        const lineGeometry = new THREE.BufferGeometry();
        const lineVertices = new Float32Array([
            0.2, 0.2, 2,    // Início da linha (ponta mais alta da vara, mais para direita e cima)
            0.2, -2, 2    // Final da linha (isca)
        ]);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xcccccc,
            linewidth: 2
        });
        this.line = new THREE.Line(lineGeometry, lineMaterial);
        this.fishingRod.add(this.line);

        // Isca - ajustada para acompanhar a linha
        const baitGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const baitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.3,
            roughness: 0.7
        });
        this.bait = new THREE.Mesh(baitGeometry, baitMaterial);
        this.bait.position.set(0.2, -2, 2); // Alinhada com o final da linha
        this.fishingRod.add(this.bait);

        // Inicialmente invisíveis
        this.line.visible = false;
        this.bait.visible = false;

        // Posiciona a vara no braço direito
        this.fishingRod.position.set(0.1, 0, 0.2);
        this.fishingRod.rotation.x = Math.PI / 6;
        this.fishingRod.rotation.z = -Math.PI / 6;
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
            
            // Atualiza a rotação da vara
            this.fishingRod.rotation.x = throwAnimation.start + 
                (throwAnimation.end - throwAnimation.start) * eased;

            // Calcula a posição da ponta da vara no espaço local da vara
            const rodLength = 2;
            const rodTipLocal = new THREE.Vector3(0, 0, rodLength);
            
            // Cria uma matriz de transformação para a ponta da vara
            const matrix = new THREE.Matrix4();
            matrix.makeRotationX(this.fishingRod.rotation.x);
            rodTipLocal.applyMatrix4(matrix);

            // Atualiza a posição da linha
            const linePositions = this.line.geometry.attributes.position.array;
            const baitDistance = 2 + progress * 2; // Distância da isca

            // Ponto inicial (ponta da vara)
            linePositions[0] = rodTipLocal.x;
            linePositions[1] = rodTipLocal.y;
            linePositions[2] = rodTipLocal.z;

            // Ponto final (isca)
            linePositions[3] = rodTipLocal.x;
            linePositions[4] = rodTipLocal.y - baitDistance;
            linePositions[5] = rodTipLocal.z;

            this.line.geometry.attributes.position.needsUpdate = true;

            // Atualiza a posição da isca
            this.bait.position.set(
                rodTipLocal.x,
                rodTipLocal.y - baitDistance,
                rodTipLocal.z
            );

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
            
            // Atualiza a rotação da vara
            this.fishingRod.rotation.x = retrieveAnimation.start + 
                (retrieveAnimation.end - retrieveAnimation.start) * eased;

            // Calcula a posição da ponta da vara no espaço local da vara
            const rodLength = 2;
            const rodTipLocal = new THREE.Vector3(0, 0, rodLength);
            
            // Cria uma matriz de transformação para a ponta da vara
            const matrix = new THREE.Matrix4();
            matrix.makeRotationX(this.fishingRod.rotation.x);
            rodTipLocal.applyMatrix4(matrix);

            // Atualiza a posição da linha
            const linePositions = this.line.geometry.attributes.position.array;
            const baitDistance = 4 - progress * 2; // Reduz a distância da isca

            // Ponto inicial (ponta da vara)
            linePositions[0] = rodTipLocal.x;
            linePositions[1] = rodTipLocal.y;
            linePositions[2] = rodTipLocal.z;

            // Ponto final (isca)
            linePositions[3] = rodTipLocal.x;
            linePositions[4] = rodTipLocal.y - baitDistance;
            linePositions[5] = rodTipLocal.z;

            this.line.geometry.attributes.position.needsUpdate = true;

            // Atualiza a posição da isca
            this.bait.position.set(
                rodTipLocal.x,
                rodTipLocal.y - baitDistance,
                rodTipLocal.z
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
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
        let newPosition = this.player.position.clone();

        if (this.keys[CONTROLS.MOVE_FORWARD]) {
            newPosition.z -= speed;
            newDirection.z = -1;
            moved = true;
        }
        if (this.keys[CONTROLS.MOVE_BACKWARD]) {
            newPosition.z += speed;
            newDirection.z = 1;
            moved = true;
        }
        if (this.keys[CONTROLS.MOVE_LEFT]) {
            newPosition.x -= speed;
            newDirection.x = -1;
            moved = true;
        }
        if (this.keys[CONTROLS.MOVE_RIGHT]) {
            newPosition.x += speed;
            newDirection.x = 1;
            moved = true;
        }

        // Verifica colisão antes de mover
        if (moved && !this.scene.environment.checkCollision(newPosition, 0.5)) {
            this.player.position.copy(newPosition);
            
            if (newDirection.x !== 0 || newDirection.z !== 0) {
                newDirection.normalize();
                const angle = Math.atan2(newDirection.x, newDirection.z);
                this.player.rotation.y = angle;
            }

            // Anima as pernas durante o movimento
            this.walkCycle += this.walkSpeed;
            const legRotation = Math.sin(this.walkCycle) * this.legRotationMax;
            
            this.leftLeg.rotation.x = legRotation;
            this.rightLeg.rotation.x = -legRotation;
            
            // Anima os braços em oposição às pernas
            this.leftArm.rotation.x = -legRotation;
            this.rightArm.rotation.x = legRotation;
        } else {
            // Reseta a posição das pernas quando parado
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
        }
    }
} 