/* ========== LUMINA PHOTOGRAPHY: INTERACTIVE GALLERY SCRIPT =========
   This module handles all client-side interactivity:
   - Gallery filtering (category-based display)
   - Entrance animations (intersection observer)
   - 3D tilt hover effects on gallery cards
   - Lightbox modal for focused image viewing with keyboard/touch support
   - Contact form validation and submission
   
   Uses IIFE pattern for encapsulation and to avoid global scope pollution.
   ====================================================================== */

(() => {
  /* Shorthand query functions for cleaner DOM access */
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ========== SCROLL INTERACTIVITY ========== 
     Makes the page feel alive as user scrolls
     - Parallax effect on hero image
     - Dynamic header styling based on scroll position
     - Section fade effects during scroll
  */
  
  const preloader = q('#preloader');
  const header = q('.site-header');
  const heroImage = q('.hero-image');
  const heroInner = q('.hero-inner');
  
  /* Hide preloader after page load */
  window.addEventListener('load', () => {
    if (preloader) {
      setTimeout(() => {
        preloader.classList.add('hide');
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 600);
      }, 4000); // Keep the animation visible for 4 seconds on load
    }
  });
  
  /* Smooth parallax using requestAnimationFrame for 60fps performance */
  let ticking = false;
  let scrollY = 0;
  
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
  
  function updateParallax() {
    /* Hero image parallax: move slower than scroll for depth effect */
    if (heroImage) {
      heroImage.style.transform = `translateY(${scrollY * 0.5}px)`;
    }
    
    /* Hero inner container: slight scale and fade as you scroll past */
    if (heroInner && scrollY < 400) {
      const opacity = Math.max(0.8, 1 - (scrollY / 1000));
      heroInner.style.opacity = opacity;
      heroInner.style.transform = `translateY(${scrollY * 0.1}px)`;
    }
    
    /* Gallery figure parallax: subtle movement as images scroll into view */
    qa('.grid figure').forEach(fig => {
      const rect = fig.getBoundingClientRect();
      const figureCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = figureCenter - viewportCenter;
      const parallaxAmount = Math.max(-18, Math.min(18, distance * 0.06));
      fig.style.transform = `translateY(${parallaxAmount}px)`;
    });
    
    /* Header: add subtle shadow and background as user scrolls */
    if (scrollY > 50) {
      header.style.boxShadow = `0 2px 12px rgba(0,0,0,0.2)`;
      header.style.background = 'rgba(31,30,27,0.95)';
      header.style.backdropFilter = 'blur(4px)';
    } else {
      header.style.boxShadow = 'none';
      header.style.background = 'transparent';
      header.style.backdropFilter = 'none';
    }
    
    ticking = false;
  }

  /* ========== GALLERY FILTERING ========== 
     Allows users to filter gallery by category (weddings, portraits, couples, graduation)
     Maintains active button state and hides/shows figures accordingly.
  */
  const filters = qa('.filter');
  const allFigures = () => qa('.grid figure');

  /* Updates visible figures based on selected filter category */
  function setFilter(key) {
    filters.forEach(btn => {
      const active = btn.dataset.filter === key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const figures = allFigures();
    if (key === 'all') {
      figures.forEach((f, i) => {
        f.style.display = i < 8 ? '' : 'none';
      });
    } else {
      figures.forEach(f => {
        const cat = f.dataset.category || 'all';
        f.style.display = (cat === key) ? '' : 'none';
      });
    }
  }

  /* Attach click handlers to all filter buttons */
  filters.forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
  setFilter('all');  /* Initialize with all images visible */

  /* ========== ENTRANCE REVEAL ANIMATION ========== 
     Uses IntersectionObserver to fade in gallery cards as they enter viewport.
     Creates smooth, staggered entrance for better visual appeal.
  */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');  /* Trigger CSS transition */
        io.unobserve(e.target);  /* Stop observing once revealed */
      }
    });
  }, { threshold: 0.12 });  /* Trigger when 12% of element is visible */

  qa('.reveal').forEach(el => io.observe(el));

  /* ========== 3D TILT HOVER EFFECT ========== 
     Responds to mouse position to create subtle 3D rotation effect.
     Enhances interactivity and visual interest on hover.
  */
  function attachTilt() {
    qa('.grid figure').forEach(fig => {
      fig.addEventListener('mousemove', (ev) => {
        const rect = fig.getBoundingClientRect();
        /* Calculate mouse position relative to element center (0.5 = center, 0 = left/top, 1 = right/bottom) */
        const x = (ev.clientX - rect.left) / rect.width - 0.5;
        const y = (ev.clientY - rect.top) / rect.height - 0.5;
        
        /* Apply 3D rotation based on mouse position, scaled for subtle effect */
        fig.style.transform = `translateY(-6px) rotateX(${(-y * 2).toFixed(2)}deg) rotateY(${(x * 2).toFixed(2)}deg)`;
      });
      
      /* Reset transform on mouse leave */
      fig.addEventListener('mouseleave', () => {
        fig.style.transform = '';
      });
    });
  }
  attachTilt();

  /* ========== LIGHTBOX MODAL ========== 
     Core feature: Full-screen image viewer with darkened background
     Provides distraction-free photo viewing experience.
     Supports keyboard (arrow keys, escape) and touch (swipe) navigation.
  */
  const lightbox = q('#lightbox');
  const lbImage = q('.lb-image', lightbox);
  const lbCaption = q('.lb-caption', lightbox);
  const btnClose = q('.lb-close', lightbox);
  const btnPrev = q('.lb-prev', lightbox);
  const btnNext = q('.lb-next', lightbox);

  /* Get list of currently visible figures (respects active filter) */
  function visibleList() {
    return allFigures().filter(f => f.style.display !== 'none');
  }

  let current = 0;  /* Track current image index in visible list */

  /* Open lightbox and load image at given index */
  function openLightbox(idx) {
    const list = visibleList();
    const fig = list[idx];
    if (!fig) return;
    
    /* Extract image data from figure element */
    const img = q('img', fig);
    lbImage.src = img.src;
    lbImage.alt = img.alt || '';
    lbCaption.textContent = q('figcaption', fig)?.textContent || '';
    current = idx;
    
    /* Show modal and prevent background scroll */
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  /* Close lightbox and restore scrolling */
  function closeLightbox() {
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImage.src = '';
    lbCaption.textContent = '';
  }

  /* Navigate to previous image with wraparound */
  function prev() {
    const list = visibleList();
    current = (current - 1 + list.length) % list.length;
    openLightbox(current);
  }

  /* Navigate to next image with wraparound */
  function next() {
    const list = visibleList();
    current = (current + 1) % list.length;
    openLightbox(current);
  }

  /* Attach click/keyboard handlers to gallery figures for opening lightbox */
  function attachOpenHandlers() {
    visibleList().forEach((fig, i) => {
      fig.tabIndex = 0;
      fig.onclick = () => openLightbox(i);
      fig.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { 
          e.preventDefault(); 
          openLightbox(i); 
        }
      };
      
      /* Allow overlay click to open lightbox */
      const overlay = q('.overlay', fig);
      if (overlay) overlay.onclick = () => openLightbox(i);
    });
  }
  attachOpenHandlers();

  /* Toggle gallery visibility when hero 'View Portfolio' is clicked
     - The gallery starts hidden (class "hidden" on the section)
     - Clicking toggles visibility and updates aria-hidden for accessibility
     - Re-attach handlers when the gallery becomes visible
  */
  (function(){
    const viewBtn = q('.hero .btn[href="#gallery"]');
    const gallery = q('#gallery');
    if (!viewBtn || !gallery) return;
    viewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = gallery.classList.toggle('hidden');
      gallery.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
      viewBtn.classList.toggle('active', !isHidden);
      if (!isHidden) {
        /* when revealing, re-attach handlers so figures are interactive */
        setTimeout(() => {
          attachOpenHandlers();
          attachTilt();
        }, 120);
      }
    });
  })();

  /* Add a one-time pop-on-load animation to the hero View Portfolio button */
  window.addEventListener('load', () => {
    const v = q('#viewPortfolioBtn');
    if (!v) return;
    /* small delay so the page feels settled before the pop */
    setTimeout(() => v.classList.add('pop-on-load'), 260);
  });

  /* ========== LIGHTBOX CONTROL HANDLERS ========== */
  btnClose?.addEventListener('click', closeLightbox);
  btnPrev?.addEventListener('click', prev);
  btnNext?.addEventListener('click', next);
  
  /* Close lightbox when clicking on background (but not on image) */
  lightbox?.addEventListener('click', e => { 
    if (e.target === lightbox) closeLightbox(); 
  });

  /* ========== KEYBOARD NAVIGATION ========== 
     Enhance accessibility: Escape to close, arrows to navigate
  */
  window.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  /* ========== TOUCH/SWIPE NAVIGATION ========== 
     Mobile-friendly: Swipe left/right to navigate gallery
     Useful for touch devices where arrow buttons may not be visible
  */
  (function swipe() {
    let startX = 0;
    lightbox?.addEventListener('touchstart', (e) => startX = e.touches[0].clientX);
    lightbox?.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) (dx > 0 ? prev() : next());  /* Swipe threshold: 50px */
    });
  })();

  /* ========== RE-ATTACH HANDLERS ON FILTER CHANGE ========== 
     When filter changes, DOM updates with new visible figures.
     Must re-attach handlers to new elements and reset tilt effect.
  */
  filters.forEach(btn => 
    btn.addEventListener('click', () => 
      setTimeout(() => { 
        attachOpenHandlers();  /* Re-attach figure click handlers */
        attachTilt();  /* Re-attach hover tilt effect */
      }, 150)  /* Delay allows CSS transitions to complete */
    )
  );

  /* ========== CONTACT MODAL ========== 
     Modal dialog for contact form with backdrop blur
     Opens when contact button is clicked, closes with X or escape key
  */
  const contactModal = q('#contactModal');
  const contactTrigger = q('#contactTrigger');
  const contactClose = q('.contact-close', contactModal);

  /* Open contact modal */
  function openContactModal() {
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    /* Focus close button for accessibility */
    setTimeout(() => contactClose?.focus(), 100);
  }

  /* Close contact modal */
  function closeContactModal() {
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    contactTrigger?.focus();  /* Return focus to trigger button */
  }

  /* Open modal when contact button or any "Book a consult" anchor is clicked */
  const contactTriggers = qa('#contactTrigger, a[href="#contactModal"]');
  contactTriggers.forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    openContactModal();
  }));

  /* Close modal when close button is clicked */
  contactClose?.addEventListener('click', closeContactModal);

  /* Close modal when clicking on overlay (backdrop) */
  contactModal?.addEventListener('click', (e) => {
    if (e.target === contactModal) closeContactModal();
  });

  /* Close modal with Escape key */
  window.addEventListener('keydown', (e) => {
    if (contactModal && contactModal.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeContactModal();
    }
  });

  /* ========== CONTACT FORM ========== 
     Client-side validation with accessible error messaging.
     Form lives in modal, visible when modal opens.
  */
  const form = q('#contactForm');
  const status = q('#formStatus');

  /* Helper: Set error message on form field and update aria-invalid state */
  function setError(el, msg) {
    const err = el.parentElement?.querySelector('.error');
    if (err) {
      err.textContent = msg || '';
      if (msg) err.style.animation = 'none';
      setTimeout(() => err.style.animation = '', 10);  /* Retrigger animation */
    }
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  /* Add interactive focus styling to form fields */
  const formInputs = qa('input, select, textarea', form);
  formInputs.forEach(input => {
    /* Focus event: enhance label styling */
    input.addEventListener('focus', () => {
      const label = input.closest('label');
      if (label) {
        const span = q('span', label);
        if (span) span.style.color = 'var(--accent)';
      }
    });

    /* Blur event: reset label styling if field is empty */
    input.addEventListener('blur', () => {
      const label = input.closest('label');
      if (label) {
        const span = q('span', label);
        if (span && !input.value.trim()) {
          span.style.color = 'var(--ink)';
        }
      }
    });

    /* Real-time validation feedback on input */
    input.addEventListener('input', () => {
      /* Clear error as user types */
      const err = input.parentElement?.querySelector('.error');
      if (err && err.textContent) {
        err.textContent = '';
        input.setAttribute('aria-invalid', 'false');
      }
    });
  });

  /* Validate all required form fields with regex for email */
  function validate() {
    let ok = true;
    const name = q('input[name="name"]', form);
    const email = q('input[name="email"]', form);
    const type = q('select[name="type"]', form);
    const message = q('textarea[name="message"]', form);

    /* Validate name (required, non-empty) */
    if (!name.value.trim()) { 
      setError(name, 'Please tell me your name'); 
      ok = false; 
    } else setError(name, '');
    
    /* Validate email (required + valid format via regex) */
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim() || !emailRx.test(email.value)) { 
      setError(email, 'Please enter a valid email'); 
      ok = false; 
    } else setError(email, '');
    
    /* Validate session type (required dropdown) */
    if (!type.value) { 
      setError(type, 'Please choose a session type'); 
      ok = false; 
    } else setError(type, '');
    
    /* Validate message (required, non-empty) */
    if (!message.value.trim()) { 
      setError(message, 'Tell me a bit about your session'); 
      ok = false; 
    } else setError(message, '');
    
    return ok;
  }

  /* Handle form submission: validate, show loading state, simulate backend response */
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    
    if (!validate()) return;  /* Exit early if validation fails */
    
    /* Show loading state with friendly feedback */
    const btn = q('button[type="submit"]', form);
    btn.disabled = true;
    btn.textContent = 'Sending your message…';

    /* Gather field elements and values */
    const nameEl = q('input[name="name"]', form);
    const emailEl = q('input[name="email"]', form);
    const typeEl = q('select[name="type"]', form);
    const messageEl = q('textarea[name="message"]', form);

    const payload = {
      name: nameEl?.value || '',
      email: emailEl?.value || '',
      type: typeEl?.value || '',
      message: messageEl?.value || ''
    };

    /* Send via EmailJS (client-side). Set your Service ID and Template ID below. */
    (function(){
      const SERVICE_ID = 'service_m6ruawa';
      const TEMPLATE_ID = 'template_0aduxfu';
      const USER_ID = 'sUq0oJJL6WlGZI0j2';

      const templateParams = {
        /* canonical names */
        from_name: payload.name,
        from_email: payload.email,
        session_type: payload.type,
        message: payload.message,
        /* common aliases to ensure template receives data regardless of variable naming */
        name: payload.name,
        email: payload.email,
        session: payload.type,
        user_name: payload.name,
        user_email: payload.email,
        user_session: payload.type,
        user_message: payload.message,
        message_body: payload.message,
        /* reply-to variants */
        reply_to: payload.email,
        reply_to_email: payload.email,
        contact_email: payload.email
      };

      console.log('EmailJS templateParams:', templateParams);

      /* Try SDK first (may be unsupported); otherwise fall back to direct REST call */
      if (window.emailjs && typeof emailjs.send === 'function') {
        emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
          .then(() => {
            btn.disabled = false;
            btn.textContent = 'Send message';
            form.reset();
            formInputs.forEach(input => {
              const label = input.closest('label');
              if (label) {
                const span = q('span', label);
                if (span) span.style.color = 'var(--ink)';
              }
            });
            status.textContent = 'Thanks — I\'ll get back to you within 48 hours.';
            setTimeout(() => { closeContactModal(); setTimeout(() => { status.textContent = ''; }, 300); }, 2000);
          })
          .catch(err => {
            btn.disabled = false;
            btn.textContent = 'Send message';
            console.error('EmailJS SDK error full:', err);
            const msg = err?.text || err?.message || err?.statusText || JSON.stringify(err) || 'something went wrong';
            status.textContent = `⚠️ Sorry — ${msg}`;
            setTimeout(() => { status.textContent = ''; }, 8000);
          });
      } else {
        /* Fallback: send directly to EmailJS REST API using public user ID */
        fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: SERVICE_ID,
            template_id: TEMPLATE_ID,
            user_id: USER_ID,
            template_params: templateParams
          })
        })
        .then(async res => {
          const body = await res.text().catch(() => '');
          if (!res.ok) {
            console.error('EmailJS REST error response:', res.status, body);
            btn.disabled = false;
            btn.textContent = 'Send message';
            status.textContent = '⚠️ Sorry — ' + (body || 'Unable to send message') + ' (' + res.status + ')';
            setTimeout(() => { status.textContent = ''; }, 8000);
            return;
          }
          btn.disabled = false;
          btn.textContent = 'Send message';
          form.reset();
          formInputs.forEach(input => {
            const label = input.closest('label');
            if (label) {
              const span = q('span', label);
              if (span) span.style.color = 'var(--ink)';
            }
          });
          status.textContent = '✓ Thanks! I\'ll be in touch within 48 hours.';
          setTimeout(() => { closeContactModal(); setTimeout(() => { status.textContent = ''; }, 300); }, 2000);
        })
        .catch(err => {
          console.error('EmailJS REST fetch error:', err);
          btn.disabled = false;
          btn.textContent = 'Send message';
          status.textContent = '⚠️ Sorry — network error. Please try again.';
          setTimeout(() => { status.textContent = ''; }, 8000);
        });
      }
    })();
  });

})();