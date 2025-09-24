/**
 * Contact form functionality
 * Handles form submission, validation, and user feedback (client-side only)
 */

class ContactForm {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.submitBtn = this.form?.querySelector('.submit-btn');
        this.messageDiv = document.getElementById('form-message');
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const data = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            message: formData.get('message').trim()
        };

        if (this.validateForm(data)) {
            this.setLoading(true);
            // Simulate form submission without backend
            setTimeout(() => {
                this.showMessage('Thank you! Message saved locally.', 'success');
                this.form.reset();
                this.setLoading(false);
            }, 1000);
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
            setTimeout(() => this.messageDiv.classList.add('hidden'), 3000);
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