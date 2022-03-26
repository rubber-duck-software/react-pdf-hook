import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import React from 'react'
import { Status, CancelablePromise, makeCancellablePromise } from './helpers'

export type usePageResults =
  | {
      isLoading: boolean
      isError: boolean
      isIdle: boolean
      isSuccess: false
      page: null
    }
  | {
      isLoading: false
      isError: false
      isIdle: false
      isSuccess: true
      page: PDFPageProxy
    }

export function usePage(pdf: PDFDocumentProxy | null | undefined, pageNumber: number): usePageResults {
  const [_, setRunningTask] = React.useState<CancelablePromise<PDFPageProxy> | null>(null)
  const [status, setStatus] = React.useState<Status>('not_started')
  const cancelRunningTask = React.useCallback(() => {
    setRunningTask((task) => {
      if (task) {
        task.cancel()
      }
      return null
    })
  }, [setRunningTask])

  const page = React.useRef<PDFPageProxy | null>(null)
  const setPage = React.useCallback(
    (newValue) => {
      page.current = newValue
    },
    [page]
  )

  React.useEffect(() => {
    if (!pdf || !pageNumber) {
      setStatus('not_started')
      return
    }
    setStatus('loading')
    setPage(null)

    const cancellable = makeCancellablePromise(pdf.getPage(pageNumber))
    setRunningTask(cancellable)

    cancellable
      .then((page) => {
        setPage(page)
        setStatus('success')
      })
      .catch((error) => {
        console.warn(error)
        setStatus('error')
        setPage(null)
      })
    return () => {
      cancelRunningTask()
    }
  }, [pageNumber, pdf, cancelRunningTask])
  if (status === 'success' && page.current) {
    return {
      page: page.current,
      isSuccess: true,
      isError: false,
      isIdle: false,
      isLoading: false
    }
  } else if (status === 'success') {
    throw new Error('Status is success but the page was not found. This is unexpected')
  } else {
    return {
      isError: status === 'error',
      isLoading: status === 'loading',
      isIdle: status === 'not_started',
      isSuccess: false,
      page: null
    }
  }
}
