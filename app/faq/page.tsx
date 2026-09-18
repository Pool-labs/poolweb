import Link from "next/link"
import { APP_STORE_URL } from "@/lib/store-links"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import BrandPattern from "@/components/brand/pattern"

/**
 * FAQ, rewritten for v1 of the shipped app.
 *
 * ⚠️ THE PREVIOUS VERSION DESCRIBED A PRODUCT THAT DOES NOT EXIST, and one
 * answer was the opposite of the truth: *"Pool supports sending and receiving
 * money."* It does not. Pool never holds, moves or transmits funds — settling up
 * happens on the rails people already use, between the two people, and Pool is
 * not part of that transfer. It also promised funding "via bank account or debit
 * card", tap-to-pay from a virtual card, and refunds of unspent funds. None of
 * that is v1.
 *
 * The rules these answers are held to, and why they matter beyond accuracy:
 *  - Pool never holds or moves money. It is the single most important sentence
 *    on this page — it is what keeps Pool out of money-transmitter territory,
 *    and the app states it too.
 *  - The Pool Card is FUTURE TENSE. No dates. Same rule the app applies to its
 *    own card copy.
 *  - No fees, because there are none.
 *  - Store links are REAL once the app is listed, and honestly absent before.
 *    iOS went live 2026-09-18; Android has not, and the answer below says so
 *    rather than implying both. Both read `lib/store-links.ts`.
 */

const FAQ = [
  {
    q: "What is Pool?",
    a: (
      <>
        Pool is a social network for the things you do together — and the money that comes with
        them. Make a pool for your roommates, your brunch crew, a trip, or the weekly coffee run,
        log what gets spent, and everyone can see where things stand. No IOUs, no spreadsheet, no
        chasing anyone down.
      </>
    ),
  },
  {
    q: "Does Pool hold my money?",
    a: (
      <>
        <strong>No.</strong> Pool never holds, moves or transmits your money. It keeps track of who
        spent what and who owes whom — the actual transfer happens directly between the two of you,
        on whichever app you already use. Your money never passes through us.
      </>
    ),
  },
  {
    q: "Then how does settling up work?",
    a: (
      <>
        Pool works out who owes whom, then hands you off to the other person&apos;s own payment
        handle — Venmo, Cash App, PayPal, Zelle or Interac e-Transfer. You pay them there, come
        back, and mark it done. The person receiving the money confirms it, so nothing is settled on
        one person&apos;s word alone.
      </>
    ),
  },
  {
    q: "What about the Pool Card?",
    a: (
      <>
        One shared card the whole group taps is what we are building next. It is not part of this
        version — for now Pool is the record of what your group spends and who owes what, and the
        card is the thing that will make it a single tap.
      </>
    ),
  },
  {
    q: "Does Pool cost anything?",
    a: <>No. There are no fees, no subscription and no charge for settling up.</>,
  },
  {
    q: "How do I start a pool?",
    a: (
      <>
        Make one, give it a name, and invite people by username. A pool can be private — invite
        only — or public, which lets people nearby find it and ask to join. You choose which, and
        you can change your mind later.
      </>
    ),
  },
  {
    q: "What can other people see about me?",
    a: (
      <>
        Only what you choose to share. Location is <strong>city-level</strong> — never your exact
        spot — and being findable in Discover is a setting you turn on. The people in a pool see
        that pool&apos;s activity; nobody outside it does.
      </>
    ),
  },
  {
    q: "What if someone is a problem?",
    a: (
      <>
        You can block anyone, which cuts off messages in both directions and removes you from each
        other&apos;s Discover results, and you can report a message or an account. Reports go to a
        real person, and blocking is never announced to the person blocked.
      </>
    ),
  },
  {
    q: "What are Pool Points?",
    a: (
      <>
        Points are how Pool marks the things you do — starting a pool, logging a spend, showing up
        for your people. They are <strong>not</strong> money: they have no cash value, cannot be
        spent, and cannot be cashed out.
      </>
    ),
  },
  {
    q: "Where can I get the app?",
    a: (
      <>
        Pool is live on the{" "}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline underline-offset-4"
        >
          App Store
        </a>{" "}
        for iPhone and iPad. Android is not on Google Play yet — when it is, the link will be
        on the{" "}
        <Link href="/download" className="font-bold underline underline-offset-4">
          download page
        </Link>
        .
      </>
    ),
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen py-16 sm:py-20 bg-pool-sky relative overflow-hidden">
      <BrandPattern variant="clouds" opacity={0.35} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-center mb-6 text-navy">
            <span className="text-sticker text-pool-yellow">WTF</span> Is Pool?!
          </h1>

          <p className="text-lg sm:text-xl text-navy/80 text-center mb-12">
            All your questions answered in one place.
          </p>

          <div className="sticker rounded-3xl bg-white p-6 sm:p-8">
            <Accordion type="single" collapsible className="w-full space-y-2">
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i + 1}`}
                  className={i === FAQ.length - 1 ? "border-none" : "border-b-2 border-navy/15"}
                >
                  <AccordionTrigger className="text-left text-lg sm:text-xl font-bold text-navy hover:text-pool-blue transition-colors">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-navy/85 text-base sm:text-lg leading-relaxed pt-2">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <p className="mt-10 text-center text-navy/80">
            Still stuck?{" "}
            <Link href="/contact" className="font-bold text-navy underline underline-offset-4">
              Send us a message
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
