class ContactForm {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.submitBtn = this.form?.querySelector('.submit-btn');
        this.messageDiv = document.getElementById('form-message');
        // Same-origin Vercel serverless function (frontend/api/contact.js).
        // No separate backend is needed any more.
        this.API_URL = '/api/contact';
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const data = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            subject: formData.get('subject')?.trim() || 'Portfolio Contact',
            message: formData.get('message').trim()
        };

        if (!this.validateForm(data)) return;

        this.setLoading(true);

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            let result = {};
            try {
                result = await response.json();
            } catch (e) {
                /* non-JSON reply (e.g. the function isn't available locally) */
            }

            if (response.ok) {
                this.showMessage('Your message was sent successfully!', 'success');
                this.form.reset();
            } else {
                this.showMessage(result.error || 'Something went wrong. Please try again.', 'error');
            }

        } catch (err) {
            console.error('Contact form error:', err);
            this.showMessage('Could not send your message. Please check your connection and try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    validateForm(data) {
        if (!data.name || !data.email || !data.message) {
            this.showMessage('Please fill in all fields.', 'error');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            this.showMessage('Please enter a valid email.', 'error');
            return false;
        }
        if (data.message.length < 10) {
            this.showMessage('Message must be at least 10 characters.', 'error');
            return false;
        }
        return true;
    }

    showMessage(message, type) {
        if (this.messageDiv) {
            this.messageDiv.textContent = message;
            this.messageDiv.className = `form-message ${type}`;
            this.messageDiv.classList.remove('hidden');
            setTimeout(() => this.messageDiv.classList.add('hidden'), 5000);
        }
    }

    setLoading(isLoading) {
        if (this.submitBtn) {
            this.submitBtn.disabled = isLoading;
            this.submitBtn.textContent = isLoading ? 'Sending...' : 'Send Message';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContactForm();
});
