import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';
import { Player } from './Player.js';
import { Environment } from './Environment.js';
import { FishingSystem } from './FishingSystem.js';
import { UIManager } from '../ui/UIManager.js';
import { MessageSystem } from '../ui/MessageSystem.js';

export class Game {
    constructor() {
        this.setupScene();
        this.environment = new Environment(this.scene);
        this.scene.environment = this.environment;
        this.player = new Player(this.scene);
        this.messageSystem = new MessageSystem();
        this.uiManager = new UIManager();
        this.fishingSystem = new FishingSystem(this.player, this.messageSystem, this.uiManager);

        // Offset inicial da câmera em relação ao jogador
        this.cameraOffset = new THREE.Vector3(0, 30, 40);
        
        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Configuração inicial da câmera
        this.camera.position.set(0, 30, 40);
        this.camera.lookAt(0, 0, 0);

        this.setupLights();
    }

    setupLights() {
        const light = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(light);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 15, 5);
        this.scene.add(dirLight);
    }

    updateCamera() {
        // Posição alvo da câmera (seguindo o jogador)
        const targetPosition = new THREE.Vector3(
            this.player.player.position.x + this.cameraOffset.x,
            this.cameraOffset.y,
            this.player.player.position.z + this.cameraOffset.z
        );

        // Suaviza o movimento da câmera
        this.camera.position.lerp(targetPosition, 0.1);
        
        // Faz a câmera olhar para o jogador
        const lookAtPosition = new THREE.Vector3(
            this.player.player.position.x,
            0,
            this.player.player.position.z
        );
        this.camera.lookAt(lookAtPosition);
    }

    animate() {
        const deltaTime = Date.now();
        requestAnimationFrame(() => this.animate());
        
        // Atualiza a posição da câmera
        this.updateCamera();
        
        this.player.update();
        this.fishingSystem.update();
        this.environment.update(this.player.player.position);
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Adiciona controle de zoom com a roda do mouse
        window.addEventListener('wheel', (e) => {
            const zoomSpeed = 2;
            const minDistance = 20;
            const maxDistance = 60;

            this.cameraOffset.z += e.deltaY * 0.01 * zoomSpeed;
            this.cameraOffset.z = Math.max(minDistance, Math.min(maxDistance, this.cameraOffset.z));
            
            // Ajusta a altura da câmera proporcionalmente
            this.cameraOffset.y = this.cameraOffset.z * 0.75;
        });
    }
} 