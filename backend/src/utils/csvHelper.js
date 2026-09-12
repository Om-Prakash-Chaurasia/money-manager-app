/**
 * RFC 4180 compliant CSV generator with UTF-8 BOM support for Excel compatibility
 */

/**
 * Escapes a single CSV cell value according to RFC 4180
 * @param {*} val - Value to escape
 * @returns {string} Escaped CSV field
 */
export const escapeCsvCell = (val) => {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // If the cell contains quotes, commas, carriage returns, or newlines, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  // Wrap strings with spaces or trim-sensitive strings in quotes
  return `"${str}"`;
};

/**
 * Generates CSV string from an array of objects
 * @param {Array<Object>} rows - Data rows
 * @param {Array<{ key: string, label: string, formatter?: Function }>} columns - Column definitions
 * @returns {string} UTF-8 encoded CSV string with BOM
 */
export const generateCsv = (rows, columns) => {
  const headerRow = columns.map((col) => escapeCsvCell(col.label)).join(',');

  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        let val;
        if (col.formatter) {
          val = col.formatter(row);
        } else {
          val = row[col.key];
        }
        return escapeCsvCell(val);
      })
      .join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) to ensure proper character rendering in Microsoft Excel
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
};
