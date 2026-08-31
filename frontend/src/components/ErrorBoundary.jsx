import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error in UI:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#1A3A2A' }}>
          <h1 style={{ fontSize: '1.3rem' }}>Une erreur est survenue</h1>
          <p>Rechargez la page. Si le problème persiste, voici le détail technique :</p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#f2f2f2',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              overflowX: 'auto',
            }}
          >
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>
            Recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
