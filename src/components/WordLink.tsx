import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type WordLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Word detail links use full page loads in production so navigation stays
 * reliable inside the Hugging Face Spaces iframe (client-side RSC routing
 * can fail there).
 */
export function WordLink({ href, children, className, ...rest }: WordLinkProps) {
  if (process.env.NODE_ENV === "production") {
    return (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}
