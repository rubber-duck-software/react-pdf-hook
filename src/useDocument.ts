import { PDFDataRangeTransport, PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import React from 'react'
import {
  CancelablePromise,
  makeCancellablePromise,
  PdfJs,
  Status,
  dataURItoByteString,
  displayCORSWarning,
  isArrayBuffer,
  isBlob,
  isBrowser,
  isDataURI,
  isFile,
  loadFromFile,
  useStableAccessor,
  TypedArray,
  DocumentInitParameters
} from './helpers'

export interface useDocumentOptions {
  onPassword?(callback: (password: string) => unknown, reason: number): unknown
}

export type useDocumentResult =
  | {
      isLoading: boolean
      isError: boolean
      isIdle: boolean
      isSuccess: false
      pdf: null
    }
  | {
      isLoading: false
      isError: false
      isIdle: false
      isSuccess: true
      pdf: PDFDocumentProxy
    }

export function useDocument(
  pdfjs: PdfJs,
  file: string | URL | TypedArray | PDFDataRangeTransport | DocumentInitParameters | null | undefined,
  options: useDocumentOptions = {}
): useDocumentResult {
  const getOptions = useStableAccessor(options)
  const [status, setStatus] = React.useState<Status>('not_started')
  const [_, setRunningTask] = React.useState<CancelablePromise<any> | null>(null)
  const [__, setLoadingTask] = React.useState<PDFDocumentLoadingTask | null>(null)
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null)

  const cancelTasks = React.useCallback(() => {
    setRunningTask((task) => {
      if (task) {
        task.cancel()
      }
      return null
    })
    setLoadingTask((task) => {
      if (task) {
        task.destroy()
      }
      return null
    })
  }, [setRunningTask, setLoadingTask])

  React.useEffect(() => {
    cancelTasks()

    const cancellable = makeCancellablePromise(findDocumentSource(pdfjs, file))
    setRunningTask(cancellable)

    cancellable
      .then((source) => {
        if (!source) {
          setStatus('not_started')
          setPdf(null)
          return
        }
        setStatus('loading')
        setPdf(null)

        const loadingTask = pdfjs.getDocument({ ...source, ...options })
        setLoadingTask(loadingTask)
        loadingTask.onPassword = getOptions().onPassword || defaultOnPassword
        const cancellable = makeCancellablePromise(loadingTask.promise)
        setRunningTask(cancellable)

        cancellable
          .then((pdf) => {
            setPdf(pdf)
            setStatus('success')
          })
          .catch((error) => {
            setPdf(null)
            console.warn(error)
            setStatus('error')
          })
      })
      .catch((error) => {
        setPdf(null)
        console.warn(error)
        setStatus('error')
      })

    return () => cancelTasks()
  }, [file, cancelTasks, setPdf, setStatus, getOptions])

  if (status === 'success' && pdf) {
    return {
      pdf,
      isSuccess: true,
      isError: false,
      isIdle: false,
      isLoading: false
    }
  } else if (status === 'success') {
    throw new Error('Status is success but the pdf was not found. This is unexpected')
  } else {
    return {
      isError: status === 'error',
      isLoading: status === 'loading',
      isIdle: status === 'not_started',
      isSuccess: false,
      pdf: null
    }
  }
}

function defaultOnPassword(callback: (password: string) => unknown, reason: number) {
  switch (reason) {
    case 1: {
      // eslint-disable-next-line no-alert
      const password = prompt('Enter the password to open this PDF file.')
      callback(password as string)
      break
    }
    case 2: {
      // eslint-disable-next-line no-alert
      const password = prompt('Invalid password. Please try again.')
      callback(password as string)
      break
    }
    default:
  }
}

/**
 * Finds a document source based on props.
 */
async function findDocumentSource(
  pdfJs: PdfJs,
  file: string | URL | TypedArray | PDFDataRangeTransport | DocumentInitParameters | null | undefined
): Promise<DocumentInitParameters | null> {
  if (!file) {
    return null
  }

  // File is a string
  if (typeof file === 'string') {
    if (isDataURI(file)) {
      const fileByteString = dataURItoByteString(file)
      return { data: fileByteString }
    }

    displayCORSWarning()
    return { url: file }
  } else if (file instanceof pdfJs.PDFDataRangeTransport) {
    return { range: file }
  } else if (isArrayBuffer(file)) {
    return { data: file }
  } else if (isBrowser) {
    // File is a Blob
    if (isBlob(file) || isFile(file)) {
      const data = await loadFromFile(file)
      return { data }
    }
  }

  if (typeof file !== 'object') {
    throw new Error('Invalid parameter in file, need either Uint8Array, string or a parameter object')
  } else if (!isDocumentInitParameters(file)) {
    throw new Error('Invalid parameter object: need either .data, .range or .url')
  } else if (typeof file.url === 'string') {
    // @ts-ignore
    if (isDataURI(file.url)) {
      // @ts-ignore
      const { url, ...otherParams } = file
      const fileByteString = dataURItoByteString(url)
      return { data: fileByteString, ...otherParams }
    }

    displayCORSWarning()
  }
  return file
}

function isDocumentInitParameters(variable: unknown): variable is DocumentInitParameters {
  return (
    typeof variable === 'object' &&
    // @ts-ignore
    (variable.url || variable.data || variable.range)
  )
}
