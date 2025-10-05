'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { FileType } from '@/lib/types/financial'

interface UploadedFileInfo {
  file: File
  fileType: FileType
  fiscalYear: number
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

interface PdfUploadProps {
  onFilesUploaded: (files: UploadedFileInfo[]) => void
  expectedFiles?: {
    fileType: FileType
    fiscalYear: number
    label: string
  }[]
}

export function PdfUpload({ onFilesUploaded, expectedFiles }: PdfUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFileInfo[] = acceptedFiles.map((file) => ({
      file,
      fileType: 'financial_statement', // デフォルト、後で選択可能にする
      fiscalYear: new Date().getFullYear(), // デフォルト、後で選択可能にする
      status: 'pending' as const,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const updateFileInfo = (
    index: number,
    updates: Partial<UploadedFileInfo>
  ) => {
    setUploadedFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, ...updates } : file))
    )
  }

  const handleUpload = () => {
    onFilesUploaded(uploadedFiles)
  }

  return (
    <div className="space-y-6">
      {/* ドロップゾーン */}
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium mb-2">
          {isDragActive
            ? 'ここにファイルをドロップ'
            : 'PDFファイルをドラッグ＆ドロップ'}
        </p>
        <p className="text-sm text-gray-500">
          または、クリックしてファイルを選択
        </p>
        <p className="text-xs text-gray-400 mt-2">
          決算書・勘定科目内訳書のPDFファイル（3期分×2種類＝計6ファイル）
        </p>
      </Card>

      {/* アップロードファイル一覧 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">アップロードファイル</h3>
          <div className="space-y-3">
            {uploadedFiles.map((fileInfo, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <File className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {fileInfo.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {/* ファイル情報選択 */}
                      <div className="flex gap-3 mt-3">
                        <select
                          className="text-sm border rounded px-2 py-1"
                          value={fileInfo.fileType}
                          onChange={(e) =>
                            updateFileInfo(index, {
                              fileType: e.target.value as FileType,
                            })
                          }
                        >
                          <option value="financial_statement">決算書</option>
                          <option value="account_details">
                            勘定科目内訳書
                          </option>
                        </select>

                        <select
                          className="text-sm border rounded px-2 py-1"
                          value={fileInfo.fiscalYear}
                          onChange={(e) =>
                            updateFileInfo(index, {
                              fiscalYear: parseInt(e.target.value),
                            })
                          }
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - i
                            return (
                              <option key={year} value={year}>
                                {year}年度
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      {/* ステータス表示 */}
                      {fileInfo.status === 'success' && (
                        <div className="flex items-center gap-2 mt-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">読み込み完了</span>
                        </div>
                      )}
                      {fileInfo.status === 'error' && (
                        <div className="flex items-center gap-2 mt-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">
                            {fileInfo.error || 'エラーが発生しました'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleUpload}
            className="w-full"
            disabled={uploadedFiles.length === 0}
          >
            アップロードして読み込み開始
          </Button>
        </div>
      )}

      {/* 期待されるファイルのガイド */}
      {expectedFiles && expectedFiles.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">
            必要なファイル（計6ファイル）
          </h4>
          <ul className="space-y-1 text-sm text-blue-800">
            {expectedFiles.map((expected, index) => {
              const uploaded = uploadedFiles.find(
                (f) =>
                  f.fileType === expected.fileType &&
                  f.fiscalYear === expected.fiscalYear
              )
              return (
                <li key={index} className="flex items-center gap-2">
                  {uploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-blue-400 rounded-full" />
                  )}
                  <span className={uploaded ? 'text-green-700' : ''}>
                    {expected.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
