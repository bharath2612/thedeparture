import "server-only";

// Supplier net cost, our margin, and the per-supplier quote comparison are
// operator information. They are the whole point of a rate-shop console and
// they are wrong on a customer's screen: a traveller does not need to know
// what we paid, and a competitor should not be able to read our supplier list
// and our buying prices off a public page.
//
// The default is OFF. Deploying without configuring anything gives the safe
// result, which is the right way round for a flag whose failure mode is
// publishing your cost base. Set SHOW_OPS_PRICING=true locally to get the
// console back.
//
// This is a display gate, not a security boundary. It decides what is
// rendered, so the numbers never reach the customer's HTML at all, but
// anything genuinely secret belongs behind auth, not behind this.
export function showOpsPricing(): boolean {
  return process.env.SHOW_OPS_PRICING === "true";
}
