---
name: safe_string_methods
description: Aturan wajib untuk menangani manipulasi string pada data dinamis agar mencegah error TypeError undefined/null di frontend React.
---

# Aturan Keamanan Manipulasi String (Safe String Methods)

Setiap kali menggunakan metode bawaan JavaScript untuk string (seperti `.toLowerCase()`, `.toUpperCase()`, `.includes()`, `.split()`, `.trim()`) pada variabel yang datanya bersifat dinamis (dari database, API, localStorage, atau state pengguna), **DILARANG KERAS** memanggilnya secara langsung tanpa *fallback*.

## ❌ Praktik yang Dilarang (Akan menyebabkan Crash)
```typescript
// BERBAHAYA: Jika r.name undefined, aplikasi akan crash seketika!
const match = r.name.toLowerCase().includes(query.toLowerCase());
```

## ✅ Praktik yang Diwajibkan
Gunakan pola pembungkus fallback string kosong `(variabel || '')` atau *optional chaining* `.?` dipadu dengan fallback.

```typescript
// AMAN: Memastikan selalu ada string sebelum memanipulasinya
const match = (r.name || '').toLowerCase().includes((query || '').toLowerCase());
```

## Aturan Tambahan (Global Replace)
Jika agen AI harus melakukan *bulk update* (perbaikan massal) di puluhan file `.tsx`:
1. Dilarang menggunakan skrip regex global mentah tanpa memeriksa potensi pergeseran sintaks (seperti `item.(name || '').toLowerCase()`).
2. Wajib menjalankan perintah `npm run lint` atau `npm run build` setelah perbaikan massal untuk memastikan tidak ada *Syntax Error* sebelum dikirim ke repositori (push).
