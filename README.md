<p align="center">
  <h1 align="center">react-pdf-hook</h1>
  <p align="center">The easiest way to usePdf()</p>
</p>

react-pdf-hook is designed to keep out of your way as you try to render pdf's in React. Inspired by the excellent
[react-pdf](https://github.com/wojtekmaj/react-pdf), react-pdf-hook provides a set of hooks (including an easy to use `usePdf` hook) which allows you to render a pdf in React.

Nearly all javascript pdf renderings rely on [PDF.js](https://mozilla.github.io/pdf.js/). react-pdf-hook is no exception! In fact, the first argument to `usePdf()` is PDF.js, which we assume is setup and ready to go. react-hook-pdf provides useful react abstractions on top of PDF.js.

### Example Usage

```js
import * as pdfjs from 'pdfjs-dist'
import { usePdf } from 'react-hook-pdf'
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

function Pdf() {
  const { pdf, canvasRef } = usePdf(pdfjs, 'http://www.africau.edu/images/default/sample.pdf', 1, { width: 400 })

  return <canvas style={{ display: !pdf ? 'none' : undefined }} ref={canvasRef} />
}
```
