import type { PDFDataRangeTransport, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { DocumentInitParameters, PdfJs, TypedArray } from './helpers'
import { useDocument } from './useDocument'
import { usePage } from './usePage'
import { usePageCanvas } from './usePageCanvas'

export interface usePdfOptions {
  onPassword?(callback: (password: string) => unknown, reason: number): unknown
  scale?: number | undefined
  rotate?: 0 | 90 | 180 | 270 | undefined
  width?: number
  height?: number
}

export interface usePdfResult {
  isError: boolean
  pdf: PDFDocumentProxy | null
  page: PDFPageProxy | null
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export function usePdf(
  pdfjs: PdfJs,
  file: string | URL | TypedArray | PDFDataRangeTransport | DocumentInitParameters | null | undefined,
  pageNumber: number,
  options: usePdfOptions = {}
): usePdfResult {
  const document = useDocument(pdfjs, file, options)
  const page = usePage(document.pdf, pageNumber)
  const canvas = usePageCanvas(page.page, options)
  return {
    pdf: document.pdf,
    page: page.page,
    canvasRef: canvas.canvasRef,
    isError: document.isError || page.isError || canvas.isError
  }
}
