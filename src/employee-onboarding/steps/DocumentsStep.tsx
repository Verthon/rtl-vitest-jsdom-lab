import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import type { DocumentUpload, Documents } from '../types'

let documentIdCounter = 0

function nextDocumentId() {
  documentIdCounter += 1
  return `document-${documentIdCounter}`
}

export function DocumentsStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: Documents
  onChange: (next: Documents) => void
  onNext: () => void
  onBack: () => void
}) {
  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    const uploads: DocumentUpload[] = Array.from(files).map((file) => ({
      id: nextDocumentId(),
      fileName: file.name,
    }))
    onChange({ uploads: [...answers.uploads, ...uploads] })
  }

  function removeUpload(id: string) {
    onChange({ uploads: answers.uploads.filter((upload) => upload.id !== id) })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Documents</h2>

      <Input
        type="file"
        multiple
        aria-label="Upload documents"
        onChange={(event) => handleFilesSelected(event.target.files)}
      />

      {answers.uploads.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No documents uploaded yet.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {answers.uploads.map((upload) => (
            <li key={upload.id}>
              <Card>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm">{upload.fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.id)}
                    aria-label={`Remove ${upload.fileName}`}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  )
}
