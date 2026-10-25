/* =========================================================================
   contact.js — Contact page interactions.
   Sections: form handling (validation, honeypot, submit, success/error),
   scroll reveals, magnetic buttons, card tilt, cursor glow, chat sequence,
   FAQ accordion, map skeleton, CTA particles, back-to-top.
   Every decorative effect checks prefers-reduced-motion and (pointer: fine)
   before doing anything, so mobile/touch and reduced-motion users get a
   calmer, still fully functional page.
   ========================================================================= */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isFinePointer = window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches;
const allowDecorative = !prefersReducedMotion && isFinePointer;

/* ------------------------------------------------------------------ */
/* Ripple effect — reusable for buttons and social icons                */
/* ------------------------------------------------------------------ */
function attachRipple(el) {
    el.addEventListener("click", (e) => {
        const rect = el.getBoundingClientRect();
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height);
        ripple.className = "ripple";
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        el.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());
    });
}

/* ------------------------------------------------------------------ */
/* Contact form: validation, honeypot, submit, loading, success/error   */
/* ------------------------------------------------------------------ */
class ContactForm {
    constructor() {
        this.form = document.getElementById("contact-form");
        this.submitBtn = this.form?.querySelector(".submit-btn");
        this.messageDiv = document.getElementById("form-message");
        this.successDiv = document.getElementById("form-success");
        this.sendAnotherBtn = document.getElementById("send-another-btn") ||
            document.querySelector(".send-another-btn");
        this.charCount = document.getElementById("char-count");
        this.messageField = document.getElementById("message");

        // Same-origin Vercel serverless function (frontend/api/contact.js).
        this.API_URL = "/api/contact";

        this.lastSubmitAt = 0;
        this.init();
    }

    init() {
        if (!this.form) return;

        this.form.addEventListener("submit", (e) => this.handleSubmit(e));

        // Real-time validation as the user types/leaves a field
        this.form.querySelectorAll("input, select, textarea").forEach((field) => {
            if (field.name === "company") return; // honeypot, skip
            field.addEventListener("blur", () => this.validateField(field));
            field.addEventListener("input", () => {
                if (field.closest(".form-group")?.classList.contains("invalid")) {
                    this.validateField(field);
                }
            });
        });

        // Live character counter on the message field
        if (this.messageField && this.charCount) {
            this.messageField.addEventListener("input", () => {
                this.charCount.textContent = this.messageField.value.length;
            });
        }

        if (this.sendAnotherBtn) {
            this.sendAnotherBtn.addEventListener("click", () => this.resetToForm());
        }
    }

    validateField(field) {
        const group = field.closest(".form-group");
        if (!group) return true;
        const errorEl = group.querySelector(".field-error");
        let message = "";

        const value = field.value.trim();

        if (field.hasAttribute("required") && !value) {
            message = "This field is required.";
        } else if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            message = "Enter a valid email address.";
        } else if (field.name === "message" && value && value.length < 10) {
            message = "Message must be at least 10 characters.";
        }

        if (message) {
            group.classList.add("invalid");
            group.classList.remove("valid");
            if (errorEl) errorEl.textContent = message;
            return false;
        }

