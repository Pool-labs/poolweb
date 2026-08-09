import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, Badge,
} from "my-v0-project"

const POOLS = [
  { name: "Ski Trip '26", members: 12, balance: "$1,240.00", status: "Open" },
  { name: "Brunch Crew", members: 5, balance: "$184.00", status: "Open" },
  { name: "Apartment 4B", members: 4, balance: "$960.00", status: "Open" },
  { name: "Beach House", members: 8, balance: "$0.00", status: "Closed" },
]

export function Default() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pool</TableHead>
          <TableHead>Members</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {POOLS.map((p) => (
          <TableRow key={p.name}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.members}</TableCell>
            <TableCell className="text-right tabular-nums">{p.balance}</TableCell>
            <TableCell>
              <Badge variant={p.status === "Open" ? "secondary" : "outline"}>{p.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function WithCaption() {
  return (
    <Table>
      <TableCaption>Pools created in the last 30 days.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Pool</TableHead>
          <TableHead className="text-right">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {POOLS.slice(0, 3).map((p) => (
          <TableRow key={p.name}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell className="text-right tabular-nums">{p.balance}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
