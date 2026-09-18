import Lenis from 'lenis';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {
  alpha: false,
  desynchronized: true,
});

const TOTAL_FRAMES = 120;
const images = [];

// Format frame filename: ezgif-frame-001.jpg ... ezgif-frame-120.jpg
const getFrameSrc = (index) => {
  const padded = String(index + 1).padStart(3, '0');
  return `/frames/ezgif-frame-${padded}.jpg`;
};

// Resize canvas taking into account device pixel ratio for maximum sharpness
function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Set internal resolution to physical screen pixels
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  // Set CSS display dimensions to viewport
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  // Apply maximum quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

// Draw image with aspect cover, integer pixel coordinates, and desktop portrait framing
function drawImageToCanvas(img) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const isWide = window.innerWidth >= 1024;

  // Enforce high quality bicubic resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Base scale (slightly boosted on wide screens to allow gentle right-shift matching reference image)
  const baseScale = Math.max(cw / iw, ch / ih);
  const scale = isWide ? baseScale * 1.08 : baseScale;

  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);

  // On desktop, gently bias position to the right half so subject complements left-aligned hero content
  let shiftX = 0;
  if (isWide) {
    shiftX = Math.round(Math.min(cw * 0.16, 260));
  }

  const dx = Math.round((cw - dw) / 2 + shiftX);
  const dy = Math.round((ch - dh) / 2);

  // Clear with pitch black and draw frame
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Render a specific frame index, falling back to nearest loaded frame if needed
function renderFrame(index) {
  const safeIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
  const img = images[safeIndex];

  if (img && img.complete && img.naturalWidth > 0) {
    drawImageToCanvas(img);
    return;
  }

  // Nearest frame fallback
  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = safeIndex - offset;
    if (prev >= 0 && images[prev]?.complete && images[prev]?.naturalWidth > 0) {
      drawImageToCanvas(images[prev]);
      return;
    }
    const next = safeIndex + offset;
    if (next < TOTAL_FRAMES && images[next]?.complete && images[next]?.naturalWidth > 0) {
      drawImageToCanvas(images[next]);
      return;
    }
  }
}

// Preload and asynchronously decode all frames
for (let i = 0; i < TOTAL_FRAMES; i++) {
  const img = new Image();
  img.src = getFrameSrc(i);

  if ('decode' in img) {
    img.decode().then(() => {
      if (i === 0 && lastRenderedIndex === -1) {
        resizeCanvas();
        renderFrame(0);
      }
    }).catch(() => {});
  }

  img.onload = () => {
    if (i === 0 && lastRenderedIndex === -1) {
      resizeCanvas();
      renderFrame(0);
    }
  };

  images.push(img);
}

// Initialize Lenis smooth scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.2,
  infinite: false,
});

let targetProgress = 0;
let currentProgress = 0;
let lastRenderedIndex = -1;

function getScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
}

lenis.on('scroll', (e) => {
  targetProgress = e.progress;
  updateActiveNav();
});

// Update progress on native scroll events
window.addEventListener(
  'scroll',
  () => {
    targetProgress = getScrollProgress();
    updateActiveNav();
  },
  { passive: true }
);

window.addEventListener('resize', () => {
  resizeCanvas();
  lastRenderedIndex = -1;
  renderFrame(Math.round(currentProgress * (TOTAL_FRAMES - 1)));
});

// Smooth anchor navigation
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      e.preventDefault();
      lenis.scrollTo(targetEl, { offset: -70, duration: 1.2 });
      closeMobileMenu();
    }
  });
});

// Active nav link highlight
const navLinks = document.querySelectorAll('.nav-link');
const trackedSections = [
  { id: 'home', el: document.getElementById('home') },
  { id: 'about', el: document.getElementById('about') },
  { id: 'education', el: document.getElementById('education') },
  { id: 'certifications', el: document.getElementById('certifications') },
  { id: 'projects', el: document.getElementById('projects') },
  { id: 'skills', el: document.getElementById('skills') },
  { id: 'contact', el: document.getElementById('contact') },
];

