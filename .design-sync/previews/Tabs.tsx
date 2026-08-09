import { Tabs, TabsContent, TabsList, TabsTrigger, Badge } from "my-v0-project"

export function Default() {
  return (
    <Tabs defaultValue="balances" className="max-w-xl">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="balances">Balances</TabsTrigger>
        <TabsTrigger value="deposits">Deposits</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="balances" className="text-sm">
        Six members, all square. Nothing outstanding.
      </TabsContent>
      <TabsContent value="deposits" className="text-sm">
        Last deposit $40 from Priya, 2 hours ago.
      </TabsContent>
      <TabsContent value="activity" className="text-sm">
        Marco added a photo to “Chamonix”.
      </TabsContent>
    </Tabs>
  )
}

export function WithCounts() {
  return (
    <Tabs defaultValue="open" className="max-w-xl">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="open">
          Open <Badge variant="secondary" className="ml-2">3</Badge>
        </TabsTrigger>
        <TabsTrigger value="resolved">
          Resolved <Badge variant="secondary" className="ml-2">18</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="open" className="text-sm">
        Three reports waiting on a decision.
      </TabsContent>
      <TabsContent value="resolved" className="text-sm">
        Everything else has been actioned.
      </TabsContent>
    </Tabs>
  )
}
