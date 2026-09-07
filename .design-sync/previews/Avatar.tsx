import { Avatar, AvatarFallback } from "my-v0-project"

// AvatarImage takes a src; these previews use the fallback so the card renders
// without reaching the network.
export function Fallbacks() {
  return (
    <div className="flex items-center gap-3">
      {["MJ", "SA", "PR", "DL"].map((i) => (
        <Avatar key={i}>
          <AvatarFallback>{i}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

export function Stacked() {
  return (
    <div className="flex items-center">
      {["MJ", "SA", "PR"].map((i, n) => (
        <Avatar key={i} className={n ? "-ml-3 ring-2 ring-white" : "ring-2 ring-white"}>
          <AvatarFallback>{i}</AvatarFallback>
        </Avatar>
      ))}
      <span className="ml-3 text-sm opacity-70">+4 others</span>
    </div>
  )
}
