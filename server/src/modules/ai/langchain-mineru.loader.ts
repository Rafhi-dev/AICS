import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document } from '@langchain/core/documents';
import { mineruService } from './mineru.service';
import { geminiService } from './gemini.service';

/**
 * LangChain Document Loader khusus untuk MinerU Cloud API
 * Mengubah dokumen PDF/berkas ke dalam LangChain Document objects berstruktur tinggi.
 */
export class MinerUDocumentLoader extends BaseDocumentLoader {
  constructor(
    private filePath: string,
    private fileName: string,
    private mineruToken?: string | null,
    private geminiKey?: string | null
  ) {
    super();
  }

  public async load(): Promise<Document[]> {
    console.log(`[MinerUDocumentLoader] Memuat dokumen via LangChain-MinerU: ${this.fileName}...`);
    let extractedMarkdown = '';

    // 1. Ekstraksi dengan MinerU Cloud API jika token tersedia
    if (this.mineruToken && this.mineruToken.trim().length > 0) {
      try {
        extractedMarkdown = await mineruService.extractDocument(
          this.filePath,
          this.fileName,
          this.mineruToken
        );
      } catch (err: any) {
        console.warn('[MinerUDocumentLoader] MinerU ekstraksi gagal:', err?.message || err);
      }
    }

    // 2. Fallback otomatis ke Gemini Multimodal jika MinerU kosong atau gagal
    if (!extractedMarkdown || extractedMarkdown.trim().length < 50) {
      console.log('[MinerUDocumentLoader] Menggunakan fallback Google Gemini Multimodal...');
      extractedMarkdown = await geminiService.extractTextFromDocument(
        this.filePath,
        'application/pdf',
        this.geminiKey
      );
    }

    return [
      new Document({
        pageContent: extractedMarkdown,
        metadata: {
          source: this.filePath,
          fileName: this.fileName,
          loader: 'langchain-mineru',
          extractedAt: new Date().toISOString(),
        },
      }),
    ];
  }
}
