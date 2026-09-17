import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface CategoriesPaginationProps { pageNumber: number; pageCount: number; totalCount: number; hasMore: boolean; showingLabel: string; onPageChange: (page: number) => void; }

export function CategoriesPagination({ pageNumber, pageCount, totalCount, hasMore, showingLabel, onPageChange }: CategoriesPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageCount));
  const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const from = totalCount === 0 ? 0 : (pageNumber - 1) * pageCount + 1;
  const to = Math.min(pageNumber * pageCount, totalCount);
  const label = showingLabel.replace("{{from}}", String(from)).replace("{{to}}", String(to)).replace("{{total}}", String(totalCount));
  const go = (event: React.MouseEvent<HTMLAnchorElement>, page: number) => { event.preventDefault(); onPageChange(page); };

  return <div className="space-y-3"><Pagination><PaginationContent><PaginationItem><PaginationPrevious href="#" aria-disabled={pageNumber === 1} className={pageNumber === 1 ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { if (pageNumber > 1) go(event, pageNumber - 1); }} /></PaginationItem>{start > 1 && <PaginationItem><PaginationLink href="#" onClick={(event) => go(event, 1)}>1</PaginationLink></PaginationItem>}{start > 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}{pages.map((page) => <PaginationItem key={page}><PaginationLink href="#" isActive={page === pageNumber} onClick={(event) => go(event, page)}>{page}</PaginationLink></PaginationItem>)}{end < totalPages - 1 && <PaginationItem><PaginationEllipsis /></PaginationItem>}{end < totalPages && <PaginationItem><PaginationLink href="#" onClick={(event) => go(event, totalPages)}>{totalPages}</PaginationLink></PaginationItem>}<PaginationItem><PaginationNext href="#" aria-disabled={!hasMore} className={!hasMore ? "pointer-events-none opacity-50" : undefined} onClick={(event) => { if (hasMore) go(event, pageNumber + 1); }} /></PaginationItem></PaginationContent></Pagination><p className="text-center text-sm text-slate-500">{label}</p></div>;
}