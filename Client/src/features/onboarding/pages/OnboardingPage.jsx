import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../../components/useTheme'
import { useAuth } from '../../auth/hooks/useAuth'
import Modal from '../../../components/Modal'
import Button from '../../../components/Button'

const LAST_OVER = [
  { text: '1', tone: 'run' },
  { text: '4', tone: 'four' },
  { text: '0', tone: 'dot' },
  { text: 'W', tone: 'wicket' },
  { text: '6', tone: 'six' },
  { text: 'Wd', tone: 'extra' },
]

const HIGHLIGHTS = [
  {
    tag: 'Score',
    title: 'One tap per ball',
    body: 'Dots, fours, sixes, wickets and extras recorded as they happen.',
  },
  {
    tag: 'Share',
    title: 'A link for the sidelines',
    body: 'Send one link and the whole ground follows the score live.',
  },
  {
    tag: 'Rank',
    title: 'Standings settle it',
    body: 'Points and run rate update the moment a match finishes.',
  },
]

const TICKER = [
  'Coimbatore Kings need 55 from 30 balls',
  'Trichy Titans won by 14 runs',
  'Salem Strikers vs Erode Eagles, 6:30 pm',
  'Madurai Mavericks lead the table',
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated } = useAuth()
  const [askingQuickMatch, setAskingQuickMatch] = useState(false)

  const startQuickMatch = () => {
    if (isAuthenticated) {
      navigate('/')
      return
    }
    setAskingQuickMatch(true)
  }

  const goToSignIn = () => {
    setAskingQuickMatch(false)
    navigate('/login')
  }

  return (
    <div className="onboarding">
      <div className="ob-shell">
        <header className="ob-top">
          <Link to="/onboarding" className="ob-brand" aria-label="Turf home">
            <span className="ob-ball" aria-hidden="true" />
            Turf
          </Link>
          <button
            type="button"
            className="ob-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </header>

        <div className="ob-ticker" aria-hidden="true">
          <div className="ob-ticker-track">
            {TICKER.map((item, i) => (
              <span key={`a-${i}`}>{item}</span>
            ))}
            {TICKER.map((item, i) => (
              <span key={`b-${i}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="ob-hero" aria-label="Live match preview">
          <div className="ob-hero-top">
            <span className="ob-live">
              <i aria-hidden="true" />
              Live
            </span>
            <span className="ob-hero-meta">T10 - Race Course Turf</span>
          </div>

          <div className="ob-team">
            <span className="ob-badge" aria-hidden="true">CK</span>
            <div>
              <strong>Coimbatore Kings</strong>
              <small>Batting second</small>
            </div>
          </div>

          <div className="ob-score-row">
            <span className="ob-score num">41/2</span>
            <small>5.0 overs</small>
          </div>
          <p className="ob-chase">Need 55 from 30 balls</p>
          <div className="ob-bar" aria-hidden="true">
            <i style={{ width: '43%' }} />
          </div>

          <div className="ob-chips" aria-label="This over">
            {LAST_OVER.map((ball, i) => (
              <span
                key={i}
                className={ball.tone === 'run' || ball.tone === 'dot' ? 'ob-chip' : `ob-chip ob-chip-${ball.tone}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {ball.text}
              </span>
            ))}
          </div>
        </section>

        <h1 className="ob-headline">
          Gully cricket, scored <em>live</em>.
        </h1>
        <p className="ob-lede">
          Run your turf league from one phone. Score ball by ball and share the link
          with the whole ground.
        </p>

        <button type="button" className="ob-cta" onClick={startQuickMatch}>
          <span className="ob-cta-ball" aria-hidden="true" />
          Quick match
        </button>
        <Link to="/" className="ob-cta-ghost">
          Browse live matches
        </Link>
        <p className="ob-hint">Quick match signs you in, then opens your match list.</p>

        <section className="ob-features" aria-label="How Turf works">
          {HIGHLIGHTS.map((item) => (
            <div key={item.tag} className="ob-feature">
              <span className="ob-feature-tag">{item.tag}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </section>

        <p className="ob-foot">Turf - turf cricket scoring</p>
      </div>

      <Modal
        open={askingQuickMatch}
        onClose={() => setAskingQuickMatch(false)}
        title="Start a quick match"
        footer={
          <>
            <Button variant="outline" onClick={() => setAskingQuickMatch(false)}>
              Not now
            </Button>
            <Button onClick={goToSignIn}>Go to sign in</Button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-300">
          Quick match is for signed-in players. Sign in and we will take you straight
          to your match list.
        </p>
      </Modal>
    </div>
  )
}
