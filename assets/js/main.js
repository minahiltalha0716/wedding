const ENCRYPTION_PASSWORD = localStorage.getItem('imagePassword') ? localStorage.getItem('imagePassword').trim() : null;

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
  const toUint8Array = (base64) => {
    // Remove any whitespace or newlines that might break atob
    const cleanBase64 = base64.replace(/\s/g, '');
    try {
        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        throw new Error(`Invalid base64 string: ${e.message}`);
    }
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
  localStorage.setItem('imagePassword', password.trim());
  window.location.reload();
}

async function loadEncryptedImage(imageMeta, elementId) {
  const img = document.getElementById(elementId);
  if (!img) return;

  if (!ENCRYPTION_PASSWORD) {
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ccc" width="300" height="300"/%3E%3Ctext x="50%" y="50" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666"%3EPassword required to view%3C/text%3E%3C/svg%3E';
    return;
  }

  try {
    const response = await fetch(`assets/encrypted-images/${imageMeta.enc}`);
    if (!response.ok) throw new Error(`Failed to fetch: ${imageMeta.enc}`);

    const encryptedBase64 = await response.text();
    const imageBytes = await decryptImage(encryptedBase64, ENCRYPTION_PASSWORD, imageMeta.salt, imageMeta.iv);
    const blob = new Blob([imageBytes], { type: imageMeta.type });
    const url = URL.createObjectURL(blob);
    img.src = url;

    img.onload = () => {
        img.closest('.story-item').classList.add('image-loaded');
    };
  } catch (err) {
    console.error('Decryption failed:', err);
    img.alt = 'Access Denied';

    // Check if it's likely a password error
    if (err.name === 'OperationError' || err.message.includes('decrypt')) {
        handleAuthError();
    }
  }
}

function handleAuthError() {
    localStorage.removeItem('imagePassword');
    const authError = document.getElementById('authError');
    if (authError) {
        authError.innerText = "Incorrect password. Please ensure it matches your invitation.";
        authError.style.display = 'block';
    }
    setupAuthModal(true);
}

function createStoryItem(imageMeta, index) {
  const item = document.createElement('div');
  item.className = 'story-item';

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

  authForm.onsubmit = function (e) {
    e.preventDefault();
    const password = passwordInput.value;
    if (!password) return;
    setImageAuth(password);
  };

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
    if (!manifestResponse.ok) return;

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
    console.error('Gallery failed to initialize:', err);
  }
}

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.story-item').forEach(item => observer.observe(item));
}

document.addEventListener('DOMContentLoaded', function () {
  setupAuthModal();
  initializeGallery();
});
