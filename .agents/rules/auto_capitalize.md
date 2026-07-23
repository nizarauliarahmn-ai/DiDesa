# Auto Capitalization Standard for Text Inputs

## Principles
1. **Title Case Transformation**: Every text input field handling proper nouns, titles, names, addresses, village/district names, or general descriptions must automatically format inputs to Title Case (capitalizing the first letter of each word).
2. **User Convenience**: Users should not be required to manually press `Shift` to capitalize words.
3. **Implementation Invariants**:
   - For form input fields in React/JSX, format the state value using a title casing helper (e.g. `capitalizeWords(val)`) on input change or blur.
   - For displayed values in document previews or tables, ensure proper casing helper or CSS class (`capitalize` / `uppercase`) is applied.

## 🚫 Pengecualian (Exceptions)
Fitur auto-kapitalisasi **TIDAK BOLEH** diterapkan pada form autentikasi atau input teknis. Anda wajib menambahkan atribut `data-no-cap` atau menggunakan `type="email"` pada kasus-kasus berikut:
1. **Email / Username**: Input pada halaman Login atau form pengaturan akun.
2. **Password**: Terutama saat fitur "Show Password" diaktifkan (yang mengubah tipe input menjadi `text`).
3. **Parameter Sistem / URL / Token**: Input yang bersifat case-sensitive.

Contoh Implementasi yang Benar di React:
`<input type="email" data-no-cap ... />`
`<input type={showPassword ? 'text' : 'password'} data-no-cap ... />`