function updateActiveNav() {
  const scrollPos = window.scrollY + 140;
  const sorted = trackedSections
    .filter((s) => s.el)
    .sort((a, b) => b.el.offsetTop - a.el.offsetTop);

  for (const sec of sorted) {
    if (scrollPos >= sec.el.offsetTop) {
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${sec.id}`);
      });
      break;
    }
  }
}

// Toggle Projects "View All"
const toggleProjectsBtn = document.getElementById('toggleProjectsBtn');
const extraProject = document.getElementById('project-network-lab');
const viewAllText = document.getElementById('viewAllText');

if (toggleProjectsBtn && extraProject) {
  toggleProjectsBtn.addEventListener('click', () => {
    const isHidden = extraProject.classList.contains('project-hidden');

    if (isHidden) {
      extraProject.classList.remove('project-hidden');
      extraProject.classList.add('animate-in');
      toggleProjectsBtn.classList.add('expanded');
      toggleProjectsBtn.setAttribute('aria-expanded', 'true');
      if (viewAllText) viewAllText.textContent = 'Show Less';
    } else {
      extraProject.classList.add('project-hidden');
      extraProject.classList.remove('animate-in');
      toggleProjectsBtn.classList.remove('expanded');
      toggleProjectsBtn.setAttribute('aria-expanded', 'false');
      if (viewAllText) viewAllText.textContent = 'View All';
    }

    // Synchronize Lenis and scroll progress with newly expanded/collapsed height
    lenis.resize();
    targetProgress = getScrollProgress();
    updateActiveNav();
  });
}

// ==========================================================================
// MOBILE MENU TOGGLE LOGIC
// ==========================================================================
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');

function closeMobileMenu() {
  if (navToggle && mobileMenu) {
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
  }
}

if (navToggle && mobileMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.classList.contains('open');
    if (isOpen) {
      closeMobileMenu();
    } else {
      navToggle.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('open');
      mobileMenu.setAttribute('aria-hidden', 'false');
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });
}

// ==========================================================================
// SCROLL REVEAL INTERSECTION OBSERVER
// ==========================================================================
const revealElements = document.querySelectorAll('.reveal-on-scroll');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((el) => revealObserver.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add('is-visible'));
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `
    <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================================================
// MODAL SYSTEM HANDLERS
// ==========================================================================
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (typeof lenis !== 'undefined' && lenis) {
    lenis.stop();
  }
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (typeof lenis !== 'undefined' && lenis) {
    lenis.start();
  }
}

// Close modals on escape key or backdrop click
document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.classList.contains('modal-close-btn') || e.target.classList.contains('modalCloseBtn')) {
      closeModal(backdrop);
    }
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach((m) => closeModal(m));
  }
});

