import { PDFPageProxy, RenderTask } from 'pdfjs-dist'
import React from 'react'
import { getPixelRatio, getScale, isCancelException, useStableAccessor, Status } from './helpers'

export interface PageCanvasOptions {
  scale?: number | undefined
  rotate?: 0 | 90 | 180 | 270 | undefined
  width?: number
  height?: number
}

export interface usePageCanvasResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isLoading: boolean
  isError: boolean
  isIdle: boolean
  isSuccess: boolean
}

export function usePageCanvas(page: PDFPageProxy | null | undefined, options: PageCanvasOptions): usePageCanvasResult {
  const getPage = useStableAccessor(page)
  const canvasLayerRef = React.useRef<HTMLCanvasElement | null>(null)
  const [renderStatus, setRenderStatus] = React.useState<Status>('not_started')
  const [_, setRenderingTask] = React.useState<RenderTask | null>(null)
  const cancelRenderingTask = React.useCallback(() => {
    setRenderingTask((task) => {
      if (task) {
        task.cancel()
      }
      return task
    })
  }, [setRenderingTask])

  const getOptions = useStableAccessor(options)

  const onRenderSuccess = React.useCallback(() => {
    setRenderStatus('success')
    setRenderingTask(null)
  }, [setRenderingTask])

  const onRenderError = React.useCallback((error) => {
    setRenderStatus('error')
    if (isCancelException(error)) {
      return
    }
    console.warn(error)
  }, [])

  React.useEffect(() => {
    const canvas = canvasLayerRef.current
    if (!canvas || !page) {
      setRenderStatus('not_started')
    } else {
      setRenderStatus('loading')
      const renderViewport = getRenderViewport(page, getOptions())
      const viewport = getViewport(page, getOptions())

      canvas.width = renderViewport.width
      canvas.height = renderViewport.height

      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      const renderContext = {
        get canvasContext() {
          return canvas.getContext('2d') as CanvasRenderingContext2D
        },
        viewport: renderViewport
      }

      // If another render is in progress, let's cancel it
      cancelRenderingTask()

      const renderer = page.render(renderContext)
      setRenderingTask(renderer)

      renderer.promise.then(onRenderSuccess).catch(onRenderError)
    }
  }, [page, canvasLayerRef.current, getOptions, cancelRenderingTask, onRenderSuccess, onRenderError])

  React.useEffect(() => {
    return () => {
      page?.cleanup()
      const canvasLayer = canvasLayerRef.current
      if (canvasLayer) {
        canvasLayer.width = 0
        canvasLayer.height = 0
      }
    }
  }, [getPage, canvasLayerRef])

  return {
    canvasRef: canvasLayerRef,
    isSuccess: renderStatus === 'success',
    isLoading: renderStatus === 'loading',
    isError: renderStatus === 'error',
    isIdle: renderStatus === 'not_started'
  }
}

function getRenderViewport(page: PDFPageProxy, options: PageCanvasOptions) {
  const pixelRatio = getPixelRatio()
  const scale = getScale(page, options)

  return page.getViewport({
    scale: scale * pixelRatio,
    rotation: options.rotate || page.rotate
  })
}

function getViewport(page: PDFPageProxy, options: PageCanvasOptions) {
  const scale = getScale(page, options)

  return page.getViewport({ scale, rotation: options.rotate || page.rotate })
}
