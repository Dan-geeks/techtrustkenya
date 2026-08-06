import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applySeo, clearJsonLd, SeoInput } from "@/lib/seo";

/**
 * Per-route head tags. Drop one into each page:
 *
 *   <Seo title="Browse Verified Tech" description="..." />
 *
 * `path` defaults to the live location, so pages rarely need to pass it.
 * Private pages should pass `noindex` rather than relying on robots.txt alone -
 * a Disallow stops crawling, not indexing of a URL someone linked to.
 */
export const Seo = (props: SeoInput) => {
  const { pathname } = useLocation();
  const {
    title,
    description,
    path,
    image,
    type,
    noindex,
    jsonLd,
  } = props;

  // jsonLd is usually a fresh array literal each render, so serialise it for the
  // dependency list instead of letting identity churn re-run this every time.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    applySeo({
      title,
      description,
      path: path ?? pathname,
      image,
      type,
      noindex,
      jsonLd: jsonLdKey ? (JSON.parse(jsonLdKey) as Record<string, unknown>[]) : undefined,
    });
    // Structured data is per page; leaving it behind would attach one page's
    // Product schema to the next page the user opens.
    return () => clearJsonLd();
  }, [title, description, path, pathname, image, type, noindex, jsonLdKey]);

  return null;
};

export default Seo;
