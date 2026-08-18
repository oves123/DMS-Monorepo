export const formatIndianNumber = (num: number | string): string => {
  const numericValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericValue) || numericValue === 0) return '0';
  
  const absNum = Math.abs(numericValue);
  let formatted = '';
  let suffix = '';

  if (absNum >= 10000000) {
    formatted = (absNum / 10000000).toFixed(2);
    suffix = ' Cr';
  } else if (absNum >= 100000) {
    formatted = (absNum / 100000).toFixed(2);
    suffix = ' L';
  } else if (absNum >= 1000) {
    formatted = (absNum / 1000).toFixed(2);
    suffix = ' K';
  } else {
    formatted = absNum.toFixed(2);
  }

  // Remove unnecessary trailing zeros
  formatted = parseFloat(formatted).toString();

  return (numericValue < 0 ? '-' : '') + formatted + suffix;
};

export const formatCurrencyDetailed = (num: number | string): string => {
  const numericValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericValue)) return '0.00';
  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};
