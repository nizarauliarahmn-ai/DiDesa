export function getFormattedDate(): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const date = new Date();
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getCurrentMonthYear(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const date = new Date();
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function getRelativeDateString(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
