import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { config } from '../../config';

export interface MineruBatchResponse {
  code: number;
  msg?: string;
  data?: {
    batch_id: string;
    file_urls: string[];
  };
}

export interface MineruResultResponse {
  code: number;
  msg?: string;
  data?: {
    batch_id: string;
    extract_result?: Array<{
      state: 'done' | 'running' | 'pending' | 'failed';
      full_zip_url?: string;
      markdown_url?: string;
      err_msg?: string;
    }>;
  };
}

export class MineruService {
  private static instance: MineruService;

  private constructor() {}

  public static getInstance(): MineruService {
    if (!MineruService.instance) {
      MineruService.instance = new MineruService();
    }
    return MineruService.instance;
  }

  /**
   * Ekstraksi dokumen PDF / berkas menggunakan MinerU Cloud API
   * Mengembalikan teks hasil konversi Markdown terstruktur tinggi.
   */
  public async extractDocument(
    filePath: string,
    fileName: string,
    tokenOverride?: string | null
  ): Promise<string> {
    const token = tokenOverride?.trim() || config.mineruApiToken?.trim();

    if (!token) {
      console.log('[MineruService] Token MinerU tidak disetel, melewati MinerU...');
      return '';
    }

    if (!fs.existsSync(filePath)) {
      console.error(`[MineruService] File tidak ditemukan: ${filePath}`);
      return '';
    }

    try {
      console.log(`[MineruService] Memulai pengunggahan ${fileName} ke MinerU Cloud API...`);
      const safeName = path.basename(fileName) || 'document.pdf';

      // 1. Dapatkan presigned upload URL
      const batchRes = await fetch('https://mineru.net/api/v4/file-urls/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          files: [{ name: safeName }],
          model_version: 'vlm',
        }),
      });

      const batchData = (await batchRes.json()) as MineruBatchResponse;

      if (batchData.code !== 0 || !batchData.data?.file_urls?.length) {
        console.warn('[MineruService] Gagal membuat batch task di MinerU:', batchData.msg || batchData);
        return '';
      }

      const uploadUrl = batchData.data.file_urls[0];
      const batchId = batchData.data.batch_id;
      console.log(`[MineruService] Mengunggah file ke MinerU storage (Batch ID: ${batchId})...`);

      // 2. Upload file ke presigned URL dengan PUT
      const fileBuffer = fs.readFileSync(filePath);
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': '', // Dikosongkan agar signature S3 presigned URL valid
        },
        body: fileBuffer,
      });

      if (!putRes.ok) {
        console.warn(`[MineruService] Gagal PUT file ke MinerU URL: HTTP ${putRes.status}`);
        return '';
      }

      console.log('[MineruService] File berhasil diunggah! Menunggu pemrosesan dokumen di MinerU Cloud...');

      // 3. Polling status ekstraksi (maksimum 45 detik)
      const maxAttempts = 15;
      const intervalMs = 3000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));

        try {
          const statusRes = await fetch(
            `https://mineru.net/api/v4/extract-results/batch/${batchId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const statusData = (await statusRes.json()) as MineruResultResponse;

          if (statusData.code === 0 && statusData.data?.extract_result?.length) {
            const item = statusData.data.extract_result[0];
            console.log(`[MineruService] Status coba ke-${attempt}: ${item.state}`);

            if (item.state === 'done') {
              // Jika ada URL markdown langsung
              if (item.markdown_url) {
                const mdRes = await fetch(item.markdown_url);
                const mdText = await mdRes.text();
                if (mdText.trim()) {
                  console.log(`[MineruService] Ekstraksi sukses! Panjang teks: ${mdText.length} karakter.`);
                  return mdText;
                }
              }

              // Jika hasil berupa zip
              if (item.full_zip_url) {
                console.log(`[MineruService] Mengunduh hasil dari MinerU zip: ${item.full_zip_url}`);
                const zipRes = await fetch(item.full_zip_url);
                const arrayBuffer = await zipRes.arrayBuffer();
                // Ekstraksi markdown dari buffer zip
                const unzippedText = await this.extractMarkdownFromZipBuffer(Buffer.from(arrayBuffer));
                if (unzippedText) {
                  console.log(`[MineruService] Berhasil mengekstrak ${unzippedText.length} karakter dari zip MinerU!`);
                  return unzippedText;
                }
              }
            } else if (item.state === 'failed') {
              console.warn('[MineruService] Pemrosesan gagal di MinerU:', item.err_msg);
              return '';
            }
          }
        } catch (pollErr: any) {
          console.warn(`[MineruService] Percobaan polling #${attempt} gagal:`, pollErr?.message || pollErr);
        }
      }

      console.warn('[MineruService] Waktu tunggu pemrosesan MinerU habis (timeout).');
      return '';
    } catch (err: any) {
      console.error('[MineruService Error]:', err?.message || err);
      return '';
    }
  }

  /**
   * Mengambil teks .md dari arsip ZIP MinerU
   */
  private async extractMarkdownFromZipBuffer(zipBuffer: Buffer): Promise<string> {
    try {
      // Baca header zip sederhana mencari file .md
      // Mengingat struktur output MinerU selalu menyertakan file .md di root atau subfolder
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.entryName.endsWith('.md') && !entry.isDirectory) {
          return entry.getData().toString('utf8');
        }
      }

      // Jika tidak ada adm-zip atau nama lain, baca entry teks pertama
      for (const entry of zipEntries) {
        if (!entry.isDirectory && (entry.entryName.endsWith('.txt') || entry.entryName.endsWith('.json'))) {
          return entry.getData().toString('utf8');
        }
      }
    } catch (zipErr: any) {
      // Jika library adm-zip tidak terpasang, coba cari plain text pattern
      console.warn('[MineruService] adm-zip tidak tersedia, mencoba membaca langsung.');
    }
    return '';
  }
}

export const mineruService = MineruService.getInstance();