// ==========================================================================
// PROJECT CASE STUDY DATA & MODAL
// ==========================================================================
const projectData = {
  'container-sec-pipeline': {
    category: 'DevSecOps & Automation',
    title: 'Containerized Security Monitoring Pipeline with Auto-Remediation',
    github: 'https://github.com/khuddusshk06',
    content: `
      <p>Designed and deployed a containerized security monitoring pipeline utilizing Docker and Docker Compose, integrating Node.js, MongoDB, and Python for automated threat detection.</p>
      <h4 class="modal-sec-heading">Key Features & Engineering Highlights:</h4>
      <ul class="modal-list">
        <li><strong>Real-time Log Monitoring:</strong> Captured and analyzed authentication activity with Winston logging for anomaly detection.</li>
        <li><strong>Threshold-Based Detection:</strong> Identified brute-force attack patterns and generated structured security alerts for incident triage.</li>
        <li><strong>Python Auto-Remediation:</strong> Developed automated response scripts to process security alerts and trigger mitigation logic.</li>
        <li><strong>DevSecOps Practices:</strong> Full version control and lifecycle management via Git & GitHub.</li>
      </ul>
      <h4 class="modal-sec-heading">Tech Stack & Tools:</h4>
      <p>Docker, Docker Compose, Node.js, MongoDB, Python, Winston, Git, GitHub, Linux, JSON.</p>
    `,
  },
  'linux-perm-mgmt': {
    category: 'System Administration & Security',
    title: 'Linux-User-Permission-Management',
    github: 'https://github.com/khuddusshk06',
    content: `
      <p>Implemented Role-Based Access Control (RBAC) and Identity & Access Management (IAM) concepts in Kali Linux, governing user permissions and file system security.</p>
      <h4 class="modal-sec-heading">Key Capabilities & Auditing:</h4>
      <ul class="modal-list">
        <li><strong>Granular Privilege Control:</strong> Managed user permissions and file access using <code>chmod</code>, <code>chown</code>, and <code>chgrp</code>.</li>
        <li><strong>Security Auditing:</strong> Validated access controls across multiple user roles following least-privilege principles.</li>
        <li><strong>Version Control:</strong> Maintained comprehensive project documentation and repos on GitHub.</li>
      </ul>
      <h4 class="modal-sec-heading">Tech Stack & Tools:</h4>
      <p>Kali Linux, RBAC, IAM, chmod, chgrp, chown, Git, GitHub.</p>
    `,
  },
  'cloud-remediation': {
    category: 'Azure / Cloud Security',
    title: 'Automated Cloud Misconfiguration Detection & Remediation System',
    github: 'https://github.com/khuddusshk06',
    content: `
      <p>An automated cloud security assessment framework designed to scan Microsoft Azure infrastructure for security posture weaknesses, identity risks, and unencrypted resource storage.</p>
      <h4 class="modal-sec-heading">Key Features & Architecture:</h4>
      <ul class="modal-list">
        <li><strong>Real-time Azure Resource Graph Scanning:</strong> Scans storage accounts, NSGs, and Key Vaults for exposed endpoints.</li>
        <li><strong>Automated Remediation Workflows:</strong> Automatically applies security baselines (e.g. disabling public blob access, enforcing TLS 1.2+).</li>
        <li><strong>Custom Risk Scoring Engine:</strong> Ranks vulnerabilities based on CVSS severity and exposure impact.</li>
      </ul>
      <h4 class="modal-sec-heading">Tech Stack & Tools:</h4>
      <p>Python 3.11, Azure SDK for Python, Azure Resource Manager, REST APIs, JSON Policy Enforcement.</p>
    `,
  },
  'iam-analyzer': {
    category: 'Identity & Access Management',
    title: 'Cloud IAM Policy Analyzer',
    github: 'https://github.com/khuddusshk06',
    content: `
      <p>A static analysis and least-privilege auditing tool for Azure RBAC definitions and AWS IAM JSON policies to detect permission bloat and privilege escalation risks.</p>
      <h4 class="modal-sec-heading">Key Capabilities:</h4>
      <ul class="modal-list">
        <li><strong>Over-Privilege Detection:</strong> Flags wildcards (*) in Action definitions and excessive Owner/Contributor assignments.</li>
        <li><strong>Principle of Least Privilege Generator:</strong> Recommends minimal scoped custom role definitions based on actual telemetry logs.</li>
        <li><strong>Visual Dependency Graph:</strong> Maps principal role assignments across subscriptions.</li>
      </ul>
      <h4 class="modal-sec-heading">Tech Stack:</h4>
      <p>Python, JSON Schema Validation, Azure Graph API, Policy Parser CLI.</p>
    `,
  },
  'network-lab': {
    category: 'Network Forensics & Linux',
    title: 'Network Monitoring & Troubleshooting Lab',
    github: 'https://github.com/khuddusshk06/Network-Monitoring-Lab/tree/main',
    content: `
      <p>A hands-on Linux network security laboratory for capturing, analyzing, and troubleshooting live TCP/IP traffic, packet inspection, and service port auditing.</p>
      <h4 class="modal-sec-heading">Lab Components & Exercises:</h4>
      <ul class="modal-list">
        <li><strong>Packet Capture & Inspection:</strong> Filtering pcap files using <code>tcpdump</code> and <code>Wireshark</code> to identify unauthorized connections.</li>
        <li><strong>Socket & Port Monitoring:</strong> Auditing active listening daemons using <code>ss -tulnp</code> and <code>netstat</code>.</li>
        <li><strong>DNS & Route Tracing:</strong> Diagnosing resolution latency and hop-by-hop packet loss using <code>nslookup</code>, <code>dig</code>, and <code>traceroute</code>.</li>
      </ul>
      <h4 class="modal-sec-heading">Tech Stack & Tools:</h4>
      <p>Ubuntu Linux, Bash Scripting, tcpdump, Wireshark, nmap, netcat, iproute2.</p>
    `,
  },
};

const projectModal = document.getElementById('projectModal');
const modalProjectCategory = document.getElementById('modalProjectCategory');
const modalProjectTitle = document.getElementById('modalProjectTitle');
const modalProjectBody = document.getElementById('modalProjectBody');
const modalProjectGithub = document.getElementById('modalProjectGithub');

