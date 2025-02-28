import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.chunkSize = 50;
        this.loadDistance = 2;
        this.currentChunk = { x: 0, z: 0 };
        
        // Pré-carrega as geometrias e materiais para reuso
        this.setupGeometriesAndMaterials();
        this.createSkybox();
        this.createWater();
        this.updateChunks(new THREE.Vector3(0, 0, 0));
    }

    setupGeometriesAndMaterials() {
        // Geometrias reusáveis
        this.treeGeometries = {
            trunk: new THREE.CylinderGeometry(0.3, 0.4, 3),
            leaves: new THREE.ConeGeometry(1.5, 3, 6)
        };

        // Materiais reusáveis
        this.materials = {
            ground: new THREE.MeshStandardMaterial({
                color: 0x355E3B,
                roughness: 0.8,
                metalness: 0.2
            }),
            trunk: new THREE.MeshStandardMaterial({ color: 0x4A2B0F }),
            leaves: new THREE.MeshStandardMaterial({ color: 0x0F4D0F }),
            rock: new THREE.MeshStandardMaterial({ 
                color: 0x666666,
                roughness: 0.8
            }),
            grass: new THREE.MeshStandardMaterial({
                color: 0x3A5F0B,
                side: THREE.DoubleSide
            })
        };
    }

    getChunkCoord(position) {
        return {
            x: Math.floor(position.x / this.chunkSize),
            z: Math.floor(position.z / this.chunkSize)
        };
    }

    updateChunks(playerPosition) {
        const chunk = this.getChunkCoord(playerPosition);
        
        // Carrega chunks em uma área maior
        for (let x = -this.loadDistance; x <= this.loadDistance; x++) {
            for (let z = -this.loadDistance; z <= this.loadDistance; z++) {
                const chunkX = chunk.x + x;
                const chunkZ = chunk.z + z;
                const key = `${chunkX},${chunkZ}`;
                
                if (!this.chunks.has(key)) {
                    this.createChunk(chunkX, chunkZ);
                }
            }
        }

        // Remove chunks mais distantes
        for (const [key, chunkData] of this.chunks) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunk.x) > this.loadDistance + 1 || 
                Math.abs(z - chunk.z) > this.loadDistance + 1) {
                this.removeChunk(key);
            }
        }
    }

    createChunk(chunkX, chunkZ) {
        const chunk = new THREE.Group();
        const key = `${chunkX},${chunkZ}`;
        
        // Terreno simplificado
        const terrain = this.createTerrain(chunkX, chunkZ);
        chunk.add(terrain);

        // Menos decorações por chunk
        this.addOptimizedDecorations(chunk, chunkX, chunkZ);

        chunk.position.set(
            chunkX * this.chunkSize,
            0,
            chunkZ * this.chunkSize
        );

        this.scene.add(chunk);
        this.chunks.set(key, chunk);
    }

    createTerrain(chunkX, chunkZ) {
        const geometry = new THREE.PlaneGeometry(
            this.chunkSize, 
            this.chunkSize, 
            10, // Reduzido número de segmentos
            10
        );

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + chunkX * this.chunkSize;
            const z = vertices[i + 2] + chunkZ * this.chunkSize;
            vertices[i + 1] = this.generateHeight(x, z);
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const terrain = new THREE.Mesh(geometry, this.materials.ground);
        terrain.rotation.x = -Math.PI / 2;
        return terrain;
    }

    addOptimizedDecorations(chunk, chunkX, chunkZ) {
        // Menos árvores
        const treeCount = 3;
        for (let i = 0; i < treeCount; i++) {
            const x = Math.random() * this.chunkSize - this.chunkSize/2;
            const z = Math.random() * this.chunkSize - this.chunkSize/2;
            const tree = this.createTree();
            tree.position.set(x, 0, z);
            chunk.add(tree);
        }

        // Menos rochas
        const rockCount = 2;
        for (let i = 0; i < rockCount; i++) {
            const x = Math.random() * this.chunkSize - this.chunkSize/2;
            const z = Math.random() * this.chunkSize - this.chunkSize/2;
            const rock = this.createRock();
            rock.position.set(x, 0, z);
            chunk.add(rock);
        }

        // Grama em instâncias para melhor performance
        this.addInstancedGrass(chunk);
    }

    createTree() {
        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(this.treeGeometries.trunk, this.materials.trunk);
        trunk.position.y = 1.5;
        tree.add(trunk);

        const leaves = new THREE.Mesh(this.treeGeometries.leaves, this.materials.leaves);
        leaves.position.y = 4;
        tree.add(leaves);

        return tree;
    }

    createRock() {
        return new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.5),
            this.materials.rock
        );
    }

    addInstancedGrass(chunk) {
        const grassGeometry = new THREE.PlaneGeometry(0.1, 0.3);
        const instanceCount = 100;
        const grass = new THREE.InstancedMesh(
            grassGeometry,
            this.materials.grass,
            instanceCount
        );

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < instanceCount; i++) {
            const x = Math.random() * this.chunkSize - this.chunkSize/2;
            const z = Math.random() * this.chunkSize - this.chunkSize/2;
            const y = 0.15;
            const rotation = Math.random() * Math.PI;
            
            matrix.makeRotationY(rotation);
            matrix.setPosition(x, y, z);
            grass.setMatrixAt(i, matrix);
        }

        chunk.add(grass);
    }

    generateHeight(x, z) {
        const scale = 0.02;
        return Math.sin(x * scale) * Math.cos(z * scale);
    }

    removeChunk(key) {
        const chunk = this.chunks.get(key);
        if (chunk) {
            this.scene.remove(chunk);
            chunk.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            this.chunks.delete(key);
        }
    }

    update(playerPosition) {
        this.updateChunks(playerPosition);
        this.updateWater();
    }

    updateWater() {
        if (this.water && this.waterVertices) {
            const vertices = this.water.geometry.attributes.position.array;
            const time = Date.now() * 0.001;
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i + 1] = this.waterVertices[i + 1] + 
                    Math.sin(time + vertices[i] * 0.05) * 0.1;
            }
            this.water.geometry.attributes.position.needsUpdate = true;
        }
    }

    createSkybox() {
        // Céu mais realista
        const skyColor = new THREE.Color(0x87CEEB);
        this.scene.background = skyColor;
        this.scene.fog = new THREE.Fog(skyColor, 50, 150);
    }

    createWater() {
        // Lago maior e mais detalhado
        const waterGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0077be,
            transparent: true,
            opacity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        });
        
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -0.1; // Ligeiramente abaixo do terreno
        
        // Animação das ondas
        const vertices = waterGeometry.attributes.position.array;
        this.waterVertices = vertices.slice();
        
        this.scene.add(this.water);
    }

    createDecorations() {
        // Árvores
        this.createTrees();
        // Rochas
        this.createRocks();
        // Grama
        this.createGrass();
        // Píer
        this.createPier();
    }

    createTrees() {
        const treeCount = 50;
        for (let i = 0; i < treeCount; i++) {
            const tree = this.createTree();
            const angle = Math.random() * Math.PI * 2;
            const radius = 30 + Math.random() * 50;
            tree.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.scene.add(tree);
        }
    }

    createPier() {
        const pier = new THREE.Group();

        // Base do píer
        const baseGeometry = new THREE.BoxGeometry(4, 0.2, 20);
        const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const base = new THREE.Mesh(baseGeometry, woodMaterial);
        base.position.set(0, 0.1, -10);
        pier.add(base);

        // Postes
        for (let i = 0; i < 5; i++) {
            const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1);
            const post = new THREE.Mesh(postGeometry, woodMaterial);
            post.position.set(1.5, 0.5, -19 + i * 5);
            pier.add(post);

            const post2 = post.clone();
            post2.position.x = -1.5;
            pier.add(post2);
        }

        pier.position.set(0, 0, 0);
        this.scene.add(pier);
    }

    createRocks() {
        const rockCount = 30;
        for (let i = 0; i < rockCount; i++) {
            const rock = this.createRock();
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 45;
            rock.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            // Rotação aleatória
            rock.rotation.y = Math.random() * Math.PI;
            this.scene.add(rock);
        }
    }

    createGrass() {
        // Cria patches de grama
        const grassCount = 1000;
        const grassGeometry = new THREE.PlaneGeometry(0.1, 0.3);
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3A5F0B,
            side: THREE.DoubleSide,
            alphaTest: 0.5
        });

        for (let i = 0; i < grassCount; i++) {
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            
            // Posição aleatória no terreno
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 60;
            grass.position.set(
                Math.cos(angle) * radius,
                0.15,
                Math.sin(angle) * radius
            );

            // Rotação aleatória para variedade
            grass.rotation.y = Math.random() * Math.PI;
            grass.rotation.x = Math.random() * 0.2;

            // Não coloca grama na água
            if (grass.position.distanceTo(new THREE.Vector3(0, 0, 0)) > 25) {
                this.scene.add(grass);
            }
        }
    }
} 