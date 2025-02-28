export class MessageSystem {
    constructor() {
        this.setupMessageElement();
    }

    setupMessageElement() {
        this.messageEl = document.createElement('div');
        this.messageEl.id = 'fishingMessage';
        this.messageEl.style.position = 'absolute';
        this.messageEl.style.top = '60%';
        this.messageEl.style.left = '50%';
        this.messageEl.style.transform = 'translate(-50%, -50%)';
        this.messageEl.style.padding = '10px';
        this.messageEl.style.borderRadius = '5px';
        this.messageEl.style.fontFamily = 'Arial, sans-serif';
        this.messageEl.style.fontWeight = 'bold';
        this.messageEl.style.transition = 'opacity 0.3s';
        this.messageEl.style.zIndex = '1000';
        document.body.appendChild(this.messageEl);
    }

    show(text, color) {
        this.messageEl.style.backgroundColor = color;
        this.messageEl.style.color = 'white';
        this.messageEl.textContent = text;
        this.messageEl.style.opacity = '1';

        setTimeout(() => {
            this.messageEl.style.opacity = '0';
        }, 3000);
    }
} 