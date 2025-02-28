export const TerrainShader = {
    uniforms: {
        grassMap: { value: null },
        grassNormal: { value: null },
        grassRough: { value: null },
        
        sandMap: { value: null },
        sandNormal: { value: null },
        sandRough: { value: null },
        
        rockMap: { value: null },
        rockNormal: { value: null },
        rockRough: { value: null },
        
        dirtMap: { value: null },
        dirtNormal: { value: null },
        dirtRough: { value: null },
        
        textureScale: { value: 4.0 }
    },

    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vSlope;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            
            // Calcula a inclinação do terreno
            vSlope = 1.0 - vNormal.y;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform sampler2D grassMap;
        uniform sampler2D grassNormal;
        uniform sampler2D grassRough;
        
        uniform sampler2D sandMap;
        uniform sampler2D sandNormal;
        uniform sampler2D sandRough;
        
        uniform sampler2D rockMap;
        uniform sampler2D rockNormal;
        uniform sampler2D rockRough;
        
        uniform sampler2D dirtMap;
        uniform sampler2D dirtNormal;
        uniform sampler2D dirtRough;
        
        uniform float textureScale;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vSlope;

        void main() {
            vec2 scaledUv = vUv * textureScale;
            
            // Amostra todas as texturas
            vec4 grassColor = texture2D(grassMap, scaledUv);
            vec4 sandColor = texture2D(sandMap, scaledUv);
            vec4 rockColor = texture2D(rockMap, scaledUv);
            vec4 dirtColor = texture2D(dirtMap, scaledUv);
            
            // Mistura baseada na altura e inclinação
            float height = vPosition.y;
            
            float grassWeight = 1.0 - smoothstep(0.0, 0.3, vSlope);
            float rockWeight = smoothstep(0.2, 0.7, vSlope);
            float sandWeight = smoothstep(-0.1, 0.1, height) * (1.0 - rockWeight);
            float dirtWeight = (1.0 - grassWeight - rockWeight - sandWeight);
            
            // Normaliza os pesos
            float totalWeight = grassWeight + rockWeight + sandWeight + dirtWeight;
            grassWeight /= totalWeight;
            rockWeight /= totalWeight;
            sandWeight /= totalWeight;
            dirtWeight /= totalWeight;
            
            // Mistura final
            vec4 finalColor = 
                grassColor * grassWeight +
                rockColor * rockWeight +
                sandColor * sandWeight +
                dirtColor * dirtWeight;
            
            gl_FragColor = finalColor;
        }
    `
}; 