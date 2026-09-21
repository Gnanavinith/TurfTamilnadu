import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const GullyFeedbackContext = createContext({ burst: () => {} })

const SPARK_PALETTE = ['#ffd166', '#ffffff', '#ff6a1a', '#7c5cff']

function makeSparks(color) {
  const palette = [color, ...SPARK_PALETTE]
  return Array.from({ length: 28 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const dist = 120 + Math.random() * 190
    return {
      id: i,
      sc: palette[i % palette.length],
      dx: `${Math.round(Math.cos(angle) * dist)}px`,
      dy: `${Math.round(Math.sin(angle) * dist)}px`,
      rot: `${Math.round(Math.random() * 720 - 360)}deg`,
    }
  })
}

export function GullyFeedbackProvider({ children }) {
  const [burstState, setBurstState] = useState(null)
  const idRef = useRef(0)
  const [reduce] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  const burst = useCallback(
    (text, color = '#ff6a1a') => {
      idRef.current += 1
      setBurstState({
        id: idRef.current,
        text,
        color,
        sparks: reduce ? [] : makeSparks(color),
      })
    },
    [reduce],
  )

  const dismiss = useCallback(() => setBurstState(null), [])

  useEffect(() => {
    if (!burstState) return undefined
    const timer = setTimeout(dismiss, 1100)
    return () => clearTimeout(timer)
  }, [burstState, dismiss])

  const value = useMemo(() => ({ burst }), [burst])

  return (
    <GullyFeedbackContext.Provider value={value}>
      {children}
      <div
        className={`g-burst${burstState ? '' : ' is-hidden'}`}
        style={burstState ? { '--bc': burstState.color } : undefined}
        aria-hidden="true"
      >
        {burstState ? (
          <>
            <div className="g-flash" />
            {burstState.sparks.map((spark) => (
              <i
                key={spark.id}
                className="g-spark"
                style={{
                  '--sc': spark.sc,
                  '--dx': spark.dx,
                  '--dy': spark.dy,
                  '--rot': spark.rot,
                }}
              />
            ))}
            <div className="g-burst-text" key={burstState.id}>
              {burstState.text}
            </div>
          </>
        ) : null}
      </div>
    </GullyFeedbackContext.Provider>
  )
}

export function useGullyFeedback() {
  return useContext(GullyFeedbackContext)
}
