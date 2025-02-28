import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.createWater();
        this.createGround();
        this.createBorder();
    }

    createWater() {
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
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x654321,
            roughness: 0.8
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0.01;
        this.scene.add(this.ground);
    }

    createBorder() {
        const borderGeometry = new THREE.BoxGeometry(30, 0.2, 30);
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.y = 0;
        this.scene.add(border);
    }
} 