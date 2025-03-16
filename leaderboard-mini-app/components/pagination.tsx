"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { generatePagination } from "@/lib/utils";
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export default function CustomPagination({
  totalPages,
}: {
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const all_pages = generatePagination(currentPage, totalPages);

  return (
    <Pagination className="mt-16">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={currentPage === 1}
            tabIndex={currentPage === 1 ? -1 : undefined}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
            href={createPageURL(currentPage - 1)}
          />
        </PaginationItem>
        {all_pages.map((page, index) => {
          if (page === "...") {
            return (
              <PaginationItem key={index}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }
          return (
            <PaginationItem key={index}>
              <PaginationLink
                isActive={currentPage === page}
                href={createPageURL(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        <PaginationItem>
          <PaginationNext
            aria-disabled={currentPage === Number(all_pages.at(-1))}
            tabIndex={currentPage === Number(all_pages.at(-1)) ? -1 : undefined}
            className={currentPage === Number(all_pages.at(-1)) ? "pointer-events-none opacity-50" : undefined}
            href={createPageURL(currentPage + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
