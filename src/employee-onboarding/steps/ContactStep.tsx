import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ContactPerson } from '../types'

let contactIdCounter = 0

function nextContactId() {
  contactIdCounter += 1
  return `contact-${contactIdCounter}`
}

export function ContactStep({
  answers,
  onChange,
  onNext,
  onBack,
}: {
  answers: ContactPerson[]
  onChange: (next: ContactPerson[]) => void
  onNext: () => void
  onBack: () => void
}) {
  function addContact() {
    onChange([...answers, { id: nextContactId(), name: '', relationship: '', phone: '' }])
  }

  function removeContact(id: string) {
    onChange(answers.filter((contact) => contact.id !== id))
  }

  function updateContact(id: string, patch: Partial<ContactPerson>) {
    onChange(answers.map((contact) => (contact.id === id ? { ...contact, ...patch } : contact)))
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Emergency contacts</h2>

      <div className="flex flex-col gap-3">
        {answers.map((contact, index) => (
          <Card key={contact.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Contact {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(contact.id)}
                  aria-label={`Remove contact ${index + 1}`}
                >
                  Remove
                </Button>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`contact-name-${contact.id}`}>Name</FieldLabel>
                  <Input
                    id={`contact-name-${contact.id}`}
                    value={contact.name}
                    onChange={(event) => updateContact(contact.id, { name: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`contact-relationship-${contact.id}`}>Relationship</FieldLabel>
                  <Input
                    id={`contact-relationship-${contact.id}`}
                    value={contact.relationship}
                    onChange={(event) =>
                      updateContact(contact.id, { relationship: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`contact-phone-${contact.id}`}>Phone</FieldLabel>
                  <Input
                    id={`contact-phone-${contact.id}`}
                    type="tel"
                    value={contact.phone}
                    onChange={(event) => updateContact(contact.id, { phone: event.target.value })}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Button variant="outline" onClick={addContact}>
          Add another contact
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  )
}
