/**
 * Stub module for react-pdf.
 * This exists so vite's import-analysis can resolve 'react-pdf' even when the
 * package is not installed.  Individual test files override this via vi.mock().
 */
export const Document = () => null;
export const Page = () => null;
export const pdfjs = { GlobalWorkerOptions: { workerSrc: '' } };
