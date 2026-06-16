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
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

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

async function loadEncryptedImage(imageMeta, elementId) {
  const img = document.getElementById(elementId);
  if (!img) return;

  if (!ENCRYPTION_PASSWORD) {
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ccc" width="300" height="300"/%3E%3Ctext x="50%" y="50" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666"%3EPassword required to view%3C/text%3E%3C/svg%3E';
    return;
  }

  try {
    const response = await fetch(imageMeta.enc);
    if (!response.ok) throw new Error('Failed to fetch encrypted image');

    const encryptedBase64 = await response.text();
    const imageBytes = await decryptImage(encryptedBase64, ENCRYPTION_PASSWORD, imageMeta.salt, imageMeta.iv);
    const blob = new Blob([imageBytes], { type: imageMeta.type });
    const url = URL.createObjectURL(blob);
    img.src = url;
  } catch (err) {
    console.error('Error loading encrypted image:', err);
    img.alt = 'Failed to decrypt image';
  }
}

function createGalleryItem(imageMeta, index) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  const img = document.createElement('img');
  img.id = `photo-${index}`;
  img.alt = imageMeta.name;
  item.appendChild(img);
  return item;
}

function setupAuthModal() {
  const authModal = document.getElementById('authModal');
  const authForm = document.getElementById('authForm');
  const passwordInput = document.getElementById('password');

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

  if (!ENCRYPTION_PASSWORD) {
    authModal.style.display = 'flex';
  }
}

async function initializeGallery() {
  if (!ENCRYPTION_PASSWORD) return;

  const manifestResponse = await fetch('assets/encrypted-images/manifest.json');
  if (!manifestResponse.ok) return;

  const manifest = await manifestResponse.json();
  const gallery = document.getElementById('photoGallery');
  if (!gallery) return;

  manifest.images.forEach((imageMeta, index) => {
    const item = createGalleryItem(imageMeta, index);
    gallery.appendChild(item);
    loadEncryptedImage(imageMeta, `photo-${index}`);
  });
}

function setupSmoothScroll() {
  const rsvp = document.querySelector('.rsvp');
  if (rsvp) {
    rsvp.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setupSmoothScroll();
  setupAuthModal();
  initializeGallery();
});


