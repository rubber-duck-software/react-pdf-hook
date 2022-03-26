import type { PDFDataRangeTransport, PDFDocumentLoadingTask, PDFPageProxy } from 'pdfjs-dist'
import React from 'react'

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
export interface DocumentInitParameters {
  url?: string | URL | undefined
  data?: string | number[] | TypedArray | undefined
  range?: PDFDataRangeTransport | undefined
}

export interface PdfJs {
  getDocument(src: string | URL | TypedArray | PDFDataRangeTransport | DocumentInitParameters): PDFDocumentLoadingTask
  PDFDataRangeTransport: typeof PDFDataRangeTransport
}

export type Status = 'not_started' | 'loading' | 'success' | 'error'

export const isBrowser = typeof window !== 'undefined'

export const isLocalFileSystem = isBrowser && window.location.protocol === 'file:'

export function isUndefined(variable: unknown): variable is undefined {
  return typeof variable === 'undefined'
}

export function isNull(variable: unknown): variable is null {
  return variable == null
}

export function isProvided(variable: unknown) {
  return !isUndefined(variable) && !isNull(variable)
}

export function isString(variable: unknown): variable is string {
  return typeof variable === 'string'
}

/**
 * Checks whether a variable provided is an ArrayBuffer.
 *
 * @param {*} variable Variable to check
 */
export function isArrayBuffer(variable: unknown): variable is ArrayBuffer {
  return variable instanceof ArrayBuffer
}

/**
 * Checkes whether a variable provided is a Blob.
 *
 * @param {*} variable Variable to check
 */
export function isBlob(variable: unknown): variable is Blob {
  if (!isBrowser) throw new Error('isBlob can only be used in a browser environment')

  return variable instanceof Blob
}

/**
 * Checkes whether a variable provided is a File.
 *
 * @param {*} variable Variable to check
 */
export function isFile(variable: unknown): variable is File {
  if (!isBrowser) throw new Error('isFile can only be used in a browser environment')

  return variable instanceof File
}

export function isDataURI(str: string): boolean {
  return isString(str) && /^data:/.test(str)
}

export function dataURItoByteString(dataURI: string): string {
  if (!isDataURI(dataURI)) throw new Error('Invalid data URI.')

  const [headersString, dataString] = dataURI.split(',')
  const headers = headersString.split(';')

  if (headers.indexOf('base64') !== -1) {
    return atob(dataString)
  }

  return window.decodeURI(dataString)
}

export function getPixelRatio() {
  return (isBrowser && window.devicePixelRatio) || 1
}

const allowFileAccessFromFilesTip =
  'On Chromium based browsers, you can use --allow-file-access-from-files flag for debugging purposes.'

export function displayCORSWarning() {
  if (!isLocalFileSystem) {
    console.warn(
      `Loading PDF as base64 strings/URLs may not work on protocols other than HTTP/HTTPS. ${allowFileAccessFromFilesTip}`
    )
  }
}

export function isCancelException(error: Error) {
  return error.name === 'RenderingCancelledException'
}

export function loadFromFile(file: Blob) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = (event) => {
      if (event?.target?.error) {
        switch (event.target.error.code) {
          case event.target.error.NOT_FOUND_ERR:
            return reject(new Error('Error while reading a file: File not found.'))
          case event.target.error.SECURITY_ERR:
            return reject(new Error('Error while reading a file: Security error.'))
          case event.target.error.ABORT_ERR:
            return reject(new Error('Error while reading a file: Aborted.'))
          default:
            return reject(new Error('Error while reading a file.'))
        }
      } else {
        return reject(new Error('Unknown Error'))
      }
    }
    reader.readAsArrayBuffer(file)

    return null
  })
}

export function useStableAccessor<T>(value: T) {
  const initialPersisterKey = React.useRef<{ value: T }>({ value })
  const getValue = React.useCallback(() => {
    return initialPersisterKey.current.value
  }, [initialPersisterKey.current])
  initialPersisterKey.current.value = value
  return getValue
}

export function getScale(page: PDFPageProxy, options: { scale?: number; width?: number; height?: number; rotate?: number }) {
  const rotate = options.rotate || page.rotate
  // Be default, we'll render page at 100% * scale width.
  let pageScale = 1

  // Passing scale explicitly null would cause the page not to render
  const scaleWithDefault: number = !isProvided(options.scale) ? 1 : (options.scale as number)

  // If width/height is defined, calculate the scale of the page so it could be of desired width.
  if (options.width || options.height) {
    const viewport = page.getViewport({ scale: 1, rotation: rotate })
    pageScale = options.width ? options.width / viewport.width : (options.height as number) / viewport.height
  }

  return scaleWithDefault * pageScale
}

export type CancelablePromise<T> = Promise<T> & {
  cancel(): void
}

export function makeCancellablePromise<T>(promise: Promise<T>): CancelablePromise<T> {
  let isCancelled = false

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise.then((...args) => !isCancelled && resolve(...args)).catch((error) => !isCancelled && reject(error))
  })

  return Object.assign(wrappedPromise, {
    cancel() {
      isCancelled = true
    }
  })
}
