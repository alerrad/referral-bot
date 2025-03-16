"use client";

import {
  Table,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
} from "@/components/ui/table";

interface User {
  tg_id: number;
  name: string;
  _count: {
    invited: number;
  };
}

export default function UserTable({ users }: { users: User[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell>
            <b>Rank</b>
          </TableCell>
          <TableCell>
            <b>Name</b>
          </TableCell>
          <TableCell>
            <b>Ref count</b>
          </TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, rank) => (
          <TableRow key={rank}>
            <TableCell>{rank + 1}</TableCell>
            <TableCell>
              <a href={`tg://user?id=${user.tg_id}`}>{user.name}</a>
            </TableCell>
            <TableCell>{user._count.invited}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
