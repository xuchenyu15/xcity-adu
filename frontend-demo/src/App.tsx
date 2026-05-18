import React, { useEffect, useState } from 'react'
import CesiumApp from './apps/CesiumApp'
import ThreeApp from './apps/ThreeApp'

type RouteKey = 'home' | 'cesium' | 'three'

function parseRouteFromHash(hash: string): RouteKey {
  const h = (hash || '').replace(/^#/, '')
  if (!h || h === '/' || h === '/home' || h === 'home') return 'home'
  if (h === '/three' || h === 'three') return 'three'
  if (h === '/cesium' || h === 'cesium') return 'cesium'
  return 'home'
}

export default function App() {
  const [route, setRoute] = useState<RouteKey>(() => parseRouteFromHash(window.location.hash))

  useEffect(() => {
    const sync = () => {
      setRoute(parseRouteFromHash(window.location.hash))
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return (
    <div style={{ height: '100%' }}>
      <div
        style={{
          position: 'fixed',
          zIndex: 3000,
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          padding: 6,
          borderRadius: 10,
          background: 'rgba(255,255,255,.92)',
          boxShadow: '0 8px 18px rgba(0,0,0,.12)'
        }}
      >
        <button
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,.15)',
            background: route === 'home' ? 'rgba(0,0,0,.06)' : 'white',
            cursor: 'pointer'
          }}
          onClick={() => { window.location.hash = '#/' }}
        >
          Home
        </button>
        <button
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,.15)',
            background: route === 'cesium' ? 'rgba(0,0,0,.06)' : 'white',
            cursor: 'pointer'
          }}
          onClick={() => { window.location.hash = '#/cesium' }}
        >
          Cesium
        </button>
        <button
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,.15)',
            background: route === 'three' ? 'rgba(0,0,0,.06)' : 'white',
            cursor: 'pointer'
          }}
          onClick={() => { window.location.hash = '#/three' }}
        >
          Three
        </button>
      </div>

      {route === 'home' ? (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 'min(720px, calc(100% - 48px))' }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, color: '#111' }}>Welcome to XBuild</div>
            <div style={{ marginTop: 10, fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              Please select a mode:
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)', background: 'white', cursor: 'pointer' }}
                onClick={() => { window.location.hash = '#/cesium' }}
              >
                CesiumJS (earth)
              </button>
              <button
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)', background: 'white', cursor: 'pointer' }}
                onClick={() => { window.location.hash = '#/three' }}
              >
                ThreeJS (scope)
              </button>
            </div>
          </div>
        </div>
      ) : route === 'three' ? (
        <ThreeApp />
      ) : (
        <CesiumApp />
      )}
    </div>
  )
}
