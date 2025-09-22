/**
 * DataProcessor Component
 * CSV import/export and data manipulation utilities for Table Block
 */

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { TableData, TableCell } from './TableGrid';

export interface DataProcessorProps {
  data: TableData;
  onImport: (data: TableData) => void;
  className?: string;
}

/**
 * Convert table data to CSV string
 */
export function tableToCSV(data: TableData): string {
  const rows: string[] = [];

  // Add caption as first row comment if exists
  if (data.caption) {
    rows.push(`# ${data.caption}`);
  }

  // Process each row
  for (let r = 0; r < data.rows; r++) {
    const csvRow: string[] = [];

    for (let c = 0; c < data.cols; c++) {
      const cell = data.cells[r][c];

      // Skip merged cells (they're handled by their origin)
      if (cell.isMerged) {
        csvRow.push(''); // Empty placeholder
        continue;
      }

      // Escape content for CSV
      let content = cell.content || '';

      // Handle special characters
      const needsQuoting = content.includes(',') || content.includes('"') || content.includes('\n') || content.includes('\r');

      if (needsQuoting) {
        // Escape quotes by doubling them
        content = content.replace(/"/g, '""');
        content = `"${content}"`;
      }

      csvRow.push(content);
    }

    rows.push(csvRow.join(','));
  }

  return rows.join('\n');
}

/**
 * Parse CSV string to table data
 */
export function csvToTable(csvContent: string): TableData {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Check for caption (comment lines starting with #)
  let caption = '';
  const dataLines: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      if (!caption) {
        caption = trimmed.substring(1).trim();
      }
    } else if (trimmed) {
      dataLines.push(trimmed);
    }
  });

  if (dataLines.length === 0) {
    throw new Error('No data rows found in CSV');
  }

  // Parse CSV rows
  const parsedRows: string[][] = [];
  let maxCols = 0;

  dataLines.forEach(line => {
    const row = parseCSVRow(line);
    parsedRows.push(row);
    maxCols = Math.max(maxCols, row.length);
  });

  // Create table data
  const rows = parsedRows.length;
  const cols = maxCols;
  const cells: TableCell[][] = [];

  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    const parsedRow = parsedRows[r];

    for (let c = 0; c < cols; c++) {
      const content = parsedRow[c] || '';
      cells[r][c] = {
        content,
        rowSpan: 1,
        colSpan: 1,
        align: 'left',
        isHeader: r === 0, // First row as header
        isSelected: false,
        isMerged: false
      };
    }
  }

  return {
    rows,
    cols,
    cells,
    style: 'default',
    hasHeaderRow: true,
    hasHeaderCol: false,
    caption
  };
}

/**
 * Parse a single CSV row respecting quotes and escapes
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current);

  return result;
}

/**
 * Download table data as CSV file
 */
export function downloadTableAsCSV(data: TableData, filename = 'table.csv'): void {
  try {
    const csvContent = tableToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error('Failed to download CSV file');
  }
}

/**
 * Read uploaded CSV file
 */
