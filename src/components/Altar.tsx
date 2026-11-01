import type { CandleState, Offering, Sentence } from '../types'

const PENNANTS = ['orange', 'rose', 'navy', 'cream', 'orange', 'rose', 'navy', 'cream', 'orange', 'rose', 'navy', 'cream']

type AltarProps = {
  offering: Offering
  photoUrl: string | null
  state: CandleState
  draft: string
  sentences: Sentence[]
  status: string
  progress: number
}

function Tape({ children }: { children: string }) {
  return <span className="tape">{children}</span>
}

function PapelPicado() {
  return (
    <div className="papel" aria-hidden="true">
      <span className="papel-string" />
      {PENNANTS.map((color, index) => (
        <span className={`pennant ${color}`} key={`${color}-${index}`}>
          <i className="circle-cut" />
          <i className="diamond-cut one" />
          <i className="diamond-cut two" />
        </span>
      ))}
    </div>
  )
}

function Candle({ state, progress }: { state: CandleState; progress: number }) {
  const tape =
    state === 'downloading'
      ? `Bringing the model · ${Math.round(progress * 100)}%`
      : state === 'writing'
        ? 'Writing'
        : state === 'settled'
          ? 'Candle steady'
          : state === 'error'
            ? 'Candle out'
            : 'Candle unlit'

  const flameStyle = state === 'downloading' ? { height: `${10 + progress * 18}px`, opacity: 0.85 } : undefined

  return (
    <div className={`candle-wrap state-${state}`}>
      <div className="smoke" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="flame" style={flameStyle} aria-hidden="true">
        <span />
      </div>
      <div className="votive" aria-hidden="true">
        <span className="wick" />
        <span className="wax" />
        <span className="glass-shine" />
      </div>
      <Tape>{tape}</Tape>
    </div>
  )
}

function Inscription({
  state,
  draft,
  sentences,
}: {
  state: CandleState
  draft: string
  sentences: Sentence[]
}) {
  if ((state === 'writing' || state === 'downloading') && draft) {
    return <p>{draft}</p>
  }

  if (sentences.length > 0) {
    return (
      <>
        {sentences.map((sentence, index) =>
          sentence.grounded ? (
            <p key={`${sentence.text}-${index}`}>{sentence.text}</p>
          ) : (
            <div className="struck-note" key={`${sentence.text}-${index}`}>
              <span className="struck">{sentence.text}</span>
              <span className="mono-note">Not on the table</span>
            </div>
          ),
        )}
      </>
    )
  }

  return <p className="sheet-placeholder">The inscription will be written here.</p>
}

export function Altar({ offering, photoUrl, state, draft, sentences, status, progress }: AltarProps) {
  const named = offering.name.trim().length > 0

  return (
    <>
      <PapelPicado />
      <div className="scene-wrap">
        <section className="table-scene" aria-label="Ofrenda table">
          <div className="cloth">
            <div className="altar-upper">
              <div className="portrait-group">
                <div className="portrait-mat">
                  {photoUrl ? (
                    <img src={photoUrl} alt={named ? `Photo of ${offering.name}` : 'Photo on the altar'} />
                  ) : (
                    <div className="portrait-placeholder">
                      <span className="portrait-head" aria-hidden="true" />
                      <span className="portrait-shoulders" aria-hidden="true" />
                      <span className="empty-photo">No photo yet</span>
                    </div>
                  )}
                </div>
                <Tape>Photo</Tape>
                <h1>{named ? offering.name : 'The table is clear'}</h1>
                {offering.years.trim() ? <p className="years">{offering.years}</p> : null}
                {offering.relation.trim() ? <p className="relation">{offering.relation}</p> : null}
              </div>

              <article className="wax-sheet" aria-live={state === 'writing' ? 'off' : 'polite'}>
                <span className="pin pin-left" aria-hidden="true" />
                <span className="pin pin-right" aria-hidden="true" />
                <Inscription state={state} draft={draft} sentences={sentences} />
                <span className="sheet-mark" aria-hidden="true">
                  V
                </span>
              </article>
            </div>

            <div className="offerings">
              <div className="offering">
                <div className="plate" aria-hidden="true">
                  <span className="bread bread-one" />
                  <span className="bread bread-two" />
                </div>
                <Tape>{offering.food.trim() ? `A food · ${offering.food}` : 'A food'}</Tape>
              </div>
              <div className="offering">
                <div className="water-glass" aria-hidden="true">
                  <span />
                </div>
                <Tape>Water</Tape>
              </div>
              <div className="offering">
                <div className="record" aria-hidden="true">
                  <span />
                </div>
                <Tape>{offering.song.trim() ? `A song · ${offering.song}` : 'A song'}</Tape>
              </div>
              <div className="offering">
                <Candle state={state} progress={progress} />
              </div>
            </div>

            <p className="candle-status" role="status">
              {status}
            </p>

            <div className="memory-slip">
              <span>In my words</span>
              <p>{offering.memory.trim() || 'One memory will go here.'}</p>
            </div>
          </div>
          <div className="wood-lip" />
          <div className="marigolds" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <span className={`marigold flower-${(index % 4) + 1}`} key={index}>
                <i />
              </span>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

export function PrintSheet({
  offering,
  photoUrl,
  sentences,
}: {
  offering: Offering
  photoUrl: string | null
  sentences: Sentence[]
}) {
  const kept = sentences.filter((sentence) => sentence.grounded).map((sentence) => sentence.text)
  const inscription = kept.length > 0 ? kept.join(' ') : offering.memory

  return (
    <article className="print-sheet" aria-hidden="true">
      {photoUrl ? <img src={photoUrl} alt="" /> : <div className="print-empty">No photo</div>}
      <p className="print-name">{offering.name || 'Their name'}</p>
      {offering.years ? <p className="print-years">{offering.years}</p> : null}
      {offering.relation ? <p className="print-relation">{offering.relation}</p> : null}
      <p className="print-inscription">{inscription}</p>
    </article>
  )
}