        group.classList.remove("invalid");
        if (value) group.classList.add("valid");
        if (errorEl) errorEl.textContent = "";
        return true;
    }

    validateAll() {
        const fields = this.form.querySelectorAll("input[required], select[required], textarea[required]");
        let allValid = true;
        fields.forEach((field) => {
            if (!this.validateField(field)) allValid = false;
        });
        return allValid;
    }

    async handleSubmit(event) {
        event.preventDefault();

        // Honeypot: real users never fill this hidden field. If it's
        // filled, quietly pretend to succeed rather than tipping off a bot.
        const honeypot = this.form.querySelector('[name="company"]');
        if (honeypot && honeypot.value.trim() !== "") {
            this.form.reset();
            return;
        }

        // Simple resubmission cooldown — stops accidental double-sends
        const now = Date.now();
        if (now - this.lastSubmitAt < 8000) {
            this.showMessage("Please wait a few seconds before sending again.", "error");
            return;
        }

        if (!this.validateAll()) {
            this.showMessage("Please fix the highlighted fields.", "error");
            return;
        }

        const formData = new FormData(this.form);
        const service = formData.get("service")?.trim();
        const budget = formData.get("budget")?.trim();

        // Backend accepts name/email/subject/message — fold the extra
        // service/budget fields into the message body rather than
        // requiring a backend change.
        let combinedMessage = formData.get("message").trim();
        const extras = [];
        if (service) extras.push(`Service Required: ${service}`);
        if (budget) extras.push(`Budget: ${budget}`);
        if (extras.length) combinedMessage = `${extras.join(" | ")}\n\n${combinedMessage}`;

        const data = {
            name: formData.get("name").trim(),
            email: formData.get("email").trim(),
            subject: formData.get("subject")?.trim() || "Portfolio Contact",
            message: combinedMessage
        };

        this.setLoading(true);

        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            let result = {};
            try {
                result = await response.json();
            } catch (e) {
                /* non-JSON reply (e.g. the function isn't available locally) */
            }

            if (response.ok) {
                this.lastSubmitAt = now;
                this.showSuccess();
                this.form.reset();
                this.form.querySelectorAll(".form-group").forEach((g) => g.classList.remove("valid", "invalid"));
                if (this.charCount) this.charCount.textContent = "0";
            } else {
                this.showMessage(result.error || "Something went wrong. Please try again.", "error");
            }
        } catch (err) {
            console.error("Contact form error:", err);
            this.showMessage("Could not send your message. Please check your connection and try again.", "error");
        } finally {
            this.setLoading(false);
        }
    }

    showMessage(message, type) {
        if (!this.messageDiv) return;
        this.messageDiv.textContent = message;
        this.messageDiv.className = `form-message ${type}`;
        this.messageDiv.classList.remove("hidden");
        setTimeout(() => this.messageDiv.classList.add("hidden"), 5000);
    }

    showSuccess() {
        if (!this.successDiv) return;
        this.form.style.display = "none";
        this.successDiv.classList.remove("hidden");
    }

    resetToForm() {
        if (!this.successDiv || !this.form) return;
        this.successDiv.classList.add("hidden");
        this.form.style.display = "";
    }

    setLoading(isLoading) {
        if (!this.submitBtn) return;
        this.submitBtn.classList.toggle("loading", isLoading);
        const label = this.submitBtn.querySelector(".btn-label");
        if (label) label.textContent = isLoading ? "Sending..." : "Send Message";
    }
}

/* ------------------------------------------------------------------ */
/* Scroll reveal (fade-up / slide-left / slide-right / zoom / scale)    */
/* ------------------------------------------------------------------ */
function initScrollReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
        items.forEach((el) => el.classList.add("in-view"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
                setTimeout(() => el.classList.add("in-view"), delay);
                obs.unobserve(el);
            });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------------ */
/* Magnetic buttons — pulls slightly toward the cursor within range.    */
/* Strength reduced from the original so the pull reads as a subtle     */
/* nudge rather than the button chasing the cursor.                     */
/* ------------------------------------------------------------------ */
function attachMagnetic(el, strength = 10) {
    if (!allowDecorative) return;
    let raf = null;

    el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;

        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            el.style.transform = `translate(${relX / rect.width * strength}px, ${relY / rect.height * strength}px)`;
        });
    });

    el.addEventListener("mouseleave", () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "translate(0, 0)";
    });
}

/* ------------------------------------------------------------------ */
/* Card tilt — subtle 3D tilt following the cursor                      */
/* ------------------------------------------------------------------ */
function attachTilt(el, maxTilt = 4) {
    if (!allowDecorative) return;
    let raf = null;

    el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * maxTilt * 2;
        const rotateX = (0.5 - py) * maxTilt * 2;

        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    });

    el.addEventListener("mouseleave", () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "perspective(700px) rotateX(0) rotateY(0)";
    });
}

/* ------------------------------------------------------------------ */
/* Cursor-follow glow                                                    */
/* ------------------------------------------------------------------ */
function initCursorGlow() {
    const glow = document.getElementById("cursor-glow");
    if (!glow || !allowDecorative) return;

    let raf = null;
    document.addEventListener("mousemove", (e) => {
        glow.classList.add("active");
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            glow.style.setProperty("--x", `${e.clientX}px`);
            glow.style.setProperty("--y", `${e.clientY}px`);
        });
    });

    document.addEventListener("mouseleave", () => glow.classList.remove("active"));
}

