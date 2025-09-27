class PortfolioChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.localStorageKey = "portfolioChatHistory";
        this.backendUrl = "http://127.0.0.1:8000/api/v1/chat";
        this.isTyping = false;
        this.isUserScrolling = false;
        this.isGeneratingResponse = false;
        this.lastScrollTime = 0;
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.securityKeywords = ['murder', 'weapon', 'bomb', 'terrorism', 'hate', 'fuck', 'sex'];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadHistory();
        this.setupMicrophone();
        this.injectSimpleStyles();
        
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.addEventListener('scroll', () => this.handleScroll());
         this.showWelcomePopup();
    }

    bindEvents() {
        const chatButton = document.getElementById('chatbot-button');
        const closeBtn = document.querySelector('.close-chat');
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');

        if (chatButton) chatButton.addEventListener('click', () => this.openChat());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeChat());
        if (sendBtn) sendBtn.addEventListener('click', () => {
            if (!this.isTyping && chatInput?.value.trim()) this.sendMessage();
        });
        
        if (chatInput) {
            chatInput.addEventListener('input', () => this.updateButtonState());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.isTyping && chatInput.value.trim()) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }
    showWelcomePopup() {
    const welcomePopup = document.getElementById("chatbot-welcome");
    const chatButton = document.getElementById("chatbot-button");

    if (!welcomePopup) return;

    // Show popup after 2s
    setTimeout(() => {
        welcomePopup.classList.remove("hidden");

        // Hide after 6s
        setTimeout(() => {
            welcomePopup.classList.add("hidden");
        }, 6000);
    }, 2000);

    // Hide popup instantly if user opens chat
    if (chatButton) {
        chatButton.addEventListener("click", () => {
            welcomePopup.classList.add("hidden");
        });
    }
}


    setupMicrophone() {
        const micBtn = document.getElementById('micBtn');
        if (!micBtn || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            if (micBtn) micBtn.style.display = 'none';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => micBtn.classList.add('listening');
        recognition.onend = () => micBtn.classList.remove('listening');
        recognition.onresult = (event) => {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.value = event.results[0][0].transcript;
                this.updateButtonState();
                if (!this.isGeneratingResponse) chatInput.focus();
            }
        };
        
        micBtn.addEventListener('click', () => recognition.start());
    }

    updateButtonState() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const micBtn = document.getElementById('micBtn');
        if (!chatInput || !sendBtn) return;
        
        const hasText = chatInput.value.trim() !== "";
        if (hasText) {
            sendBtn.innerHTML = "➤";
            sendBtn.style.display = "inline-flex";
            if (micBtn) micBtn.style.display = "none";
        } else {
            sendBtn.style.display = "none";
            if (micBtn) micBtn.style.display = "inline-flex";
        }
    }

    handleScroll() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        const threshold = 30;
        const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
        this.isUserScrolling = distanceFromBottom > threshold;
    }

    validateInput(input) {
        const inputLower = input.toLowerCase();
        
        // Remove 'kill' if it's part of skill-related words
        let cleanedInput = inputLower;
        if (inputLower.includes('skill') || inputLower.includes('skil')) {
            cleanedInput = inputLower.replace(/skills?|skils?/g, ''); // Remove skill variations
        }
        
        const foundKeywords = this.securityKeywords.filter(keyword => {
            if (keyword === 'kill') {
                // Only check for 'kill' in the cleaned input (without skill words)
                return cleanedInput.includes('kill');
            }
            return inputLower.includes(keyword);
        });
        
        if (foundKeywords.length > 0) {
            return { isValid: false, message: 'I can only assist with professional questions about Adil\'s portfolio and work.' };
        }
        
        if (input.length > 500) {
            return { isValid: false, message: 'Please keep your question under 500 characters.' };
        }
        
        return { isValid: true };
    }

    loadHistory() {
        try {
            const sessionHistory = localStorage.getItem(this.localStorageKey);
            if (sessionHistory) {
                const parsed = JSON.parse(sessionHistory);
                if (Array.isArray(parsed)) {
                    this.messages = parsed.slice(-50);
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) chatMessages.innerHTML = '';
                    this.messages.forEach(msg => this.renderMessage(msg));
                    this.scrollToBottom(true);
                    return;
                }
            }
        } catch (error) {
            console.warn('Error loading chat history:', error);
            localStorage.removeItem(this.localStorageKey);
        }
        this.loadInitialMessage();
    }

    loadInitialMessage() {
        const welcomeMessage = {
            id: this.generateMessageId(),
            text: "Hi! I'm Adil Saeed's AI Assistant. Ask me about his projects, skills, education, or contact information.\n\nI'm Adil Saeed's AI Assistant.",
            isUser: false,
            timestamp: new Date().toISOString(),
            type: 'welcome'
        };
        this.messages.push(welcomeMessage);
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        this.renderMessage(welcomeMessage);
        this.saveHistory();
        this.scrollToBottom(true);
    }
