import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Altar, PrintSheet } from './components/Altar'
import { ClearDialog } from './components/ClearDialog'
import { deleteAltar, listAltars, saveAltar } from './db'
import { generateInscription } from './engine'
import { groundInscription } from './ground'
import { rosa } from './sample'
import { emptyOffering, type AltarRecord, type CandleState, type Offering, type Sentence } from './types'

const DRAFT_KEY = 'veladora-draft'

function loadDraft(): Offering {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyOffering()
    const parsed = JSON.parse(raw) as Partial<Offering>
    return { ...emptyOffering(), ...parsed }
  } catch {
    return emptyOffering()
  }
}

function statusCopy(state: CandleState, detail: string, modelLabel: string): string {
  if (state === 'downloading') return detail || 'Bringing the model onto this machine. This happens once.'
  if (state === 'writing') return 'Writing from what you placed.'
  if (state === 'settled') {
    const writer = modelLabel ? ` Written by ${modelLabel}.` : ''
    return `Inscription is on the table.${writer} Nothing was sent to a server.`
  }
  if (state === 'error') return 'The candle went out. This browser could not run the model. Try again.'
  return 'Candle is unlit.'
}

export default function App() {
  const [offering, setOffering] = useState<Offering>(loadDraft)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [draft, setDraft] = useState('')
  const [state, setState] = useState<CandleState>('unlit')
  const [progress, setProgress] = useState(0)
  const [detail, setDetail] = useState('')
  const [modelLabel, setModelLabel] = useState('')
  const [failure, setFailure] = useState('')
  const [formNote, setFormNote] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [altars, setAltars] = useState<AltarRecord[]>([])
  const [clearOpen, setClearOpen] = useState(false)

  const busy = state === 'downloading' || state === 'writing'
  const ready = offering.name.trim().length > 0 && offering.memory.trim().length >= 20
  const status = useMemo(() => statusCopy(state, detail, modelLabel), [state, detail, modelLabel])

  useEffect(() => {
    document.title = 'Veladora'
    void listAltars()
      .then(setAltars)
      .catch(() => setFormNote('Saved altars could not be read in this browser.'))
  }, [])

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(offering))
  }, [offering])

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  const replacePhoto = (blob: Blob | null) => {
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return blob ? URL.createObjectURL(blob) : null
    })
    setPhotoBlob(blob)
  }

  const update = (key: keyof Offering, value: string) => {
    setOffering((current) => ({ ...current, [key]: value }))
    if (state === 'settled' || state === 'error') {
      setState('unlit')
      setSentences([])
      setDraft('')
      setModelLabel('')
    }
  }

  const resetTable = () => {
    setOffering(emptyOffering())
    setSentences([])
    setDraft('')
    setState('unlit')
    setProgress(0)
    setDetail('')
    setModelLabel('')
    setFailure('')
    setFormNote('')
    setCurrentId(null)
    replacePhoto(null)
    sessionStorage.removeItem(DRAFT_KEY)
  }

  const lightCandle = (event: FormEvent) => {
    event.preventDefault()
    if (!ready || busy) return

    setState('downloading')
    setProgress(0)
    setDetail('Bringing the model onto this machine. This happens once.')
    setDraft('')
    setSentences([])
    setFailure('')
    setFormNote('')
    setModelLabel('')

    void generateInscription(
      offering,
      (update) => {
        setProgress(update.ratio)
        setDetail(update.detail)
        if (update.detail.startsWith('Writing')) setState('writing')
      },
      (text) => {
        setState('writing')
        setDraft((current) => current + text)
      },
    )
      .then((result) => {
        const grounded = groundInscription(result.text, offering)
        setSentences(grounded)
        setDraft('')
        setModelLabel(result.modelLabel)
        setState(grounded.length > 0 ? 'settled' : 'error')
        if (grounded.length === 0) {
          setFailure('The model returned nothing that could be read as an inscription.')
        }
      })
      .catch((error: unknown) => {
        setState('error')
        setFailure(error instanceof Error ? error.message : 'The model could not start.')
      })
  }

  const saveCurrent = () => {
    if (!offering.name.trim()) {
      setFormNote('Add their name before saving this altar.')
      return
    }

    const id = currentId ?? crypto.randomUUID()
    const record: AltarRecord = {
      ...offering,
      id,
      sentences,
      modelLabel,
      photo: photoBlob ?? undefined,
      updatedAt: Date.now(),
    }

    void saveAltar(record)
      .then(() => listAltars())
      .then((records) => {
        setCurrentId(id)
        setAltars(records)
        setFormNote('Saved on this machine.')
      })
      .catch(() => setFormNote('This altar could not be saved in this browser.'))
  }

  const openAltar = (record: AltarRecord) => {
    setOffering({
      name: record.name,
      years: record.years,
      relation: record.relation,
      food: record.food,
      song: record.song,
      memory: record.memory,
    })
    setSentences(record.sentences)
    setDraft('')
    setState(record.sentences.length > 0 ? 'settled' : 'unlit')
    setModelLabel(record.modelLabel ?? '')
    setFailure('')
    setFormNote('')
    setCurrentId(record.id)
    replacePhoto(record.photo ?? null)
  }

  const clearCurrent = () => {
    const id = currentId
    setClearOpen(false)
    resetTable()
    if (!id) return
    void deleteAltar(id)
      .then(() => listAltars())
      .then(setAltars)
      .catch(() => setFormNote('This altar could not be removed.'))
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#altar">
          Veladora
        </a>
        <p className="machine-status">
          On this machine <i aria-hidden="true" />
        </p>
      </header>

      <div id="altar">
        <Altar
          offering={offering}
          photoUrl={photoUrl}
          state={state}
          draft={draft}
          sentences={sentences}
          status={status}
          progress={progress}
        />
      </div>

      <section className="form-wall" aria-labelledby="offerings-heading">
        <form onSubmit={lightCandle}>
          <h2 id="offerings-heading">Offerings</h2>
          <div className="form-grid">
            <label className="field">
              <span>Their name</span>
              <input value={offering.name} onChange={(event) => update('name', event.target.value)} />
            </label>
            <label className="field">
              <span>Years</span>
              <input
                value={offering.years}
                placeholder="1948–2019"
                onChange={(event) => update('years', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Who you are to them</span>
              <input
                value={offering.relation}
                placeholder="Their granddaughter"
                onChange={(event) => update('relation', event.target.value)}
              />
            </label>
            <label className="field">
              <span>A food they loved</span>
              <input value={offering.food} onChange={(event) => update('food', event.target.value)} />
            </label>
            <label className="field">
              <span>A song they played</span>
              <input value={offering.song} onChange={(event) => update('song', event.target.value)} />
            </label>
            <label className="field field-wide">
              <span>One memory, in your words</span>
              <textarea
                rows={4}
                value={offering.memory}
                onChange={(event) => update('memory', event.target.value)}
              />
            </label>
            <div className="field field-wide">
              <span id="photo-label">Photo</span>
              <input
                id="photo"
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  if (file.size > 8_000_000) {
                    setFormNote('Choose a photo smaller than 8 MB.')
                    return
                  }
                  replacePhoto(file)
                  setFormNote('')
                }}
              />
              <label className="photo-button" htmlFor="photo">
                {photoUrl ? 'Change photo' : 'Add a photo'}
              </label>
            </div>
          </div>

          <p className="form-hint">The candle can only use this. It will not add a life you did not write.</p>
          {formNote ? <p className="form-note">{formNote}</p> : null}
          {state === 'error' && failure ? (
            <details className="failure">
              <summary>What happened</summary>
              <p>{failure}</p>
            </details>
          ) : null}

          <button className="primary-button" type="submit" disabled={!ready || busy}>
            {state === 'downloading' ? 'Bringing the model…' : state === 'writing' ? 'Writing…' : state === 'error' ? 'Try again' : 'Light the candle'}
          </button>
          <div className="quiet-actions">
            <button type="button" onClick={() => window.print()}>
              Print this card
            </button>
            <button type="button" onClick={saveCurrent}>
              Save this altar
            </button>
            <button
              type="button"
              onClick={() => {
                setOffering(rosa)
                setSentences([])
                setDraft('')
                setState('unlit')
                setModelLabel('')
                setFailure('')
                setCurrentId(null)
                replacePhoto(null)
              }}
            >
              Use Rosa’s table
            </button>
            <button type="button" onClick={() => setClearOpen(true)}>
              Clear this altar
            </button>
          </div>
          <p className="privacy">
            Photos and words stay in this browser. The weights download once, then the inscription is written here.
          </p>
        </form>

        <div className="shelf-column">
          <div className="votive-shelf" aria-label="Saved altars">
            {altars.length === 0 ? (
              <p className="shelf-empty">No candles yet</p>
            ) : (
              altars.map((altar) => (
                <button
                  key={altar.id}
                  type="button"
                  className="shelf-votive"
                  aria-current={altar.id === currentId ? 'true' : undefined}
                  onClick={() => openAltar(altar)}
                >
                  <span className="tiny-flame" aria-hidden="true" />
                  <span className="tiny-glass" aria-hidden="true" />
                  <span>{altar.name}</span>
                </button>
              ))
            )}
          </div>
          <p className="shelf-caption">Saved votives</p>
        </div>
      </section>

      <PrintSheet offering={offering} photoUrl={photoUrl} sentences={sentences} />

      {clearOpen ? (
        <ClearDialog name={offering.name} onClose={() => setClearOpen(false)} onClear={clearCurrent} />
      ) : null}
    </main>
  )
}
