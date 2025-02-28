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
        this.player = new Player(this.scene);
        this.messageSystem = new MessageSystem();
        this.uiManager = new UIManager();
        this.fishingSystem = new FishingSystem(this.player, this.messageSystem, this.uiManager);

        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 15, 20);
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

    animate() {
        requestAnimationFrame(() => this.animate());
        this.player.update();
        this.fishingSystem.update();
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
} 