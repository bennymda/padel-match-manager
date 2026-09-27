/**
 * Web Crypto API utilities for Cloudflare Pages Functions / Workers.
 * Native, zero-dependency password hashing (PBKDF2) and JWT token generation.
 */

// Convert ArrayBuffer to Hex string
function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Base64Url encoding
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

const DEFAULT_SECRET = 'padel_pro_cf_edge_secret_2026_xyz';

/**
 * Hash password with PBKDF2-SHA256
 */
export async function hashPassword(password) {
  const saltBuf = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bufToHex(saltBuf);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: 10000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashHex = bufToHex(derived);
  return { salt: saltHex, hash: hashHex };
}

/**
 * Verify password against salt and hash
 */
export async function verifyPassword(password, saltHex, hashHex) {
  try {
    const saltBuf = hexToBuf(saltHex);
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuf,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return bufToHex(derived) === hashHex;
  } catch (err) {
    return false;
  }
}

/**
 * Create native HMAC-SHA256 JWT Token
 */
export async function createToken(payload, secret = DEFAULT_SECRET) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days
  }));

  const dataToSign = `${header}.${body}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const signature = base64UrlEncode(String.fromCharCode(...new Uint8Array(sigBuf)));

  return `${header}.${body}.${signature}`;
}

/**
 * Verify native HMAC-SHA256 JWT Token
 */
export async function verifyToken(token, secret = DEFAULT_SECRET) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const dataToSign = `${header}.${body}`;
  const enc = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBuf = new Uint8Array(
      base64UrlDecode(signature)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(dataToSign));
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}
