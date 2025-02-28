import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';
import { TerrainShader } from './shaders/TerrainShader.js';
import { createNoise2D } from '../utils/SimplexNoise.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.chunkSize = 50;
        this.loadDistance = 2;
        this.currentChunk = { x: 0, z: 0 };
        this.objects = new Set(); // Armazena todos os objetos do mundo
        this.colliders = []; // Armazena os colliders para colisão
        this.isTexturesLoaded = false;

        // Inicializa o gerador de ruído
        this.noise2D = createNoise2D();

        // Parâmetros do terreno
        this.terrainParams = {
            scale: 80.0,         // Escala maior para terreno mais suave
            height: 10.0,        // Altura um pouco maior
            octaves: 4,          // Mantém 4 octaves
            persistence: 0.5,
            lacunarity: 2.0,
            heightOffset: -2,
            waterLevel: -1
        };

        this.setupGeometriesAndMaterials();
        this.createSkybox();

        // Carrega as texturas primeiro e depois inicializa o resto
        this.loadTextures().then(() => {
            this.isTexturesLoaded = true;
            this.createStaticWater(); // Lago fixo
            this.updateChunks(new THREE.Vector3(0, 0, 0));
        });
    }

    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        const loadTexture = (path) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(
                    path,
                    resolve,
                    undefined, // onProgress callback
                    () => {
                        console.warn(`Falha ao carregar textura: ${path}`);
                        // Retorna uma textura temporária em caso de erro
                        resolve(new THREE.Texture());
                    }
                );
            });
        };

        try {
            this.terrainTextures = {
                grass: {
                    diffuse: await loadTexture('assets/textures/grass/diffuse.jpg'),
                    normal: await loadTexture('assets/textures/grass/normal.jpg'),
                    roughness: await loadTexture('assets/textures/grass/roughness.jpg')
                },
                sand: {
                    diffuse: await loadTexture('assets/textures/sand/diffuse.jpg'),
                    normal: await loadTexture('assets/textures/sand/normal.jpg'),
                    roughness: await loadTexture('assets/textures/sand/roughness.jpg')
                },
                rock: {
                    diffuse: await loadTexture('assets/textures/rock/diffuse.jpg'),
                    normal: await loadTexture('assets/textures/rock/normal.jpg'),
                    roughness: await loadTexture('assets/textures/rock/roughness.jpg')
                },
                dirt: {
                    diffuse: await loadTexture('assets/textures/dirt/diffuse.jpg'),
                    normal: await loadTexture('assets/textures/dirt/normal.jpg'),
                    roughness: await loadTexture('assets/textures/dirt/roughness.jpg')
                }
            };

            // Configura as texturas
            Object.values(this.terrainTextures).forEach(textures => {
                Object.values(textures).forEach(texture => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(10, 10); // Aumenta a repetição da textura
                });
            });
        } catch (error) {
            console.error('Erro ao carregar texturas:', error);
            // Cria texturas temporárias em caso de erro
            this.terrainTextures = {
                grass: { diffuse: new THREE.Texture(), normal: new THREE.Texture(), roughness: new THREE.Texture() },
                sand: { diffuse: new THREE.Texture(), normal: new THREE.Texture(), roughness: new THREE.Texture() },
                rock: { diffuse: new THREE.Texture(), normal: new THREE.Texture(), roughness: new THREE.Texture() },
                dirt: { diffuse: new THREE.Texture(), normal: new THREE.Texture(), roughness: new THREE.Texture() }
            };
        }
    }

    setupGeometriesAndMaterials() {
        // Geometrias reusáveis
        this.treeGeometries = {
            trunk: new THREE.CylinderGeometry(0.3, 0.4, 3),
            leaves: new THREE.ConeGeometry(1.5, 3, 6)
        };

        // Materiais
        this.materials = {
            trunk: new THREE.MeshStandardMaterial({
                color: 0x4A2B0F,
                roughness: 0.9
            }),
            leaves: new THREE.MeshStandardMaterial({
                color: 0x0F4D0F,
                roughness: 0.8
            }),
            rock: new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.8
            }),
            grass: new THREE.MeshStandardMaterial({
                color: 0x3A5F0B,
                side: THREE.DoubleSide,
                alphaTest: 0.5
            }),
            water: new THREE.MeshStandardMaterial({
                color: 0x0077be,
                transparent: true,
                opacity: 0.85,
                metalness: 0.9,
                roughness: 0.1,
                vertexColors: true
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
        // Não atualiza chunks até as texturas estarem carregadas
        if (!this.isTexturesLoaded) return;

        const chunk = this.getChunkCoord(playerPosition);

        // Carrega chunks em uma área maior
        for (let x = -this.loadDistance; x <= this.loadDistance; x++) {
            for (let z = -this.loadDistance; z <= this.loadDistance; z++) {
                const chunkX = chunk.x + x;
                const chunkZ = chunk.z + z;
                const key = `${chunkX},${chunkZ}`;

                if (!this.chunks.has(key)) {
                    this.createChunk(chunkX, chunkZ);
                } else {
                    // Garante que o chunk está visível
                    const existingChunk = this.chunks.get(key);
                    existingChunk.visible = true;
                }
            }
        }

        // Esconde chunks muito distantes
        for (const [key, chunkData] of this.chunks) {
            const [x, z] = key.split(',').map(Number);
            const distance = Math.max(Math.abs(x - chunk.x), Math.abs(z - chunk.z));

            if (distance > this.loadDistance) {
                chunkData.visible = false;
            }
        }
    }

    createChunk(chunkX, chunkZ) {
        const chunk = new THREE.Group();
        const key = `${chunkX},${chunkZ}`;

        // Terreno base
        const terrain = this.createTerrain(chunkX, chunkZ);
        chunk.add(terrain);

        // Adiciona decorações de floresta
        this.addForestDecorations(chunk, chunkX, chunkZ);

        chunk.position.set(
            chunkX * this.chunkSize,
            0,
            chunkZ * this.chunkSize
        );

        this.scene.add(chunk);
        this.chunks.set(key, {
            mesh: chunk,
            visible: true,
            key: key,
            x: chunkX,
            z: chunkZ
        });
    }

    createTerrain(chunkX, chunkZ) {
        const geometry = new THREE.PlaneGeometry(
            this.chunkSize,
            this.chunkSize,
            32,
            32
        );

        const vertices = geometry.attributes.position.array;

        // Criar um atributo UV manualmente para o terreno DEPOIS de ter vertices
        const uvs = new Float32Array(vertices.length / 3 * 2);
        for (let i = 0, j = 0; i < vertices.length; i += 3, j += 2) {
            uvs[j] = (vertices[i] + chunkX * this.chunkSize) / this.chunkSize;
            uvs[j + 1] = (vertices[i + 2] + chunkZ * this.chunkSize) / this.chunkSize;
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const colors = new Float32Array(vertices.length);

        // Cores dos biomas
        const biomeColors = {
            beach: new THREE.Color(0xE2C484),    // Areia
            plains: new THREE.Color(0x3B7D3B),   // Grama
            highland: new THREE.Color(0x6B8E4E),  // Grama alta
            mountain: new THREE.Color(0x8B7355)   // Rocha
        };

        let maxHeight = -Infinity;
        let maxSlope = -Infinity;

        // Primeiro loop para encontrar valores máximos
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + chunkX * this.chunkSize;
            const z = vertices[i + 2] + chunkZ * this.chunkSize;
            
            const height = this.generateHeight(x, z);
            vertices[i + 1] = height;
            maxHeight = Math.max(maxHeight, height);

            // Calcula a inclinação
            const heightL = this.generateHeight(x - 1, z);
            const heightR = this.generateHeight(x + 1, z);
            const heightU = this.generateHeight(x, z - 1);
            const heightD = this.generateHeight(x, z + 1);
            
            const slope = Math.max(
                Math.abs(heightL - heightR),
                Math.abs(heightU - heightD)
            );
            maxSlope = Math.max(maxSlope, slope);
        }

        // Segundo loop para cores e materiais
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + chunkX * this.chunkSize;
            const z = vertices[i + 2] + chunkZ * this.chunkSize;
            const height = vertices[i + 1];

            // Calcula a inclinação novamente
            const heightL = this.generateHeight(x - 1, z);
            const heightR = this.generateHeight(x + 1, z);
            const heightU = this.generateHeight(x, z - 1);
            const heightD = this.generateHeight(x, z + 1);
            
            const slope = Math.max(
                Math.abs(heightL - heightR),
                Math.abs(heightU - heightD)
            );

            // Determina o bioma
            let biome;
            if (height < this.terrainParams.waterLevel + 0.5) {
                biome = 'beach';
            } else if (slope > 0.7) {
                biome = 'mountain';
            } else if (height > maxHeight * 0.7) {
                biome = 'highland';
            } else {
                biome = 'plains';
            }

            const color = biomeColors[biome];

            // Adiciona variação de cor
            const variation = this.noise2D(x * 0.1, z * 0.1) * 0.1;
            color.offsetHSL(0, 0, variation);

            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.1
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        return terrain;
    }

    generateHeight(x, z) {
        let amplitude = 1.0;
        let frequency = 1.0;
        let noiseHeight = 0;
        let maxAmplitude = 0;

        for (let i = 0; i < this.terrainParams.octaves; i++) {
            const sampleX = x / this.terrainParams.scale * frequency;
            const sampleZ = z / this.terrainParams.scale * frequency;

            const perlinValue = this.noise2D(sampleX, sampleZ);
            noiseHeight += perlinValue * amplitude;

            maxAmplitude += amplitude;
            amplitude *= this.terrainParams.persistence;
            frequency *= this.terrainParams.lacunarity;
        }

        noiseHeight = noiseHeight / maxAmplitude;

        // Ajusta a curva para terreno mais natural
        const terrain = Math.pow(Math.abs(noiseHeight), 1.1) * Math.sign(noiseHeight);
        return terrain * this.terrainParams.height + this.terrainParams.heightOffset;
    }

    getBiome(height, slope) {
        // Determina o bioma baseado na altura e inclinação
        if (height < this.terrainParams.waterLevel + 0.5) {
            return 'beach';
        } else if (slope > 0.7) {
            return 'mountain';
        } else if (height > 8) {
            return 'highland';
        } else {
            return 'plains';
        }
    }

    generateNoise(x, z) {
        // Melhora a função de ruído para mais naturalidade
        return (
            Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5 +
            Math.sin(x * 1.0 + 1.3) * Math.cos(z * 1.0) * 0.25 +
            Math.sin(x * 2.0 + 2.6) * Math.cos(z * 2.0) * 0.125 +
            0.5
        );
    }

    addForestDecorations(chunk, chunkX, chunkZ) {
        if (chunkX === this.currentChunk.x && chunkZ === this.currentChunk.z) {
            return;
        }

        // Usa ruído para determinar densidade de árvores em diferentes áreas
        const forestDensity = (x, z) => {
            const scale = 0.02;
            return this.noise2D(x * scale, z * scale);
        };

        // Área do chunk
        const chunkArea = this.chunkSize * this.chunkSize;
        
        // Número base de árvores que varia por chunk
        const baseTreeCount = Math.floor(Math.random() * 4) + 2; // 2 a 5 árvores base

        // Tenta posicionar árvores em locais adequados
        for (let i = 0; i < baseTreeCount; i++) {
            // Tenta algumas vezes encontrar um bom local para cada árvore
            for (let attempt = 0; attempt < 5; attempt++) {
                const x = Math.random() * this.chunkSize - this.chunkSize / 2;
                const z = Math.random() * this.chunkSize - this.chunkSize / 2;
                
                // Posição global para verificação de densidade
                const worldX = x + chunkX * this.chunkSize;
                const worldZ = z + chunkZ * this.chunkSize;

                // Verifica a densidade da floresta neste ponto
                const density = forestDensity(worldX, worldZ);
                
                // Só coloca árvore se a densidade for adequada
                if (Math.random() < density) {
                    const treeData = this.createTree();
                    const tree = treeData.mesh;
                    
                    // Adiciona variação na escala
                    const scale = 0.8 + Math.random() * 0.4; // 0.8 a 1.2
                    tree.scale.set(scale, scale, scale);

                    tree.position.set(x, 0, z);

                    // Adiciona um pouco de rotação aleatória no tronco
                    tree.rotation.y = Math.random() * Math.PI * 2;
                    // Pequena inclinação aleatória
                    tree.rotation.z = (Math.random() - 0.5) * 0.2;

                    // Adiciona collider ajustado à escala
                    const collider = new THREE.CylinderGeometry(
                        treeData.colliderRadius * scale,
                        treeData.colliderRadius * scale,
                        3 * scale
                    );
                    const colliderMesh = new THREE.Mesh(collider);
                    colliderMesh.position.set(worldX, 1.5 * scale, worldZ);
                    colliderMesh.visible = false;

                    this.colliders.push({
                        mesh: colliderMesh,
                        type: 'tree',
                        radius: treeData.colliderRadius * scale
                    });

                    chunk.add(tree);
                    this.objects.add(tree);
                    break; // Sai do loop de tentativas se conseguiu colocar a árvore
                }
            }
        }

        // Adiciona alguns arbustos de forma mais natural
        const bushCount = Math.floor(Math.random() * 6) + 2; // 2 a 7 arbustos
        for (let i = 0; i < bushCount; i++) {
            const x = Math.random() * this.chunkSize - this.chunkSize / 2;
            const z = Math.random() * this.chunkSize - this.chunkSize / 2;
            
            const worldX = x + chunkX * this.chunkSize;
            const worldZ = z + chunkZ * this.chunkSize;
            
            if (forestDensity(worldX, worldZ) > 0.3) {
                const bush = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 8, 6),
                    this.materials.leaves
                );
                bush.position.set(x, 0.3 + Math.random() * 0.4, z);
                bush.scale.set(1, 0.7 + Math.random() * 0.3, 1);
                chunk.add(bush);
            }
        }

        // Adiciona grama em instâncias para melhor performance
        this.addInstancedGrass(chunk);
    }

    createTree() {
        const tree = new THREE.Group();
        
        // Escolhe aleatoriamente o tipo de árvore
        const treeType = Math.random();
        
        if (treeType < 0.3) { // Árvore alta e fina (30% de chance)
            // Tronco alto
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.4, 6),
                this.materials.trunk
            );
            trunk.position.y = 3;
            tree.add(trunk);

            // Copa em camadas
            const leavesCount = 4;
            for (let i = 0; i < leavesCount; i++) {
                const leaves = new THREE.Mesh(
                    new THREE.ConeGeometry(1.2 - i * 0.15, 2, 8),
                    this.materials.leaves
                );
                leaves.position.y = 5 + i * 0.8;
                tree.add(leaves);
            }
        } 
        else if (treeType < 0.6) { // Árvore grossa e baixa (30% de chance)
            // Tronco grosso
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 1, 3),
                this.materials.trunk
            );
            trunk.position.y = 1.5;
            tree.add(trunk);

            // Copa arredondada
            const leaves = new THREE.Mesh(
                new THREE.SphereGeometry(2, 8, 8),
                this.materials.leaves
            );
            leaves.position.y = 3.5;
            leaves.scale.y = 0.8;
            tree.add(leaves);
        }
        else if (treeType < 0.8) { // Árvore média com copa larga (20% de chance)
            // Tronco médio
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.6, 4),
                this.materials.trunk
            );
            trunk.position.y = 2;
            tree.add(trunk);

            // Copa larga em camadas
            for (let i = 0; i < 3; i++) {
                const leaves = new THREE.Mesh(
                    new THREE.CylinderGeometry(2 - i * 0.3, 1.5 - i * 0.3, 1.5, 8),
                    this.materials.leaves
                );
                leaves.position.y = 3.5 + i * 1;
                tree.add(leaves);
            }
        }
        else { // Árvore antiga e torta (20% de chance)
            // Tronco principal torto
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.9, 5),
                this.materials.trunk
            );
            trunk.position.y = 2.5;
            trunk.rotation.z = Math.random() * 0.2 - 0.1;
            tree.add(trunk);

            // Galhos laterais
            for (let i = 0; i < 3; i++) {
                const branch = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2, 0.3, 2),
                    this.materials.trunk
                );
                branch.position.y = 2 + i * 1.5;
                branch.rotation.z = Math.PI / 4 * (i % 2 ? 1 : -1);
                branch.position.x = i % 2 ? 0.5 : -0.5;
                tree.add(branch);

                // Copa para cada galho
                const leaves = new THREE.Mesh(
                    new THREE.SphereGeometry(1, 8, 8),
                    this.materials.leaves
                );
                leaves.position.copy(branch.position);
                leaves.position.x += i % 2 ? 1 : -1;
                leaves.position.y += 0.5;
                tree.add(leaves);
            }

            // Copa principal
            const mainLeaves = new THREE.Mesh(
                new THREE.SphereGeometry(1.8, 8, 8),
                this.materials.leaves
            );
            mainLeaves.position.y = 5;
            mainLeaves.scale.set(1.2, 1, 1.2);
            tree.add(mainLeaves);
        }

        // Adiciona variação na rotação
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        // Ajusta o collider baseado no tipo de árvore
        const colliderRadius = treeType < 0.3 ? 0.5 : 
                              treeType < 0.6 ? 1.2 :
                              treeType < 0.8 ? 0.8 : 1.0;
        
        return {
            mesh: tree,
            colliderRadius: colliderRadius
        };
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
            const x = Math.random() * this.chunkSize - this.chunkSize / 2;
            const z = Math.random() * this.chunkSize - this.chunkSize / 2;
            const y = 0.15;
            const rotation = Math.random() * Math.PI;

            matrix.makeRotationY(rotation);
            matrix.setPosition(x, y, z);
            grass.setMatrixAt(i, matrix);
        }

        chunk.add(grass);
    }

    update(playerPosition) {
        const newChunk = this.getChunkCoord(playerPosition);

        // Atualiza o chunk atual se necessário
        if (newChunk.x !== this.currentChunk.x || newChunk.z !== this.currentChunk.z) {
            this.currentChunk = newChunk;
        }

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

    createWaterAndPier() {
        const group = new THREE.Group();

        // Lago
        const waterGeometry = new THREE.PlaneGeometry(30, 30, 20, 20);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077be,
            transparent: true,
            opacity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        });

        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -0.1;

        // Guarda os vértices originais para animação
        this.waterVertices = waterGeometry.attributes.position.array.slice();

        group.add(this.water);

        // Píer
        const pier = new THREE.Group();
        const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        // Base do píer
        const baseGeometry = new THREE.BoxGeometry(4, 0.2, 20);
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

        group.add(pier);
        return group;
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

    createFarmArea() {
        const farm = new THREE.Group();

        // Cria canteiros de plantação
        const plotSize = 5;
        const plotsPerRow = 4;

        for (let x = 0; x < plotsPerRow; x++) {
            for (let z = 0; z < plotsPerRow; z++) {
                const plot = this.createFarmPlot(plotSize);
                plot.position.set(
                    (x - plotsPerRow / 2) * (plotSize + 1),
                    0,
                    (z - plotsPerRow / 2) * (plotSize + 1)
                );
                farm.add(plot);
            }
        }

        // Adiciona cerca ao redor da fazenda
        const fence = this.createFence(25);
        farm.add(fence);

        // Adiciona alguns elementos decorativos
        this.addFarmDecorations(farm);

        return farm;
    }

    createFarmPlot(size) {
        const plot = new THREE.Group();

        // Terra cultivada
        const soil = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            this.materials.farmland
        );
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = 0.05;
        plot.add(soil);

        // Adiciona cultivos aleatórios
        if (Math.random() > 0.3) {
            const cropCount = 9;
            const cropSpacing = size / 3;

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const crop = this.createCrop();
                    crop.position.set(
                        (i - 1) * cropSpacing,
                        0,
                        (j - 1) * cropSpacing
                    );
                    plot.add(crop);
                }
            }
        }

        return plot;
    }

    createCrop() {
        const crop = new THREE.Group();

        // Caule
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.5),
            this.materials.crops
        );
        stem.position.y = 0.25;
        crop.add(stem);

        // Folhas
        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(0.2),
            this.materials.crops
        );
        leaves.position.y = 0.5;
        crop.add(leaves);

        return crop;
    }

    createFence(size) {
        const fence = new THREE.Group();
        const postGeometry = new THREE.BoxGeometry(0.2, 1, 0.2);
        const railGeometry = new THREE.BoxGeometry(2, 0.1, 0.1);

        // Cria cerca nos quatro lados
        for (let i = -size / 2; i <= size / 2; i += 2) {
            // Posts
            const post = new THREE.Mesh(postGeometry, this.materials.fence);

            // Norte
            const postN = post.clone();
            postN.position.set(i, 0.5, -size / 2);
            fence.add(postN);

            // Sul
            const postS = post.clone();
            postS.position.set(i, 0.5, size / 2);
            fence.add(postS);

            // Leste
            const postE = post.clone();
            postE.position.set(size / 2, 0.5, i);
            fence.add(postE);

            // Oeste
            const postW = post.clone();
            postW.position.set(-size / 2, 0.5, i);
            fence.add(postW);

            // Adiciona as travessas horizontais
            if (i < size / 2) {
                const rail = new THREE.Mesh(railGeometry, this.materials.fence);

                // Norte
                const railN = rail.clone();
                railN.position.set(i + 1, 0.7, -size / 2);
                fence.add(railN);

                // Sul
                const railS = rail.clone();
                railS.position.set(i + 1, 0.7, size / 2);
                fence.add(railS);

                // Leste
                const railE = rail.clone();
                railE.rotation.y = Math.PI / 2;
                railE.position.set(size / 2, 0.7, i + 1);
                fence.add(railE);

                // Oeste
                const railW = rail.clone();
                railW.rotation.y = Math.PI / 2;
                railW.position.set(-size / 2, 0.7, i + 1);
                fence.add(railW);
            }
        }

        return fence;
    }

    createStaticWater() {
        // Lago principal na posição original (50, 50)
        const mainLake = this.createLake(50, 50, 15);
        this.scene.add(mainLake);

        // Lagos adicionais em posições fixas
        const additionalLakes = [
            { x: -30, z: 80, size: 10 },
            { x: 100, z: -20, size: 12 },
            { x: -50, z: -60, size: 8 }
        ];

        additionalLakes.forEach(lake => {
            const waterBody = this.createLake(lake.x, lake.z, lake.size);
            this.scene.add(waterBody);
        });
    }

    createLake(x, z, size) {
        const group = new THREE.Group();

        // Cria o lago com forma mais orgânica
        const lakeGeometry = new THREE.PlaneGeometry(size, size, 32, 32);
        const vertices = lakeGeometry.attributes.position.array;
        const colors = new Float32Array(vertices.length);

        // Cores para o degradê da água
        const colorDeep = new THREE.Color(0x1a4c6e);    // Azul escuro para partes profundas
        const colorShallow = new THREE.Color(0x4d9ee3); // Azul mais claro para partes rasas
        const colorEdge = new THREE.Color(0x7fb9e6);    // Azul bem claro para as bordas

        for (let i = 0; i < vertices.length; i += 3) {
            const px = vertices[i];
            const pz = vertices[i + 2];

            // Distância do centro para criar bordas irregulares
            const distFromCenter = Math.sqrt(px * px + pz * pz) / (size * 0.5);
            const angle = Math.atan2(pz, px);

            // Cria bordas irregulares
            const irregularity = Math.sin(angle * 5) * 0.2 +
                Math.sin(angle * 3) * 0.3 +
                Math.sin(angle * 8) * 0.1;

            const edgeFactor = Math.smoothstep(0.7, 1.0, distFromCenter + irregularity);
            vertices[i + 1] = -edgeFactor * 0.5; // Profundidade variável

            // Cor baseada na profundidade e distância da borda
            let waterColor;
            if (distFromCenter > 0.8) {
                waterColor = colorEdge;
            } else if (distFromCenter > 0.4) {
                waterColor = colorShallow.clone().lerp(colorEdge, (distFromCenter - 0.4) / 0.4);
            } else {
                waterColor = colorDeep.clone().lerp(colorShallow, distFromCenter / 0.4);
            }

            colors[i] = waterColor.r;
            colors[i + 1] = waterColor.g;
            colors[i + 2] = waterColor.b;
        }

        lakeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        lakeGeometry.attributes.position.needsUpdate = true;
        lakeGeometry.computeVertexNormals();

        const lakeMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            metalness: 0.9,
            roughness: 0.1,
        });

        const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(x, -0.1, z);
        group.add(lake);

        // Adiciona borda do lago
        const shoreGeometry = new THREE.PlaneGeometry(size * 1.1, size * 1.1, 32, 32);
        const shoreVertices = shoreGeometry.attributes.position.array;

        for (let i = 0; i < shoreVertices.length; i += 3) {
            const px = shoreVertices[i];
            const pz = shoreVertices[i + 2];
            const distFromCenter = Math.sqrt(px * px + pz * pz) / (size * 0.55);
            const angle = Math.atan2(pz, px);

            const irregularity = Math.sin(angle * 5) * 0.2 +
                Math.sin(angle * 3) * 0.3 +
                Math.sin(angle * 8) * 0.1;

            shoreVertices[i + 1] = Math.max(0, distFromCenter + irregularity - 0.8) * 0.3;
        }

        shoreGeometry.attributes.position.needsUpdate = true;
        shoreGeometry.computeVertexNormals();

        const shore = new THREE.Mesh(shoreGeometry, new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 1,
            metalness: 0
        }));
        shore.rotation.x = -Math.PI / 2;
        shore.position.set(x, -0.15, z);
        group.add(shore);

        return group;
    }

    addFarmDecorations(farm) {
        // Adiciona alguns barris decorativos
        const barrelCount = 3;
        for (let i = 0; i < barrelCount; i++) {
            const barrel = new THREE.Group();

            // Corpo do barril
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.4, 0.8, 12),
                this.materials.fence
            );
            barrel.add(body);

            // Aros do barril
            const ringGeometry = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
            const topRing = new THREE.Mesh(ringGeometry, this.materials.rock);
            topRing.position.y = 0.3;
            topRing.rotation.x = Math.PI / 2;
            barrel.add(topRing);

            const bottomRing = topRing.clone();
            bottomRing.position.y = -0.3;
            barrel.add(bottomRing);

            // Posiciona o barril
            barrel.position.set(
                (Math.random() - 0.5) * 20,
                0.4,
                (Math.random() - 0.5) * 20
            );
            barrel.rotation.y = Math.random() * Math.PI * 2;

            farm.add(barrel);
        }

        // Adiciona algumas ferramentas de fazenda
        const tools = ['shovel', 'rake', 'wateringCan'];
        tools.forEach((tool, index) => {
            const toolGroup = new THREE.Group();

            // Cabo da ferramenta
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 1),
                this.materials.fence
            );
            toolGroup.add(handle);

            // Cabeça da ferramenta
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.4),
                this.materials.rock
            );
            head.position.y = 0.5;
            toolGroup.add(head);

            // Posiciona a ferramenta
            toolGroup.position.set(
                10 - index * 2,
                0.5,
                10
            );
            toolGroup.rotation.z = Math.PI / 4;

            farm.add(toolGroup);
        });
    }

    // Método para verificar colisões
    checkCollision(position, radius) {
        for (const collider of this.colliders) {
            const dx = position.x - collider.mesh.position.x;
            const dz = position.z - collider.mesh.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < (radius + collider.radius)) {
                return true; // Há colisão
            }
        }
        return false; // Não há colisão
    }
}

Math.smoothstep = function (min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}; 