/* ------------------------------------------------------------------ */
/* Chat bubble sequence — plays once when the card scrolls into view     */
/* ------------------------------------------------------------------ */
function initChatSequence() {
    const thread = document.getElementById("chat-thread");
    const typing = document.getElementById("chat-typing");
    const reply = document.getElementById("chat-reply");
    if (!thread) return;

    const clientBubble = thread.querySelector(".chat-bubble-client");

    const play = () => {
        if (clientBubble) clientBubble.classList.add("visible");
        setTimeout(() => {
            if (typing) typing.classList.add("visible");
        }, 500);
        setTimeout(() => {
            if (typing) typing.classList.remove("visible");
            if (reply) reply.classList.add("visible");
        }, 1900);
    };

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        if (clientBubble) clientBubble.classList.add("visible");
        if (reply) reply.classList.add("visible");
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                play();
                obs.disconnect();
            });
        },
        { threshold: 0.4 }
    );
    observer.observe(thread);
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                         */
/* ------------------------------------------------------------------ */
function initFaqAccordion() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
        const question = item.querySelector(".faq-question");
        const answer = item.querySelector(".faq-answer");
        if (!question || !answer) return;

        question.addEventListener("click", () => {
            const isOpen = item.classList.contains("open");

            // Close all others (single-open accordion)
            items.forEach((other) => {
                if (other === item) return;
                other.classList.remove("open");
                other.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
                const otherAnswer = other.querySelector(".faq-answer");
                if (otherAnswer) otherAnswer.style.maxHeight = null;
            });

            if (isOpen) {
                item.classList.remove("open");
                question.setAttribute("aria-expanded", "false");
                answer.style.maxHeight = null;
            } else {
                item.classList.add("open");
                question.setAttribute("aria-expanded", "true");
                answer.style.maxHeight = `${answer.scrollHeight}px`;
            }
        });
    });
}

/* ------------------------------------------------------------------ */
/* Map skeleton — hides once the iframe reports it has loaded            */
/* ------------------------------------------------------------------ */
function initMapSkeleton() {
    const frame = document.getElementById("map-frame");
    const skeleton = document.getElementById("map-skeleton");
    if (!frame || !skeleton) return;
    frame.addEventListener("load", () => skeleton.classList.add("done"));
}

/* ------------------------------------------------------------------ */
/* CTA particles — lightweight canvas, pauses off-screen, skipped        */
/* entirely for reduced-motion users. Particle color matches the         */
/* site-wide blue accent (#3b82f6) used on every other page.             */
/* ------------------------------------------------------------------ */
function initCtaParticles() {
    const canvas = document.getElementById("cta-particles");
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext("2d");
    let width, height, particles, animId;
    let running = false;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        width = canvas.width = rect.width;
        height = canvas.height = rect.height;
    }

    function makeParticles() {
        const count = Math.min(30, Math.floor(width / 36));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            a: Math.random() * 0.3 + 0.12
        }));
    }

    function tick() {
        if (!running) return;
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(59, 130, 246, ${p.a})`;
            ctx.fill();
        });
        animId = requestAnimationFrame(tick);
    }

    resize();
    makeParticles();
    window.addEventListener("resize", () => { resize(); makeParticles(); });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && !running) {
                running = true;
                tick();
            } else if (!entry.isIntersecting && running) {
                running = false;
                if (animId) cancelAnimationFrame(animId);
            }
        });
    }, { threshold: 0.05 });
    observer.observe(canvas);
}

/* ------------------------------------------------------------------ */
/* Back to top                                                           */
/* ------------------------------------------------------------------ */
function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;

    window.addEventListener("scroll", () => {
        btn.classList.toggle("visible", window.scrollY > 500);
    });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
}

/* ------------------------------------------------------------------ */
/* Init                                                                  */
/* ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    new ContactForm();

    initScrollReveal();
    initCursorGlow();
    initChatSequence();
    initFaqAccordion();
    initMapSkeleton();
    initCtaParticles();
    initBackToTop();

    document.querySelectorAll(".ripple-target").forEach(attachRipple);
    document.querySelectorAll(".magnetic").forEach((el) => attachMagnetic(el, 10));
    document.querySelectorAll(".tilt-card").forEach((el) => attachTilt(el, 4));

    // Smooth-scroll for the in-page CTA link to the form
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (e) => {
            const targetId = link.getAttribute("href").slice(1);
            const target = document.getElementById(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
            }
        });
    });
});