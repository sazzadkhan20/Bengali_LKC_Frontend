import type { Metadata } from "next";
import { ContributePageContent } from "@/components/public/ContributePageContent";

export const metadata: Metadata = {
  title: "Apply to Contribute",
  description:
    "Request an invitation to contribute to the Bengali Local Knowledge Core (Ben-LKC).",
};

export default function ContributePage() {
  return <ContributePageContent />;
}