document.querySelectorAll('.btn-details-trigger').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-project');
    const data = projectData[key];
    if (data && projectModal) {
      if (modalProjectCategory) modalProjectCategory.textContent = data.category;
      if (modalProjectTitle) modalProjectTitle.textContent = data.title;
      if (modalProjectBody) modalProjectBody.innerHTML = data.content;
      if (modalProjectGithub) modalProjectGithub.href = data.github;
      openModal(projectModal);
    }
  });
});

// Close button inside project modal
const projectModalCloseBtn = document.getElementById('projectModalCloseBtn');
if (projectModalCloseBtn) {
  projectModalCloseBtn.addEventListener('click', () => closeModal(projectModal));
}

// ==========================================================================
// RESUME MODAL HANDLERS
// ==========================================================================
const downloadResumeBtn = document.getElementById('downloadResumeBtn');
const resumeModal = document.getElementById('resumeModal');
const resumeModalCloseBtn = document.getElementById('resumeModalCloseBtn');
const resumeCloseBtn = document.getElementById('resumeCloseBtn');

if (downloadResumeBtn && resumeModal) {
  downloadResumeBtn.addEventListener('click', () => openModal(resumeModal));
}
if (resumeModalCloseBtn) {
  resumeModalCloseBtn.addEventListener('click', () => closeModal(resumeModal));
}
if (resumeCloseBtn) {
  resumeCloseBtn.addEventListener('click', () => closeModal(resumeModal));
}

// ==========================================================================
// CONTACT MODAL & COPY EMAIL HANDLERS
// ==========================================================================
const copyEmailBtn = document.getElementById('copyEmailBtn');
if (copyEmailBtn) {
  copyEmailBtn.addEventListener('click', () => {
    const email = 'khuddusshaik06@gmail.com';
    navigator.clipboard.writeText(email).then(() => {
      showToast('Copied khuddusshaik06@gmail.com to clipboard!');
    }).catch(() => {
      showToast('Email: khuddusshaik06@gmail.com');
    });
  });
}

const openContactModalBtn = document.getElementById('openContactModalBtn');
const contactModal = document.getElementById('contactModal');
const contactModalCloseBtn = document.getElementById('contactModalCloseBtn');
const contactCancelBtn = document.getElementById('contactCancelBtn');
const contactForm = document.getElementById('contactForm');

if (openContactModalBtn && contactModal) {
  openContactModalBtn.addEventListener('click', () => openModal(contactModal));
}
if (contactModalCloseBtn) {
  contactModalCloseBtn.addEventListener('click', () => closeModal(contactModal));
}
if (contactCancelBtn) {
  contactCancelBtn.addEventListener('click', () => closeModal(contactModal));
}

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal(contactModal);
    contactForm.reset();
    showToast('Thank you! Your message has been sent successfully.');
  });
}

// ==========================================================================
// SKILLS TAB FILTERING LOGIC
// ==========================================================================
const skillTabBtns = document.querySelectorAll('.skill-tab-btn');
const skillTags = document.querySelectorAll('#skillsWrap .skill-tag');

skillTabBtns.forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => {
    const filter = tabBtn.getAttribute('data-filter');

    skillTabBtns.forEach((btn) => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    skillTags.forEach((tag) => {
      const category = tag.getAttribute('data-category');
      if (filter === 'all' || category === filter) {
        tag.classList.remove('hidden');
      } else {
        tag.classList.add('hidden');
      }
    });
  });
});

// Animation loop
function raf(time) {
  lenis.raf(time);

  // Smooth subframe lerp for buttery transitions
  const diff = targetProgress - currentProgress;
  if (Math.abs(diff) < 0.0001) {
    currentProgress = targetProgress;
  } else {
    currentProgress += diff * 0.15;
  }

  const targetIndex = Math.min(
    TOTAL_FRAMES - 1,
    Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
  );

  if (targetIndex !== lastRenderedIndex) {
    lastRenderedIndex = targetIndex;
    renderFrame(targetIndex);
  }

  requestAnimationFrame(raf);
}

// Initial setup
resizeCanvas();
targetProgress = getScrollProgress();
currentProgress = targetProgress;
renderFrame(0);
requestAnimationFrame(raf);
