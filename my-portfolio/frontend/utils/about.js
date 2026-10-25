// frontend/utils/about.js - Fixed Version
console.log("=== about.js loading ===");

document.addEventListener("DOMContentLoaded", () => {
    console.log("=== DOM Content Loaded ===");
    
    const hireBtn = document.querySelector(".hire-btn");
    const hireOptions = document.querySelector(".hire-options");
    
    if (!hireBtn || !hireOptions) {
        console.error("❌ Hire button or options not found!");
        return;
    }
    
    console.log("✅ Both elements found successfully!");

    // Toggle dropdown on Hire Me button click
    hireBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation(); // prevent closing on this click
        hireOptions.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function(e) {
        if (
            hireOptions.classList.contains("show") && 
            !hireBtn.contains(e.target) && 
            !hireOptions.contains(e.target)
        ) {
            hireOptions.classList.remove("show");
            console.log("⬅️ Closed dropdown (clicked outside)");
        }
    });

    // Optional: close when clicking inside dropdown option
    hireOptions.addEventListener("click", function(e) {
        if (e.target.tagName === "A" || e.target.tagName === "BUTTON") {
            hireOptions.classList.remove("show");
            console.log("✅ Closed dropdown after selecting option");
        }
    });

    console.log("✅ Event listeners added successfully!");

    // ---------------------------------------------------------------
    // Scroll-reveal for the new About page sections (Highlights,
    // Workflow, Principles, Toolkit, Mission, Ecosystem, Philosophy).
    // Uses IntersectionObserver so each section animates in once,
    // respects prefers-reduced-motion, and never blocks first paint.
    // ---------------------------------------------------------------
    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const revealEls = document.querySelectorAll(".reveal");

    if (revealEls.length) {
        if (prefersReducedMotion || !("IntersectionObserver" in window)) {
            revealEls.forEach((el) => el.classList.add("in-view"));
        } else {
            const revealObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;

                        const el = entry.target;
                        const group = el.closest(".reveal-group");

                        if (group) {
                            // Stagger cards within the same group (50-100ms apart)
                            const siblings = Array.from(
                                group.querySelectorAll(".reveal")
                            );
                            const index = siblings.indexOf(el);
                            el.style.transitionDelay = `${Math.min(index, 8) * 70}ms`;
                        }

                        el.classList.add("in-view");
                        observer.unobserve(el);
                    });
                },
                { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
            );

            revealEls.forEach((el) => revealObserver.observe(el));
        }
    }

    // ---------------------------------------------------------------
    // Development Workflow timeline: grows the connecting line, fades
    // each step in, then lights up the step dots one at a time in
    // sequence. Deliberately NOT done with a per-step
    // IntersectionObserver — on most screens all 7 steps are visible
    // at once, so a per-step observer fires every step simultaneously
    // instead of in sequence. A single timed sequence after the
    // section becomes visible gives the intended storytelling effect
    // reliably, regardless of viewport height.
    // ---------------------------------------------------------------
    const workflowSection = document.querySelector(".about-workflow");

    if (workflowSection) {
        const steps = workflowSection.querySelectorAll(".workflow-step");

        const activateStepsInSequence = () => {
            steps.forEach((step, index) => {
                setTimeout(() => {
                    step.classList.add("active");
                }, index * 130);
            });
        };

        if (prefersReducedMotion || !("IntersectionObserver" in window)) {
            workflowSection.classList.add("in-view");
            steps.forEach((step) => step.classList.add("active"));
        } else {
            const sectionObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        workflowSection.classList.add("in-view");
                        // Let the line-grow and fade-in transitions start first,
                        // then light up the dots one after another.
                        setTimeout(activateStepsInSequence, 300);
                        observer.unobserve(entry.target);
                    });
                },
                { threshold: 0.25 }
            );
            sectionObserver.observe(workflowSection);
        }
    }
});