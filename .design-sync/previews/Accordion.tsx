import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "my-v0-project"

const FAQ = [
  { q: "What is Pool?", a: "A social network for people who spend time — and money — together." },
  { q: "Is it a bank?", a: "No. Pool sits on top of a shared virtual card your crew spends from." },
  { q: "When does the beta open?", a: "Pre-register and you're first in when it fills." },
]

export function Single() {
  return (
    <Accordion type="single" collapsible defaultValue="item-0" className="max-w-lg">
      {FAQ.map((f, i) => (
        <AccordionItem key={f.q} value={`item-${i}`}>
          <AccordionTrigger>{f.q}</AccordionTrigger>
          <AccordionContent>{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function Multiple() {
  return (
    <Accordion type="multiple" defaultValue={["item-0", "item-1"]} className="max-w-lg">
      {FAQ.map((f, i) => (
        <AccordionItem key={f.q} value={`item-${i}`}>
          <AccordionTrigger>{f.q}</AccordionTrigger>
          <AccordionContent>{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
