export class UIManager {
    constructor() {
        this.setupInventoryUI();
        this.setupFishingUI();
    }

    setupInventoryUI() {
        this.fishList = document.getElementById('fishList');
        this.totalPoints = document.getElementById('totalPoints');
    }

    setupFishingUI() {
        this.fishingBar = document.getElementById('fishingBar');
        this.fishingProgress = document.getElementById('fishingProgress');
    }

    updateInventory(inventory, fishTypes) {
        this.fishList.innerHTML = '';
        
        fishTypes.forEach(fishType => {
            const count = inventory[fishType.name];
            const fishDiv = document.createElement('div');
            fishDiv.className = 'fish-item';
            fishDiv.innerHTML = `
                <span>${fishType.icon} ${fishType.name}:</span>
                <span class="fish-details">
                    <span class="fish-count">${count}</span>
                    <span class="fish-price">(${fishType.price} 💰)</span>
                </span>
            `;
            this.fishList.appendChild(fishDiv);
        });

        // Atualiza o total de pontos
        this.totalPoints.textContent = fishTypes.reduce((total, fishType) => {
            return total + (inventory[fishType.name] * fishType.points);
        }, 0);
    }

    showFishingBar() {
        this.fishingBar.style.display = 'block';
    }

    hideFishingBar() {
        this.fishingBar.style.display = 'none';
    }

    updateFishingBar(progress) {
        this.fishingProgress.style.width = `${progress}%`;
        this.fishingProgress.style.backgroundColor = 
            Math.abs(progress - 50) <= 10 ? '#4CAF50' : '#ff6b6b';
    }
} 