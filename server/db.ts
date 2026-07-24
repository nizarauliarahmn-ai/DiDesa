import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Define Drizzle Schema for PostgreSQL
export const residentsTable = pgTable("residents", {
  nik: text("nik").primaryKey(),
  initials: text("initials"),
  name: text("name").notNull(),
  gender: text("gender"),
  genderColor: text("gender_color"),
  rtRw: text("rt_rw"),
  rt: text("rt"),
  rw: text("rw"),
  status: text("status"),
  statusColor: text("status_color"),
  maritalStatus: text("marital_status"),
  age: integer("age"),
  birthPlace: text("birth_place"),
  birthDate: text("birth_date"),
  bloodType: text("blood_type"),
  religion: text("religion"),
  job: text("job"),
  address: text("address"),
  desa: text("desa"),
  domicileStatus: text("domicile_status"),
  familyRelation: text("family_relation"),
  education: text("education"),
  photo: text("photo"),
  noKk: text("no_kk"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  activeAids: jsonb("active_aids").$type<string[]>(),
  isDeleted: integer("is_deleted").default(0),
});

export const globalUpdatesTable = pgTable("global_updates", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: text("version").notNull(),
  releaseDate: text("release_date").notNull(),
  type: text("type").notNull(), // 'feature', 'fix', 'improvement'
  isActive: integer("is_active").default(1),
});

