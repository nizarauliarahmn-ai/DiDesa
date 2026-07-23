---
name: multi_tenant_isolation
description: Strict architectural rules for Multi-Tenant SaaS isolation, ensuring no hardcoded tenant identities exist in the codebase.
---

# Aturan Multi-Tenant & Isolasi Desa (SaaS)

DiDesa adalah aplikasi SaaS Multi-Tenant. Satu *codebase* digunakan oleh banyak desa secara bersamaan, di mana setiap desa dibedakan secara unik berdasarkan `tenant_id` atau subdomain.

## 🚫 Larangan Keras (NEVER DO)
1. **Dilarang Keras Melakukan Hardcode Identitas Tenant**: Jangan pernah menanamkan logika kondisional spesifik untuk suatu desa (contoh: `if (desa === 'Wasah Hilir') { ganti_menjadi('Sukamakmur') }`) di mana pun dalam siklus hidup aplikasi (khususnya komponen global seperti `App.tsx` atau utilitas utama).
2. **Jangan Lompati Tenant Resolver**: Jangan pernah memanipulasi atau menimpa variabel state global (seperti `localStorage.getItem('kop_desa')`) secara paksa di komponen utama tanpa melewati proses autentikasi yang valid dari `tenantResolver.ts`.
3. **Patuhi Batas Isolasi Data**: Saat melakukan query database (Supabase), agen harus selalu memastikan manipulasi/pengambilan data tidak berisiko membocorkan data lintas-tenant. Selalu patuhi arsitektur RLS (Row Level Security) yang mengandalkan `tenant_id`.

## ✅ Praktik Terbaik (ALWAYS DO)
1. **Gunakan Dynamic Rendering**: Selalu gunakan data dinamis dari `tenantResolver` atau konfigurasi global SaaS (Supabase) untuk merender nama desa, logo, konfigurasi, atau tema.
2. **Pertahankan Global Konteks (Agnostic)**: Asumsikan kode yang Anda tulis akan dijalankan secara paralel oleh 100+ desa yang berbeda pada saat yang sama. Kode harus 100% agnostik dan tidak pernah memihak/merujuk pada satu entitas desa tertentu.
3. **Selesaikan Masalah pada Akar (Root Cause)**: Jangan memberikan "solusi pintas" dengan melakukan *hardcode* hanya untuk menyenangkan pengguna/memperbaiki error lokal yang spesifik. Selesaikan di level konfigurasi database atau struktur data.
