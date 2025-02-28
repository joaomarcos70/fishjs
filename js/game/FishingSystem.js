import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';
import { GAME_CONFIG } from '../utils/Constants.js';
import { Fish } from '../entities/Fish.js';

export class FishingSystem {
    constructor(player, messageSystem, uiManager) {
        this.player = player;
        this.messageSystem = messageSystem;
        this.uiManager = uiManager;
        
        this.isFishing = false;
        this.canCatch = false;
        this.currentFish = null;
        this.fishingInterval = null;
        this.catchAttempts = 0;
        this.fishCount = 0;
        this.inventory = {
            'Sardinha': 0,
            'Atum': 0,
            'Salmão': 0
        };
        this.totalPoints = 0;
        
        this.setupFishingControls();
    }

    setupFishingControls() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (this.isFishing) {
                    // Retirar a vara
                    clearInterval(this.fishingInterval);
                    this.messageSystem.show('Vara retirada da água', '#4169E1');
                    this.endFishing(false);
                } else {
                    // Lançar a vara
                    this.startFishing();
                }
            } else if (e.code === 'KeyF' && this.isFishing) {
                this.attemptCatch();
            }
        });
    }

    startFishing() {
        if (!this.isFishing) {
            this.isFishing = true;
            this.player.startFishingAnimation();
            this.messageSystem.show('Vara lançada! Aguarde um peixe...', '#4169E1');
            
            setTimeout(() => {
                if (this.isFishing) {
                    this.triggerFishingMinigame();
                }
            }, Math.random() * 2000 + 1000);
        }
    }

    triggerFishingMinigame() {
        this.currentFish = Fish.getRandomFish();
        this.uiManager.showFishingBar();
        this.messageSystem.show('Um peixe mordeu! Pressione F quando a barra estiver verde!', '#ff9800');
        
        this.startFishingBar();
    }

    startFishingBar() {
        let progress = 50;
        this.canCatch = false;

        this.fishingInterval = setInterval(() => {
            const fishMovement = Math.sin(Date.now() * 0.003) * this.currentFish.difficulty;
            progress = 50 + fishMovement * 25;
            
            this.uiManager.updateFishingBar(progress);
            this.canCatch = Math.abs(progress - 50) <= this.currentFish.catchWindow;
        }, 16);
    }

    attemptCatch() {
        if (this.canCatch) {
            this.fishCount++;
            this.inventory[this.currentFish.name]++;
            this.totalPoints += this.currentFish.points;
            
            document.getElementById('fishCount').textContent = this.fishCount;
            this.uiManager.updateInventory(this.inventory, Fish.TYPES);
            
            this.messageSystem.show(
                `Pegou um ${this.currentFish.name}! ${this.currentFish.icon} +${this.currentFish.points} pontos (${this.currentFish.price} 💰)`, 
                '#4CAF50'
            );
            this.endFishing(true);
        } else {
            this.messageSystem.show('O peixe escapou! Timing errado!', '#ff6b6b');
            this.endFishing(false);
        }
    }

    endFishing(success) {
        this.isFishing = false;
        this.canCatch = false;
        clearInterval(this.fishingInterval);
        this.uiManager.hideFishingBar();
        this.player.endFishingAnimation();
        
        // Limpa o peixe atual
        this.currentFish = null;
    }

    update() {
        if (this.isFishing) {
            if (this.player.fishingLine) {
                this.player.fishingLine.rotation.x = Math.sin(Date.now() * 0.003) * 0.1;
                if (this.player.bait) {
                    this.player.bait.position.y = -2 + Math.sin(Date.now() * 0.003) * 0.2;
                }
            }
        }
    }
} 