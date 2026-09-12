/**
 * Currency & Monetary Precision Utility
 * All financial records store currency in integer minor units (paise/cents).
 * This eliminates IEEE-754 floating-point inaccuracies.
 */

/**
 * Converts decimal major units (e.g. 1500.50) to integer minor units (e.g. 150050)
 * @param {number|string} amount
 * @returns {number} Integer minor units
 */
export const toMinorUnits = (amount) => {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numeric)) return 0;
  return Math.round(numeric * 100);
};

/**
 * Converts integer minor units (e.g. 150050) to decimal major units (e.g. 1500.50)
 * @param {number} minorUnits
 * @returns {number} Decimal major units
 */
export const toMajorUnits = (minorUnits) => {
  if (!minorUnits || isNaN(minorUnits)) return 0;
  return minorUnits / 100;
};

/**
 * Formats minor units into localized currency string
 * @param {number} minorUnits - e.g. 4000000 (representing ₹40,000.00)
 * @param {string} currency - ISO currency code e.g. 'INR', 'USD'
 * @returns {string} e.g. "₹40,000.00"
 */
export const formatCurrency = (minorUnits, currency = 'INR') => {
  const majorUnits = toMajorUnits(minorUnits);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(majorUnits);
  } catch {
    return `${currency} ${majorUnits.toFixed(2)}`;
  }
};
