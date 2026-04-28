/**
 * Sellable ATP: total on-hand minus reservations and non-sellable holds.
 * quantity = total physical on-hand (good + damaged + unconfirmed extra, etc.)
 */
export const recomputeAvailable = (doc) => {
    const q = Number(doc.quantity ?? 0);
    const r = Number(doc.reserved ?? 0);
    const mh = Number(doc.missingHold ?? 0);
    const dq = Number(doc.damagedQty ?? 0);
    const eh = Number(doc.extraHold ?? 0);
    doc.available = Math.max(0, q - r - mh - dq - eh);
};
