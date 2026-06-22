// AES-GCM encryption for QR code payloads
// Key is derived from SHA-256 of a fixed secret — makes QR content unreadable without the app

const QR_SECRET = "BinhLoi-WorkshopQR-AES256-2026!@#SecureKey";
let _cachedKey = null;

async function getKey() {
  if (_cachedKey) return _cachedKey;
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(QR_SECRET)
  );
  _cachedKey = await crypto.subtle.importKey(
    "raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
  return _cachedKey;
}

export async function encryptQR(payload) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  // URL-safe base64
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function decryptQR(encryptedStr) {
  const key = await getKey();
  // Restore standard base64
  const b64 = encryptedStr.replace(/-/g, "+").replace(/_/g, "/");
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}
