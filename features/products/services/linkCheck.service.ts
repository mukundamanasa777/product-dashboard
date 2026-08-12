import {
  checkUrl,
  mapWithConcurrency,
} from "@/features/tools/services/urlValidator.service";
import {
  findLinkCheckCandidates,
  markLinksNotFound,
  type LinkCheckCandidate,
} from "../repositories/product.repository";

const CONCURRENCY = 8;

export interface LinkCheckSummary {
  checked: number;
  okCount: number;
  brokenCount: number;
}

/**
 * Actively fetches every checkable product's own URL (see
 * findLinkCheckCandidates) and flags whichever ones fail as NOT_FOUND —
 * reusing the exact same checker built for Tools > URL Validator, so a
 * product gets the same OK/timeout/blocked/challenge classification here
 * as it would from the standalone tool. Flagged products land in PENDING
 * with a remark, same as any other auto-detected change — this doesn't
 * block anything directly; Approve (in the existing review flow) is what
 * actually confirms it's gone.
 */
export async function checkAllProductLinks(): Promise<LinkCheckSummary> {
  const candidates = await findLinkCheckCandidates();
  console.log("candidates", candidates.map((c) => c.id));

  const checked = await mapWithConcurrency(
    candidates,
    CONCURRENCY,
    async (product: LinkCheckCandidate) => ({
      product,
      outcome: await checkUrl(product.productUrl),
    }),
  );

  const broken = checked
    .filter(({ outcome }) => !outcome.result.startsWith("OK"))
    .map(({ product }) => product);

  await markLinksNotFound(broken);

  return {
    checked: candidates.length,
    brokenCount: broken.length,
    okCount: candidates.length - broken.length,
  };
}
