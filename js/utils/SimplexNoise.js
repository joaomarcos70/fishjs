// Implementação simples de Perlin Noise
export function createNoise2D() {
    // Gradientes para 2D
    const GRAD = [
        [1, 1], [-1, 1], [1, -1], [-1, -1],
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    // Cria e embaralha a tabela de permutação
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        p[i] = i;
    }

    for (let i = 255; i > 0; i--) {
        const r = Math.floor(Math.random() * (i + 1));
        const temp = p[i];
        p[i] = p[r];
        p[r] = temp;
    }

    // Duplica a tabela de permutação
    const perm = new Uint8Array(512);
    const permMod8 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        permMod8[i] = perm[i] & 7;
    }

    // Funções auxiliares
    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }

    function grad2d(hash, x, y) {
        const g = GRAD[hash & 7];
        return g[0] * x + g[1] * y;
    }

    // Função principal de ruído
    return function(x, y) {
        // Encontra unidade quadrada
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        // Encontra posição relativa no quadrado
        x -= Math.floor(x);
        y -= Math.floor(y);

        // Curvas de suavização
        const u = fade(x);
        const v = fade(y);

        // Hash de coordenadas dos 4 cantos do quadrado
        const A = perm[X] + Y;
        const AA = perm[A];
        const AB = perm[A + 1];
        const B = perm[X + 1] + Y;
        const BA = perm[B];
        const BB = perm[B + 1];

        // Mistura os resultados
        return lerp(
            lerp(
                grad2d(perm[AA], x, y),
                grad2d(perm[BA], x - 1, y),
                u
            ),
            lerp(
                grad2d(perm[AB], x, y - 1),
                grad2d(perm[BB], x - 1, y - 1),
                u
            ),
            v
        ) * 0.5 + 0.5;
    };
} 