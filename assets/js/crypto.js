const encoder = new TextEncoder();
const decoder = new TextDecoder();

const pbkdf2 = async (password, salt) => {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 250000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
};

export const decryptImage = async (encryptedBase64, password, saltBase64, ivBase64) => {
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  const key = await pbkdf2(password, salt);
  const plainBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBytes);
  return new Uint8Array(plainBuffer);
};
