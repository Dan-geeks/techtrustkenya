import { useLocation } from "react-router-dom";
import { Seo } from "./Seo";
import { seoForPath } from "@/lib/seoRoutes";

/**
 * Applies the static-route head tags from ROUTE_SEO.
 *
 * Mounted once, after <Routes> in App.tsx. That ordering matters: React runs
 * child effects before parent/sibling effects that come later in the tree, so
 * rendering this after <Routes> means a page's own title effect cannot clobber
 * the tags we just set. Dynamic pages that manage their own <Seo> are excluded
 * by seoForPath returning null.
 */
export const RouteSeo = () => {
  const { pathname } = useLocation();
  const seo = seoForPath(pathname);
  if (!seo) return null;
  return <Seo {...seo} path={pathname} />;
};

export default RouteSeo;
