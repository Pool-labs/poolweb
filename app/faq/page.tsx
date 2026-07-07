import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function FAQPage() {
  return (
    <div className="min-h-screen py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-center mb-6 text-navy">
            <span className="text-sticker text-pool-yellow">WTF</span> Is Pool?!
          </h1>

          <p className="text-lg sm:text-xl text-navy/80 text-center mb-12">
            All your questions answered in one place!
          </p>

          <div className="sticker rounded-3xl bg-white p-6 sm:p-8">
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="item-1" className="border-b-2 border-navy/15">
                <AccordionTrigger className="text-left text-lg sm:text-xl font-bold text-navy hover:text-pool-blue transition-colors">
                  What is Pool?
                </AccordionTrigger>
                <AccordionContent className="text-navy/85 text-base sm:text-lg leading-relaxed pt-2">
                  Pool makes group spending easy — no IOUs, no chasing anyone down. Whether
                  it&apos;s daily lunches with coworkers, weekly hangouts with friends, group trips, or any
                  shared activity, Pool handles it all. Deposit equal amounts into a shared pool, and everyone gets
                  access to a virtual card for tap-to-pay purchases.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b-2 border-navy/15">
                <AccordionTrigger className="text-left text-lg sm:text-xl font-bold text-navy hover:text-pool-blue transition-colors">
                  How does joining a Pool work?
                </AccordionTrigger>
                <AccordionContent className="text-navy/85 text-base sm:text-lg leading-relaxed pt-2">
                  Users receive an invite or enter a pool code, with the ability to review terms before committing. Once
                  you join, you can add funds via your preferred method (bank account or debit card), and a virtual
                  debit card is generated for pool members.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-b-2 border-navy/15">
                <AccordionTrigger className="text-left text-lg sm:text-xl font-bold text-navy hover:text-pool-blue transition-colors">
                  How do I use the virtual card?
                </AccordionTrigger>
                <AccordionContent className="text-navy/85 text-base sm:text-lg leading-relaxed pt-2">
                  The virtual card integrates with Apple or Google Wallet for easy tap-to-pay purchases. All
                  transactions are deducted from the pool, and members receive notifications about spending activity.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-b-2 border-navy/15">
                <AccordionTrigger className="text-left text-lg sm:text-xl font-bold text-navy hover:text-pool-blue transition-colors">
                  Are pools temporary or ongoing?
                </AccordionTrigger>
                <AccordionContent className="text-navy/85 text-base sm:text-lg leading-relaxed pt-2">
                  Pool offers flexibility! Pools can be ongoing (like for daily lunches, topped up as needed) or
                  temporary (like for trips, with unspent funds refunded when the pool closes, members leave, or after
                  inactivity).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-none">
                <AccordionTrigger className="text-left text-lg sm:text-xl font-bold text-navy hover:text-pool-blue transition-colors">
                  Can I send money to friends?
                </AccordionTrigger>
                <AccordionContent className="text-navy/85 text-base sm:text-lg leading-relaxed pt-2">
                  Yes! Pool supports sending and receiving money.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  )
}
