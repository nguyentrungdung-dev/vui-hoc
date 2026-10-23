import type { Subject } from "./documents";

export type RevisionKind = "documents" | "topics";
export type RevisionSource = {
  page: number;
  documentId: string;
  title: string;
  sourcePage: number;
  fileIndex: number;
  pdf: boolean;
};
export type Revision = {
  kind: RevisionKind;
  documentIds: string[];
  sources: RevisionSource[];
};
export type RevisionCatalog = {
  documents: {
    id: string;
    title: string;
    subject: Subject;
    topics: string[];
    pageCount: number;
    partial: boolean;
  }[];
  sets: {
    id: string;
    title: string;
    subject: Subject;
    kind: RevisionKind;
    count: number;
    status: string;
    createdAt: string;
  }[];
};
export function sourceUrl(source: RevisionSource) {
  return `/api/documents/${source.documentId}/files/${source.fileIndex}${source.pdf ? `#page=${source.sourcePage}` : ""}`;
}
