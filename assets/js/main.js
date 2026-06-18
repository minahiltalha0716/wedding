const ENCRYPTION_PASSWORD = localStorage.getItem('imagePassword') || null;

const textEncoder = new TextEncoder();

async function deriveKey(password, salt) {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function decryptImage(encryptedBase64, password, saltBase64, ivBase64) {
  // Use a more robust way to handle base64 to uint8array
  const toUint8Array = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encryptedBytes = toUint8Array(encryptedBase64);
  const salt = toUint8Array(saltBase64);
  const iv = toUint8Array(ivBase64);

  const key = await deriveKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBytes
  );

  return new Uint8Array(decrypted);
}

function setImageAuth(password) {
  localStorage.setItem('imagePassword', password);
  window.location.reload();
}

/**
 * PRIVATE IMAGE LOADING LOGIC:
 * To maintain privacy while using a public static site, this project uses a build-time encryption strategy.
 * 1. Original images are kept in the 'images/' folder (which is .gitignored to prevent accidental public pushes).
 * 2. During the GitHub Actions deployment (deploy.yml), 'scripts/encrypt-images.js' is executed using a
 *    secret 'IMAGE_PASSWORD'.
 * 3. Encrypted versions of these images are generated in 'assets/encrypted-images/' along with a 'manifest.json'.
 * 4. Only the encrypted assets are deployed to the public repository.
 * 5. This script (main.js) performs client-side decryption using the user-provided password via Web Crypto API.
 */
async function loadEncryptedImage(imageMeta, elementId) {
  const img = document.getElementById(elementId);
  if (!img) return;

  if (!ENCRYPTION_PASSWORD) {
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ccc" width="300" height="300"/%3E%3Ctext x="50%" y="50" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666"%3EPassword required to view%3C/text%3E%3C/svg%3E';
    return;
  }

  try {
    const response = await fetch(`assets/encrypted-images/${imageMeta.enc}`);
    if (!response.ok) throw new Error('Failed to fetch encrypted image');

    const encryptedBase64 = await response.text();
    const imageBytes = await decryptImage(encryptedBase64.trim(), ENCRYPTION_PASSWORD, imageMeta.salt, imageMeta.iv);
    const blob = new Blob([imageBytes], { type: imageMeta.type });
    const url = URL.createObjectURL(blob);
    img.src = url;

    // Once image is loaded, trigger animation if using observer
    img.onload = () => {
        img.closest('.story-item').classList.add('image-loaded');
    };
  } catch (err) {
    console.error('Error loading encrypted image:', err);
    img.alt = 'Failed to decrypt image';
    // If decryption fails, it might be an incorrect password
    if (ENCRYPTION_PASSWORD) {
        localStorage.removeItem('imagePassword');
        const authError = document.getElementById('authError');
        if (authError) authError.style.display = 'block';
        setupAuthModal(true);
    }
  }
}

function createStoryItem(imageMeta, index) {
  const item = document.createElement('div');
  item.className = 'story-item';

  // Create a dummy story based on index
  const stories = [
    { date: 'June 2023', title: 'The First Chapter', text: 'Where it all began. A simple hello that changed everything.' },
    { date: 'October 2023', title: 'A Special Day', text: 'Capturing moments that we will cherish forever.' },
    { date: 'December 2023', title: 'The Promise', text: 'Looking forward to a lifetime of adventures together.' },
    { date: 'January 2024', title: 'New Beginnings', text: 'Starting the year with love and hope.' }
  ];

  const story = stories[index % stories.length];

  item.innerHTML = `
    <div class="story-dot"></div>
    <div class="story-content">
        <span class="story-date">${story.date}</span>
        <h3 class="story-title">${story.title}</h3>
        <p class="story-text">${story.text}</p>
    </div>
    <div class="story-image-wrap">
        <img id="photo-${index}" alt="${imageMeta.name}">
    </div>
  `;

  return item;
}

function setupAuthModal(forceShow = false) {
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const passwordInput = document.getElementById('password');
  const gallery = document.getElementById('photoGallery');

  if (!authForm || !authModal) return;

  authForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const password = passwordInput.value;
    if (!password) {
      alert('Please enter a password');
      return;
    }
    setImageAuth(password);
  });

  if (!ENCRYPTION_PASSWORD || forceShow) {
    authModal.style.display = 'flex';
    if (gallery) gallery.style.display = 'none';
  } else {
    authModal.style.display = 'none';
    if (gallery) gallery.style.display = 'block';
  }
}

async function initializeGallery() {
  if (!ENCRYPTION_PASSWORD) return;

  try {
    const manifestResponse = await fetch('assets/encrypted-images/manifest.json');
    if (!manifestResponse.ok) throw new Error('Manifest not found');

    const manifest = await manifestResponse.json();
    const gallery = document.getElementById('photoGallery');
    if (!gallery) return;

    manifest.images.forEach((imageMeta, index) => {
      const item = createStoryItem(imageMeta, index);
      gallery.appendChild(item);
      loadEncryptedImage(imageMeta, `photo-${index}`);
    });

    setupScrollAnimations();
  } catch (err) {
    console.error('Gallery initialization failed:', err);
  }
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.story-item').forEach(item => {
        observer.observe(item);
    });
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setupSmoothScroll();
  setupAuthModal();
  initializeGallery();
});
