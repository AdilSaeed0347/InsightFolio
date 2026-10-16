/**
 * feedback.js
 * ---------------------------------------------------------------------------
 * Self-contained floating feedback widget. Frontend-only.
 *
 * - Skips itself entirely on the home page (see isHomePage() below).
 * - Skips itself entirely, on every page, once the visitor has ever
 *   submitted feedback — persisted in localStorage so it survives refreshes
 *   and follows the visitor across every page (about/contact/projects/...).
 * - Injects its own stylesheet <link> (../styles/feedback.css) so no existing
 *   page templates need to reference a new CSS file.
 * - Builds its own markup via DOM APIs (see components/feedback.html for the
 *   documented structure) so it works identically on every static page.
 * - No fetch(), no API calls, no routes. submitFeedback() just logs the
 *   collected object to the console — replace its body later to call your
 *   backend once it's ready.
 *
 * Safe to include on every page. Does nothing to existing DOM/CSS/JS.
 * ---------------------------------------------------------------------------
 */
(function () {
  "use strict";

  // Guard against double-init (e.g. if script gets included twice)
  if (window.__feedbackWidgetInitialized) return;
  window.__feedbackWidgetInitialized = true;

  /**
   * Returns true when the current page is the home page. Checked against
   * both the root path ("/") and a literal "home.html" filename, since the
   * site is served under Vercel (clean "/") but also opened directly as a
   * static file during local testing (".../pages/home.html").
   */
  function isHomePage() {
    var path = window.location.pathname;
    return (
      path === "/" ||
      path === "" ||
      path.endsWith("/home") ||
      path.endsWith("/home.html") ||
      path.endsWith("home.html")
    );
  }

  var CSS_HREF = "../styles/feedback.css";
  var MAX_CHARS = 300;

  // localStorage (NOT sessionStorage) so this survives refreshes, new tabs,
  // and future visits — once true, the widget never builds itself again on
  // any page for this browser.
  var SUBMITTED_KEY = "fw_submitted";

  function hasSubmittedFeedback() {
    try {
      return localStorage.getItem(SUBMITTED_KEY) === "1";
    } catch (e) {
      // localStorage blocked (e.g. private mode / disabled) — fail open,
      // widget behaves as if nothing was ever submitted.
      return false;
    }
  }

  function markFeedbackSubmitted() {
    try {
      localStorage.setItem(SUBMITTED_KEY, "1");
    } catch (e) {
      /* ignore — worst case the widget may reappear on a future visit */
    }
  }

  var state = {
    rating: 0,
    open: false,
  };

  var els = {};

  function injectStylesheet() {
    if (document.getElementById("fw-stylesheet")) return;
    var link = document.createElement("link");
    link.id = "fw-stylesheet";
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "text") {
          node.textContent = attrs[key];
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    (children || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  function buildStars() {
    var wrap = el("div", {
      id: "fw-stars",
      class: "fw-stars",
      role: "radiogroup",
      "aria-label": "Rate 1 to 5 stars",
    });

    for (var i = 1; i <= 5; i++) {
      var star = el("button", {
        type: "button",
        class: "fw-star",
        "data-value": String(i),
        role: "radio",
        "aria-checked": "false",
        "aria-label": i + " star" + (i > 1 ? "s" : ""),
        text: "★",
      });
      star.addEventListener("click", function (e) {
        setRating(Number(e.currentTarget.getAttribute("data-value")));
      });
      star.addEventListener("mouseenter", function (e) {
        paintStars(Number(e.currentTarget.getAttribute("data-value")), true);
      });
      star.addEventListener("mouseleave", function () {
        paintStars(state.rating, false);
      });
      wrap.appendChild(star);
    }
    return wrap;
  }

  function paintStars(value, hovered) {
    var stars = els.stars.querySelectorAll(".fw-star");
    stars.forEach(function (star) {
      var v = Number(star.getAttribute("data-value"));
      star.classList.toggle("fw-active", v <= value);
      star.classList.toggle("fw-hovered", hovered && v <= value);
      star.setAttribute("aria-checked", v === state.rating ? "true" : "false");
    });
  }

  function setRating(value) {
    state.rating = value;
    paintStars(value, false);
    if (value > 0) {
      hideError(els.ratingError);
    }
  }

  function buildWidget() {
    // Toggle button
    els.toggle = el(
      "button",
      {
        id: "fw-toggle",
        class: "fw-toggle",
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": "false",
        "aria-controls": "fw-modal",
      },
      [
        el("span", { class: "fw-toggle-icon", "aria-hidden": "true", text: "💬" }),
        el("span", { class: "fw-toggle-label", text: "Share Feedback" }),
      ]
    );

    // Overlay
    els.overlay = el("div", { id: "fw-overlay", class: "fw-overlay", hidden: "hidden" });

    // Close button
    els.closeBtn = el("button", {
      id: "fw-close",
      class: "fw-close",
      type: "button",
      "aria-label": "Close feedback form",
      text: "✕",
    });

    // Stars field
    els.stars = buildStars();
    els.ratingError = el("p", { id: "fw-rating-error", class: "fw-error", hidden: "hidden", text: "Please select a rating." });

    var ratingField = el("div", { class: "fw-field" }, [
      el("label", { class: "fw-label", text: "Rating" }),
      els.stars,
      els.ratingError,
    ]);

    // Name field
    els.name = el("input", {
      id: "fw-name",
      class: "fw-input",
      type: "text",
      placeholder: "Your name",
      maxlength: "80",
    });

    var nameField = el("div", { class: "fw-field" }, [
      el("label", { for: "fw-name", class: "fw-label" }, [
        document.createTextNode("Name "),
        el("span", { class: "fw-optional", text: "(optional)" }),
      ]),
      els.name,
    ]);

    // Message field
    els.message = el("textarea", {
      id: "fw-message",
      class: "fw-textarea",
      placeholder: "Share your thoughts...",
      maxlength: String(MAX_CHARS),
      rows: "4",
    });
    els.counter = el("span", { id: "fw-counter", class: "fw-counter", text: "0/" + MAX_CHARS });
    els.messageError = el("p", { id: "fw-message-error", class: "fw-error", hidden: "hidden", text: "Please enter your feedback." });

    var messageField = el("div", { class: "fw-field" }, [
      el("label", { for: "fw-message", class: "fw-label", text: "Feedback" }),
      els.message,
      el("div", { class: "fw-meta-row" }, [els.messageError, els.counter]),
    ]);

    // Spam-trap field, hidden off-screen (not display:none, which bots detect)
    els.honeypot = el("input", {
      type: "text",
      name: "website",
      tabindex: "-1",
      autocomplete: "off",
      "aria-hidden": "true",
      style: "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;",
    });

    // Inline error shown when sending fails
    els.submitError = el("p", { id: "fw-submit-error", class: "fw-error", hidden: "hidden", text: "" });

    // Submit
    els.submit = el("button", { id: "fw-submit", class: "fw-submit", type: "button", text: "Submit Feedback" });

    els.formView = el("div", { id: "fw-form-view", class: "fw-view" }, [
      el("h2", { id: "fw-title", class: "fw-title", text: "Share your feedback" }),
      el("p", { class: "fw-subtitle", text: "We'd love to hear your thoughts." }),
      ratingField,
      nameField,
      messageField,
      els.honeypot,
      els.submit,
      els.submitError,
    ]);

    // Success view
    els.successView = el(
      "div",
      { id: "fw-success-view", class: "fw-view fw-success-view", hidden: "hidden" },
      [
        el("div", { class: "fw-success-check", "aria-hidden": "true", text: "✓" }),
        el("p", { class: "fw-success-text", text: "Thank you for your feedback!" }),
      ]
    );

    els.modalInner = el("div", { class: "fw-modal-inner" }, [els.closeBtn, els.formView, els.successView]);

    els.modal = el(
      "div",
      {
        id: "fw-modal",
        class: "fw-modal",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "fw-title",
        hidden: "hidden",
      },
      [els.modalInner]
    );

    document.body.appendChild(els.toggle);
    document.body.appendChild(els.overlay);
    document.body.appendChild(els.modal);

    bindEvents();
  }

  function bindEvents() {
    els.toggle.addEventListener("click", openModal);
    els.closeBtn.addEventListener("click", closeModal);
    els.overlay.addEventListener("click", closeModal);

    els.message.addEventListener("input", function () {
      var len = els.message.value.length;
      els.counter.textContent = len + "/" + MAX_CHARS;
      if (len > 0) hideError(els.messageError);
    });

    els.submit.addEventListener("click", handleSubmit);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) closeModal();
    });
  }

  function showError(node) {
    node.hidden = false;
  }

  function hideError(node) {
    node.hidden = true;
  }

  function openModal() {
    // Opening the form is the "user focus switched toward it" moment — stop
    // any attention pulsing immediately since it's done its job.
    els.toggle.classList.remove("fw-attention");

    state.open = true;
    els.toggle.classList.add("fw-active-open");
    els.overlay.hidden = false;
    els.modal.hidden = false;
    // next frame so the transition actually runs
    requestAnimationFrame(function () {
      els.overlay.classList.add("fw-visible");
      els.modal.classList.add("fw-visible");
    });
    els.toggle.setAttribute("aria-expanded", "true");
    els.name.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    state.open = false;
    els.toggle.classList.remove("fw-active-open");
    els.overlay.classList.remove("fw-visible");
    els.modal.classList.remove("fw-visible");
    els.toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(function () {
      if (!state.open) {
        els.overlay.hidden = true;
        els.modal.hidden = true;
      }
    }, 280);
  }

  function resetForm() {
    setRating(0);
    els.name.value = "";
    els.message.value = "";
    els.counter.textContent = "0/" + MAX_CHARS;
    els.message.classList.remove("fw-invalid");
    hideError(els.ratingError);
    hideError(els.messageError);
    els.formView.hidden = false;
    els.successView.hidden = true;
  }

  function validate() {
    var valid = true;

    if (state.rating < 1) {
      showError(els.ratingError);
      valid = false;
    }

    var message = els.message.value.trim();
    if (message.length === 0) {
      showError(els.messageError);
      els.message.classList.add("fw-invalid");
      valid = false;
    } else {
      hideError(els.messageError);
      els.message.classList.remove("fw-invalid");
    }

    return valid;
  }
   //feedback function 
  async function submitFeedback() {
    var payload = {
      name: els.name.value.trim() || null,
      rating: state.rating,
      feedback: els.message.value.trim(),
    };

    // Hidden spam-trap field: real visitors never fill it, bots usually do.
    payload.website = els.honeypot ? els.honeypot.value : "";

    // Same-origin Vercel serverless function (frontend/api/feedback.js).
    var response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      var message = "Could not send your feedback. Please try again.";
      try {
        var data = await response.json();
        if (data && data.error) message = data.error;
      } catch (e) {
        /* non-JSON reply — keep the generic message */
      }
      throw new Error(message);
    }

    return payload;
  }
  /**
   * Permanently retires the widget from the current page: fades the toggle
   * out, then removes every element the widget created from the DOM. Runs
   * right after a successful submit, alongside the localStorage flag, so
   * the effect is immediate on this page load AND on every future one.
   */
  function retireWidget() {
    if (els.toggle) {
      els.toggle.classList.remove("fw-visible", "fw-floating", "fw-attention");
      els.toggle.style.pointerEvents = "none";
      els.toggle.style.opacity = "0";
    }
    setTimeout(function () {
      [els.toggle, els.overlay, els.modal].forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
    }, 500);
  }

  async function handleSubmit() {
    if (!validate()) return;

    els.submit.disabled = true;
    hideError(els.submitError);
    try {
      await submitFeedback();
      markFeedbackSubmitted();
      els.formView.hidden = true;
      els.successView.hidden = false;

      setTimeout(function () {
        closeModal();
        setTimeout(retireWidget, 300);
      }, 2000);
    } catch (err) {
      console.error("Feedback submit error:", err);
      els.submit.disabled = false;
      els.submitError.textContent = err && err.message ? err.message : "Could not send your feedback. Please try again.";
      showError(els.submitError);
    }
  }

  // Show the widget once the visitor has seen a few pages, or after a short
  // delay on a single page — whichever happens first. Keeps a first-time
  // visitor from being interrupted instantly, without waiting too long for
  // someone browsing quickly.
  var VISIT_KEY = "fw_visit_count"; // sessionStorage: resets each new session, that's fine — it only paces the reveal, not whether it shows at all
  var VISIT_THRESHOLD = 3; // reveal quickly once this is the 3rd page viewed this session
  var TIME_THRESHOLD_MS = 3000; // otherwise reveal after ~3s on a page
  var SLIDE_IN_DURATION_MS = 650; // must match the CSS transition duration below
  // Matches the CSS: fw-pulse-glow is 2.2s x 3 iterations = 6.6s total. Kept
  // in sync so the JS class removal lines up with the animation's own end
  // rather than cutting a glow cycle short.
  var ATTENTION_DURATION_MS = 6600;

  function revealWidget() {
    if (els.toggle.classList.contains("fw-visible")) return;
    // Step 1: slide + fade in from the side (CSS transition on transform/opacity).
    els.toggle.classList.add("fw-visible");
    // Step 2: once the slide-in finishes, hand "transform" over to the
    // floating + pulse animations. Sequencing this avoids the CSS rule where
    // an animation running on a property suppresses any transition on that
    // same property — starting them together would skip the slide entirely.
    setTimeout(function () {
      els.toggle.classList.add("fw-floating", "fw-attention");
      setTimeout(function () {
        els.toggle.classList.remove("fw-attention");
      }, ATTENTION_DURATION_MS);
    }, SLIDE_IN_DURATION_MS);
  }

  function scheduleReveal() {
    var visits = VISIT_THRESHOLD; // safe fallback if storage is unavailable
    try {
      visits = parseInt(sessionStorage.getItem(VISIT_KEY) || "0", 10) + 1;
      sessionStorage.setItem(VISIT_KEY, String(visits));
    } catch (e) {
      /* sessionStorage blocked (e.g. private mode) — fall through to time-based reveal */
    }

    if (visits >= VISIT_THRESHOLD) {
      setTimeout(revealWidget, 500);
    } else {
      setTimeout(revealWidget, TIME_THRESHOLD_MS);
    }
  }

  /**
   * Avoids overlapping the existing chatbot button. Measures the real
   * chatbot toggle (#chatbot-button) at runtime rather than hardcoding a
   * guessed pixel offset, so it keeps working even if the chatbot's size
   * or position changes later.
   */
  function positionAboveChatbot() {
    var chatbotBtn = document.getElementById("chatbot-button");
    if (!chatbotBtn) return;

    var gap = 20;
    // Measure the chatbot button's real on-screen position instead of
    // trusting its CSS "bottom" value — this stays correct no matter how
    // the chatbot is actually positioned (fixed, absolute, inside a flex
    // container, etc.), which is what was causing the overlap.
    var rect = chatbotBtn.getBoundingClientRect();
    var distanceFromViewportBottom = window.innerHeight - rect.top;
    var offset = distanceFromViewportBottom + gap;

    els.toggle.style.setProperty("--fw-bottom-offset", offset + "px");
    els.toggle.style.bottom = offset + "px";
  }

  function init() {
    // Skip the widget entirely on the home page — nothing is built, no
    // stylesheet is injected, no listeners are attached.
    if (isHomePage()) return;

    // Skip the widget entirely, on every page, once this visitor has ever
    // submitted feedback. Checked before anything else is built/injected.
    if (hasSubmittedFeedback()) return;

    injectStylesheet();
    buildWidget();
    positionAboveChatbot();
    // Late-loading fonts/images can shift the chatbot button's position
    // after the initial layout — recheck a couple of times early on.
    setTimeout(positionAboveChatbot, 300);
    setTimeout(positionAboveChatbot, 1200);
    window.addEventListener("resize", positionAboveChatbot);
    // Chat window opening can change the chatbot button's own layout on
    // some mobile styles — recheck shortly after any click on it too.
    var chatbotBtn = document.getElementById("chatbot-button");
    if (chatbotBtn) {
      chatbotBtn.addEventListener("click", function () {
        setTimeout(positionAboveChatbot, 50);
      });
    }
    scheduleReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();