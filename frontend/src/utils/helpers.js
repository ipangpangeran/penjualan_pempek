// Format number to Rupiah currency format
export const formatRupiah = (value) => {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

// Format ISO date or date string to Indonesian formatted date
export const formatDateIndo = (dateStr, includeDay = false) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (includeDay) {
    options.weekday = 'long';
  }

  // Use id-ID locale for Indonesian names
  return date.toLocaleDateString('id-ID', options);
};

// Return Lapak Name by ID
export const getLapakName = (lapakId) => {
  const id = parseInt(lapakId);
  switch (id) {
    case 1:
      return 'Lapak Ipang';
    case 2:
      return 'Kang Asep PJP';
    case 3:
      return 'Kang Asep RDTX & GRHA';
    default:
      return 'Lapak Lain';
  }
};

// Get current date string in local YYYY-MM-DD format (without timezone shifts)
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