openChat() {
    const chatWindow = document.getElementById('chat-window');
    const chatButton = document.getElementById('chatbot-button');
    const welcomePopup = document.getElementById("chatbot-welcome");

    if (chatWindow && chatButton) {
        this.isOpen = true;
        chatButton.style.display = 'none';
        chatWindow.classList.remove('hidden');
        if (welcomePopup) welcomePopup.classList.add("hidden"); // ✅ hide popup
        this.scrollToBottom(true);
        this.updateButtonState();
        setTimeout(() => document.getElementById('chat-input')?.focus(), 10000);
    }
}


    closeChat() {
        const chatWindow = document.getElementById('chat-window');
        const chatButton = document.getElementById('chatbot-button');
        if (chatWindow && chatButton) {
            this.isOpen = false;
            chatWindow.classList.add('hidden');
            chatButton.style.display = 'flex';
            this.hideTypingIndicator();
        }
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const messageText = chatInput?.value.trim();

        if (!messageText || this.isTyping || this.isGeneratingResponse) return;

        const validation = this.validateInput(messageText);
        if (!validation.isValid) {
            this.showValidationError(validation.message);
            return;
        }

        this.isTyping = true;
        this.isGeneratingResponse = true;
        this.addMessage(messageText, true);
        this.scrollToBottom(true);

        chatInput.value = '';
        this.updateButtonState();
        chatInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        try {
            this.showTypingIndicator();
            const botResponse = await this.getBotResponse(messageText);
            this.hideTypingIndicator();
            
            // NEW: Handle both text and images
            await this.streamMessageText(botResponse.answer || botResponse, {
                sources: botResponse.sources || [],
                queryType: botResponse.query_type || 'unknown',
                images: botResponse.images || [],
                showImagesAfter: botResponse.show_images_after_ms || 0
            });
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Chat error:', error);
            await this.streamMessageText(this.getErrorMessage(error), { type: 'error' });
        } finally {
            this.isTyping = false;
            this.isGeneratingResponse = false;
            chatInput.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            this.updateButtonState();
            chatInput.focus();
        }
    }

    async streamMessageText(text, metadata = {}) {
        const messageId = this.generateMessageId();
        const message = {
            id: messageId,
            text: text,
            isUser: false,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };
        this.messages.push(message);
        this.saveHistory();
        
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message bot-message';
        messageElement.id = messageId;
        messageElement.innerHTML = `
            <div class="message-content"></div>
            <div class="message-time">${this.formatTime(new Date(message.timestamp))}</div>
        `;
        chatMessages.appendChild(messageElement);
        
        // Stream the text first
        let currentText = '';
        for (let i = 0; i < text.length; i++) {
            if (!this.isGeneratingResponse) break;
            currentText = text.slice(0, i + 1);
            const formattedText = this.parseSimpleMarkdown(currentText);
            
            messageElement.innerHTML = `
                <div class="message-content">${formattedText}</div>
                <div class="message-time">${this.formatTime(new Date(message.timestamp))}</div>
            `;
            
            if (Date.now() - this.lastScrollTime >= 100) {
                this.scrollToBottom();
                this.lastScrollTime = Date.now();
            }
            await this.sleep(8);
        }
        
        // NEW: Handle images with streaming effect
        if (metadata.images && metadata.images.length > 0) {
            await this.handleImageDisplay(messageElement, metadata.images, metadata.showImagesAfter || 2500);
        }
        
        this.scrollToBottom();
    }

    // NEW: Image display with streaming effect
    async handleImageDisplay(messageElement, images, delay) {
        const messageContent = messageElement.querySelector('.message-content');
        
        // Add "generating image" placeholder
        const imageSpinner = document.createElement('div');
        imageSpinner.className = 'image-spinner';
        imageSpinner.innerHTML = `
            <div class="image-loading">
                <div class="loading-spinner"></div>
                <span>Generating image...</span>
            </div>
        `;
        messageContent.appendChild(imageSpinner);
        this.scrollToBottom();
        
        // Wait for the specified delay
        await this.sleep(delay);
        
        // Remove spinner and show images
        imageSpinner.remove();
        
        const imageGallery = document.createElement('div');
        imageGallery.className = 'image-gallery';
        
        for (const img of images) {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            imageCard.style.opacity = '0';
            
            const imageEl = document.createElement('img');
            imageEl.src = `/rag/documents/images/${img.file || img}`;
            imageEl.alt = img.alt || 'Image from Adil\'s portfolio';
            imageEl.className = 'chat-image';
            
            const caption = document.createElement('div');
            caption.className = 'image-caption';
            caption.textContent = img.caption || 'Portfolio Image';
            
            imageCard.appendChild(imageEl);
            imageCard.appendChild(caption);
            imageGallery.appendChild(imageCard);
            
            // Fade in effect
            setTimeout(() => {
                imageCard.style.transition = 'opacity 0.4s ease';
                imageCard.style.opacity = '1';
            }, 100);
        }
        
        messageContent.appendChild(imageGallery);
        this.scrollToBottom();
    }

    async getBotResponse(userMessage) {
        try {
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Accept': 'application/json' 
                },
                body: JSON.stringify({
                    query: userMessage,
                    language: /[\u0600-\u06FF]/.test(userMessage) ? 'ur' : 'en',
                    session_id: this.sessionId,
                    timestamp: new Date().toISOString(),
                    conversation_history: this.messages.slice(-10).map(msg => ({
                        role: msg.isUser ? 'user' : 'assistant',
                        content: msg.text,
                        timestamp: msg.timestamp || new Date().toISOString()
                    }))
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Backend connection error:', error);
            throw error;
        }
    }

    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) return "Connection error. Check your internet connection.";
        return "I encountered an error. Please try again.";
    }

    addMessage(text, isUser, metadata = {}) {
        const message = {
            id: this.generateMessageId(),
            text: text,
            isUser: isUser,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        this.saveHistory();
    }

    renderMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.isUser ? 'user-message' : 'bot-message'}`;
        const parsedText = message.isUser ? this.escapeHtml(message.text) : this.parseSimpleMarkdown(message.text);
        const timeString = this.formatTime(new Date(message.timestamp));
        
        messageElement.innerHTML = `
            <div class="message-content">${parsedText}</div>
            <div class="message-time">${timeString}</div>
        `;
        chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    parseSimpleMarkdown(text) {
        // Clean HTML artifacts
        text = text.replace(/target="_blank"[^>]*>/g, '">');
        text = text.replace(/rel="[^"]*"/g, '');
        text = text.replace(/class="[^"]*">/g, '');
        
        text = this.escapeHtml(text);
        
        // ChatGPT-style formatting - simple and clean:
        
        // 1. Bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 2. Convert word-only links to clickable links (no raw URLs)
        text = text.replace(/\[GitHub\]/g, 
            '<a href="https://github.com/AdilSaeed0347" target="_blank" style="color: #1a73e8; text-decoration: none;">GitHub</a>');
        text = text.replace(/\[LinkedIn\]/g, 
            '<a href="https://www.linkedin.com/in/adil-saeed-9b7b51363/" target="_blank" style="color: #1a73e8; text-decoration: none;">LinkedIn</a>');
        text = text.replace(/\[Facebook\]/g, 
            '<a href="https://www.facebook.com/adil.saeed.9406" target="_blank" style="color: #1a73e8; text-decoration: none;">Facebook</a>');
        text = text.replace(/\[Email\]/g, 
            '<a href="mailto:adilsaeed047@gmail.com" style="color: #1a73e8; text-decoration: none;">Email</a>');
        
        // 3. Line breaks
        text = text.replace(/\n\n/g, '<br><br>');
        text = text.replace(/\n/g, '<br>');
        
        // 4. Clean signature - NOT italic, normal font
        text = text.replace(/(💬 I'm Adil Saeed's AI Assistant\. 📚 Adil_Data)/g, 
            '<div style="margin-top: 12px; color: #666; font-size: 0.9em; font-weight: normal;">$1</div>');
        
        return text;
    }

    formatTime(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showValidationError(message) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.style.borderColor = '#ff4444';
            setTimeout(() => chatInput.style.borderColor = '', 3000);
        }
        this.addMessage(`${message}`, false, { type: 'validation_error' });
    }

    saveHistory() {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.messages.slice(-50)));
        } catch (error) {
            console.warn('Error saving chat history:', error);
        }
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const existing = document.getElementById('typing-indicator');
        if (existing) existing.remove();
        
        const typingElement = document.createElement('div');
        typingElement.className = 'message bot-message typing-indicator';
        typingElement.id = 'typing-indicator';
        typingElement.innerHTML = `
            <div class="message-content">
                <div class="typing-animation">
                    <span></span><span></span><span></span>
                </div>
                <span class="typing-text"> Thinking...</span>
            </div>
        `;
        chatMessages.appendChild(typingElement);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }

    scrollToBottom(force = false) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages || (this.isUserScrolling && !force)) return;
        requestAnimationFrame(() => chatMessages.scrollTop = chatMessages.scrollHeight);
    }

    injectSimpleStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* ChatGPT-style clean formatting */
            .message-content a {
                color: #1a73e8;
                text-decoration: none;
                transition: text-decoration 0.2s ease;
            }
            .message-content a:hover {
                text-decoration: underline;
            }
            .message-content strong {
                font-weight: 600;
            }
            
            /* Image display styles */
            .image-gallery {
                display: flex;
                gap: 10px;
                margin-top: 12px;
                flex-wrap: wrap;
            }
            
            .image-card {
                max-width: 200px;
                border-radius: 12px;
                overflow: hidden;
                background: #f8f9fa;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: opacity 0.4s ease;
            }
            
            .chat-image {
                width: 100%;
                height: auto;
                display: block;
            }
            
            .image-caption {
                padding: 8px 12px;
                font-size: 13px;
                color: #666;
                border-top: 1px solid #eee;
            }
            
            /* Image loading spinner */
            .image-spinner {
                margin-top: 12px;
                padding: 12px;
                background: linear-gradient(90deg, #f0f2f6, #eef3ff);
                border-radius: 8px;
                display: inline-block;
            }
            
            .image-loading {
                display: flex;
                align-items: center;
                gap: 8px;
                font-style: italic;
                color: #666;
            }
            
            .loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #e3e3e3;
                border-top: 2px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* OLD BLUE typing indicator with bounce animation */
            .typing-animation {
                display: inline-flex;
                gap: 3px;
                margin-right: 8px;
            }
            .typing-animation span {
                width: 6px;
                height: 6px;
                background: #3b82f6;
                border-radius: 50%;
                animation: typing 1.4s infinite;
            }
            .typing-animation span:nth-child(2) { animation-delay: 0.2s; }
            .typing-animation span:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes typing {
                0%, 60%, 100% { 
                    transform: translateY(0); 
                    opacity: 0.4; 
                }
                30% { 
                    transform: translateY(-8px); 
                    opacity: 1; 
                }
            }
            
            .typing-text {
                color: #6b7280;
                font-style: italic;
            }
            
            /* Microphone listening state */
            #micBtn.listening {
                background-color: #fef3c7;
                border-color: #f59e0b;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize chatbot
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.portfolioChatbot = new PortfolioChatbot();
        console.log('Image-enabled chatbot initialized');
    } catch (error) {
        console.error('Failed to initialize chatbot:', error);
    }
});
