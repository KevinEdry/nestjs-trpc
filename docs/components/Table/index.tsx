import { Info } from 'lucide-react';
import React, { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  columns?: string[];
}

interface CellProps {
  children: ReactNode;
  description?: string;
}

function Table({ children, columns = [] }: TableProps) {
  return (
    <table className="w-full table-auto">
      <thead>
      <tr className="text-left text-[rgba(163,163,163,var(--tw-text-opacity))]">
        {columns.map((column, index) => (
          <Table.Column key={index}>{column}</Table.Column>
        ))}
      </tr>
      </thead>
      <tbody>
      {children}
      </tbody>
    </table>
  );
}

function Column({ children }: { children: ReactNode }) {
  return <th className="pb-2">{children}</th>;
}

function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-[#262626]">
      {children}
    </tr>
  );
}

function Cell({ children, description }: CellProps) {
  return (
    <td className="py-2">
      <div className="flex items-center">
        {children}
        {description != null && <Info size={16} className="ml-1 text-gray-500" />}
      </div>
    </td>
  );
}

// Attaching subcomponents to Table
Table.Column = Column;
Table.Row = Row;
Table.Cell = Cell;

export default Table;