// Default initial/fallback data for residents
export let memoryResidents = [
  // --- KELUARGA 1: 11 ANGGOTA (noKk: "1111111111111111") ---
  { nik: "1111111111110001", initials: "SH", name: "Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 55, birthPlace: "Kandangan", birthDate: "1971-04-10", bloodType: "A", religion: "Islam", job: "Wiraswasta", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Kadir", motherName: "Siti", activeAids: ["BLT Dana Desa", "Bantuan Pangan Non-Tunai"] },
  { nik: "1111111111110002", initials: "SM", name: "Sumiati", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 50, birthPlace: "Simpur", birthDate: "1976-08-15", bloodType: "B", religion: "Islam", job: "Mengurus Rumah Tangga", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Hamid", motherName: "Mariam", activeAids: [] },
  { nik: "1111111111110003", initials: "BS", name: "Budi Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 28, birthPlace: "Wasah Hilir", birthDate: "1998-02-12", bloodType: "O", religion: "Islam", job: "Wiraswasta", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110004", initials: "AS", name: "Ani Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 26, birthPlace: "Wasah Hilir", birthDate: "2000-05-20", bloodType: "A", religion: "Islam", job: "Guru", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110005", initials: "CS", name: "Cici Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Wasah Hilir", birthDate: "2002-11-25", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110006", initials: "DS", name: "Dedi Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 22, birthPlace: "Wasah Hilir", birthDate: "2004-09-30", bloodType: "B", religion: "Islam", job: "Belum / Tidak Bekerja", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110007", initials: "ES", name: "Efi Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 20, birthPlace: "Wasah Hilir", birthDate: "2006-03-14", bloodType: "O", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110008", initials: "FS", name: "Fani Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 18, birthPlace: "Wasah Hilir", birthDate: "2008-07-22", bloodType: "A", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110009", initials: "GS", name: "Gani Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 16, birthPlace: "Wasah Hilir", birthDate: "2010-12-05", bloodType: "B", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110010", initials: "HS", name: "Hani Suherman", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 14, birthPlace: "Wasah Hilir", birthDate: "2012-06-18", bloodType: "O", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },
  { nik: "1111111111110011", initials: "IS", name: "Ipan Suherman", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 12, birthPlace: "Wasah Hilir", birthDate: "2014-10-09", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Merdeka No. 11", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SD / Sederajat", photo: null, noKk: "1111111111111111", fatherName: "Suherman", motherName: "Sumiati", activeAids: [] },

  // --- KELUARGA 2: 4 ANGGOTA (noKk: "2222222222222222") ---
  { nik: "2222222222220001", initials: "BW", name: "Bambang Wijaya", gender: "Laki-laki", genderColor: "blue", rtRw: "02 / 01", rt: "02", rw: "01", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 42, birthPlace: "Surabaya", birthDate: "1984-03-24", bloodType: "B", religion: "Islam", job: "Karyawan Swasta", address: "Jl. Mawar No. 24", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "2222222222222222", fatherName: "Subianto", motherName: "Hartini", activeAids: [] },
  { nik: "2222222222220002", initials: "RK", name: "Ratih Kumala", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 01", rt: "02", rw: "01", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 38, birthPlace: "Kandangan", birthDate: "1988-07-15", bloodType: "O", religion: "Islam", job: "Tenaga Kesehatan (Bidan)", address: "Jl. Mawar No. 24", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "Sarjana (S1)", photo: null, noKk: "2222222222222222", fatherName: "Wahyudi", motherName: "Endang", activeAids: [] },
  { nik: "2222222222220003", initials: "DW", name: "Dafa Wijaya", gender: "Laki-laki", genderColor: "blue", rtRw: "02 / 01", rt: "02", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 15, birthPlace: "Wasah Hilir", birthDate: "2011-09-05", bloodType: "B", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Mawar No. 24", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "2222222222222222", fatherName: "Bambang Wijaya", motherName: "Ratih Kumala", activeAids: [] },
  { nik: "2222222222220004", initials: "KW", name: "Keysha Wijaya", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 01", rt: "02", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 10, birthPlace: "Wasah Hilir", birthDate: "2016-01-20", bloodType: "A", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Mawar No. 24", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SD / Sederajat", photo: null, noKk: "2222222222222222", fatherName: "Bambang Wijaya", motherName: "Ratih Kumala", activeAids: ["Program Keluarga Harapan (PKH)"] },

  // --- KELUARGA 3: 7 ANGGOTA (noKk: "3333333333333333") ---
  { nik: "3333333333330001", initials: "KT", name: "Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 48, birthPlace: "Wasah Hilir", birthDate: "1978-11-12", bloodType: "O", religion: "Islam", job: "Petani", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Sardji", motherName: "Ponirah", activeAids: ["Bantuan Pangan Non-Tunai"] },
  { nik: "3333333333330002", initials: "WS", name: "Warsiah", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 44, birthPlace: "Wasah Hilir", birthDate: "1982-05-18", bloodType: "A", religion: "Islam", job: "Petani", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kromo", motherName: "Warni", activeAids: [] },
  { nik: "3333333333330003", initials: "DK", name: "Doni Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 22, birthPlace: "Wasah Hilir", birthDate: "2004-04-22", bloodType: "O", religion: "Islam", job: "Buruh Harian Lepas", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
  { nik: "3333333333330004", initials: "DI", name: "Dina Kartono", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 19, birthPlace: "Wasah Hilir", birthDate: "2007-06-25", bloodType: "B", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
  { nik: "3333333333330005", initials: "DD", name: "Didi Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 17, birthPlace: "Wasah Hilir", birthDate: "2009-08-11", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
  { nik: "3333333333330006", initials: "DT", name: "Dita Kartono", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 15, birthPlace: "Wasah Hilir", birthDate: "2011-10-09", bloodType: "A", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMP / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },
  { nik: "3333333333330007", initials: "DA", name: "Danu Kartono", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 02", rt: "03", rw: "02", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 10, birthPlace: "Wasah Hilir", birthDate: "2016-12-14", bloodType: "O", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Tani Indah RT.003 RW.002", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SD / Sederajat", photo: null, noKk: "3333333333333333", fatherName: "Kartono", motherName: "Warsiah", activeAids: [] },

  // --- WARGA TAMBAHAN ---
  { nik: "3201020405060001", initials: "AB", name: "Ahmad Bukhori", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 02", rt: "01", rw: "02", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 40, birthPlace: "Bandung", birthDate: "1986-05-12", bloodType: "O", religion: "Islam", job: "Wiraswasta", address: "Jl. Cempaka No. 42", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890001", fatherName: "Budi Santoso", motherName: "Ratna Sari", activeAids: ["BLT Dana Desa", "Bantuan Pangan Non-Tunai"] },
  { nik: "3201020405060002", initials: "SN", name: "Siti Nurhaliza", gender: "Perempuan", genderColor: "pink", rtRw: "03 / 01", rt: "03", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Bandung", birthDate: "2002-11-20", bloodType: "AB", religion: "Islam", job: "Pelajar / Mahasiswa", address: "Jl. Melati No. 10", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "320412008890002", fatherName: "Ahmad Bukhori", motherName: "Siti Aminah", activeAids: ["Program Keluarga Harapan (PKH)"] },
  { nik: "3201020405060003", initials: "DS", name: "Deddy Setiawan", gender: "Laki-laki", genderColor: "blue", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 35, birthPlace: "Jakarta", birthDate: "1991-08-15", bloodType: "B", religion: "Islam", job: "Karyawan Swasta", address: "Jl. Mawar No. 5", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890003", fatherName: "Suradi", motherName: "Sumiati", activeAids: [] },
  { nik: "3201020405060004", initials: "RW", name: "Rina Wulandari", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 02", rt: "02", rw: "02", status: "Aktif", maritalStatus: "Kawin", statusColor: "emerald", age: 32, birthPlace: "Bandung", birthDate: "1994-03-24", bloodType: "A", religion: "Islam", job: "Mengurus Rumah Tangga", address: "Jl. Anggrek No. 15", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Istri", education: "SMA / Sederajat", photo: null, noKk: "320412008890004", fatherName: "Suparman", motherName: "Warsih", activeAids: ["Bantuan Pangan Non-Tunai"] },
  { nik: "3201020405060005", initials: "HS", name: "Hendra Saputra", gender: "Laki-laki", genderColor: "blue", rtRw: "05 / 03", rt: "05", rw: "03", status: "Aktif", maritalStatus: "Cerai Mati", statusColor: "gray", age: 60, birthPlace: "Bogor", birthDate: "1966-02-10", bloodType: "O", religion: "Islam", job: "Pensiunan", address: "Jl. Kamboja No. 3", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Sarjana (S1)", photo: null, noKk: "320412008890005", fatherName: "Taufik Hidayat", motherName: "Siti Rahma", activeAids: ["BLT Dana Desa"] },
  { nik: "6306021212990001", initials: "NAR", name: "Nizar Aulia Rahman", gender: "Laki-laki", genderColor: "blue", rtRw: "02 / 01", rt: "02", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 27, birthPlace: "Kandangan", birthDate: "1999-12-12", bloodType: "B", religion: "Islam", job: "Wiraswasta", address: "Jl. Keramat RT.002 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "Diploma III (D3)", photo: null, noKk: "6306021111990002", fatherName: "Fazakkir Rahmad", motherName: "Siti Aminah", activeAids: [] },
  { nik: "6306022005020002", initials: "DL", name: "Dewi Lestari", gender: "Perempuan", genderColor: "pink", rtRw: "01 / 01", rt: "01", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 24, birthPlace: "Simpur", birthDate: "2002-05-20", bloodType: "A", religion: "Islam", job: "Guru", address: "Jl. Anggrek No. 12 RT.001 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "Sarjana (S1)", photo: null, noKk: "6306021111990010", fatherName: "Ahmad Bukhori", motherName: "Rina Wulandari", activeAids: [] },
  { nik: "6306021508930003", initials: "MY", name: "Muhammad Yusuf", gender: "Laki-laki", genderColor: "blue", rtRw: "03 / 01", rt: "03", rw: "01", status: "Aktif", maritalStatus: "Cerai Hidup", statusColor: "gray", age: 33, birthPlace: "Wasah Hilir", birthDate: "1993-08-15", bloodType: "O", religion: "Islam", job: "Petani", address: "Jl. Mawar RT.003 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Kepala Keluarga", education: "SMA / Sederajat", photo: null, noKk: "6306021111990022", fatherName: "Supian", motherName: "Siti Rahmah", activeAids: ["Bantuan Pangan Non-Tunai"] },
  { nik: "6306022802010004", initials: "FW", name: "Fatima Wardah", gender: "Perempuan", genderColor: "pink", rtRw: "02 / 01", rt: "02", rw: "01", status: "Aktif", maritalStatus: "Belum Kawin", statusColor: "gray", age: 25, birthPlace: "Wasah Hilir", birthDate: "2001-02-28", bloodType: "O", religion: "Islam", job: "Karyawan Swasta", address: "Jl. Keramat No. 24 RT.002 RW.001", desa: "Wasah Hilir", domicileStatus: "Sesuai KTP", familyRelation: "Anak", education: "SMA / Sederajat", photo: null, noKk: "6306021111990033", fatherName: "Rahmadi", motherName: "Sri Wahyuni", activeAids: [] }
];

// 1. Drizzle setup (Node-Postgres)
const databaseUrl = (process.env.DATABASE_URL || "").trim().replace(/\s+/g, "");
let drizzleDb: any = null;
let pgPool: any = null;

if (databaseUrl) {
  try {
    const useSsl = databaseUrl.includes("sslmode=require") || 
                   databaseUrl.includes("neon.tech") || 
                   databaseUrl.includes("supabase.co") || 
                   databaseUrl.includes("render.com");
                   
    pgPool = new pg.Pool({ 
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    });

    pgPool.on('error', (err: any) => {
      console.error('Unexpected error on idle pg client', err.message || err);
      drizzleDb = null;
    });

    drizzleDb = drizzle(pgPool);
    console.log("Drizzle/PostgreSQL successfully connected.");

    // Auto-create table schema if it doesn't exist
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS residents (
        nik TEXT PRIMARY KEY,
        initials TEXT,
        name TEXT NOT NULL,
        gender TEXT,
        gender_color TEXT,
        rt_rw TEXT,
        rt TEXT,
        rw TEXT,
        status TEXT,
        status_color TEXT,
        marital_status TEXT,
        age INTEGER,
        birth_place TEXT,
        birth_date TEXT,
        blood_type TEXT,
        religion TEXT,
        job TEXT,
        address TEXT,
        desa TEXT,
        domicile_status TEXT,
        family_relation TEXT,
        education TEXT,
        photo TEXT,
        no_kk TEXT,
        father_name TEXT,
        mother_name TEXT,
        active_aids JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS global_updates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        version TEXT NOT NULL,
        release_date TEXT NOT NULL,
        type TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        kode_desa TEXT UNIQUE NOT NULL,
        nama_desa TEXT NOT NULL,
        domain TEXT UNIQUE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        admin_email TEXT,
        admin_password TEXT,
        kades_email TEXT,
        kades_password TEXT
      );

      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_password TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kades_email TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kades_password TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kecamatan TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kabupaten TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS alamat TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kontak TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

      ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;
      ALTER TABLE residents ADD COLUMN IF NOT EXISTS marital_status TEXT;
    `).then(() => {
      console.log("Database table verification completed (auto-migration).");
    }).catch((err: any) => {
      // Silently catch error and fallback
      // console.error("Failed to run database auto-migration:", err.message || err);
      console.log("Disabling Drizzle due to migration connection/authentication failure. Falling back to Supabase/Memory.");
      drizzleDb = null;
    });
  } catch (err: any) {
    // console.error("Drizzle connection failed:", err.message || err);
    console.log("Drizzle DB connection failed, falling back to Supabase/Memory.");
    drizzleDb = null;
  }
}

// 2. Supabase setup
let supabaseUrl = (process.env.SUPABASE_URL || "").trim().replace(/\s+/g, "");
// Sanitize URL to prevent "Invalid path specified in request URL"
if (supabaseUrl) {
  try {
    if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
      supabaseUrl = "https://" + supabaseUrl;
    }
    const urlObj = new URL(supabaseUrl);
    supabaseUrl = urlObj.origin;
  } catch (e) {
    console.error("Invalid SUPABASE_URL format:", supabaseUrl);
  }
}
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KE || "").trim().replace(/\s+/g, "");
let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized.");
  } catch (err) {
    console.error("Supabase client initialization failed:", err);
    supabase = null;
  }
}

// Return active database engine name
export function getActiveDbEngine(): "Drizzle" | "Supabase" | "Memory" {
  if (drizzleDb) return "Drizzle";
  if (supabase) return "Supabase";
  return "Memory";
}

function calculateAge(birthDateStr: string, currentAge: number): number {
  if (!birthDateStr) return currentAge || 30;
  try {
    const birthDate = new Date(birthDateStr);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : (currentAge || 30);
    }
  } catch (e) {
    // ignore
  }
  return currentAge || 30;
}

// Normalize DB resident object to frontend format
function normalizeResident(res: any) {
  if (!res) return res;
  // Ensure activeAids is an array
  let activeAids = res.activeAids || res.active_aids || [];
  if (typeof activeAids === "string") {
    try {
      activeAids = JSON.parse(activeAids);
    } catch {
      activeAids = [];
    }
  }
  const rawBirthDate = res.birthDate || res.birth_date || "";
  const rawAge = res.age ? Number(res.age) : 0;
  const calculatedAge = (rawAge === 0 || rawAge === 30) && rawBirthDate
    ? calculateAge(rawBirthDate, rawAge)
    : (rawAge || 30);

  return {
    nik: res.nik,
    initials: res.initials || "",
    name: res.name,
    gender: res.gender || "",
    genderColor: res.genderColor || res.gender_color || "blue",
    rtRw: res.rtRw || res.rt_rw || "",
    rt: res.rt || "",
    rw: res.rw || "",
    status: res.status || "",
    statusColor: res.statusColor || res.status_color || "gray",
    maritalStatus: res.maritalStatus || res.marital_status || "Belum Kawin",
    age: calculatedAge,
    birthPlace: res.birthPlace || res.birth_place || "",
    birthDate: rawBirthDate,
    bloodType: res.bloodType || res.blood_type || "",
    religion: res.religion || "",
    job: res.job || "",
    address: res.address || "",
    desa: res.desa || "",
    domicileStatus: res.domicileStatus || res.domicile_status || "",
    familyRelation: res.familyRelation || res.family_relation || "",
    education: res.education || "",
    photo: res.photo || null,
    noKk: res.noKk || res.no_kk || "",
    fatherName: res.fatherName || res.father_name || "",
    motherName: res.motherName || res.mother_name || "",
    activeAids: Array.isArray(activeAids) ? activeAids : [],
    is_deleted: res.isDeleted || res.is_deleted || 0
  };
}

// Unified residents CRUD functions
export async function getResidents(tenant_id?: string): Promise<any[]> {
  // Try Drizzle PostgreSQL first
  if (drizzleDb) {
    try {
      const res = await pgPool.query("SELECT * FROM residents ORDER BY name ASC");
      if (res.rows.length === 0) {
        console.log("Database table 'residents' is empty. Auto-seeding default dummy residents...");
        for (const resident of memoryResidents) {
          await insertResident(resident);
        }
        const seededRes = await pgPool.query("SELECT * FROM residents ORDER BY name ASC");
        return seededRes.rows.map(normalizeResident).filter((r: any) => r.is_deleted !== 1);
      }
      return res.rows.map(normalizeResident).filter((r: any) => r.is_deleted !== 1);
    } catch (err: any) {
      console.warn("Drizzle PostgreSQL getResidents failed:", err.message || err);
      console.warn("Falling back and disabling Drizzle PostgreSQL for this session.");
      drizzleDb = null;
    }
  }

  // Try Supabase second
  if (supabase) {
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      // Loop dynamically with offset pagination to fetch all residents.
      // This is fully safe and will automatically loop as many times as needed 
      // (e.g. for 3,000 residents: 0-999, 1000-1999, 2000-2999, 3000-3999) 
      // so there is absolutely no limit and it will never miss any residents.
      while (hasMore) {
        let query = supabase
          .from("residents")
          .select("*")
          .order("name", { ascending: true })
          .range(from, from + step - 1);

        if (tenant_id) {
          query = query.eq("tenant_id", tenant_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        }
      }

      if (allData.length === 0) {
        console.log("Supabase table 'residents' is empty. Auto-seeding default dummy residents...");
        for (const resident of memoryResidents) {
          await insertResident(resident);
        }
        // Fetch again after seeding
        const { data: seededData, error: seededError } = await supabase.from("residents").select("*").order("name", { ascending: true });
        if (!seededError && seededData) {
          allData = seededData;
        }
      }

      return allData.map(normalizeResident).filter((r: any) => r.is_deleted !== 1);
    } catch (err: any) {
      console.warn("Supabase query failed. The 'residents' table might not be initialized yet in Supabase.");
      console.warn("Tip: Run the SQL migration script from PANDUAN_DATABASE.md inside Supabase SQL Editor!");
      console.warn("Error details:", err.message || JSON.stringify(err));
      console.warn("Falling back and disabling Supabase Client for this session.");
      supabase = null;
    }
  }

  // Fallback to local memory list
  return memoryResidents.filter((r: any) => r.is_deleted !== 1);
}

export async function insertResident(resident: any): Promise<any> {
  const norm = {
    nik: resident.nik,
    initials: resident.initials || "",
    name: resident.name,
    gender: resident.gender || "",
    gender_color: resident.genderColor || "blue",
    rt_rw: resident.rtRw || "",
    rt: resident.rt || "",
    rw: resident.rw || "",
    status: resident.status || "",
    status_color: resident.statusColor || "gray",
    marital_status: resident.maritalStatus || "Belum Kawin",
    age: resident.age || 0,
    birth_place: resident.birthPlace || "",
    birth_date: resident.birthDate || "",
    blood_type: resident.bloodType || "",
    religion: resident.religion || "",
    job: resident.job || "",
    address: resident.address || "",
    desa: resident.desa || "",
    domicile_status: resident.domicileStatus || "",
    family_relation: resident.familyRelation || "",
    education: resident.education || "",
    photo: resident.photo || null,
    no_kk: resident.noKk || "",
    father_name: resident.fatherName || "",
    mother_name: resident.motherName || "",
    active_aids: JSON.stringify(resident.activeAids || []),
  };

  if (drizzleDb) {
    try {
      await pgPool.query(
        `INSERT INTO residents (
          nik, initials, name, gender, gender_color, rt_rw, rt, rw, status, status_color, marital_status, 
          age, birth_place, birth_date, blood_type, religion, job, address, desa, 
          domicile_status, family_relation, education, photo, no_kk, father_name, mother_name, active_aids
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        ON CONFLICT (nik) DO UPDATE SET 
          initials = EXCLUDED.initials, name = EXCLUDED.name, gender = EXCLUDED.gender, 
          gender_color = EXCLUDED.gender_color, rt_rw = EXCLUDED.rt_rw, rt = EXCLUDED.rt, rw = EXCLUDED.rw,
          marital_status = EXCLUDED.marital_status,
          status = EXCLUDED.status, status_color = EXCLUDED.status_color, age = EXCLUDED.age,
          birth_place = EXCLUDED.birth_place, birth_date = EXCLUDED.birth_date, blood_type = EXCLUDED.blood_type,
          religion = EXCLUDED.religion, job = EXCLUDED.job, address = EXCLUDED.address, desa = EXCLUDED.desa,
          domicile_status = EXCLUDED.domicile_status, family_relation = EXCLUDED.family_relation,
          education = EXCLUDED.education, photo = EXCLUDED.photo, no_kk = EXCLUDED.no_kk,
          father_name = EXCLUDED.father_name, mother_name = EXCLUDED.mother_name, active_aids = EXCLUDED.active_aids`,
        [
          norm.nik, norm.initials, norm.name, norm.gender, norm.gender_color, norm.rt_rw, norm.rt, norm.rw, norm.status, norm.status_color, norm.marital_status,
          norm.age, norm.birth_place, norm.birth_date, norm.blood_type, norm.religion, norm.job, norm.address, norm.desa,
          norm.domicile_status, norm.family_relation, norm.education, norm.photo, norm.no_kk, norm.father_name, norm.mother_name, norm.active_aids
        ]
      );
      const res = normalizeResident({ ...resident });
      addNotification("Pendaftaran Penduduk Baru", `Admin baru saja mendaftarkan ${res.name} (NIK: ${res.nik}) ke dalam sistem.`, "Residents");
      return res;
    } catch (err: any) {
      console.error("Drizzle insert error, using memory:", err);
      drizzleDb = null;
    }
  }

  if (supabase) {
    try {
      const dbFormat = {
        nik: resident.nik,
        initials: resident.initials,
        name: resident.name,
        gender: resident.gender,
        gender_color: resident.genderColor,
        rt_rw: resident.rtRw,
        rt: resident.rt,
        rw: resident.rw,
        status: resident.status,
        status_color: resident.statusColor,
        marital_status: resident.maritalStatus,
        age: resident.age,
        birth_place: resident.birthPlace,
        birth_date: resident.birthDate,
        blood_type: resident.bloodType,
        religion: resident.religion,
        job: resident.job,
        address: resident.address,
        desa: resident.desa,
        domicile_status: resident.domicileStatus,
        family_relation: resident.familyRelation,
        education: resident.education,
        photo: resident.photo,
        no_kk: resident.noKk,
        father_name: resident.fatherName,
        mother_name: resident.motherName,
        active_aids: resident.activeAids || [],
      };
      const { data, error } = await supabase.from("residents").upsert([dbFormat]).select();
      if (error) throw error;
      const res = normalizeResident(data[0]);
      addNotification("Pendaftaran Penduduk Baru", `Admin baru saja mendaftarkan ${res.name} (NIK: ${res.nik}) ke dalam sistem.`, "Residents");
      return res;
    } catch (err: any) {
      console.error("Supabase insert error, using memory:", err);
      supabase = null;
    }
  }

  // Fallback to memory
  const index = memoryResidents.findIndex(r => r.nik === resident.nik);
  if (index >= 0) {
    memoryResidents[index] = { ...memoryResidents[index], ...resident };
    addNotification("Data Penduduk Diperbarui", `Informasi kependudukan ${resident.name} (NIK: ${resident.nik}) telah diperbarui.`, "Residents");
  } else {
    memoryResidents.unshift(resident);
    addNotification("Pendaftaran Penduduk Baru", `Admin baru saja mendaftarkan ${resident.name} (NIK: ${resident.nik}) ke dalam sistem.`, "Residents");
  }
  return resident;
}

export async function updateResident(nik: string, updatedFields: any, silent: boolean = false): Promise<any> {
  const existing = (await getResidents()).find(r => r.nik === nik);
  if (!existing) throw new Error("Resident not found");

  const merged = { ...existing, ...updatedFields };

  if (drizzleDb) {
    try {
      await pgPool.query(
        `UPDATE residents SET 
          nik = $1, initials = $2, name = $3, gender = $4, gender_color = $5, rt_rw = $6, rt = $7, rw = $8,
          status = $9, status_color = $10, marital_status = $28, age = $11, birth_place = $12, birth_date = $13,
          blood_type = $14, religion = $15, job = $16, address = $17, desa = $18,
          domicile_status = $19, family_relation = $20, education = $21, photo = $22,
          no_kk = $23, father_name = $24, mother_name = $25, active_aids = $26
        WHERE nik = $27`,
        [
          merged.nik, merged.initials, merged.name, merged.gender, merged.genderColor, merged.rtRw, merged.rt, merged.rw,
          merged.status, merged.statusColor, merged.age, merged.birthPlace, merged.birthDate,
          merged.bloodType, merged.religion, merged.job, merged.address, merged.desa,
          merged.domicileStatus, merged.familyRelation, merged.education, merged.photo,
          merged.noKk, merged.fatherName, merged.motherName, JSON.stringify(merged.activeAids),
          nik
        ]
      );
      if (!silent) addNotification("Data Penduduk Diperbarui", `Informasi kependudukan ${merged.name} (NIK: ${merged.nik}) telah diperbarui.`, "Residents");
      return normalizeResident(merged);
    } catch (err: any) {
      console.error("Drizzle update error, using memory:", err);
      drizzleDb = null;
    }
  }

  if (supabase) {
    try {
      const dbFormat = {
        nik: merged.nik,
        initials: merged.initials,
        name: merged.name,
        gender: merged.gender,
        gender_color: merged.genderColor,
        rt_rw: merged.rtRw,
        rt: merged.rt,
        rw: merged.rw,
        status: merged.status,
        status_color: merged.statusColor,
        marital_status: merged.maritalStatus,
        age: merged.age,
        birth_place: merged.birthPlace,
        birth_date: merged.birthDate,
        blood_type: merged.bloodType,
        religion: merged.religion,
        job: merged.job,
        address: merged.address,
        desa: merged.desa,
        domicile_status: merged.domicileStatus,
        family_relation: merged.familyRelation,
        education: merged.education,
        photo: merged.photo,
        no_kk: merged.noKk,
        father_name: merged.fatherName,
        mother_name: merged.motherName,
        active_aids: merged.activeAids,
      };
      const { data, error } = await supabase.from("residents").update(dbFormat).eq("nik", nik).select();
      if (error) throw error;
      if (!silent) addNotification("Data Penduduk Diperbarui", `Informasi kependudukan ${merged.name} (NIK: ${merged.nik}) telah diperbarui.`, "Residents");
      return normalizeResident(data[0]);
    } catch (err: any) {
      console.error("Supabase update error, using memory:", err);
      supabase = null;
    }
  }

  // Fallback memory
  memoryResidents = memoryResidents.map(r => r.nik === nik ? merged : r);
  if (!silent) addNotification("Data Penduduk Diperbarui", `Informasi kependudukan ${merged.name} (NIK: ${merged.nik}) telah diperbarui.`, "Residents");
  return merged;
}

export async function deleteResident(nik: string, silent: boolean = false): Promise<boolean> {
  let residentName = "Penduduk";
  try {
    const list = await getResidents();
    const found = list.find(r => r.nik === nik);
    if (found) residentName = found.name;
  } catch (err) {}

  if (drizzleDb) {
    try {
      await pgPool.query("UPDATE residents SET is_deleted = 1 WHERE nik = $1", [nik]);
      if (!silent) addNotification("Penduduk Dipindahkan ke Arsip", `Data penduduk ${residentName} (NIK: ${nik}) telah dipindahkan ke arsip/tong sampah.`, "Residents");
      return true;
    } catch (err: any) {
      console.error("Drizzle delete error:", err);
      drizzleDb = null;
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase.from("residents").update({ is_deleted: 1 }).eq("nik", nik);
      if (error) throw error;
      if (!silent) addNotification("Penduduk Dipindahkan ke Arsip", `Data penduduk ${residentName} (NIK: ${nik}) telah dipindahkan ke arsip/tong sampah.`, "Residents");
      return true;
    } catch (err: any) {
      console.error("Supabase delete error:", err);
      supabase = null;
    }
  }

  const foundMem = memoryResidents.find(r => r.nik === nik);
  if (foundMem) {
    (foundMem as any).is_deleted = 1;
  }
  if (!silent) addNotification("Penduduk Dipindahkan ke Arsip", `Data penduduk ${residentName} (NIK: ${nik}) telah dipindahkan ke arsip/tong sampah.`, "Residents");
  return true;
}

export async function getArchivedResidents(): Promise<any[]> {
  if (drizzleDb) {
    try {
      const res = await pgPool.query("SELECT * FROM residents WHERE is_deleted = 1 ORDER BY name ASC");
      return res.rows.map(normalizeResident);
    } catch (err: any) {}
  }
  if (supabase) {
    try {
      const { data } = await supabase.from("residents").select("*").eq("is_deleted", 1).order("name", { ascending: true });
      if (data) return data.map(normalizeResident);
    } catch (err: any) {}
  }
  return memoryResidents.filter(r => (r as any).is_deleted === 1);
}

export async function restoreResident(nik: string): Promise<boolean> {
  if (drizzleDb) {
    try {
      await pgPool.query("UPDATE residents SET is_deleted = 0 WHERE nik = $1", [nik]);
      return true;
    } catch (err: any) {}
  }
  if (supabase) {
    try {
      await supabase.from("residents").update({ is_deleted: 0 }).eq("nik", nik);
      return true;
    } catch (err: any) {}
  }
  const foundMem = memoryResidents.find(r => r.nik === nik);
  if (foundMem) (foundMem as any).is_deleted = 0;
  return true;
}

export async function hardDeleteResident(nik: string): Promise<boolean> {
  if (drizzleDb) {
    try {
      await pgPool.query("DELETE FROM residents WHERE nik = $1", [nik]);
      return true;
    } catch (err: any) {}
  }
  if (supabase) {
    try {
      await supabase.from("residents").delete().eq("nik", nik);
      return true;
    } catch (err: any) {}
  }
  memoryResidents = memoryResidents.filter(r => r.nik !== nik);
  return true;
}

// Memory store for notifications with realistic default values
export let memoryNotifications: any[] = [];

export function getNotifications() {
  return memoryNotifications;
}

export function addNotification(title: string, message: string, category: "Residents" | "Services" | "Assistance" | "System") {
  const notif = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    message,
    category,
    time: "Just now",
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  memoryNotifications.unshift(notif);
  return notif;
}

export function markAllNotificationsAsRead() {
  memoryNotifications = memoryNotifications.map(n => ({ ...n, isRead: true }));
  return { success: true };
}


// Tenants
export let memoryTenants: any[] = [
  {
    id: "71b0a3ce-7f78-4395-8123-1d6f1df21e1a",
    kode_desa: "1234WHi",
    nama_desa: "Desa Wasah Hilir",
    domain: "wasahhilir.sistemdidesa.id",
    status: "active",
    admin_email: "admin@wasahhilir.desa.id",
    admin_password: "admin123",
    kades_email: "kades@wasahhilir.desa.id",
    kades_password: "kades123"
  }
];

export async function getTenants(): Promise<any[]> {
  if (drizzleDb) {
    try {
      const res = await pgPool.query("SELECT * FROM tenants ORDER BY created_at DESC");
      if (res.rows.length === 0) {
        // Seed default memory tenant
        await pgPool.query(
          `INSERT INTO tenants (kode_desa, nama_desa, domain, status, admin_email, admin_password, kades_email, kades_password) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            "1234WHi", 
            "Desa Wasah Hilir", 
            "wasahhilir.sistemdidesa.id", 
            "active", 
            "admin@wasahhilir.desa.id", 
            "admin123", 
            "kades@wasahhilir.desa.id", 
            "kades123"
          ]
        );
        const seeded = await pgPool.query("SELECT * FROM tenants ORDER BY created_at DESC");
        return seeded.rows;
      }
      return res.rows;
    } catch (err: any) {
      console.warn("Drizzle PostgreSQL getTenants failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        // Seed on Supabase
        const { data: seeded, error: seedError } = await supabase.from("tenants").insert([
          {
            kode_desa: "1234WHi",
            nama_desa: "Desa Wasah Hilir",
            domain: "wasahhilir.sistemdidesa.id",
            status: "active",
            admin_email: "admin@wasahhilir.desa.id",
            admin_password: "admin123",
            kades_email: "kades@wasahhilir.desa.id",
            kades_password: "kades123"
          }
        ]).select();
        if (!seedError && seeded) return seeded;
      }
      return data || [];
    } catch (err: any) {
      console.warn("Supabase getTenants failed:", err.message || err);
    }
  }

  return memoryTenants;
}

export async function addTenant(tenantData: any): Promise<any> {
  const newTenant = {
    id: tenantData.id || `tenant-${Date.now()}`,
    kode_desa: tenantData.kode_desa,
    nama_desa: tenantData.nama_desa,
    domain: tenantData.domain,
    status: tenantData.status || 'active',
    admin_email: tenantData.admin_email || `admin@${tenantData.domain || 'desa.id'}`,
    admin_password: tenantData.admin_password || 'admin123',
    kades_email: tenantData.kades_email || `kades@${tenantData.domain || 'desa.id'}`,
    kades_password: tenantData.kades_password || 'kades123',
    kecamatan: tenantData.kecamatan || '',
    kabupaten: tenantData.kabupaten || '',
    alamat: tenantData.alamat || '',
    kontak: tenantData.kontak || '',
    logo_url: tenantData.logo_url || '',
    created_at: new Date().toISOString()
  };

  if (drizzleDb) {
    try {
      const res = await pgPool.query(
        "INSERT INTO tenants (kode_desa, nama_desa, domain, status, admin_email, admin_password, kades_email, kades_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [
          newTenant.kode_desa, 
          newTenant.nama_desa, 
          newTenant.domain, 
          newTenant.status,
          newTenant.admin_email,
          newTenant.admin_password,
          newTenant.kades_email,
          newTenant.kades_password
        ]
      );
      return res.rows[0];
    } catch (err: any) {
      console.warn("Drizzle addTenant failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from("tenants").insert([
        {
          kode_desa: newTenant.kode_desa,
          nama_desa: newTenant.nama_desa,
          domain: newTenant.domain,
          status: newTenant.status,
          admin_email: newTenant.admin_email,
          admin_password: newTenant.admin_password,
          kades_email: newTenant.kades_email,
          kades_password: newTenant.kades_password,
          kecamatan: newTenant.kecamatan,
          kabupaten: newTenant.kabupaten,
          alamat: newTenant.alamat,
          kontak: newTenant.kontak,
          logo_url: newTenant.logo_url
        }
      ]).select().single();
      
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn("Supabase addTenant failed, trying fallback without new columns:", err.message || err);
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.from("tenants").insert([
          {
            kode_desa: newTenant.kode_desa,
            nama_desa: newTenant.nama_desa,
            domain: newTenant.domain,
            status: newTenant.status
          }
        ]).select().single();
        if (fallbackError) throw fallbackError;
        return fallbackData;
      } catch (innerErr) {
        // ignore
      }
    }
  }

  memoryTenants.push(newTenant);
  return newTenant;
}

export async function updateTenant(id: string, tenantData: any): Promise<any> {
  const updatedTenant = {
    kode_desa: tenantData.kode_desa,
    nama_desa: tenantData.nama_desa,
    domain: tenantData.domain,
    status: tenantData.status || 'active',
    admin_email: tenantData.admin_email,
    admin_password: tenantData.admin_password,
    kades_email: tenantData.kades_email,
    kades_password: tenantData.kades_password,
    kecamatan: tenantData.kecamatan,
    kabupaten: tenantData.kabupaten,
    alamat: tenantData.alamat,
    kontak: tenantData.kontak,
    logo_url: tenantData.logo_url
  };

  if (drizzleDb) {
    try {
      const res = await pgPool.query(
        `UPDATE tenants 
         SET kode_desa = $1, nama_desa = $2, domain = $3, status = $4, 
             admin_email = $5, admin_password = $6, kades_email = $7, kades_password = $8
         WHERE id = $9 RETURNING *`,
        [
          updatedTenant.kode_desa,
          updatedTenant.nama_desa,
          updatedTenant.domain,
          updatedTenant.status,
          updatedTenant.admin_email,
          updatedTenant.admin_password,
          updatedTenant.kades_email,
          updatedTenant.kades_password,
          id
        ]
      );
      if (res.rows && res.rows[0]) return res.rows[0];
    } catch (err: any) {
      console.warn("Drizzle updateTenant failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .update({
          kode_desa: updatedTenant.kode_desa,
          nama_desa: updatedTenant.nama_desa,
          domain: updatedTenant.domain,
          status: updatedTenant.status,
          admin_email: updatedTenant.admin_email,
          admin_password: updatedTenant.admin_password,
          kades_email: updatedTenant.kades_email,
          kades_password: updatedTenant.kades_password,
          kecamatan: updatedTenant.kecamatan,
          kabupaten: updatedTenant.kabupaten,
          alamat: updatedTenant.alamat,
          kontak: updatedTenant.kontak,
          logo_url: updatedTenant.logo_url
        })
        .eq("id", id)
        .select()
        .single();
      
      if (!error && data) return data;
    } catch (err: any) {
      console.warn("Supabase updateTenant failed, trying fallback without new columns:", err.message || err);
      try {
        const { data, error } = await supabase
          .from("tenants")
          .update({
            kode_desa: updatedTenant.kode_desa,
            nama_desa: updatedTenant.nama_desa,
            domain: updatedTenant.domain,
            status: updatedTenant.status
          })
          .eq("id", id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (innerErr) {
        // ignore
      }
    }
  }

  const idx = memoryTenants.findIndex(t => t.id === id);
  if (idx !== -1) {
    memoryTenants[idx] = { ...memoryTenants[idx], ...updatedTenant };
    return memoryTenants[idx];
  }
  return null;
}

export async function deleteTenant(id: string): Promise<boolean> {
  if (drizzleDb) {
    try {
      await pgPool.query("DELETE FROM tenants WHERE id = $1", [id]);
      return true;
    } catch (err: any) {
      console.warn("Drizzle deleteTenant failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (!error) return true;
    } catch (err: any) {
      console.warn("Supabase deleteTenant failed:", err.message || err);
    }
  }

  const initialLen = memoryTenants.length;
  memoryTenants = memoryTenants.filter(t => t.id !== id);
  return memoryTenants.length < initialLen;
}

// Global Updates CRUD
export async function getGlobalUpdates(): Promise<any[]> {
  if (drizzleDb) {
    try {
      const res = await pgPool.query("SELECT * FROM global_updates WHERE is_active = 1 ORDER BY release_date DESC");
      return res.rows;
    } catch (err: any) {
      console.warn("Drizzle PostgreSQL getGlobalUpdates failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from("global_updates").select("*").eq("is_active", 1).order("release_date", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.warn("Supabase getGlobalUpdates failed:", err.message || err);
    }
  }

  return [];
}

export async function addGlobalUpdate(updateData: any): Promise<any> {
  const id = `update-${Date.now()}`;
  const data = {
    id,
    title: updateData.title,
    content: updateData.content,
    version: updateData.version,
    release_date: updateData.releaseDate || new Date().toISOString(),
    type: updateData.type || 'feature',
    is_active: 1
  };

  if (drizzleDb) {
    try {
      const res = await pgPool.query(
        "INSERT INTO global_updates (id, title, content, version, release_date, type, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [data.id, data.title, data.content, data.version, data.release_date, data.type, data.is_active]
      );
      return res.rows[0];
    } catch (err: any) {
      console.warn("Drizzle addGlobalUpdate failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { data: inserted, error } = await supabase.from("global_updates").insert([data]).select().single();
      if (error) throw error;
      return inserted;
    } catch (err: any) {
      console.warn("Supabase addGlobalUpdate failed:", err.message || err);
      throw err;
    }
  }

  return data; // Memory fallback
}

// Global settings caching and multi-tenant persistence logic
export let memorySettings: Record<string, string> = {
  global_app_name: "DiDesa",
  global_app_logo: "",
  global_app_color: "#047857",
  global_print_footer: "Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia"
};

export async function getGlobalSettings(): Promise<Record<string, string>> {
  if (drizzleDb) {
    try {
      const res = await pgPool.query("SELECT * FROM global_settings");
      const dbSettings: Record<string, string> = {};
      res.rows.forEach((row: any) => {
        dbSettings[row.key] = row.value;
      });
      return { ...memorySettings, ...dbSettings };
    } catch (err: any) {
      console.warn("Drizzle getGlobalSettings failed, falling back to Memory:", err.message || err);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from("global_settings").select("*");
      if (!error && data) {
        const dbSettings: Record<string, string> = {};
        data.forEach((row: any) => {
          dbSettings[row.key] = row.value;
        });
        return { ...memorySettings, ...dbSettings };
      }
    } catch (err: any) {
      console.warn("Supabase getGlobalSettings failed, falling back to Memory:", err.message || err);
    }
  }

  return memorySettings;
}

export async function saveGlobalSetting(key: string, value: string): Promise<void> {
  memorySettings[key] = value;

  if (drizzleDb) {
    try {
      await pgPool.query(
        `INSERT INTO global_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    } catch (err: any) {
      console.warn("Drizzle saveGlobalSetting failed:", err.message || err);
    }
  }

  if (supabase) {
    try {
      await supabase.from("global_settings").upsert([{ key, value }]);
    } catch (err: any) {
      console.warn("Supabase saveGlobalSetting failed:", err.message || err);
    }
  }
}