export function readCSVFile(file: File): Promise<TableData> {
  return new Promise((resolve, reject) => {
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Please select a CSV file'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const tableData = csvToTable(csvContent);
        resolve(tableData);
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Generate sample CSV data for demonstration
 */
export function generateSampleTable(): TableData {
  return {
    rows: 4,
    cols: 4,
    cells: [
      [
        { content: 'Product', rowSpan: 1, colSpan: 1, align: 'left', isHeader: true, isSelected: false, isMerged: false },
        { content: 'Price', rowSpan: 1, colSpan: 1, align: 'center', isHeader: true, isSelected: false, isMerged: false },
        { content: 'Stock', rowSpan: 1, colSpan: 1, align: 'center', isHeader: true, isSelected: false, isMerged: false },
        { content: 'Status', rowSpan: 1, colSpan: 1, align: 'center', isHeader: true, isSelected: false, isMerged: false }
      ],
      [
        { content: 'Laptop', rowSpan: 1, colSpan: 1, align: 'left', isHeader: false, isSelected: false, isMerged: false },
        { content: '$999', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false },
        { content: '25', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false },
        { content: 'Available', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false }
      ],
      [
        { content: 'Mouse', rowSpan: 1, colSpan: 1, align: 'left', isHeader: false, isSelected: false, isMerged: false },
        { content: '$29', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false },
        { content: '150', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false },
        { content: 'Available', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false }
      ],
      [
        { content: 'Keyboard', rowSpan: 1, colSpan: 1, align: 'left', isHeader: false, isSelected: false, isMerged: false },
        { content: '$79', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false },
        { content: '0', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false },
        { content: 'Out of Stock', rowSpan: 1, colSpan: 1, align: 'center', isHeader: false, isSelected: false, isMerged: false }
      ]
    ],
    style: 'default',
    hasHeaderRow: true,
    hasHeaderCol: false,
    caption: 'Product Inventory'
  };
}

/**
 * Validate table data structure
 */
export function validateTableData(data: TableData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check basic structure
  if (!data.cells || !Array.isArray(data.cells)) {
    errors.push('Invalid cells data structure');
  }

  if (data.rows <= 0 || data.cols <= 0) {
    errors.push('Table must have at least 1 row and 1 column');
  }

  if (data.rows > 100 || data.cols > 50) {
    errors.push('Table size exceeds maximum limits (100 rows, 50 columns)');
  }

  // Check cells array dimensions
  if (data.cells.length !== data.rows) {
    errors.push('Rows count does not match cells array length');
  }

  // Check each row
  data.cells.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push(`Row ${rowIndex} is not an array`);
      return;
    }

    if (row.length !== data.cols) {
      errors.push(`Row ${rowIndex} has ${row.length} cells, expected ${data.cols}`);
    }

    // Check each cell
    row.forEach((cell, colIndex) => {
      if (!cell || typeof cell !== 'object') {
        errors.push(`Cell [${rowIndex}, ${colIndex}] is invalid`);
        return;
      }

      // Check required properties
      if (typeof cell.content !== 'string') {
        errors.push(`Cell [${rowIndex}, ${colIndex}] has invalid content`);
      }

      if (cell.rowSpan && (typeof cell.rowSpan !== 'number' || cell.rowSpan < 1)) {
        errors.push(`Cell [${rowIndex}, ${colIndex}] has invalid rowSpan`);
      }

      if (cell.colSpan && (typeof cell.colSpan !== 'number' || cell.colSpan < 1)) {
        errors.push(`Cell [${rowIndex}, ${colIndex}] has invalid colSpan`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main DataProcessor component
 */
export const DataProcessor: React.FC<DataProcessorProps> = ({
  data,
  onImport,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    try {
      downloadTableAsCSV(data, 'table-export.csv');
    } catch (error) {
      alert('Failed to export table as CSV');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await readCSVFile(file);
      const validation = validateTableData(importedData);

      if (!validation.valid) {
        alert(`Import failed:\n${validation.errors.join('\n')}`);
        return;
      }

      onImport(importedData);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSampleData = () => {
    const sampleData = generateSampleTable();
    onImport(sampleData);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileUpload}
        className="hidden"
        id="csv-file-input"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="h-7 px-2 text-xs"
        title="Import CSV file"
      >
        <Upload className="h-3 w-3 mr-1" />
        Import CSV
      </Button>

      {/* CSV Export */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="h-7 px-2 text-xs"
        title="Export as CSV file"
      >
        <Download className="h-3 w-3 mr-1" />
        Export CSV
      </Button>

      {/* Sample Data */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSampleData}
        className="h-7 px-2 text-xs"
        title="Load sample data"
      >
        <FileSpreadsheet className="h-3 w-3 mr-1" />
        Sample
      </Button>
    </div>
  );
};

export default DataProcessor;