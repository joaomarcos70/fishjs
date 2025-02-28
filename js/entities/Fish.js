export class Fish {
    constructor(type) {
        this.type = type;
        this.difficulty = type.difficulty;
        this.catchWindow = type.catchWindow;
        this.price = type.price;
    }

    static TYPES = [
        {
            name: 'Sardinha',
            difficulty: 0.5,
            timeWindow: 1000,
            catchWindow: 15,
            points: 10,
            price: 50,
            icon: '🐟'
        },
        {
            name: 'Atum',
            difficulty: 1,
            timeWindow: 800,
            catchWindow: 12,
            points: 20,
            price: 120,
            icon: '🐠'
        },
        {
            name: 'Salmão',
            difficulty: 1.5,
            timeWindow: 600,
            catchWindow: 10,
            points: 30,
            price: 200,
            icon: '🐡'
        }
    ];

    static getRandomFish() {
        return this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
    }
} 