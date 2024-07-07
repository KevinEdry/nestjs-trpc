import React from "react";
import {Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, getKeyValue} from "@nextui-org/react";

const rows = [
  {
    key: "1",
    name: "autoSchemaFile",
    description: "Path to trpc router and helpers types output."
  },
  {
    key: "2",
    name: "basePath",
    description: "The base path for all trpc requests. default '/trpc'.",
  },
  {
    key: "3",
    name: "createContext",
    description: "The exposed trpc options when creating a route with `createExpressMiddleware`. If not provided, the adapter will use a default createContext.",
  }
];

const columns = [
  {
    key: "name",
    label: "Name",
  },
  {
    key: "description",
    label: "Description",
  },
];

export default function TrpcModuleOptionsTable() {
  return (
    <Table hideHeader isCompact aria-label="Example table with dynamic content">
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={rows}>
        {(item) => (
          <TableRow key={item.key}>
            {(columnKey) => <TableCell>{getKeyValue(item, columnKey)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
